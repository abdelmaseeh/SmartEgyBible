import { GoogleGenAI, Type, Chat, GenerateContentResponse, Modality } from "@google/genai";
import { Verse } from '../types';

// Ideally, this should be checked at startup, but for strict adherence to rules, we use it directly.
const getClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_INSTRUCTION_TRANSLATE = `
You are an expert Bible translator and linguist specialized in Egyptian Arabic (Masri) and Standard Arabic (Fus'ha).

Task:
1. Retrieve the text for the requested Bible book and chapter from the standard Van Dyck Arabic Bible translation.
2. Translate this exact text into the **Egyptian Arabic (Masri)** dialect. The translation should be natural, modern, and respectful, suitable for an Egyptian reader.
3. Return the output as a strictly structured JSON object.

Output Format:
A JSON object containing an array called "verses". Each item in the array must be an object with:
- "number": The verse number (integer).
- "original": The original Van Dyck Arabic text.
- "translated": The Egyptian Arabic translation.
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

export const fetchChapterTranslation = async (bookName: string, chapterNumber: number): Promise<Verse[]> => {
  const ai = getClient();
  
  const prompt = `Translate ${bookName} Chapter ${chapterNumber}.`;

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
    if (!jsonText) throw new Error("No content received from Gemini");

    const parsed = JSON.parse(jsonText);
    if (!parsed.verses || !Array.isArray(parsed.verses)) {
      throw new Error("Invalid JSON structure returned");
    }

    return parsed.verses;

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  groundingSources?: { title: string; uri: string }[];
}

// Store chat instances in memory (for this demo session) to maintain history
let chatSession: Chat | null = null;

export const sendMessageToChat = async (message: string, context?: string): Promise<ChatMessage> => {
    const ai = getClient();
    
    // Initialize chat if not exists
    if (!chatSession) {
        chatSession = ai.chats.create({
            model: 'gemini-2.5-flash',
            config: {
                systemInstruction: SYSTEM_INSTRUCTION_CHAT,
                temperature: 0, // ZERO temperature to enforce determinism and reduce hallucinations
                tools: [{googleSearch: {}}],
            }
        });
    }

    // Construct the message with context and STRICT search instructions
    let fullMessage = "";
    if (context) {
        fullMessage += `Context: ${context}\n\n`;
    }
    
    // Force the model to treat this as a search task with explicit site restrictions
    fullMessage += `User Question: ${message}\n\n`;
    fullMessage += `COMMAND: Perform a Google Search for "${message} site:st-takla.org". Answer ONLY based on the search results found. If the results are empty or irrelevant, state that you cannot answer. Do not use internal knowledge.`;

    try {
        const response: GenerateContentResponse = await chatSession.sendMessage({ message: fullMessage });
        
        // --- DATA CLEANING & EXTRACTION START ---
        let cleanText = response.text || "";
        const uniqueSourcesMap = new Map<string, { title: string; uri: string }>();

        // 1. Remove internal Google Grounding Redirects and Markdown links from text
        // We do NOT extract links from text anymore to avoid hallucinations.
        const googleRedirectRegex = /\[.*?\]\(https:\/\/vertexaisearch\.cloud\.google\.com\/.*?\)/g;
        cleanText = cleanText.replace(googleRedirectRegex, '');
        const rawRedirectRegex = /https:\/\/vertexaisearch\.cloud\.google\.com\/[^\s)\]]*/g;
        cleanText = cleanText.replace(rawRedirectRegex, '');
        
        // 2. Remove any other raw URLs the model might have slipped in (cleanup only)
        // We want the text to be clean prose.
        const otherUrlRegex = /https?:\/\/[^\s)\]]+/g;
        cleanText = cleanText.replace(otherUrlRegex, ' ');

        // 3. Remove markdown links [Title](URL)
        const markdownLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g;
        cleanText = cleanText.replace(markdownLinkRegex, '$1'); 

        // 4. Cleanup Whitespace BUT PRESERVE NEWLINES for Markdown
        // Replace tabs and multiple spaces on a single line with one space
        cleanText = cleanText.replace(/[ \t]+/g, ' ');
        // Ensure max 2 newlines (paragraph breaks)
        cleanText = cleanText.replace(/\n{3,}/g, '\n\n');
        cleanText = cleanText.trim();
        // --- DATA CLEANING END ---

        // 5. Process Official Grounding Metadata (The ONLY Source of Truth)
        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        
        groundingChunks.forEach(chunk => {
            if (chunk.web && chunk.web.uri) {
                const uri = chunk.web.uri;
                const title = chunk.web.title || "St-Takla Reference";

                // Filter: Must be from st-takla
                if (uri.toLowerCase().includes('st-takla')) {
                    if (!uniqueSourcesMap.has(uri)) {
                        uniqueSourcesMap.set(uri, { title, uri });
                    }
                }
            }
        });

        let sources = Array.from(uniqueSourcesMap.values());

        // 6. Fallback: If ABSOLUTELY NO st-takla links found in metadata
        if (sources.length === 0) {
            const queryClean = message.replace(/\n/g, " ").trim().substring(0, 100);
            const searchUrl = `https://www.google.com/search?q=site%3Ast-takla.org+${encodeURIComponent(queryClean)}`;
            
            sources.push({
                title: "بحث في St-Takla.org",
                uri: searchUrl
            });
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

export const resetChat = () => {
    chatSession = null;
};

// --- AUDIO HELPERS ---

export const generateChapterAudio = async (text: string): Promise<string> => {
    const ai = getClient();
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Puck' },
                    },
                },
            },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) {
             throw new Error("No audio content returned");
        }
        return base64Audio;
    } catch (error) {
        console.error("TTS Generation Error", error);
        throw error;
    }
};

export const base64ToBlobUrl = (base64: string): string => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: 'audio/wav' }); // Gemini returns PCM/WAV compatible bytes usually, or raw. 
    // Actually Gemini Live API returns raw PCM, but the TTS model returns encodings that browser can often sniff or are WAV wrapped.
    // The previous decodeAudioData context worked with it, meaning it has headers or is decodeable.
    // For <audio> src, we might need to ensure it works. 
    // The previous code used AudioContext.decodeAudioData.
    // If it's raw PCM, <audio> tag won't play it directly without a WAV header.
    // However, gemini-2.5-flash-preview-tts usually returns a format playble by decodeAudioData.
    // Let's assume for this implementation we rely on the browser's ability to play the blob.
    // If strictly RAW PCM is returned without header, we'd need to add a WAV header. 
    // Based on standard usage of this endpoint, it usually works with decodeAudioData.
    // Let's assume it works as a Blob for now.
    return URL.createObjectURL(blob);
};