import {
  Modal,
  TextInput,
  Select,
  Button,
  Group,
  Stack,
  Textarea,
  MultiSelect,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { WordLearn } from "../locales/types";

const AddWordForm = ({
  opened,
  onClose,
  onSubmit,
}: {
  opened: boolean;
  onClose: () => void;
  onSubmit: (word: WordLearn) => void;
}) => {
  const form = useForm({
    initialValues: {
      germanWord: "",
      translation: "",
      partOfSpeech: "",
      gender: "",
      examples: "",
      tags: [],
    },

    validate: {
      germanWord: (value) =>
        value.trim().length < 1 ? "请输入德语单词" : null,
      translation: (value) =>
        value.trim().length < 1 ? "请输入中文翻译" : null,
    },
  });

  const handleSubmit = (values: typeof form.values) => {
    const newWord: WordLearn = {
      id: Date.now().toString(),
      germanWord: values.germanWord.trim(),
      translation: values.translation.trim(),
      firstLearnedDate: new Date(),
      lastReviewedDate: new Date(),
      nextReviewDate: new Date(Date.now() + 1000 * 60 * 60 * 24), // 默认1天后复习
      errorCount: 0,
      consecutiveCorrect: 0,
      familiarity: 0,
      isKnown: false,
      examples: values.examples.split("\n").filter((e) => e.trim()),
      partOfSpeech: values.partOfSpeech,
      gender: values.gender || undefined,
      tags: values.tags,
    };

    onSubmit(newWord);
    form.reset();
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="添加新单词"
      size="lg"
      radius="md"
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="sm">
          <TextInput
            label="德语单词"
            placeholder="输入德语单词"
            withAsterisk
            {...form.getInputProps("germanWord")}
          />

          <TextInput
            label="中文翻译"
            placeholder="输入中文意思"
            withAsterisk
            {...form.getInputProps("translation")}
          />

          <Group grow>
            <Select
              label="词性"
              placeholder="选择词性"
              data={[
                { value: "noun", label: "名词" },
                { value: "verb", label: "动词" },
                { value: "adjective", label: "形容词" },
                { value: "adverb", label: "副词" },
                { value: "preposition", label: "介词" },
                { value: "conjunction", label: "连词" },
              ]}
              {...form.getInputProps("partOfSpeech")}
            />

            {form.values.partOfSpeech === "noun" && (
              <Select
                label="词性(名词)"
                placeholder="选择性别"
                data={[
                  { value: "der", label: "der (阳性)" },
                  { value: "die", label: "die (阴性)" },
                  { value: "das", label: "das (中性)" },
                ]}
                {...form.getInputProps("gender")}
              />
            )}
          </Group>

          <Textarea
            label="例句 (每行一句)"
            placeholder="输入例句，每行一个例句"
            autosize
            minRows={2}
            {...form.getInputProps("examples")}
          />

          <MultiSelect
            label="标签"
            placeholder="选择标签"
            data={[
              "A1",
              "A2",
              "B1",
              "B2",
              "C1",
              "日常用语",
              "商务德语",
              "旅行用语",
              "动词变位",
              "形容词变化",
            ]}
            {...form.getInputProps("tags")}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={onClose}>
              取消
            </Button>
            <Button type="submit" color="blue">
              添加单词
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
};

export default AddWordForm;
