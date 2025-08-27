import {
  NavLink,
  ScrollArea,
  Group,
  Text,
  ThemeIcon,
  Divider,
  Box,
} from "@mantine/core";
import {
  Home,
  BookOpen,
  BookMarked,
  Activity,
  Settings,
  LogIn,
  UserPlus,
} from "lucide-react";
import { Link } from "react-router-dom";

interface AppNavbarProps {
  currentPath: string;
}

function AppNavbar({ currentPath }: AppNavbarProps) {
  const mainLinks = [
    { icon: <Home size="1rem" />, label: "首页", to: "/" },
    { icon: <BookOpen size="1rem" />, label: "学习", to: "/learn" },
    { icon: <BookMarked size="1rem" />, label: "单词本", to: "/vocabulary" },
    { icon: <Activity size="1rem" />, label: "进度统计", to: "/progress" },
  ];

  const authLinks = [
    { icon: <LogIn size="1rem" />, label: "登录", to: "/login" },
    { icon: <UserPlus size="1rem" />, label: "注册", to: "/signup" },
  ];

  return (
    <>
      <Box component={ScrollArea} pb="md">
        <Group mb="sm"></Group>

        {mainLinks.map((link) => (
          <NavLink
            key={link.to}
            component={Link}
            to={link.to}
            label={link.label}
            leftSection={
              <ThemeIcon variant="light" size="sm">
                {link.icon}
              </ThemeIcon>
            }
            active={currentPath === link.to}
            variant="filled"
            mb={4}
          />
        ))}
      </Box>

      <Divider my="sm" />
      {/* 
      <Box pt="sm">
        <Text size="sm" c="dimmed" mb="sm">
          账户
        </Text>
        {authLinks.map((link) => (
          <NavLink
            key={link.to}
            component={Link}
            to={link.to}
            label={link.label}
            leftSection={
              <ThemeIcon variant="light" size="sm">
                {link.icon}
              </ThemeIcon>
            }
            active={currentPath === link.to}
            variant="filled"
            mb={4}
          />
        ))}
      </Box>

      <Divider my="sm" />
      <NavLink
        component={Link}
        to="/settings"
        label="设置"
        leftSection={
          <ThemeIcon variant="light" size="sm">
            <Settings size="1rem" />
          </ThemeIcon>
        }
        active={currentPath === "/settings"}
        variant="filled"
      /> */}
    </>
  );
}

export default AppNavbar;
