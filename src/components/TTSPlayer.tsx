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
  Collapse,
  Badge,
  Flex,
} from "@mantine/core";
import {
  IconPlayerPlay,
  IconPlayerPause,
  IconVolume,
  IconArrowBack,
  IconRefresh,
  IconLanguage,
  IconChevronDown,
  IconChevronUp,
} from "@tabler/icons-react";
import { md5 } from "js-md5";
import { useMediaQuery } from "@mantine/hooks";
import { indexedDBService, AudioData } from "../services/indexedDBService";

interface TTSPlayerProps {
  text: string;
  onBack: () => void;
}

interface SentenceAudio {
  text: string;
  hash: string;
  audio: HTMLAudioElement | null;
  loaded: boolean;
  error?: string;
  translation?: string;
  translationLoading?: boolean;
  translationError?: string;
}

interface TranslationResponse {
  original: string;
  translated: string;
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
  const [showTranslations, setShowTranslations] = useState(true);
  const [translationLanguage, setTranslationLanguage] = useState<
    "de-zh" | "de-en"
  >("de-zh");

  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  /* ---------- 工具函数 ---------- */
  // const splitTextToSentences = useCallback((text: string): string[] => {
  //   return text
  //     .replace(/\n+/g, " ")
  //     .split(/(?<=[.!?])\s+/)
  //     .filter((s) => s.trim().length > 0)
  //     .map((s) => s.trim());
  // }, []);
  const splitTextToSentences = useCallback((text: string): string[] => {
    // 保护缩写模式：将缩写中的点替换为特殊字符
    const protectedText = text
      .replace(/([a-z])\.\s*([A-Z][a-z]*\.)/gi, "$1‹DOT› $2") // n. Chr. → n‹DOT› Chr.
      .replace(/([a-z])\.([a-z]\.)/gi, "$1‹DOT›$2") // z.b. → z‹DOT›b.
      .replace(/\n+/g, " ");

    // 切分句子：只在标点后跟大写字母时切分
    const sentences = protectedText
      .split(/(?<=[.!?])\s+(?=[A-Z])/) // 标点 + 空格 + 大写字母
      .filter((s) => s.trim().length > 0)
      .map((s) => s.trim());

    // 恢复缩写中的点
    const result = sentences.map((sentence) => sentence.replace(/‹DOT›/g, "."));

    return result;
  }, []);

  const generateHash = (text: string): string => md5(text);

