import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import { ClerkProvider } from "@clerk/clerk-react";
import { AppProvider } from "./contexts/AppContext";
import { IntlProvider } from "react-intl";
import messages_en from "./locales/en.json";
import messages_de from "./locales/de.json";
import messages_ar from "./locales/ar.json";
import messages_tr from "./locales/tr.json";
import messages_zh from "./locales/zh.json";

// 定义消息类型
type Messages = Record<string, Record<string, string>>; // 每种语言的消息都是一个字符串键值对

// 支持的语言
const supportedLanguages = ["en", "de", "ar", "tr", "zh"] as const;
type Language = (typeof supportedLanguages)[number]; // 获取支持的语言类型

// 消息对象
const messages: Messages = {
  en: messages_en,
  de: messages_de,
  ar: messages_ar,
  tr: messages_tr,
  zh: messages_zh,
};

// 获取浏览器语言
const language: Language =
  (navigator.language.split(/[-_]/)[0] as Language) || "en"; // 默认语言为英语

// 获取 Clerk 的 publishable key
const clerk_key = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!clerk_key) {
  throw new Error(
    "VITE_CLERK_PUBLISHABLE_KEY is not defined. Please set it in your .env file."
  );
}

// 渲染应用
ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <IntlProvider locale={language} messages={messages[language]}>
    <ClerkProvider publishableKey={clerk_key} afterSignOutUrl="/">
      <AppProvider>
        <App />
      </AppProvider>
    </ClerkProvider>
  </IntlProvider>
);
