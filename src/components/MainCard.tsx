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
} from "@mantine/core";
import IconInfoCircle from "@tabler/icons-react/dist/esm/icons/IconInfoCircle";
import IconLanguage from "@tabler/icons-react/dist/esm/icons/IconLanguage";
import IconBook from "@tabler/icons-react/dist/esm/icons/IconBook";
import IconBulb from "@tabler/icons-react/dist/esm/icons/IconBulb";

export interface WordData {
  word: string;
  pos: string | null;
  plural: string | null; // 可选复数形式
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
      prhase: string;
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
  wordData: WordData; // 使用您的 JSON 数据结构类型
}

const WordCard = ({ wordData }: WordCardProps) => {
  console.log("WordCard rendered with data:", wordData);
  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder w="100%" maw={600}>
      {/* 顶部基础信息 */}
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
          <Badge color="teal" variant="light">
            CEFR: {wordData.stats.CEFR_level}
          </Badge>
          <Badge color="gray" variant="light">
            词频: {wordData.stats.frequency_rank}
          </Badge>
        </Group>
      </Group>

      <Group gap="xs" mb="md">
        <Text c="dimmed">{wordData.phonetic}</Text>
        <Text c="dimmed">•</Text>
        <Text c="dimmed">{wordData.syllabledivi}</Text>
      </Group>

      <Divider my="sm" />

      {/* 核心解释 */}
      <Stack gap="sm" mb="md">
        <Group gap="xs">
          <IconLanguage size={18} />
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
                例句:
              </Text>{" "}
              {meaning.example_lang[0].translation.zh}
            </Text>
            {index < wordData.meanings.length - 1 && <Divider my="xs" />}
          </div>
        ))}
      </Stack>

      {/* 助记信息 */}
      <Accordion variant="contained" mb="md">
        <Accordion.Item value="memory">
          <Accordion.Control icon={<IconBulb size={18} />}>
            助记技巧
          </Accordion.Control>
          <Accordion.Panel>
            <Text size="sm">{wordData.association_lang.zh}</Text>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>

      {/* 扩展信息 */}
      <Accordion variant="contained" mb="md">
        <Accordion.Item value="phrases">
          <Accordion.Control icon={<IconBook size={18} />}>
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
          <Accordion.Control icon={<IconInfoCircle size={18} />}>
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

// 使用示例

export default function MainCard(wordData: WordData) {
  return (
    <WordCard
      wordData={wordData} // 替换为实际的JSON数据
    />
    // <div>aaa</div>
  );
}
