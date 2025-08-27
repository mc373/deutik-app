import { useState } from "react";
import {
  Card,
  Text,
  Button,
  Group,
  Progress,
  SegmentedControl,
  Box,
  TextInput,
  Badge,
  Stack,
  Title,
  Alert,
} from "@mantine/core";
import { useLocalStorage } from "@mantine/hooks";
import { QuizType, WordLearn } from "../locales/types";

const GermanWordLearning = () => {
  const [words, setWords] = useLocalStorage<WordLearn[]>({
    key: "german-words",
    defaultValue: [],
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [quizType, setQuizType] = useState<QuizType>("translation");
  const [userAnswer, setUserAnswer] = useState("");
  const [feedback, setFeedback] = useState<{
    correct: boolean;
    message: string;
  } | null>(null);
  const [showTranslation, setShowTranslation] = useState(false);
  const [isReviewMode, setIsReviewMode] = useState(false);

  // 获取当前需要复习的单词
  const wordsToReview = words.filter(
    (word) => new Date(word.nextReviewDate) <= new Date() || word.errorCount > 0
  );

  const currentWord = isReviewMode
    ? wordsToReview[currentIndex % Math.max(1, wordsToReview.length)]
    : words[currentIndex % Math.max(1, words.length)];

  // 检查答案
  const checkAnswer = () => {
    if (!currentWord) return;

    let isCorrect = false;
    let message = "";

    switch (quizType) {
      case "translation":
        isCorrect =
          userAnswer.trim().toLowerCase() ===
          currentWord.translation.toLowerCase();
        message = isCorrect
          ? "正确!"
          : `错误，正确翻译是: ${currentWord.translation}`;
        break;
      case "spelling":
        isCorrect =
          userAnswer.trim().toLowerCase() ===
          currentWord.germanWord.toLowerCase();
        message = isCorrect
          ? "拼写正确!"
          : `拼写错误，正确是: ${currentWord.germanWord}`;
        break;
      // 其他题型处理...
    }

    setFeedback({ correct: isCorrect, message });

    // 更新单词记录
    const updatedWords = [...words];
    const wordIndex = updatedWords.findIndex((w) => w.id === currentWord.id);

    if (wordIndex >= 0) {
      updatedWords[wordIndex] = {
        ...updatedWords[wordIndex],
        lastReviewedDate: new Date(),
        errorCount: isCorrect
          ? updatedWords[wordIndex].errorCount
          : updatedWords[wordIndex].errorCount + 1,
        consecutiveCorrect: isCorrect
          ? updatedWords[wordIndex].consecutiveCorrect + 1
          : 0,
        familiarity: Math.min(
          100,
          isCorrect
            ? updatedWords[wordIndex].familiarity + 10
            : Math.max(0, updatedWords[wordIndex].familiarity - 15)
        ),
        isKnown:
          updatedWords[wordIndex].consecutiveCorrect >= 3 ||
          updatedWords[wordIndex].familiarity >= 80,
        nextReviewDate: calculateNextReviewDate(
          updatedWords[wordIndex].familiarity,
          updatedWords[wordIndex].consecutiveCorrect
        ),
      };

      setWords(updatedWords);
    }
  };

  const calculateNextReviewDate = (
    familiarity: number,
    consecutiveCorrect: number
  ): Date => {
    const now = new Date();
    const days = Math.floor((familiarity / 20) * (consecutiveCorrect + 1));
    now.setDate(now.getDate() + days);
    return now;
  };

  const nextWord = () => {
    setUserAnswer("");
    setFeedback(null);
    setShowTranslation(false);
    setCurrentIndex((prev) => prev + 1);
  };

  // const markAsKnown = () => {
  //   if (!currentWord) return;

  //   const updatedWords = words.map((word) =>
  //     word.id === currentWord.id
  //       ? {
  //           ...word,
  //           isKnown: true,
  //           familiarity: 100,
  //           nextReviewDate: calculateNextReviewDate(
  //             100,
  //             word.consecutiveCorrect
  //           ),
  //         }
  //       : word
  //   );

  //   setWords(updatedWords);
  //   nextWord();
  // };

  return (
    <Box p="md" maw={600} mx="auto">
      <Title order={2} mb="lg">
        {isReviewMode ? "复习模式" : "学习新单词"}
      </Title>

      <SegmentedControl
        value={quizType}
        onChange={(value) => setQuizType(value as QuizType)}
        data={[
          { label: "翻译", value: "translation" },
          { label: "拼写", value: "spelling" },
          { label: "听力", value: "listening" },
          { label: "填空", value: "fillBlank" },
        ]}
        fullWidth
        mb="md"
      />

      {wordsToReview.length > 0 && (
        <Button
          onClick={() => setIsReviewMode(!isReviewMode)}
          variant="light"
          mb="md"
        >
          {isReviewMode ? "返回学习" : `开始复习 (${wordsToReview.length})`}
        </Button>
      )}

      {currentWord ? (
        <Card withBorder shadow="sm" p="lg" radius="md">
          <Stack gap="md">
            <Group justify="space-between">
              <Text size="lg" fw={500}>
                {quizType === "translation" ? currentWord.germanWord : "..."}
              </Text>
              <Group gap="sm">
                {currentWord.partOfSpeech && (
                  <Badge color="blue" variant="light">
                    {currentWord.partOfSpeech}
                  </Badge>
                )}
                {currentWord.gender && (
                  <Badge color="pink" variant="light">
                    {currentWord.gender}
                  </Badge>
                )}
              </Group>
            </Group>

            <Progress.Root size="lg" mb="sm">
              <Progress.Section
                value={currentWord.familiarity}
                color={
                  currentWord.familiarity >= 80
                    ? "green"
                    : currentWord.familiarity >= 50
                    ? "blue"
                    : "orange"
                }
              >
                <Progress.Label>{`${currentWord.familiarity}%`}</Progress.Label>
              </Progress.Section>
            </Progress.Root>

            {quizType === "translation" && (
              <>
                <TextInput
                  placeholder="输入中文意思"
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  disabled={!!feedback}
                />
                {feedback && (
                  <Alert
                    variant="light"
                    color={feedback.correct ? "green" : "red"}
                    title={feedback.correct ? "正确" : "错误"}
                  >
                    {feedback.message}
                  </Alert>
                )}
              </>
            )}

            {quizType === "spelling" && (
              <>
                <Text>{currentWord.translation}</Text>
                <TextInput
                  placeholder="拼写德语单词"
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  disabled={!!feedback}
                />
                {feedback && (
                  <Alert
                    variant="light"
                    color={feedback.correct ? "green" : "red"}
                    title={feedback.correct ? "正确" : "错误"}
                  >
                    {feedback.message}
                  </Alert>
                )}
              </>
            )}

            <Group justify="space-between">
              <Button
                onClick={feedback ? nextWord : checkAnswer}
                color={feedback ? "blue" : "green"}
              >
                {feedback ? "下一个" : "检查"}
              </Button>

              {!feedback && (
                <Button
                  variant="outline"
                  onClick={() => setShowTranslation(!showTranslation)}
                >
                  {showTranslation ? "隐藏翻译" : "显示翻译"}
                </Button>
              )}
            </Group>

            {showTranslation && quizType === "translation" && (
              <Text c="dimmed">{currentWord.translation}</Text>
            )}

            {currentWord.examples.length > 0 && (
              <Box mt="md">
                <Text size="sm" fw={500}>
                  例句:
                </Text>
                {currentWord.examples.map((example, i) => (
                  <Text key={i} size="sm" c="dimmed">
                    - {example}
                  </Text>
                ))}
              </Box>
            )}
          </Stack>
        </Card>
      ) : (
        <Alert variant="light" color="blue" title="提示">
          没有单词可学习，请添加新单词
        </Alert>
      )}
    </Box>
  );
};

export default GermanWordLearning;
