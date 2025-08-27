import {
  Card,
  Group,
  Badge,
  Text,
  Divider,
  Stack,
  Accordion,
  Table,
  Title,
  ActionIcon,
} from "@mantine/core";
import { useState } from "react";
import {
  Info,
  Languages,
  BookOpen,
  Lightbulb,
  LanguagesIcon,
  Globe,
} from "lucide-react";

export interface WordData {
  word: string;
  pos: string | null;
  plural: string | null;
  gender: "m" | "f" | "n" | null;
  phonetic: string;
  syllabledivi: string;
  conjugations: {
    third_singular: string | null;
    past: string | null;
    perfect: string | null;
  } | null;
  stats: {
    frequency_rank: number;
    importance: "low" | "medium" | "high";
    CEFR_level: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  };
  meanings: {
    meaning_lang: {
      zh: string;
      en: string;
      de: string;
    };
    example_lang: {
      phrase: string;
      translation: {
        zh: string;
        en: string;
      };
    }[];
  }[];
  association_lang: {
    zh: string;
    en: string;
    de: string;
  };
  common_phrases: {
    phrase: string;
    translation: {
      zh: string;
      en: string;
    };
  }[];
  synonyms: {
    word: string;
    similarity: number;
  }[];
  antonyms: {
    word: string;
    similarity: number;
  }[];
  cultural_usage_tip: {
    content: string;
    translation: {
      zh: string;
      en: string;
    };
  };
}

interface WordCardProps {
  wordData: WordData;
}

const WordCard = ({ wordData }: WordCardProps) => {
  const [activeLang, setActiveLang] = useState<"zh" | "en">("zh");

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder w="100%" maw={600}>
      <Group justify="space-between" mb="xs">
        <Group gap="xs">
          <Title order={2}>{wordData.word}</Title>
          <Badge color="blue" variant="light">
            {wordData.pos ? wordData.pos.toUpperCase() : ""}
          </Badge>
          {wordData.gender && (
            <Badge color="pink" variant="light">
              {wordData.gender === "m"
                ? "阳性"
                : wordData.gender === "f"
                ? "阴性"
                : "中性"}
            </Badge>
          )}
        </Group>
        <Group gap="xs">
          <Badge color="teal" variant="filled">
            CEFR: {wordData.stats.CEFR_level}
          </Badge>
          <ActionIcon
            variant="subtle"
            color={activeLang === "zh" ? "blue" : "gray"}
            onClick={() => setActiveLang("zh")}
            title="中文"
          >
            <LanguagesIcon size={18} />
          </ActionIcon>
          <ActionIcon
            variant="subtle"
            color={activeLang === "en" ? "blue" : "gray"}
            onClick={() => setActiveLang("en")}
            title="English"
          >
            <Globe size={18} />
          </ActionIcon>
        </Group>
      </Group>

      <Group gap="xs" mb="md">
        <Text c="dimmed">{wordData.phonetic}</Text>
        <Text c="dimmed">•</Text>
        <Text c="dimmed">{wordData.syllabledivi}</Text>
      </Group>

      <Divider my="sm" />

      <Stack gap="sm" mb="md">
        <Group gap="xs">
          <Languages size={18} />
          <Text fw={500}>核心释义</Text>
        </Group>

        {wordData.meanings.map((meaning, index) => (
          <div key={index}>
            <Text size="sm" mb="xs">
              <Text span fw={500}>
                中文:
              </Text>{" "}
              {meaning.meaning_lang.zh}
            </Text>
            <Text size="sm" mb="xs">
              <Text span fw={500}>
                {meaning.example_lang[0].phrase}
              </Text>
              <Text span fw={500}>
                {meaning.example_lang[0].translation.zh}
              </Text>
            </Text>
            {index < wordData.meanings.length - 1 && <Divider my="xs" />}
          </div>
        ))}
      </Stack>

      <Accordion variant="contained" mb="md">
        <Accordion.Item value="memory">
          <Accordion.Control icon={<Lightbulb size={18} />}>
            助记技巧
          </Accordion.Control>
          <Accordion.Panel>
            <Text size="sm">{wordData.association_lang.de}</Text>
            <Text size="sm">{wordData.association_lang.zh}</Text>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>

      <Accordion variant="contained" mb="md">
        <Accordion.Item value="phrases">
          <Accordion.Control icon={<BookOpen size={18} />}>
            常用短语
          </Accordion.Control>
          <Accordion.Panel>
            <Table>
              <Table.Tbody>
                {wordData.common_phrases.map((phrase, index) => (
                  <Table.Tr key={index}>
                    <Table.Td width="40%">{phrase.phrase}</Table.Td>
                    <Table.Td>{phrase.translation.zh}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="more-info">
          <Accordion.Control icon={<Info size={18} />}>
            更多信息
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="sm">
              <div>
                <Text fw={500} size="sm">
                  同义词:
                </Text>
                <Group gap="xs">
                  {wordData.synonyms.map((syn, i) => (
                    <Badge key={i} variant="outline">
                      {syn.word}
                    </Badge>
                  ))}
                </Group>
              </div>

              <div>
                <Text fw={500} size="sm">
                  反义词:
                </Text>
                <Group gap="xs">
                  {wordData.antonyms.map((ant, i) => (
                    <Badge key={i} variant="outline">
                      {ant.word}
                    </Badge>
                  ))}
                </Group>
              </div>

              <div>
                <Text fw={500} size="sm">
                  文化提示:
                </Text>
                <Text size="sm">{wordData.cultural_usage_tip.content}</Text>
                <Text size="sm">
                  {wordData.cultural_usage_tip.translation.zh}
                </Text>
              </div>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </Card>
  );
};

export default function MainCard(wordData: WordData) {
  return <WordCard wordData={wordData} />;
}
