// types/audio.ts
export interface AudioCacheItem {
  hash: string;
  audioBlob: Blob;
  createdAt: number;
  lastAccessed: number;
}

export interface Verb {
  id?: string | number;
  infinitiv: string;
  trans?: string;
  prasens?: string;
  prateritum?: string;
  perfekt?: string;
}

export interface UseAudioPlayerReturn {
  playAudio: (hash: string, text: string) => Promise<void>;
  preloadAudio: (hash: string, text: string) => Promise<void>;
  preloadAllAudios: (verbs: Verb[]) => Promise<void>;
  loadingAudios: Set<string>;
}
