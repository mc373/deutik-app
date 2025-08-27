import GermanWordLearning from "../components/GermanWordLearning";
import AddWordForm from "../components/AddWordForm";
import { useState } from "react";
import { Box, Button, Group, Title } from "@mantine/core";

export default function Learning() {
  const [formOpened, setFormOpened] = useState(false);

  return (
    <Box p="md">
      <Group justify="space-between" mb="xl">
        <Title order={2}>德语单词学习</Title>
        <Button onClick={() => setFormOpened(true)}>添加新单词</Button>
      </Group>

      <GermanWordLearning />
      <AddWordForm
        opened={formOpened}
        onClose={() => setFormOpened(false)}
        onSubmit={(word) => {
          // 这里可以添加保存单词的逻辑
          console.log("新单词:", word);
          setFormOpened(false);
        }}
      />
    </Box>
  );
}
