// hooks/useAudioPlayer.ts
import { useState, useRef, useCallback } from "react";
import { audioCache } from "../utils/audioCache";
import { UseAudioPlayerReturn, Verb } from "../types/audio";
import { md5HexPy } from "../utils/audioUtils";

export function useAudioPlayer(): UseAudioPlayerReturn {
  const [loadingAudios, setLoadingAudios] = useState<Set<string>>(new Set());
  const audioElements = useRef<Map<string, HTMLAudioElement>>(new Map());

  const preloadAudio = useCallback(
    async (hash: string, text: string): Promise<void> => {
      console.log(text);
      if (!hash || loadingAudios.has(hash)) return;

      setLoadingAudios((prev) => new Set(prev).add(hash));

      try {
        const cachedAudio = await audioCache.getAudio(hash);

        if (cachedAudio) {
          const audio = new Audio(cachedAudio);
          audioElements.current.set(hash, audio);
          setLoadingAudios((prev) => {
            const newSet = new Set(prev);
            newSet.delete(hash);
            return newSet;
          });
          return;
        }

        // 从 Cloudflare R2 下载
        const response = await fetch(
          `https://app.deutik.com/audio/${hash}.mp3`
        );

        if (!response.ok) {
          throw new Error(`Audio not found for hash: ${hash}`);
        }

        const audioBlob = await response.blob();
        await audioCache.saveAudio(hash, audioBlob);

        const audioURL = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioURL);
        audioElements.current.set(hash, audio);
      } catch (error) {
        console.error("Failed to load audio:", error);
      } finally {
        setLoadingAudios((prev) => {
          const newSet = new Set(prev);
          newSet.delete(hash);
          return newSet;
        });
      }
    },
    [loadingAudios]
  );

  const playAudio = useCallback(
    async (hash: string, text: string): Promise<void> => {
      if (!hash) return;

      if (loadingAudios.has(hash)) {
        setTimeout(() => playAudio(hash, text), 100);
        return;
      }

      const audio = audioElements.current.get(hash);

      if (audio) {
        try {
          audio.currentTime = 0;
          await audio.play();
        } catch (error) {
          console.error("Failed to play audio:", error);
        }
      } else {
        await preloadAudio(hash, text);
        setTimeout(() => playAudio(hash, text), 100);
      }
    },
    [loadingAudios, preloadAudio]
  );

  const preloadAllAudios = useCallback(
    async (verbs: Verb[]): Promise<void> => {
      const allHashes = new Set<string>();

      verbs.forEach((verb) => {
        if (verb.infinitiv) allHashes.add(md5HexPy(verb.infinitiv));
        if (verb.prasens) allHashes.add(md5HexPy(verb.prasens));
        if (verb.prateritum) allHashes.add(md5HexPy(verb.prateritum));
        if (verb.perfekt) allHashes.add(md5HexPy(verb.perfekt));
      });

      for (const hash of allHashes) {
        preloadAudio(hash, "");
      }
    },
    [preloadAudio]
  );

  return {
    playAudio,
    preloadAudio,
    preloadAllAudios,
    loadingAudios,
  };
}
