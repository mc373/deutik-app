import React, { useState, useEffect } from "react";
import {
  Card,
  Title,
  Text,
  Badge,
  Group,
  Divider,
  Loader,
  Alert,
  Stack,
  List,
  ThemeIcon,
  Box,
} from "@mantine/core";
import { IconInfoCircle, IconCheck } from "@tabler/icons-react";
import { WordEntry, TranslationSet, CommonPhrase } from "./types";

interface GermanWordDisplayProps {
  word: string;
  userLanguage: string; // 'en', 'zh', 'de', ...
  onError?: (message: string) => void;
}

const GermanWordDisplay: React.FC<GermanWordDisplayProps> = ({
  word,
  userLanguage = "en",
  onError,
}) => {
  const [wordData, setWordData] = useState<WordEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWordData = async () => {
      if (!word) return;
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `http://app.deutik.com/lemma/${encodeURIComponent(word)}`
        );
        if (!response.ok) throw new Error(`Word not found: ${word}`);
        const data: WordEntry = await response.json();
        setWordData(data);
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Failed to fetch word data";
        setError(msg);
        onError?.(msg);
        setWordData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchWordData();
  }, [word, onError]);

  const getTranslation = (translations: TranslationSet | CommonPhrase) =>
    translations[userLanguage] || translations.en || translations.de || "";

  const renderMeanings = () =>
    wordData?.meanings?.length ? (
      <Stack gap="md">
        <Title order={3}>Meanings</Title>
        {wordData.meanings.map((m, i) => (
          <Card
            key={i}
            shadow="sm"
            padding="lg"
            radius="md"
            withBorder
            style={(theme) => ({
              borderColor: theme.colors.gray[3],
              transition: "transform 0.2s",
              "&:hover": {
                transform: "scale(1.02)",
              },
            })}
          >
            <Text fw={600} c="blue.7" size="sm">
              Focus: {getTranslation(m.focus)}
            </Text>
            <Text mt="xs">
              <strong>Definition:</strong> {getTranslation(m.definitions)}
            </Text>
            {m.examples?.de && (
              <>
                <Divider my="sm" />
                <Text c="dimmed" size="sm">
                  <em>{m.examples.de}</em>
                </Text>
              </>
            )}
            {m.examples && getTranslation(m.examples) && (
              <Text mt="xs" size="sm">
                {getTranslation(m.examples)}
              </Text>
            )}
            {m.score && (
              <Badge color="teal" mt="sm" variant="light">
                Score: {m.score}
              </Badge>
            )}
          </Card>
        ))}
      </Stack>
    ) : null;

  const renderCommonPhrases = () =>
    wordData?.common_phrases?.length ? (
      <Stack gap="sm" mt="lg">
        <Title order={3}>Common Phrases</Title>
        <List
          spacing="sm"
          icon={
            <ThemeIcon color="blue" size={22} radius="xl">
              <IconCheck size={16} />
            </ThemeIcon>
          }
        >
          {wordData.common_phrases.map((p, i) => (
            <List.Item key={i}>
              <Text fw={500} size="sm">
                {p.de}
              </Text>
              <Text c="dimmed" size="xs">
                {getTranslation(p)}
              </Text>
            </List.Item>
          ))}
        </List>
      </Stack>
    ) : null;

  const renderCulturalUsage = () =>
    wordData?.cultural_usage ? (
      <Stack gap="sm" mt="lg">
        <Title order={3}>Cultural Usage</Title>
        <Text size="sm">{getTranslation(wordData.cultural_usage)}</Text>
      </Stack>
    ) : null;

  const renderWordInfo = () =>
    wordData && (
      <Card
        shadow="md"
        padding="lg"
        radius="md"
        withBorder
        style={(theme) => ({
          borderColor: theme.colors.gray[3],
          backgroundColor: "white",
        })}
      >
        <Group align="apart" justify="flex-start" gap="sm">
          <Title order={2} size="h4" lineClamp={1}>
            {wordData.word}
          </Title>
          {wordData.category && (
            <Badge color="pink" variant="filled" size="lg">
              {wordData.category}
            </Badge>
          )}
        </Group>
        {wordData.pronunciation && (
          <Text c="dimmed" mt="xs" size="sm">
            Pronunciation: {wordData.pronunciation}
          </Text>
        )}
        {wordData.frequency && (
          <Text c="dimmed" size="sm">
            Frequency: {wordData.frequency}/100
          </Text>
        )}
      </Card>
    );

  if (loading)
    return (
      <Group align="center" mt="xl">
        <Loader size="lg" />
      </Group>
    );

  if (error)
    return (
      <Alert
        icon={<IconInfoCircle size={16} />}
        title="Error"
        color="red"
        mt="md"
      >
        {error}
      </Alert>
    );

  if (!wordData)
    return (
      <Text ta="center" c="dimmed" mt="md">
        No word data available
      </Text>
    );

  return (
    <Box
      style={(theme) => ({
        maxWidth: 800,
        margin: "0 auto",
        padding: theme.spacing.md,
      })}
    >
      <Stack gap="lg">
        {renderWordInfo()}
        {renderMeanings()}
        {renderCommonPhrases()}
        {renderCulturalUsage()}
      </Stack>
    </Box>
  );
};

export default GermanWordDisplay;
