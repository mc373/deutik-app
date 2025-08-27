// components/VerbScrollerWithData.tsx
import { useEffect, useRef, useState } from "react";
import {
  Table,
  Button,
  Group,
  Slider,
  ActionIcon,
  Text,
  Box,
  Paper,
  Switch,
  Loader,
  Alert,
  Center,
  Stack,
  Checkbox,
  useMantineColorScheme,
  Menu,
  Badge,
} from "@mantine/core";
import {
  IconPlayerPlay,
  IconPlayerPause,
  IconRefresh,
  IconInfoCircle,
  IconEye,
  IconEyeOff,
  IconSettings,
} from "@tabler/icons-react";
import { useVerbsData, VerbData } from "../hooks/useVerbsData";
import { useAudioPlayer } from "../hooks/useAudioPlayer";
import { md5HexPy } from "../utils/audioUtils";
import { useApp } from "../contexts/AppContext";

// 转换 API 数据到组件需要的格式
const transformVerbData = (verb: VerbData, index: number) => ({
  id: index,
  infinitiv: verb.lemma || "",
  trans: "", // 可以根据需要添加翻译字段
  prasens: verb.third_singular || "",
  prateritum: verb.past || "",
  perfekt: verb.perfect || "",
});

type Verb = ReturnType<typeof transformVerbData>;

type VerbScrollerProps = {
  verbs: Verb[];
  initialIndex?: number;
  initialSpeed?: number;
  initialRowDelay?: number;
  loop?: boolean;
  height?: number | string;
};

