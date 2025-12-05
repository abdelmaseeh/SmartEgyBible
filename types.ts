export interface BibleBook {
  id: string;
  name: string;
  chapters: number;
}

export interface Verse {
  number: number;
  original: string; // The Van Dyck / Standard Arabic text
  translated: string; // The Egyptian Arabic text
}

export interface ChapterTranslation {
  bookId: string;
  chapterNumber: number;
  verses: Verse[];
  timestamp: number;
}

export interface TranslationCache {
  [key: string]: ChapterTranslation;
}
