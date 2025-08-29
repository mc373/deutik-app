// 修改后的 GermanWordDisplay 组件，支持多语言和主题
import React, { useState, useEffect } from "react";
import {
  Card,
  Text,
  Badge,
  Group,
  Divider,
  Loader,
  Stack,
  Box,
  Button,
  Paper,
  ScrollArea,
  useMantineColorScheme,
} from "@mantine/core";
import { IconChevronDown } from "@tabler/icons-react";
import { useApp } from "../contexts/AppContext";

interface TranslationSet {
  ar?: string;
  de?: string;
  en?: string;
  tr?: string;
  zh?: string;
  [key: string]: string | undefined;
}

interface WordMeaning {
  freq: number;
  mark: string;
  explain: TranslationSet;
  examples: TranslationSet & { de: string };
  definitions: TranslationSet;
}

export interface WordEntry {
  lemma: string;
  plural: string | null;
  gender: string | null;
  phonetic: string;
  syllabledivi: string;
  cefr_level: string;
  freqclass: string;
  version: string;
  updated_at: string;
  conjugations: {
    past: string;
    perfect: string;
    third_singular: string;
  };
  meanings: WordMeaning[];
  meta: {
    lemma: string;
    cefr_level: string;
    version: string;
  };
}

interface GermanWordDisplayProps {
  word: string;
  onError?: (message: string) => void;
  onClose?: () => void;
}