function VerbScroller({
  verbs,
  initialIndex = 0,
  initialSpeed = 4.0,
  initialRowDelay = 2.0,
  loop = true,
  height = 400,
}: VerbScrollerProps) {
  const { setCurWord } = useApp();
  const [current, setCurrent] = useState<number>(
    Math.max(0, Math.min(initialIndex, Math.max(0, verbs.length - 1)))
  );
  const [playing, setPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(initialSpeed);
  const [rowDelay, setRowDelay] = useState<number>(initialRowDelay);
  const [isLoop, setIsLoop] = useState<boolean>(loop);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [currentPlayingWord, setCurrentPlayingWord] = useState<string | null>(
    null
  );
  const [playForms, setPlayForms] = useState<{
    infinitiv: boolean;
    prasens: boolean;
    prateritum: boolean;
    perfekt: boolean;
  }>({
    infinitiv: true,
    prasens: true,
    prateritum: true,
    perfekt: true,
  });

  const [progressiveDisplay, setProgressiveDisplay] = useState<boolean>(false);
  const [revealedForms, setRevealedForms] = useState<{
    [verbId: number]: {
      prasens: boolean;
      prateritum: boolean;
      perfekt: boolean;
    };
  }>({});

  const { playAudio, loadingAudios } = useAudioPlayer();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rowRefs = useRef<Map<number, HTMLTableRowElement | null>>(new Map());
  const timerRef = useRef<number | null>(null);

  // 使用Mantine主题
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === "dark";

  // 清理函数
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  // 重置显示状态当 progressiveDisplay 改变时
  useEffect(() => {
    if (!progressiveDisplay) {
      setRevealedForms({});
    }
  }, [progressiveDisplay]);

  // 显示特定动词的特定形式
  const revealVerbForm = (
    verbId: number,
    form: "prasens" | "prateritum" | "perfekt"
  ) => {
    setRevealedForms((prev) => ({
      ...prev,
      [verbId]: {
        ...prev[verbId],
        [form]: true,
      },
    }));
  };

  // 播放当前行的单词
  const playCurrentRowWords = async (): Promise<boolean> => {
    if (!verbs[current] || isPlayingAudio) return false;

    setIsPlayingAudio(true);
    const currentVerb = verbs[current];

    const wordsToPlay = [
      { word: currentVerb.infinitiv, form: "infinitiv" as const },
      { word: currentVerb.prasens, form: "prasens" as const },
      { word: currentVerb.prateritum, form: "prateritum" as const },
      { word: currentVerb.perfekt, form: "perfekt" as const },
    ].filter(
      (item) => item.word && item.word.trim() !== "" && playForms[item.form]
    );

    for (const item of wordsToPlay) {
      if (item.word) {
        setCurrentPlayingWord(item.word);

        // 如果是渐进显示模式，在播放前显示对应的形式
        if (progressiveDisplay && item.form !== "infinitiv") {
          revealVerbForm(currentVerb.id, item.form);
          // 给用户一点时间看到显示变化
          await new Promise((resolve) => setTimeout(resolve, 300));
        }

        const hash = md5HexPy(item.word);
        await playAudio(hash, item.word);
        setCurrentPlayingWord(null);
        // 在每个单词之间添加间隔（根据速度调整）
        await new Promise((resolve) => setTimeout(resolve, speed * 500));
      }
    }
    setIsPlayingAudio(false);
    return true;
  };

  // 移动到下一行
  const moveToNextRow = () => {
    setCurrent((prev) => {
      const next = prev + 1;
      if (next >= verbs.length) {
        if (isLoop && verbs.length > 0) return 0;
        setPlaying(false);
        return prev;
      }
      return next;
    });
  };

  // 自动播放控制
  useEffect(() => {
    if (!playing) {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    const playRowAndAdvance = async () => {
      // 播放当前行的所有单词
      const playedSuccessfully = await playCurrentRowWords();

      // 如果播放成功且仍在播放状态，等待行间隔时间后移动到下一行
      if (playedSuccessfully && playing) {
        // 等待行间隔时间（秒转换为毫秒）
        await new Promise((resolve) => setTimeout(resolve, rowDelay * 1000));

        if (playing) {
          moveToNextRow();

          // 设置一个短暂的延迟后再开始播放下一行
          timerRef.current = window.setTimeout(() => {
            if (playing) {
              playRowAndAdvance();
            }
          }, 100);
        }
      }
    };

    // 开始播放序列
    playRowAndAdvance();

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [
    playing,
    speed,
    rowDelay,
    verbs.length,
    isLoop,
    current,
    progressiveDisplay,
    revealedForms,
    playForms,
  ]);

  // 滚动到当前行
  useEffect(() => {
    const row = rowRefs.current.get(current);
    const container = containerRef.current;
    if (!row || !container) return;

    const rowTop = row.offsetTop;
    const rowBottom = rowTop + row.clientHeight;
    const containerScrollTop = container.scrollTop;
    const containerHeight = container.clientHeight;

    if (
      rowTop < containerScrollTop ||
      rowBottom > containerScrollTop + containerHeight
    ) {
      const targetScroll = Math.max(
        0,
        rowTop -
          Math.round(containerHeight / 2) +
          Math.round(row.clientHeight / 2)
      );
      container.scrollTo({ top: targetScroll, behavior: "smooth" });
    }
  }, [current]);

  const handleRowClick = (index: number) => {
    // 停止当前播放
    setPlaying(false);
    setIsPlayingAudio(false);
    setCurrentPlayingWord(null);
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // 设置新的当前行并立即开始播放
    setCurrent(index);
    setTimeout(() => {
      setPlaying(true);
    }, 50);
  };

  const handlePlayToggle = async () => {
    if (playing) {
      setPlaying(false);
    } else {
      setPlaying(true);
    }
  };

  const handleStop = () => {
    setPlaying(false);
    setIsPlayingAudio(false);
    setCurrentPlayingWord(null);
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleWordInfoClick = (word: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCurWord(word);
  };

  // 手动显示/隐藏特定形式
  const toggleFormVisibility = (
    verbId: number,
    form: "prasens" | "prateritum" | "perfekt"
  ) => {
    setRevealedForms((prev) => ({
      ...prev,
      [verbId]: {
        ...prev[verbId],
        [form]: !prev[verbId]?.[form],
      },
    }));
  };

  // 切换播放形式
  const togglePlayForm = (form: keyof typeof playForms) => {
    setPlayForms((prev) => ({
      ...prev,
      [form]: !prev[form],
    }));
  };

  // 渲染单元格，支持渐进显示
  const renderCell = (
    word: string,
    verbId: number,
    form: "infinitiv" | "prasens" | "prateritum" | "perfekt",
    isVisible: boolean
  ) => {
    const isCurrentPlaying = currentPlayingWord === word;
    const shouldShow = form === "infinitiv" || !progressiveDisplay || isVisible;

    return (
      <Box
        style={{
          padding: "12px 8px",
          background: isCurrentPlaying
            ? isDark
              ? "linear-gradient(135deg, rgba(79, 70, 229, 0.2) 0%, rgba(199, 210, 254, 0.1) 100%)"
              : "linear-gradient(135deg, rgba(79, 70, 229, 0.06) 0%, rgba(199, 210, 254, 0.04) 100%)"
            : "transparent",
          borderRadius: "6px",
          transition: "all 0.3s ease",
          fontWeight: isCurrentPlaying ? 500 : 400,
          fontSize: "1em",
          color: isCurrentPlaying
            ? isDark
              ? "#a5b4fc"
              : "#3730a3"
            : shouldShow
            ? isDark
              ? "#e5e7eb"
              : "inherit"
            : isDark
            ? "#4b5563"
            : "#e5e7eb",
          border: isCurrentPlaying
            ? `1px solid ${isDark ? "#4b5563" : "#e0e7ff"}`
            : "1px solid transparent",
          textAlign: "center",
          margin: "2px",
          opacity: shouldShow ? 1 : 0.5,
          position: "relative",
          minHeight: "40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        onClick={(e) => {
          if (form !== "infinitiv" && progressiveDisplay) {
            e.stopPropagation();
            toggleFormVisibility(verbId, form);
          }
        }}
      >
        {shouldShow ? (
          <Text
            span
            style={{
              fontWeight: isCurrentPlaying ? 500 : 400,
              color: isCurrentPlaying
                ? isDark
                  ? "#a5b4fc"
                  : "#3730a3"
                : isDark
                ? "#e5e7eb"
                : "inherit",
            }}
          >
            {word}
          </Text>
        ) : (
          <IconEyeOff size={16} color={isDark ? "#6b7280" : "#d1d5db"} />
        )}
        {form !== "infinitiv" && progressiveDisplay && (
          <ActionIcon
            size="xs"
            variant="subtle"
            style={{
              position: "absolute",
              top: 2,
              right: 2,
              opacity: 0.5,
              color: isDark ? "#9ca3af" : "#6b7280",
            }}
            title={isVisible ? "隐藏" : "显示"}
            onClick={(e) => {
              e.stopPropagation();
              toggleFormVisibility(verbId, form);
            }}
          >
            {isVisible ? <IconEyeOff size={12} /> : <IconEye size={12} />}
          </ActionIcon>
        )}
      </Box>
    );
  };

  return (
    <Paper
      p="md"
      shadow="sm"
      bg={isDark ? "dark.6" : "white"}
      withBorder={isDark}
    >
      <style>
        {`
          @media (max-width: 768px) {
            .verb-table {
              font-size: 14px;
            }
            .verb-table th,
            .verb-table td {
              padding: 8px 4px;
            }
            .control-group {
              flex-wrap: wrap;
              gap: 8px;
            }
          }
        `}
      </style>

      <Group gap="sm" align="center" mb="sm" className="control-group">
        <Group gap="xs" align="center">
          <ActionIcon
            color={playing ? "red" : "blue"}
            onClick={handlePlayToggle}
            size="lg"
            title={playing ? "Pause" : "Play"}
            disabled={verbs.length === 0 || isPlayingAudio}
            loading={isPlayingAudio}
            variant={playing ? "filled" : "outline"}
          >
            {playing ? (
              <IconPlayerPause size={18} />
            ) : (
              <IconPlayerPlay size={18} />
            )}
          </ActionIcon>

          <Button
            variant="outline"
            size="xs"
            onClick={handleStop}
            disabled={verbs.length === 0}
            color="red"
          >
            Stop
          </Button>
        </Group>

        {/* 设置下拉菜单 */}
        <Menu shadow="md" width={200} position="bottom-start">
          <Menu.Target>
            <ActionIcon variant="outline" size="lg" title="Settings">
              <IconSettings size={18} />
            </ActionIcon>
          </Menu.Target>

          <Menu.Dropdown>
            <Menu.Label>播放设置</Menu.Label>
            <Menu.Item closeMenuOnClick={false}>
              <Group gap="xs">
                <Text size="sm">单词间隔</Text>
                <Slider
                  min={1}
                  max={8}
                  step={0.5}
                  value={speed}
                  onChange={setSpeed}
                  style={{ width: 100 }}
                  label={(val) => `${val.toFixed(1)}s`}
                  disabled={verbs.length === 0 || isPlayingAudio}
                  color={isDark ? "blue.4" : "blue"}
                />
                <Text size="sm" style={{ minWidth: 35 }}>
                  {speed.toFixed(1)}s
                </Text>
              </Group>
            </Menu.Item>

            <Menu.Item closeMenuOnClick={false}>
              <Group gap="xs">
                <Text size="sm">行间隔</Text>
                <Slider
                  min={2}
                  max={15}
                  step={0.5}
                  value={rowDelay}
                  onChange={setRowDelay}
                  style={{ width: 100 }}
                  label={(val) => `${val.toFixed(1)}s`}
                  disabled={verbs.length === 0 || isPlayingAudio}
                  color={isDark ? "blue.4" : "blue"}
                />
                <Text size="sm" style={{ minWidth: 35 }}>
                  {rowDelay.toFixed(1)}s
                </Text>
              </Group>
            </Menu.Item>

            <Menu.Divider />

            <Menu.Label>播放内容</Menu.Label>
            <Menu.Item closeMenuOnClick={false}>
              <Checkbox
                checked={playForms.infinitiv}
                onChange={() => togglePlayForm("infinitiv")}
                label="Infinitiv"
                size="sm"
              />
            </Menu.Item>
            <Menu.Item closeMenuOnClick={false}>
              <Checkbox
                checked={playForms.prasens}
                onChange={() => togglePlayForm("prasens")}
                label="Präsens"
                size="sm"
              />
            </Menu.Item>
            <Menu.Item closeMenuOnClick={false}>
              <Checkbox
                checked={playForms.prateritum}
                onChange={() => togglePlayForm("prateritum")}
                label="Präteritum"
                size="sm"
              />
            </Menu.Item>
            <Menu.Item closeMenuOnClick={false}>
              <Checkbox
                checked={playForms.perfekt}
                onChange={() => togglePlayForm("perfekt")}
                label="Perfekt"
                size="sm"
              />
            </Menu.Item>

            <Menu.Divider />

            <Menu.Item closeMenuOnClick={false}>
              <Switch
                checked={isLoop}
                onChange={(e) => setIsLoop(e.currentTarget.checked)}
                size="sm"
                label="循环播放"
                disabled={verbs.length === 0 || isPlayingAudio}
                color={isDark ? "blue.4" : "blue"}
              />
            </Menu.Item>

            <Menu.Item closeMenuOnClick={false}>
              <Checkbox
                checked={progressiveDisplay}
                onChange={(e) => setProgressiveDisplay(e.currentTarget.checked)}
                label="渐进显示"
                size="sm"
                disabled={isPlayingAudio}
                color={isDark ? "blue.4" : "blue"}
              />
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>

        {/* 当前播放状态指示器 */}
        <Badge
          color={playing ? "green" : "gray"}
          variant={isDark ? "light" : "filled"}
        >
          {playing ? "播放中" : "已停止"}
        </Badge>

        {/* 当前播放内容指示器 */}
        <Group gap={4}>
          {playForms.infinitiv && (
            <Badge size="sm" variant="outline">
              Infinitiv
            </Badge>
          )}
          {playForms.prasens && (
            <Badge size="sm" variant="outline">
              Präsens
            </Badge>
          )}
          {playForms.prateritum && (
            <Badge size="sm" variant="outline">
              Präteritum
            </Badge>
          )}
          {playForms.perfekt && (
            <Badge size="sm" variant="outline">
              Perfekt
            </Badge>
          )}
        </Group>
      </Group>

      <Box
        ref={containerRef}
        style={{
          height,
          overflow: "auto",
          border: isDark
            ? "2px solid var(--mantine-color-dark-4)"
            : "2px solid #e9ecef",
          borderRadius: "8px",
          background: isDark ? "var(--mantine-color-dark-7)" : "white",
        }}
      >
        <Table
          verticalSpacing="md"
          className="verb-table"
          layout="fixed"
          striped={isDark}
          highlightOnHover
        >
          <thead>
            <tr>
              <th
                style={{
                  width: "25%",
                  textAlign: "center",
                  color: isDark ? "var(--mantine-color-gray-3)" : "inherit",
                }}
              >
                Infinitiv
              </th>
              <th
                style={{
                  width: "25%",
                  textAlign: "center",
                  color: isDark ? "var(--mantine-color-gray-3)" : "inherit",
                }}
              >
                Präsens
              </th>
              <th
                style={{
                  width: "25%",
                  textAlign: "center",
                  color: isDark ? "var(--mantine-color-gray-3)" : "inherit",
                }}
              >
                Präteritum
              </th>
              <th
                style={{
                  width: "25%",
                  textAlign: "center",
                  color: isDark ? "var(--mantine-color-gray-3)" : "inherit",
                }}
              >
                Perfekt
              </th>
            </tr>
          </thead>
          <tbody>
            {verbs.map((v, i) => {
              const isActive = i === current;
              const verbRevealed = revealedForms[v.id] || {
                prasens: false,
                prateritum: false,
                perfekt: false,
              };

              return (
                <tr
                  key={v.id}
                  ref={(el) => void rowRefs.current.set(i, el)}
                  onClick={() => handleRowClick(i)}
                  style={{
                    background: isActive
                      ? isDark
                        ? "linear-gradient(90deg, rgba(59, 130, 246, 0.2) 0%, transparent 100%)"
                        : "linear-gradient(90deg, rgba(219, 234, 254, 0.3) 0%, transparent 100%)"
                      : undefined,
                    transition: "all 0.3s ease",
                    cursor: "pointer",
                    color: isDark ? "var(--mantine-color-gray-3)" : "inherit",
                  }}
                >
                  <td
                    style={{
                      padding: "12px 8px",
                      textAlign: "center",
                      position: "relative",
                    }}
                  >
                    {renderCell(v.infinitiv, v.id, "infinitiv", true)}
                    <ActionIcon
                      size="sm"
                      variant="subtle"
                      onClick={(e) => handleWordInfoClick(v.infinitiv, e)}
                      style={{
                        position: "absolute",
                        top: 4,
                        right: 4,
                        opacity: 0.6,
                        color: isDark ? "#9ca3af" : "#6b7280",
                      }}
                      title="查看词义"
                    >
                      <IconInfoCircle size={14} />
                    </ActionIcon>
                  </td>
                  <td style={{ padding: "12px 8px", textAlign: "center" }}>
                    {renderCell(
                      v.prasens,
                      v.id,
                      "prasens",
                      verbRevealed.prasens
                    )}
                  </td>
                  <td style={{ padding: "12px 8px", textAlign: "center" }}>
                    {renderCell(
                      v.prateritum,
                      v.id,
                      "prateritum",
                      verbRevealed.prateritum
                    )}
                  </td>
                  <td style={{ padding: "12px 8px", textAlign: "center" }}>
                    {renderCell(
                      v.perfekt,
                      v.id,
                      "perfekt",
                      verbRevealed.perfekt
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Box>
    </Paper>
  );
}

export default function VerbScrollerWithData() {
  const { data, loading, error, refetch } = useVerbsData();
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === "dark";

  const transformedVerbs = data.map(transformVerbData);

  if (loading) {
    return (
      <Center style={{ height: 400 }}>
        <Stack align="center">
          <Loader size="lg" color={isDark ? "blue.4" : "blue"} />
          <Text c={isDark ? "gray.3" : "dark"}>Loading verbs data...</Text>
        </Stack>
      </Center>
    );
  }

  if (error) {
    return (
      <Alert color="red" title="Error" variant="filled">
        <Text>Failed to load verbs: {error}</Text>
        <Button
          leftSection={<IconRefresh size={16} />}
          onClick={refetch}
          mt="md"
          size="sm"
        >
          Retry
        </Button>
      </Alert>
    );
  }

  if (transformedVerbs.length === 0) {
    return (
      <Alert color="yellow" title="No Data" variant="filled">
        <Text>No verbs data available.</Text>
        <Button
          leftSection={<IconRefresh size={16} />}
          onClick={refetch}
          mt="md"
          size="sm"
        >
          Retry
        </Button>
      </Alert>
    );
  }

  return (
    <div>
      <Group justify="space-between" mb="md">
        <Text size="xl" fw={700} c={isDark ? "gray.1" : "dark"}>
          German Irregular Verbs
        </Text>
        <Button
          variant="outline"
          leftSection={<IconRefresh size={16} />}
          onClick={refetch}
          size="sm"
          color={isDark ? "gray" : "blue"}
        >
          Refresh
        </Button>
      </Group>

      <VerbScroller
        verbs={transformedVerbs}
        initialSpeed={4.0}
        initialRowDelay={2.0}
        height={500}
      />
    </div>
  );
}
