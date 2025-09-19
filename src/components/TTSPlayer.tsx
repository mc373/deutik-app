// TTSPlayer.tsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Group,
  Button,
  Slider,
  NumberInput,
  Stack,
  Text,
  Paper,
  ActionIcon,
  Progress,
  Switch,
  Box,
  useMantineColorScheme,
  Alert,
} from "@mantine/core";
import {
  IconPlayerPlay,
  IconPlayerPause,
  IconVolume,
  IconArrowBack,
} from "@tabler/icons-react";
import { md5 } from "js-md5";
import { useMediaQuery } from "@mantine/hooks";
import { indexedDBService } from "../services/indexedDBService";

interface TTSPlayerProps {
  text: string;
  onBack: () => void;
}

interface AudioData {
  data: string;
  format: string;
  hash: string;
}

interface SentenceAudio {
  text: string;
  hash: string;
  audio: HTMLAudioElement | null;
  loaded: boolean;
  error?: string;
  translation?: string;
}

const TTSPlayer: React.FC<TTSPlayerProps> = ({ text, onBack }) => {
  const { colorScheme } = useMantineColorScheme();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [sentences, setSentences] = useState<SentenceAudio[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [pauseBetweenSentences, setPauseBetweenSentences] = useState(1);
  const [repeatCount, setRepeatCount] = useState(1);
  const [loop, setLoop] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string>("");

  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  /* ---------- 工具函数 ---------- */
  const splitTextToSentences = useCallback((text: string): string[] => {
    return text
      .split(/(?<=[.!?])\s+/)
      .filter((s) => s.trim().length > 0)
      .map((s) => s.trim());
  }, []);

  const generateHash = (text: string): string => md5(text);

  /* ---------- 缓存读写（仅用 indexedDBService） ---------- */
  const getAudioFromCache = async (hash: string): Promise<AudioData | null> => {
    try {
      return await indexedDBService.get("ttsCache", hash);
    } catch {
      return null;
    }
  };

  const saveAudioToCache = async (
    hash: string,
    audioData: AudioData
  ): Promise<void> => {
    console.log(hash);
    try {
      await indexedDBService.set("ttsCache", hash, { ...audioData, hash });
    } catch {
      setError("无法保存音频到本地缓存");
    }
  };

  /* ---------- 网络请求 ---------- */
  const fetchAudioFromAPI = async (
    text: string,
    hash: string
  ): Promise<AudioData> => {
    const API_URL = "https://app.deutik.com/tts/";
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, model: "de_DE-thorsten-low", hash }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () =>
        resolve({
          data: (reader.result as string).split(",")[1],
          format: "audio/mp3",
          hash,
        });
      reader.onerror = () => {
        setError("无法读取音频数据");
        reject(new Error("无法读取音频数据"));
      };
      reader.readAsDataURL(blob);
    });
  };

  /* ---------- 获取或创建音频 ---------- */
  const getOrCreateAudio = async (
    text: string,
    hash: string
  ): Promise<AudioData> => {
    const cached = await getAudioFromCache(hash);
    if (cached) return cached;

    const fresh = await fetchAudioFromAPI(text, hash);
    await saveAudioToCache(hash, fresh);
    return fresh;
  };

  /* ---------- 批量加载 ---------- */
  const loadAllAudios = async () => {
    if (!text) {
      setError("没有可生成的文本");
      return;
    }
    setLoading(true);
    setProgress(0);
    setError("");

    const texts = splitTextToSentences(text);
    if (!texts.length) {
      setError("文本无法分割为句子");
      setLoading(false);
      return;
    }

    const list: SentenceAudio[] = texts.map((t) => ({
      text: t,
      hash: generateHash(t),
      audio: null,
      loaded: false,
    }));
    setSentences(list);

    for (let i = 0; i < list.length; i++) {
      try {
        const audioData = await getOrCreateAudio(list[i].text, list[i].hash);
        const audio = new Audio(`data:audio/mp3;base64,${audioData.data}`);
        audio.playbackRate = playbackRate;

        setSentences((prev) => {
          const next = [...prev];
          next[i] = { ...next[i], audio, loaded: true };
          return next;
        });
        setProgress(((i + 1) / list.length) * 100);
      } catch (e) {
        console.error(`句子 ${i} 加载失败`, e);
        setSentences((prev) => {
          const next = [...prev];
          next[i] = { ...next[i], error: "Failed to load audio", loaded: true };
          return next;
        });
      }
    }
    setLoading(false);
  };

  /* ---------- 播放控制 ---------- */
  const repeatCounts = useRef<Record<number, number>>({});

  const playSentence = useCallback(
    (index: number) => {
      if (
        index >= sentences.length ||
        !sentences[index].loaded ||
        sentences[index].error
      ) {
        setError("无法播放音频：音频未加载或存在错误");
        setIsPlaying(false);
        return;
      }

      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      setCurrentIndex(index);
      const audio = sentences[index].audio!;
      currentAudioRef.current = audio;
      audio.playbackRate = playbackRate;

      audio.onended = () => {
        const cur = repeatCounts.current[index] || 0;
        if (cur < repeatCount - 1) {
          repeatCounts.current[index] = cur + 1;
          audio.currentTime = 0;
          audio.play().catch(() => {
            setError("播放音频失败");
            setIsPlaying(false);
          });
        } else {
          repeatCounts.current[index] = 0;
          if (index < sentences.length - 1) {
            timeoutRef.current = setTimeout(
              () => playSentence(index + 1),
              pauseBetweenSentences * 1000
            );
          } else if (loop) {
            timeoutRef.current = setTimeout(
              () => playSentence(0),
              pauseBetweenSentences * 1000
            );
          } else {
            setIsPlaying(false);
          }
        }
      };

      audio.play().catch(() => setIsPlaying(false));
      setIsPlaying(true);
    },
    [sentences, playbackRate, pauseBetweenSentences, repeatCount, loop]
  );

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      currentAudioRef.current?.pause();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setIsPlaying(false);
    } else {
      const idx = currentIndex >= sentences.length ? 0 : currentIndex;
      playSentence(idx);
    }
  }, [isPlaying, currentIndex, sentences.length, playSentence]);

  const playSpecificSentence = useCallback(
    (index: number) => {
      if (isPlaying) {
        currentAudioRef.current?.pause();
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      }
      setCurrentIndex(index);
      playSentence(index);
    },
    [isPlaying, playSentence]
  );

  /* ---------- 副作用 ---------- */
  useEffect(() => {
    if (text) loadAllAudios();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  useEffect(
    () => () => {
      timeoutRef.current && clearTimeout(timeoutRef.current);
      currentAudioRef.current?.pause();
    },
    []
  );

  /* ---------- UI ---------- */
  return (
    <Box>
      {error && (
        <Alert color="red" mb="md">
          {error}
        </Alert>
      )}

      <Group mb="md" justify="space-between">
        <Button
          variant="subtle"
          leftSection={<IconArrowBack size={16} />}
          onClick={onBack}
          size={isMobile ? "sm" : "md"}
        >
          返回OCR
        </Button>

        <Button
          leftSection={
            isPlaying ? (
              <IconPlayerPause size={16} />
            ) : (
              <IconPlayerPlay size={16} />
            )
          }
          onClick={togglePlay}
          disabled={sentences.length === 0 || loading}
          size={isMobile ? "sm" : "md"}
        >
          {isPlaying ? "暂停" : "播放"}
        </Button>
      </Group>

      {loading && (
        <Box mb="md">
          <Text size="sm" mb="xs">
            加载音频中...
          </Text>
          <Progress value={progress} />
        </Box>
      )}

      <Paper p="md" mb="md" bg={colorScheme === "dark" ? "dark.6" : "gray.0"}>
        <Text size="sm" fw={500} mb="md">
          播放设置
        </Text>
        <Stack gap="md">
          <Group grow>
            <div>
              <Text size="sm" mb="xs">
                播放速度
              </Text>
              <Slider
                min={0.5}
                max={2}
                step={0.1}
                value={playbackRate}
                onChange={setPlaybackRate}
                marks={[
                  { value: 0.5, label: "0.5x" },
                  { value: 1, label: "1x" },
                  { value: 1.5, label: "1.5x" },
                  { value: 2, label: "2x" },
                ]}
                size={isMobile ? "sm" : "md"}
              />
            </div>
          </Group>

          <Group grow>
            <div>
              <Text size="sm" mb="xs">
                句间间隔(秒)
              </Text>
              <NumberInput
                min={0}
                max={10}
                value={pauseBetweenSentences}
                onChange={(v) => setPauseBetweenSentences(Number(v))}
                size={isMobile ? "sm" : "md"}
              />
            </div>
            <div>
              <Text size="sm" mb="xs">
                每句重复次数
              </Text>
              <NumberInput
                min={1}
                max={10}
                value={repeatCount}
                onChange={(v) => setRepeatCount(Number(v))}
                size={isMobile ? "sm" : "md"}
              />
            </div>
          </Group>

          <Group>
            <Switch
              label="循环播放"
              checked={loop}
              onChange={(e) => setLoop(e.currentTarget.checked)}
              size={isMobile ? "sm" : "md"}
            />
          </Group>
        </Stack>
      </Paper>

      <Paper p="md" bg={colorScheme === "dark" ? "dark.6" : "gray.0"}>
        <Text size="sm" fw={500} mb="md">
          句子列表
        </Text>
        <Stack gap="xs">
          {sentences.map((s, i) => (
            <Paper
              key={i}
              p="sm"
              withBorder
              bg={colorScheme === "dark" ? "dark.5" : "white"}
              style={{
                cursor: "pointer",
                borderColor: i === currentIndex ? "#228be6" : undefined,
                borderWidth: i === currentIndex ? 2 : 1,
              }}
              onClick={() => playSpecificSentence(i)}
            >
              <Stack gap="xs">
                <Group justify="space-between">
                  <Text size="sm" style={{ flex: 1 }}>
                    {s.text}
                  </Text>

                  {s.loaded ? (
                    s.error ? (
                      <ActionIcon variant="subtle" color="red" size="sm">
                        <IconVolume size={16} />
                      </ActionIcon>
                    ) : (
                      <ActionIcon
                        variant="subtle"
                        color={
                          i === currentIndex && isPlaying ? "blue" : "gray"
                        }
                        size="sm"
                      >
                        <IconVolume size={16} />
                      </ActionIcon>
                    )
                  ) : (
                    <Text size="xs" c="dimmed">
                      加载中...
                    </Text>
                  )}
                </Group>

                {s.translation && (
                  <Text size="sm" c="dimmed" style={{ fontStyle: "italic" }}>
                    {s.translation}
                  </Text>
                )}
              </Stack>
            </Paper>
          ))}
        </Stack>
      </Paper>
    </Box>
  );
};

export default TTSPlayer;