const GermanWordDisplay: React.FC<GermanWordDisplayProps> = ({
  word,
  onError,
  onClose,
}) => {
  const [wordData, setWordData] = useState<WordEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [containerHeight, setContainerHeight] = useState("100vh");

  // 使用多语言context
  const { t, currentLanguage: userLanguage } = useApp();

  // 使用Mantine主题
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === "dark";

  // 监听窗口大小变化，动态计算高度
  useEffect(() => {
    const updateHeight = () => {
      const headerHeight = 60; // Header高度
      const padding = 30; // 内边距
      const calculatedHeight = `calc(100vh - ${headerHeight + 5 * padding}px)`;
      setContainerHeight(calculatedHeight);
    };

    updateHeight();
    window.addEventListener("resize", updateHeight);

    return () => window.removeEventListener("resize", updateHeight);
  }, []);

  const fetchWordData = async () => {
    if (!word) {
      setError(t("error.noWordProvided") || "No word provided");
      return;
    }

    setLoading(true);
    setError(null);
    setWordData(null);

    try {
      const response = await fetch(
        `http://app.deutik.com/words/${encodeURIComponent(word)}`,
        {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(10000),
        }
      );

      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);

      const data: WordEntry = await response.json();
      if (data.meanings) {
        data.meanings.sort((a, b) => b.freq - a.freq);
      }
      setWordData(data);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : t("error.fetchFailed") || "Failed to fetch word data";
      setError(msg);
      onError?.(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWordData();
  }, [word]);

  const getTranslation = (
    translations: TranslationSet,
    fallbackLanguage = "en"
  ) => {
    if (!translations) return "";
    return (
      translations[userLanguage] ||
      translations[fallbackLanguage] ||
      Object.values(translations)[0] ||
      ""
    );
  };

  const getEnglishTranslation = (translations: TranslationSet) => {
    if (!translations) return "";
    return translations.en || "";
  };

  const toggleExpandItem = (index: number) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedItems(newExpanded);
  };

  const renderConjugations = () => {
    if (!wordData?.conjugations) return null;

    const { third_singular, past, perfect } = wordData.conjugations;
    const conjugations = [];

    if (third_singular) conjugations.push(third_singular);
    if (past) conjugations.push(past);
    if (perfect) conjugations.push(perfect);

    if (conjugations.length === 0) return null;

    return (
      <Group gap={4} mb={4} wrap="nowrap">
        {conjugations.map((conj, index) => (
          <React.Fragment key={index}>
            <Text size="xs" c={isDark ? "gray.4" : "gray.6"}>
              {conj}
            </Text>
            {index < conjugations.length - 1 && (
              <Text size="xs" c={isDark ? "gray.5" : "gray.4"} px={2}>
                •
              </Text>
            )}
          </React.Fragment>
        ))}
      </Group>
    );
  };

  const renderWordHeader = () => {
    if (!wordData) return null;

    return (
      <Paper p="sm" bg={isDark ? "dark.6" : "white"} withBorder={isDark}>
        <Group justify="space-between" align="flex-start" gap="xs">
          <div style={{ flex: 1 }}>
            <Group gap="xs" align="center" mb={4}>
              <Text fw={700} size="lg" c={isDark ? "blue.4" : "blue.8"}>
                {wordData.lemma}
              </Text>
              {wordData.gender && (
                <Badge
                  color="pink"
                  variant={isDark ? "filled" : "light"}
                  size="xs"
                >
                  {wordData.gender}
                </Badge>
              )}
              {wordData.phonetic && (
                <Text size="xs" c={isDark ? "gray.4" : "dimmed"}>
                  {wordData.phonetic}
                </Text>
              )}
              {wordData.cefr_level && (
                <Badge
                  color="teal"
                  variant={isDark ? "filled" : "light"}
                  size="xs"
                >
                  {wordData.cefr_level}
                </Badge>
              )}
            </Group>

            {renderConjugations()}

            {wordData.syllabledivi && (
              <Text size="xs" c={isDark ? "gray.4" : "dimmed"}>
                {wordData.syllabledivi}
              </Text>
            )}
          </div>

          {onClose && (
            <Button
              variant="subtle"
              size="xs"
              onClick={onClose}
              color={isDark ? "gray" : "dark"}
            >
              {t("app.close") || "×"}
            </Button>
          )}
        </Group>
      </Paper>
    );
  };

  const renderMeanings = () => {
    if (!wordData?.meanings?.length) return null;

    return (
      <Paper p="sm" bg={isDark ? "dark.6" : "white"} withBorder={isDark}>
        <Stack gap="sm">
          {wordData.meanings.map((meaning, index) => (
            <Card
              key={index}
              withBorder
              radius="sm"
              p="sm"
              bg={isDark ? "dark.5" : "gray.0"}
            >
              <Group justify="space-between" align="flex-start" gap="xs">
                <div style={{ flex: 1 }}>
                  <Group gap="xs" align="flex-start" mb={6}>
                    <Badge
                      color="blue"
                      variant={isDark ? "filled" : "filled"}
                      size="xs"
                      style={{ flexShrink: 0 }}
                    >
                      {meaning.mark}
                    </Badge>
                    <div
                      style={{ display: "flex", flexDirection: "row", flex: 1 }}
                    >
                      <Text
                        size="sm"
                        fw={500}
                        style={{ lineHeight: 1.2 }}
                        mb={2}
                        c={isDark ? "gray.1" : "dark"}
                      >
                        {getTranslation(meaning.definitions)}
                      </Text>
                      <Text
                        size="xs"
                        c={isDark ? "blue.3" : "blue.6"}
                        style={{ marginLeft: "10px", lineHeight: 1.2 }}
                      >
                        {userLanguage === "en"
                          ? ""
                          : getEnglishTranslation(meaning.definitions)}
                      </Text>
                    </div>
                  </Group>

                  <Stack gap={4}>
                    <Text
                      size="xs"
                      c={isDark ? "gray.3" : "gray.7"}
                      style={{ lineHeight: 1.3 }}
                    >
                      {meaning.explain.de}
                    </Text>
                    <Text
                      size="xs"
                      c={isDark ? "gray.4" : "dimmed"}
                      style={{ lineHeight: 1.3 }}
                    >
                      {getTranslation(meaning.explain)}
                    </Text>
                  </Stack>
                </div>

                <Button
                  variant="subtle"
                  size="xs"
                  p={4}
                  onClick={() => toggleExpandItem(index)}
                  color={isDark ? "gray" : "dark"}
                >
                  <IconChevronDown
                    size={12}
                    color={isDark ? "gray" : "gray"}
                    style={{
                      transform: expandedItems.has(index)
                        ? "rotate(180deg)"
                        : "none",
                      transition: "transform 0.2s",
                    }}
                  />
                </Button>
              </Group>

              {expandedItems.has(index) && (
                <Box mt="sm">
                  <Divider mb="sm" color={isDark ? "dark.4" : "gray.2"} />

                  <Stack gap="xs">
                    <div>
                      <Text
                        size="xs"
                        fw={500}
                        c={isDark ? "gray.3" : "gray.7"}
                        mb={2}
                      >
                        {t("word.germanExample") || "德语例句:"}
                      </Text>
                      <Text
                        size="xs"
                        fs="italic"
                        style={{ lineHeight: 1.3 }}
                        mb={2}
                        c={isDark ? "gray.2" : "dark"}
                      >
                        {meaning.examples.de}
                      </Text>
                      <Text
                        size="xs"
                        c={isDark ? "gray.4" : "dimmed"}
                        style={{ lineHeight: 1.3 }}
                      >
                        {getTranslation(meaning.examples)}
                      </Text>
                    </div>
                  </Stack>
                </Box>
              )}
            </Card>
          ))}
        </Stack>
      </Paper>
    );
  };

  if (loading) {
    return (
      <Box
        p="md"
        bg={isDark ? "dark.6" : "white"}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100px",
        }}
      >
        <Loader size="sm" color={isDark ? "blue.4" : "blue"} />
        <Text size="sm" ml="sm" c={isDark ? "gray.3" : "dark"}>
          {t("app.loading") || "加载中..."}
        </Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box p="sm" bg={isDark ? "dark.6" : "white"}>
        {/* <Alert
          icon={<IconInfoCircle size={14} />}
          color="red"
          variant="light"
          p="sm"
        >
          <Text size="sm" c={isDark ? "dark" : "dark"}>
            {error}
          </Text>
          <Button
            leftSection={<IconRefresh size={12} />}
            onClick={fetchWordData}
            size="xs"
            mt="sm"
            color={isDark ? "gray" : "blue"}
          >
            {t("app.retry") || "重试"}
          </Button>
        </Alert> */}
      </Box>
    );
  }

  // if (!wordData) {
  //   return (
  //     <Box p="sm" bg={isDark ? "dark.6" : "white"} ta="center">
  //       <Text size="sm" c={isDark ? "gray.4" : "dimmed"}>
  //         {t("word.notFound") || "未找到单词数据"}
  //       </Text>
  //       <Button
  //         leftSection={<IconRefresh size={12} />}
  //         onClick={fetchWordData}
  //         size="xs"
  //         mt="sm"
  //         color={isDark ? "gray" : "blue"}
  //       >
  //         {t("app.retry") || "重试"}
  //       </Button>
  //     </Box>
  //   );
  // }

  return (
    <ScrollArea
      h={containerHeight}
      offsetScrollbars
      styles={{
        scrollbar: {
          "&:hover": {
            backgroundColor: isDark
              ? "var(--mantine-color-dark-4)"
              : "var(--mantine-color-gray-2)",
          },
        },
      }}
    >
      <Box
        p="sm"
        bg={isDark ? "dark.7" : "white"}
        style={{ minHeight: "100%" }}
      >
        <Stack gap="sm">
          {renderWordHeader()}
          {renderMeanings()}
        </Stack>
      </Box>
    </ScrollArea>
  );
};

export default GermanWordDisplay;
