// 定义后处理选项接口
export interface ProcessingOptions {
  removeHyphens: boolean;
  smartParagraphDetection: boolean;
  mergeAdjacentRegions: boolean;
}

// 定义整个管道的配置上下文（可选，用于未来扩展）
export interface ProcessorConfig {
  options: ProcessingOptions;
  language: "de"; // 目前主要支持德语，可扩展
}
