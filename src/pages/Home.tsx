import {
  AppShell,
  Group,
  Button,
  ActionIcon,
  Box,
  useMantineColorScheme,
} from "@mantine/core";
import { UserButton, useClerk } from "@clerk/clerk-react";
import { useMemo } from "react";
import { IconSun, IconMoon, IconSearch } from "@tabler/icons-react";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { GridMenu } from "../components/GridMenu";
import Searching from "./Searching";
import Learning from "./Learning";
import Unregelverb from "./Unregelverb";
import Vocabulary from "./Vocabulary";
import { useMediaQuery } from "@mantine/hooks";
import { Routes, Route, Navigate } from "react-router-dom";
import Pronunciation from "./Pronunciation";
import { useApp } from "../contexts/AppContext";
import React from "react";

export default function Home() {
  const { user } = useClerk();
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const { t, modal } = useApp();

  const MemoizedGridMenu = React.memo(GridMenu);
  const MemoizedLearning = React.memo(Learning);
  const MemoizedUnregelverb = React.memo(Unregelverb);
  const MemoizedVocabulary = React.memo(Vocabulary);
  const MemoizedPronunciation = React.memo(Pronunciation); // 空依赖数组，确保只创建一次
  const isMobile = useMediaQuery("(max-width: 768px)", false);
  // 使用 useMemo 记忆化整个路由部分
  return (
    <AppShell
      header={{ height: 60 }}
      aside={{
        width: 300,
        breakpoint: "sm",
        collapsed: { mobile: !modal.opened, desktop: false },
      }}
      padding="md"
    >
      <AppShell.Header
        p="md"
        bg={colorScheme === "dark" ? "dark.7" : "white"}
        style={{
          borderBottom:
            colorScheme === "dark"
              ? "1px solid var(--mantine-color-dark-4)"
              : "1px solid var(--mantine-color-gray-2)",
        }}
      >
        <Group justify="space-between" h="100%">
          <Group>
            <img
              src={
                colorScheme === "dark"
                  ? "/assets/deutik_img_light.png"
                  : "/assets/deutik_img.png"
              }
              alt="Deutik Logo"
              style={{
                width: "80px",
                height: "20px",
              }}
            />
            {isMobile && (
              <ActionIcon
                variant="subtle"
                size="lg"
                onClick={modal.toggle}
                aria-label="查询单词"
                c={colorScheme === "dark" ? "gray.2" : "dark.7"}
              >
                <IconSearch size={20} />
              </ActionIcon>
            )}

            {/* <Group gap="sm" visibleFrom="sm">
              <Button
                variant="subtle"
                size="sm"
                component="a"
                href="/"
                c={colorScheme === "dark" ? "gray.2" : "dark.7"}
              >
                {t("app.home")}
              </Button>
            </Group> */}
          </Group>

          <Group gap="sm">
            <ActionIcon
              variant="subtle"
              size="lg"
              onClick={toggleColorScheme}
              aria-label="切换主题"
              c={colorScheme === "dark" ? "gray.2" : "dark.7"}
            >
              {colorScheme === "dark" ? (
                <IconSun size={20} />
              ) : (
                <IconMoon size={20} />
              )}
            </ActionIcon>

            <LanguageSwitcher />

            {user ? (
              <UserButton />
            ) : (
              <Button
                variant="filled"
                size="sm"
                onClick={() => {
                  /* 触发登录 */
                }}
              >
                {t("app.login")}
              </Button>
            )}
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Main bg={colorScheme === "dark" ? "dark.8" : "gray.0"}>
        <Box
          p="xl"
          bg={colorScheme === "dark" ? "dark.6" : "white"}
          style={{
            borderRadius: "var(--mantine-radius-lg)",
            minHeight: "100%",
          }}
        >
          <Routes>
            {useMemo(
              () => (
                <>
                  <Route path="/" element={<MemoizedGridMenu />} />
                  <Route path="/learn" element={<MemoizedLearning />} />
                  <Route
                    path="/unregelverb"
                    element={<MemoizedUnregelverb />}
                  />
                  <Route path="/vocabulary" element={<MemoizedVocabulary />} />
                  <Route
                    path="/pronunciation"
                    element={<MemoizedPronunciation />}
                  />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </>
              ),
              []
            )}
          </Routes>
        </Box>
      </AppShell.Main>

      <AppShell.Aside
        p="md"
        bg={colorScheme === "dark" ? "dark.7" : "white"}
        style={{
          borderLeft:
            colorScheme === "dark"
              ? "1px solid var(--mantine-color-dark-4)"
              : "1px solid var(--mantine-color-gray-2)",
        }}
      >
        <Box
          style={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Searching />
        </Box>
      </AppShell.Aside>
    </AppShell>
  );
}
