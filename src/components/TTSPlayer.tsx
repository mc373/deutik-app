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
  translation?: string; // 为翻译预留
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
  const [error, setError] = useState<string>(""); // 添加错误状态
  // const audioRefs = useRef<HTMLAudioElement[]>([]);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 分割文本为句子
  const splitTextToSentences = useCallback((text: string): string[] => {
    return text
      .split(/(?<=[.!?])\s+/)
      .filter((sentence) => sentence.trim().length > 0)
      .map((sentence) => sentence.trim());
  }, []);

  // 生成MD5 hash
  const generateHash = (text: string): string => {
    return md5(text);
  };

  // 从IndexDB获取音频
  const getAudioFromIndexDB = async (
    hash: string
  ): Promise<AudioData | null> => {
    try {
      return new Promise((resolve) => {
        const request = indexedDB.open("DeutikAppDatabase", 1);
        // TTSDatabase;
        request.onsuccess = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains("ttsCache")) {
            resolve(null);
            return;
          }

          const transaction = db.transaction(["ttsCache"], "readonly");
          const store = transaction.objectStore("ttsCache");
          const getRequest = store.get(hash);

          getRequest.onsuccess = () => {
            resolve(getRequest.result || null);
          };

          getRequest.onerror = () => {
            resolve(null);
          };
        };

        request.onerror = () => {
          resolve(null);
        };
      });
    } catch (error) {
      console.error("Error getting audio from IndexDB:", error);
      return null;
    }
  };

  // 保存音频到IndexDB
  const saveAudioToIndexDB = async (
    hash: string,
    audioData: AudioData
  ): Promise<void> => {
    try {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open("DeutikAppDatabase", 1);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains("ttsCache")) {
            db.createObjectStore("ttsCache", { keyPath: "hash" });
          }
        };

        request.onsuccess = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          const transaction = db.transaction(["ttsCache"], "readwrite");
          const store = transaction.objectStore("ttsCache");
          const putRequest = store.put({ ...audioData, hash });

          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        };

        request.onerror = () => {
          reject(request.error);
        };
      });
    } catch (error) {
      console.error("Error saving audio to IndexDB:", error);
      setError("无法保存音频到本地缓存");
    }
  };

  // 从API获取音频
  const fetchAudioFromAPI = async (
    text: string,
    hash: string
  ): Promise<AudioData> => {
    const API_URL = "https://app.deutik.com/tts/";

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: text,
          model: "de_DE-thorsten-low",
          hash: hash,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      const blob = await response.blob();
      const reader = new FileReader();

      return new Promise((resolve, reject) => {
        reader.onloadend = () => {
          const base64data = (reader.result as string).split(",")[1];
          resolve({
            data: base64data,
            format: "audio/mp3",
            hash: hash,
          });
        };
        reader.onerror = () => {
          setError("无法读取音频数据");
          reject(new Error("无法读取音频数据"));
        };
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error("Error fetching audio from API:", error);
      setError("无法从服务器获取音频");
      throw error;
    }
  };

  // 获取或创建音频
  const getOrCreateAudio = async (
    text: string,
    hash: string
  ): Promise<AudioData> => {
    const cachedAudio = await getAudioFromIndexDB(hash);
    if (cachedAudio) {
      return cachedAudio;
    }

    const audioData = await fetchAudioFromAPI(text, hash);
    await saveAudioToIndexDB(hash, audioData);

    return audioData;
  };

  // 加载所有音频
  const loadAllAudios = async () => {
    if (!text) {
      setError("没有可生成的文本");
      return;
    }

    setLoading(true);
    setProgress(0);
    setError(""); // 重置错误状态

    const sentenceTexts = splitTextToSentences(text);
    if (sentenceTexts.length === 0) {
      setError("文本无法分割为句子");
      setLoading(false);
      return;
    }
    const sentenceAudios: SentenceAudio[] = sentenceTexts.map((text) => ({
      text,
      hash: generateHash(text),
      audio: null,
      loaded: false,
    }));

    setSentences(sentenceAudios);

    for (let i = 0; i < sentenceAudios.length; i++) {
      try {
        const audioData = await getOrCreateAudio(
          sentenceAudios[i].text,
          sentenceAudios[i].hash
        );

        const audio = new Audio(`data:audio/mp3;base64,${audioData.data}`);
        audio.playbackRate = playbackRate;

        setSentences((prev) => {
          const updated = [...prev];
          updated[i] = { ...updated[i], audio, loaded: true };
          return updated;
        });

        setProgress(((i + 1) / sentenceAudios.length) * 100);
      } catch (error) {
        console.error(`Error loading audio for sentence ${i}:`, error);
        setSentences((prev) => {
          const updated = [...prev];
          updated[i] = {
            ...updated[i],
            error: "Failed to load audio",
            loaded: true,
          };
          return updated;
        });
      }
    }

    setLoading(false);
  };

  const repeatCounts = useRef<{ [key: number]: number }>({});

  // 播放特定句子
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
      const audio = sentences[index].audio;

      if (audio) {
        currentAudioRef.current = audio;
        audio.playbackRate = playbackRate;

        audio.onended = () => {
          const currentRepeat = repeatCounts.current[index] || 0;

          if (currentRepeat < repeatCount - 1) {
            repeatCounts.current[index] = currentRepeat + 1;
            audio.currentTime = 0;
            audio.play().catch((error) => {
              console.error("Error playing audio:", error);
              setError("播放音频失败");
              setIsPlaying(false);
            });
          } else {
            repeatCounts.current[index] = 0;

            if (index < sentences.length - 1) {
              timeoutRef.current = setTimeout(() => {
                playSentence(index + 1);
              }, pauseBetweenSentences * 1000);
            } else if (loop) {
              timeoutRef.current = setTimeout(() => {
                playSentence(0);
              }, pauseBetweenSentences * 1000);
            } else {
              setIsPlaying(false);
            }
          }
        };

        audio.play().catch((error) => {
          console.error("Error playing audio:", error);
          setIsPlaying(false);
        });

        setIsPlaying(true);
      }
    },
    [sentences, playbackRate, pauseBetweenSentences, repeatCount, loop]
  );

  // 开始或暂停播放
  const togglePlay = useCallback(() => {
    if (isPlaying) {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      setIsPlaying(false);
    } else {
      if (currentIndex >= sentences.length) {
        setCurrentIndex(0);
      }
      playSentence(currentIndex);
    }
  }, [isPlaying, currentIndex, sentences.length, playSentence]);

  // 播放特定句子
  const playSpecificSentence = useCallback(
    (index: number) => {
      if (isPlaying) {
        if (currentAudioRef.current) {
          currentAudioRef.current.pause();
        }
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      }

      setCurrentIndex(index);
      playSentence(index);
    },
    [isPlaying, playSentence]
  );

  // 初始化加载音频
  useEffect(() => {
    if (text) {
      loadAllAudios();
    }
  }, [text]);

  // 清理资源
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
      }
    };
  }, []);

  return (
    <Box>
      {/* 显示错误信息 */}
      {error && (
        <Alert color="red" mb="md">
          {error}
        </Alert>
      )}
      {/* 返回按钮 */}
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

      {/* 加载进度 */}
      {loading && (
        <Box mb="md">
          <Text size="sm" mb="xs">
            加载音频中...
          </Text>
          <Progress value={progress} />
        </Box>
      )}

      {/* 播放设置 */}
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
                onChange={(value) => setPauseBetweenSentences(Number(value))}
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
                onChange={(value) => setRepeatCount(Number(value))}
                size={isMobile ? "sm" : "md"}
              />
            </div>
          </Group>

          <Group>
            <Switch
              label="循环播放"
              checked={loop}
              onChange={(event) => setLoop(event.currentTarget.checked)}
              size={isMobile ? "sm" : "md"}
            />
          </Group>
        </Stack>
      </Paper>

      {/* 句子列表 */}
      <Paper p="md" bg={colorScheme === "dark" ? "dark.6" : "gray.0"}>
        <Text size="sm" fw={500} mb="md">
          句子列表
        </Text>

        <Stack gap="xs">
          {sentences.map((sentence, index) => (
            <Paper
              key={index}
              p="sm"
              withBorder
              bg={colorScheme === "dark" ? "dark.5" : "white"}
              style={{
                cursor: "pointer",
                borderColor: index === currentIndex ? "#228be6" : undefined,
                borderWidth: index === currentIndex ? 2 : 1,
              }}
              onClick={() => playSpecificSentence(index)}
            >
              <Stack gap="xs">
                <Group justify="space-between">
                  <Text size="sm" style={{ flex: 1 }}>
                    {sentence.text}
                  </Text>

                  {sentence.loaded ? (
                    sentence.error ? (
                      <ActionIcon variant="subtle" color="red" size="sm">
                        <IconVolume size={16} />
                      </ActionIcon>
                    ) : (
                      <ActionIcon
                        variant="subtle"
                        color={
                          index === currentIndex && isPlaying ? "blue" : "gray"
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

                {/* 翻译区域 - 暂时隐藏 */}
                {sentence.translation && (
                  <Text size="sm" c="dimmed" style={{ fontStyle: "italic" }}>
                    {sentence.translation}
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