  /* ---------- 翻译功能 ---------- */
  const fetchTranslation = async (
    texts: string[]
  ): Promise<TranslationResponse[]> => {
    const API_URL = `https://tts.deutik.com/trans-batch-${translationLanguage}`;

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ texts }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      return await res.json();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "翻译请求失败";
      throw new Error(errorMessage);
    }
  };

  const translateSentences = async (sentences: SentenceAudio[]) => {
    const texts = sentences.map((s) => s.text);

    // 如果文本为空，直接返回
    if (texts.length === 0 || texts.every((text) => text.trim() === "")) {
      setSentences((prev) =>
        prev.map((sentence) => ({
          ...sentence,
          translation: "无文本可翻译",
          translationLoading: false,
        }))
      );
      return;
    }

    try {
      const translations = await fetchTranslation(texts);
      console.log("Translations fetched:", translations);
      setSentences((prev) =>
        prev.map((sentence, index) => ({
          ...sentence,
          translation: (() => {
            const result =
              translations[index]?.translated &&
              !["====", "=External links=", "=References="].some((keyword) =>
                translations[index].translated.includes(keyword)
              )
                ? translations[index].translated
                : "";
            return result || "";
          })(),
          translationLoading: false,
        }))
      );
    } catch (error) {
      console.error("翻译失败:", error);
      setSentences((prev) =>
        prev.map((sentence) => ({
          ...sentence,
          translation: "翻译加载失败",
          translationLoading: false,
          translationError: error instanceof Error ? error.message : "未知错误",
        }))
      );
    }
  };

  /* ---------- 缓存读写 ---------- */
  const getAudioFromCache = async (hash: string): Promise<AudioData | null> => {
    try {
      return await indexedDBService.getAudio(hash);
    } catch (error) {
      console.error("Cache read error:", error);
      return null;
    }
  };

  const saveAudioToCache = async (audioData: AudioData): Promise<void> => {
    try {
      await indexedDBService.saveAudio(audioData);
      console.log("Audio saved to cache successfully:", audioData.hash);
    } catch (error) {
      console.error("Cache save error:", error);
      // 这里只是记录错误，不设置全局错误状态，避免影响正常流程
      console.warn("无法保存音频到本地缓存，但将继续使用音频");
    }
  };

  /* ---------- 网络请求（适配新服务器 API） ---------- */
  const fetchAudioFromAPI = async (
    text: string,
    hash: string
  ): Promise<AudioData> => {
    const API_URL = "https://tts.deutik.com/tts/";

    const requestBody = {
      text: text,
      model: "de_DE-thorsten-low",
      hash: hash,
    };

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "audio/wav",
        },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const contentType = res.headers.get("Content-Type");
      if (!contentType || !contentType.includes("audio/wav")) {
        throw new Error("服务器返回的不是 WAV 音频格式");
      }

      const blob = await res.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result !== "string") {
            reject(new Error("无效的音频数据"));
            return;
          }
          const base64Data = reader.result.split(",")[1];
          resolve({
            data: base64Data,
            format: "audio/wav",
            hash: hash,
            sample_rate: 16000,
            bits_per_sample: 16,
          });
        };
        reader.onerror = () => {
          reject(new Error("文件读取错误"));
        };
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "网络请求失败";
      throw new Error(errorMessage);
    }
  };

  /* ---------- 获取或创建音频 ---------- */
  const getOrCreateAudio = async (
    text: string,
    hash: string
  ): Promise<AudioData> => {
    const cached = await getAudioFromCache(hash);
    if (cached) {
      console.log("Cache hit:", hash);
      return cached;
    }

    // console.log("Cache miss, fetching from API:", hash);
    const freshAudio = await fetchAudioFromAPI(text, hash);

    // 尝试保存到缓存，但即使失败也继续返回音频数据
    try {
      await saveAudioToCache(freshAudio);
    } catch (error) {
      console.warn("Failed to save to cache, but continuing with audio data");
    }

    return freshAudio;
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
      translationLoading: true,
      translation: "翻译中...",
    }));

    setSentences(list);

    // 开始翻译（不等待翻译完成）
    translateSentences(list).catch((error) => {
      console.error("翻译过程出错:", error);
    });

    const concurrencyLimit = 3;
    const loadBatch = async (batch: SentenceAudio[], startIndex: number) => {
      const promises = batch.map(async (sentence, i) => {
        try {
          const audioData = await getOrCreateAudio(
            sentence.text,
            sentence.hash
          );
          const audio = new Audio(`data:audio/wav;base64,${audioData.data}`);
          audio.playbackRate = playbackRate;
          setSentences((prev) => {
            const next = [...prev];
            next[startIndex + i] = {
              ...next[startIndex + i],
              audio,
              loaded: true,
            };
            return next;
          });
        } catch (error) {
          console.error(`句子 ${startIndex + i} 加载失败:`, error);
          setSentences((prev) => {
            const next = [...prev];
            next[startIndex + i] = {
              ...next[startIndex + i],
              error: `加载失败: ${(error as Error).message}`,
              loaded: true,
            };
            return next;
          });
          // 不设置全局错误，只设置句子级别的错误
        }
      });

      await Promise.all(promises);
      setProgress(((startIndex + batch.length) / list.length) * 100);
    };

    try {
      for (let i = 0; i < list.length; i += concurrencyLimit) {
        const batch = list.slice(i, i + concurrencyLimit);
        await loadBatch(batch, i);
      }
    } catch (error) {
      console.error("批量加载过程中出错:", error);
    } finally {
      setLoading(false);
    }
  };

  /* ---------- 重新加载失败的项目 ---------- */
  const retryFailedSentences = async () => {
    const failedIndices = sentences
      .map((s, index) => ({ s, index }))
      .filter(({ s }) => s.error)
      .map(({ index }) => index);

    if (failedIndices.length === 0) return;

    setLoading(true);
    setError("");

    for (const index of failedIndices) {
      try {
        const sentence = sentences[index];
        const audioData = await getOrCreateAudio(sentence.text, sentence.hash);

        const audio = new Audio(`data:audio/wav;base64,${audioData.data}`);
        audio.playbackRate = playbackRate;

        setSentences((prev) => {
          const next = [...prev];
          next[index] = {
            ...next[index],
            audio,
            loaded: true,
            error: undefined,
          };
          return next;
        });
      } catch (error) {
        console.error(`重试句子 ${index} 失败:`, error);
        // 不设置全局错误
      }
    }

    setLoading(false);
  };

  // 重新翻译所有句子
  const retryTranslations = async () => {
    setSentences((prev) =>
      prev.map((sentence) => ({
        ...sentence,
        translationLoading: true,
        translation: "重新翻译中...",
        translationError: undefined,
      }))
    );

    await translateSentences(sentences);
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
        const currentRepeat = repeatCounts.current[index] || 0;

        if (currentRepeat < repeatCount - 1) {
          repeatCounts.current[index] = currentRepeat + 1;
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

      audio.play().catch((error) => {
        console.error("播放失败:", error);
        setError("播放音频失败");
        setIsPlaying(false);
      });

      setIsPlaying(true);
    },
    [sentences, playbackRate, pauseBetweenSentences, repeatCount, loop]
  );

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      currentAudioRef.current?.pause();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setIsPlaying(false);
    } else {
      const startIndex = currentIndex >= sentences.length ? 0 : currentIndex;
      playSentence(startIndex);
    }
  }, [isPlaying, currentIndex, sentences.length, playSentence]);

  const playSpecificSentence = useCallback(
    (index: number) => {
      if (isPlaying) {
        currentAudioRef.current?.pause();
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      }
      setCurrentIndex(index);
      playSentence(index);
    },
    [isPlaying, playSentence]
  );

  /* ---------- 副作用 ---------- */
  useEffect(() => {
    if (text) {
      loadAllAudios();
    }
  }, [text]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      currentAudioRef.current?.pause();
    };
  }, []);

  useEffect(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // 当翻译语言改变时重新翻译
  useEffect(() => {
    if (sentences.length > 0) {
      retryTranslations();
    }
  }, [translationLanguage]);

  /* ---------- UI ---------- */
  return (
    <Box>
      {error && (
        <Alert color="red" mb="md" onClose={() => setError("")} withCloseButton>
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

        <Group>
          <Button
            variant="subtle"
            leftSection={<IconRefresh size={16} />}
            onClick={retryFailedSentences}
            disabled={!sentences.some((s) => s.error)}
            size={isMobile ? "sm" : "md"}
          >
            重试失败项
          </Button>

          <Button
            variant="subtle"
            leftSection={<IconRefresh size={16} />}
            onClick={retryTranslations}
            disabled={sentences.length === 0}
            size={isMobile ? "sm" : "md"}
          >
            重新翻译
          </Button>

          <Button
            variant="subtle"
            leftSection={<IconRefresh size={16} />}
            onClick={async () => {
              try {
                await indexedDBService.clearAudioCache();
                setSentences([]);
                setError("音频缓存已清空，请重新加载");
              } catch (error) {
                console.error("清理缓存失败:", error);
                setError("清理缓存失败");
              }
            }}
            size={isMobile ? "sm" : "md"}
          >
            清理音频缓存
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
            disabled={
              sentences.length === 0 ||
              loading ||
              sentences.every((s) => !s.loaded || s.error)
            }
            size={isMobile ? "sm" : "md"}
          >
            {isPlaying ? "暂停" : "播放"}
          </Button>
        </Group>
      </Group>

      {loading && (
        <Box mb="md">
          <Text size="sm" mb="xs">
            加载音频中... ({Math.round(progress)}%)
          </Text>
          <Progress value={progress} />
        </Box>
      )}

      <Paper p="md" mb="md" bg={colorScheme === "dark" ? "dark.6" : "gray.0"}>
        <Flex justify="space-between" align="center" mb="md">
          <Text size="sm" fw={500}>
            播放设置
          </Text>
          <Badge
            variant="light"
            color="blue"
            leftSection={<IconLanguage size={12} />}
          >
            {translationLanguage === "de-zh" ? "德译中" : "德译英"}
          </Badge>
        </Flex>

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

          <Group justify="space-between">
            <Switch
              label="循环播放"
              checked={loop}
              onChange={(e) => setLoop(e.currentTarget.checked)}
              size={isMobile ? "sm" : "md"}
            />

            <Button
              variant="subtle"
              size="xs"
              onClick={() =>
                setTranslationLanguage(
                  translationLanguage === "de-zh" ? "de-en" : "de-zh"
                )
              }
            >
              切换翻译: {translationLanguage === "de-zh" ? "德译英" : "德译中"}
            </Button>
          </Group>
        </Stack>
      </Paper>

      <Paper p="md" bg={colorScheme === "dark" ? "dark.6" : "gray.0"}>
        <Group justify="space-between" mb="md">
          <Text size="sm" fw={500}>
            句子列表 ({sentences.filter((s) => s.loaded && !s.error).length}/
            {sentences.length} 加载成功)
          </Text>

          <Group gap="xs">
            <Button
              variant="subtle"
              size="xs"
              rightSection={
                showTranslations ? (
                  <IconChevronUp size={14} />
                ) : (
                  <IconChevronDown size={14} />
                )
              }
              onClick={() => setShowTranslations(!showTranslations)}
            >
              {showTranslations ? "隐藏翻译" : "显示翻译"}
            </Button>
            <Text size="xs" c="dimmed">
              点击句子播放
            </Text>
          </Group>
        </Group>

        <Stack gap="xs">
          {sentences.map((s, i) => (
            <Paper
              key={i}
              p="sm"
              withBorder
              bg={colorScheme === "dark" ? "dark.5" : "white"}
              style={{
                cursor: s.loaded && !s.error ? "pointer" : "not-allowed",
                borderColor:
                  i === currentIndex ? "#228be6" : s.error ? "red" : undefined,
                borderWidth: i === currentIndex ? 2 : 1,
                opacity: s.loaded && !s.error ? 1 : 0.6,
              }}
              onClick={() => s.loaded && !s.error && playSpecificSentence(i)}
            >
              <Stack gap="xs">
                <Group justify="space-between" wrap="nowrap" align="flex-start">
                  <Box style={{ flex: 1 }}>
                    <Text size="sm" fw={500} mb={4}>
                      {s.text}
                    </Text>

                    <Collapse in={showTranslations}>
                      <Text
                        size="xs"
                        c="dimmed"
                        style={{
                          lineHeight: 1.4,
                          borderLeft: "2px solid #228be6",
                          paddingLeft: 8,
                          marginTop: 4,
                        }}
                      >
                        {s.translationLoading
                          ? "Translating..."
                          : s.translation || ""}
                      </Text>
                    </Collapse>
                  </Box>

                  {s.loaded ? (
                    s.error ? (
                      <Group gap="xs">
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          size="sm"
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              const audioData = await getOrCreateAudio(
                                s.text,
                                s.hash
                              );
                              const audio = new Audio(
                                `data:audio/wav;base64,${audioData.data}`
                              );
                              audio.playbackRate = playbackRate;
                              setSentences((prev) => {
                                const next = [...prev];
                                next[i] = {
                                  ...next[i],
                                  audio,
                                  loaded: true,
                                  error: undefined,
                                };
                                return next;
                              });
                            } catch (error) {
                              setSentences((prev) => {
                                const next = [...prev];
                                next[i] = {
                                  ...next[i],
                                  error: `重试失败: ${
                                    (error as Error).message
                                  }`,
                                  loaded: true,
                                };
                                return next;
                              });
                            }
                          }}
                        >
                          <IconRefresh size={16} />
                        </ActionIcon>
                        <ActionIcon variant="subtle" color="red" size="sm">
                          <IconVolume size={16} />
                        </ActionIcon>
                      </Group>
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

                {s.error && (
                  <Text size="xs" color="red">
                    {s.error}
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
