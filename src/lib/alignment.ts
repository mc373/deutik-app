// 基于动态规划的文本对齐算法
export interface AlignmentResult {
  reference: string;
  hypothesis: string;
  status: "correct" | "incorrect" | "missing" | "extra";
}

export const alignText = (
  reference: string,
  hypothesis: string
): AlignmentResult[] => {
  // 文本预处理
  const clean = (str: string) =>
    str
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .split(/\s+/);

  const refWords = clean(reference);
  const hypWords = clean(hypothesis);

  // 初始化DP矩阵
  const dp: number[][] = Array.from({ length: refWords.length + 1 }, () =>
    Array(hypWords.length + 1).fill(0)
  );

  // 填充DP矩阵
  for (let i = 1; i <= refWords.length; i++) {
    for (let j = 1; j <= hypWords.length; j++) {
      const cost = refWords[i - 1] === hypWords[j - 1] ? 1 : 0;
      dp[i][j] = Math.max(dp[i - 1][j - 1] + cost, dp[i - 1][j], dp[i][j - 1]);
    }
  }

  // 回溯对齐路径
  let i = refWords.length;
  let j = hypWords.length;
  const alignment: AlignmentResult[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) {
      alignment.unshift({
        reference: refWords[i - 1],
        hypothesis: hypWords[j - 1],
        status: refWords[i - 1] === hypWords[j - 1] ? "correct" : "incorrect",
      });
      i--;
      j--;
    } else if (i > 0 && dp[i][j] === dp[i - 1][j]) {
      alignment.unshift({
        reference: refWords[i - 1],
        hypothesis: "",
        status: "missing",
      });
      i--;
    } else {
      alignment.unshift({
        reference: "",
        hypothesis: hypWords[j - 1],
        status: "extra",
      });
      j--;
    }
  }

  return alignment;
};

// 计算发音准确率
export const calculateAccuracy = (alignment: AlignmentResult[]): number => {
  const correct = alignment.filter((a) => a.status === "correct").length;
  const total = alignment.filter((a) => a.status !== "extra").length;
  return total > 0 ? Math.round((correct / total) * 100) : 0;
};
