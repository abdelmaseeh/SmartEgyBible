import { GoogleGenAI, Type, Chat, GenerateContentResponse, Modality } from "@google/genai";
import { Verse } from '../types';
import { BIBLE_BOOKS } from '../constants';

const getClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_INSTRUCTION_ORIGINAL = `
You are a fast Bible Text Retrieval System.
Task: Return the EXACT Arabic text (Van Dyck version) for the requested Bible chapter.
Output: strictly structured JSON. NO translation. NO commentary.
`;

const SYSTEM_INSTRUCTION_TRANSLATE = `
You are an expert Bible translator and linguist specialized in Egyptian Arabic (Masri).

Task:
1. You will be provided with a JSON array of Bible verses in Standard Arabic (Van Dyck).
2. Translate each verse into the **Egyptian Arabic (Masri)** dialect. 
3. The translation should be natural, modern, and respectful.
4. Return the output as a JSON object containing the updated "verses" array with a new "translated" field for each verse.
`;

const SYSTEM_INSTRUCTION_CHAT = `
You are a research assistant for Coptic Orthodox theology.
Your SOLE purpose is to search **st-takla.org** and summarize the findings in Egyptian Arabic.

CRITICAL PROTOCOLS:
1.  **NO INTERNAL KNOWLEDGE**: Do not use your pre-trained knowledge base. If the answer is not in the Google Search results, you MUST say: "عذراً، لم أجد إجابة دقيقة في المصادر المتاحة على موقع الأنبا تكلا."
2.  **MANDATORY SEARCH**: You must ALWAYS use the Google Search tool.
3.  **SEARCH QUERY**: Always append "site:st-takla.org" to the user's query.
4.  **STRICT GROUNDING**: Your answer must be a direct summary of the search snippets. Do not add external facts or hallucinations.
5.  **LANGUAGE**: Egyptian Arabic (Masri).
`;

// Helper to map our string IDs to standard Bible numeric IDs (1-66)
// Used for api.getbible.net
const getGetBibleId = (bookId: string): number | null => {
    const index = BIBLE_BOOKS.findIndex(b => b.id === bookId);
    if (index === -1) return null;

    // Old Testament (Genesis to Malachi) - Indices 0-38
    // Maps to IDs 1-39
    if (index <= 38) return index + 1;

    // New Testament (Matthew to Revelation) - Indices 48-74
    // We skip the 9 Deuterocanonical books (indices 39-47)
    // Matthew (index 48) should be ID 40.
    // 48 - 8 = 40.
    if (index >= 48) return index - 8;

    // Deuterocanonical Books (indices 39-47)
    // Not supported by standard Protestant API (arabicsv)
    return null;
};

// FALLBACK: Use Gemini if API fails (e.g., for Deuterocanonical books not in standard APIs)
const fetchOriginalVersesViaGemini = async (bookNameOrId: string, chapterNumber: number): Promise<Verse[]> => {
  const ai = getClient();
  // Find name for prompt context
  const bookName = BIBLE_BOOKS.find(b => b.id === bookNameOrId)?.name || bookNameOrId;
  const prompt = `Retrieve ${bookName} Chapter ${chapterNumber} (Van Dyck Arabic). Return JSON.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_ORIGINAL,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            verses: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  number: { type: Type.INTEGER },
                  original: { type: Type.STRING },
                },
                required: ["number", "original"]
              }
            }
          }
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("No content received");
    const parsed = JSON.parse(jsonText);
    return parsed.verses;
  } catch (error) {
    console.error("Gemini Fallback Error:", error);
    throw error;
  }
};

// STAGE 1: Fetch Original Text (API FIRST -> GEMINI FALLBACK)
export const fetchOriginalVerses = async (bookId: string, chapterNumber: number): Promise<Verse[]> => {
  const apiId = getGetBibleId(bookId);

  // If we have a valid ID, try the fast API first
  if (apiId !== null) {
      const url = `https://api.getbible.net/v2/arabicsv/${apiId}/${chapterNumber}.json`;
      
      try {
        const response = await fetch(url);
        
        if (!response.ok) {
           throw new Error(`API Error: ${response.status}`);
        }
    
        const data = await response.json();
        
        // getbible.net v2 format: { verses: [ { verse: 1, text: "..." }, ... ] }
        if (!data.verses || !Array.isArray(data.verses)) {
            throw new Error("Invalid API format");
        }
    
        return data.verses.map((v: any) => ({
          number: v.verse,
          original: v.text.trim().replace(/[\n\r]+/g, ' ')
        }));
    
      } catch (error) {
        console.warn("Primary API (getbible.net) failed, trying fallback...", error);
        // Fallback below
      }
  } else {
      console.warn(`Book ID ${bookId} is likely Deuterocanonical (No API ID). Using AI Fallback.`);
  }

  // Final safety net / Deuterocanonical fallback
  return await fetchOriginalVersesViaGemini(bookId, chapterNumber);
};

