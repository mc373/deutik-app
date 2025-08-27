import {
  AppShell,
  Group,
  Button,
  ActionIcon,
  Box,
  Text,
  useMantineColorScheme,
} from "@mantine/core";
import { UserButton, useClerk } from "@clerk/clerk-react";
import { useEffect } from "react";
import { IconSun, IconMoon, IconSearch } from "@tabler/icons-react";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { initializeDB } from "../utils/db";

import { GridMenu } from "../components/GridMenu";
import Searching from "./Searching";
import Learning from "./Learning";
import Unregelverb from "./Unregelverb";
import Vocabulary from "./Vocabulary";

import { Routes, Route, Navigate } from "react-router-dom";
import Pronunciation from "./Pronunciation";
import { useApp } from "../contexts/AppContext";

export default function Home() {
  const { user } = useClerk();
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const { t } = useApp();
  useEffect(() => {
    initializeDB();
  }, []);

  return (
    <AppShell
      header={{ height: 60 }}
      aside={{
        width: { base: 300, lg: 380 },
        breakpoint: "md",
        collapsed: { mobile: true },
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

            <Group gap="sm" visibleFrom="sm">
              <Button
                variant="subtle"
                size="sm"
                component="a"
                href="/"
                c={colorScheme === "dark" ? "gray.2" : "dark.7"}
              >
                {t("app.home")}
              </Button>
            </Group>
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
            <Route path="/" element={<GridMenu />} />
            <Route path="/learn" element={<Learning />} />
            <Route path="/unregelverb" element={<Unregelverb />} />
            <Route path="/vocabulary" element={<Vocabulary />} />
            <Route path="/pronunciation" element={<Pronunciation />} />
            <Route path="*" element={<Navigate to="/" replace />} />
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
          <Group mb="md" gap="xs">
            <IconSearch size={18} />
            <Text size="sm" fw={500}>
              {t("app.wordserach")}
            </Text>
          </Group>
          <Searching />
        </Box>
      </AppShell.Aside>
    </AppShell>
  );
}