// STAGE 2: Translate Existing Verses (ON DEMAND - AI REQUIRED)
export const fetchTranslationForVerses = async (verses: Verse[]): Promise<Verse[]> => {
  const ai = getClient();
  
  // We send the original verses to be translated
  const payload = JSON.stringify({ verses });
  const prompt = `Translate these verses to Egyptian Arabic JSON: ${payload}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_TRANSLATE,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            verses: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  number: { type: Type.INTEGER },
                  original: { type: Type.STRING },
                  translated: { type: Type.STRING },
                },
                required: ["number", "original", "translated"]
              }
            }
          }
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("No content received");
    const parsed = JSON.parse(jsonText);
    return parsed.verses;
  } catch (error) {
    console.error("Translation Error:", error);
    throw error;
  }
};

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  groundingSources?: { title: string; uri: string }[];
}

let chatSession: Chat | null = null;

export const sendMessageToChat = async (message: string, context?: string): Promise<ChatMessage> => {
    const ai = getClient();
    
    if (!chatSession) {
        chatSession = ai.chats.create({
            model: 'gemini-2.5-flash',
            config: {
                systemInstruction: SYSTEM_INSTRUCTION_CHAT,
                temperature: 0,
                tools: [{googleSearch: {}}],
            }
        });
    }

    let fullMessage = "";
    if (context) fullMessage += `Context: ${context}\n\n`;
    fullMessage += `User Question: ${message}\n\n`;
    fullMessage += `COMMAND: Perform a Google Search for "${message} site:st-takla.org". Answer ONLY based on the search results.`;

    try {
        const response: GenerateContentResponse = await chatSession.sendMessage({ message: fullMessage });
        
        let cleanText = response.text || "";
        const uniqueSourcesMap = new Map<string, { title: string; uri: string }>();

        // Cleanup
        cleanText = cleanText.replace(/\[.*?\]\(https:\/\/vertexaisearch\.cloud\.google\.com\/.*?\)/g, '');
        cleanText = cleanText.replace(/https:\/\/vertexaisearch\.cloud\.google\.com\/[^\s)\]]*/g, '');
        cleanText = cleanText.replace(/https?:\/\/[^\s)\]]+/g, ' ');
        cleanText = cleanText.replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, '$1'); 
        cleanText = cleanText.replace(/[ \t]+/g, ' ');
        cleanText = cleanText.replace(/\n{3,}/g, '\n\n');
        cleanText = cleanText.trim();

        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        
        groundingChunks.forEach(chunk => {
            if (chunk.web && chunk.web.uri) {
                const uri = chunk.web.uri;
                const title = chunk.web.title || "St-Takla Reference";
                if (uri.toLowerCase().includes('st-takla') && !uniqueSourcesMap.has(uri)) {
                    uniqueSourcesMap.set(uri, { title, uri });
                }
            }
        });

        let sources = Array.from(uniqueSourcesMap.values());
        if (sources.length === 0) {
            const queryClean = message.replace(/\n/g, " ").trim().substring(0, 100);
            const searchUrl = `https://www.google.com/search?q=site%3Ast-takla.org+${encodeURIComponent(queryClean)}`;
            sources.push({ title: "بحث في St-Takla.org", uri: searchUrl });
        }
            
        return {
            role: 'model',
            text: cleanText || "عذراً، لم أستطع إيجاد إجابة.",
            groundingSources: sources
        };
    } catch (error) {
        console.error("Chat Error:", error);
        chatSession = null;
        throw new Error("حدث خطأ في المحادثة");
    }
};

export const resetChat = () => { chatSession = null; };

// --- AUDIO HELPERS ---

export const generateChapterAudio = async (text: string): Promise<string> => {
    const ai = getClient();
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } },
            },
        });
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) throw new Error("No audio content returned");
        return base64Audio;
    } catch (error) {
        console.error("TTS Error", error);
        throw error;
    }
};

const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
};

const createWavHeader = (dataLength: number, sampleRate: number = 24000, numChannels: number = 1, bitsPerSample: number = 16): ArrayBuffer => {
    const header = new ArrayBuffer(44);
    const view = new DataView(header);
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * (bitsPerSample / 8), true);
    view.setUint16(32, numChannels * (bitsPerSample / 8), true);
    view.setUint16(34, bitsPerSample, true);
    writeString(view, 36, 'data');
    view.setUint32(40, dataLength, true);
    return header;
};

export const base64ToBlobUrl = (base64: string): string => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    const wavHeader = createWavHeader(len, 24000, 1, 16);
    const blob = new Blob([wavHeader, bytes], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
};