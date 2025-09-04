import {
  Grid,
  Card,
  Group,
  Text,
  Title,
  useMantineTheme,
  Stack,
} from "@mantine/core";
import {
  Mic,
  Edit3,
  Languages,
  MessageSquare,
  Headphones,
  ClipboardList,
  UserCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../contexts/AppContext";
import { IconSearch } from "@tabler/icons-react";
interface MenuItem {
  icon: React.ReactNode;
  title: string;
  description: string;
  path: string;
  color: string;
}

export function GridMenu() {
  const theme = useMantineTheme();
  const navigate = useNavigate();
  const { modal } = useApp();
  const menuItems: MenuItem[] = [
    {
      icon: <IconSearch size={24} />,
      title: "查单词",
      description: "多语言德语单词快速查询",
      path: "/search",
      color: "blue",
    },
    {
      icon: <Languages size={24} />,
      title: "背单词",
      description: "掌握德语语法规则",
      path: "/Learn",
      color: "teal",
    },
    {
      icon: <Mic size={24} />,
      title: "练发音",
      description: "通过AI纠正发音",
      path: "/pronunciation",
      color: "violet",
    },
    {
      icon: <Edit3 size={24} />,
      title: "写文章",
      description: "练习德语写作",
      path: "/writing",
      color: "pink",
    },
    {
      icon: <MessageSquare size={24} />,
      title: "不规则动词",
      description: "模拟真实对话场景",
      path: "/unregelverb",
      color: "orange",
    },
    {
      icon: <Headphones size={24} />,
      title: "学语法",
      description: "提高听力理解能力",
      path: "/test",
      color: "cyan",
    },
    {
      icon: <ClipboardList size={24} />,
      title: "做测试",
      description: "检验学习成果",
      path: "/tests",
      color: "grape",
    },
    {
      icon: <UserCircle size={24} />,
      title: "个人中心",
      description: "查看学习进度",
      path: "/profile",
      color: "gray",
    },
  ];
  const handleClick = (path: string) => {
    if (path === "/search") {
      modal.open();
    } else {
      navigate(path);
    }
  };

  return (
    <>
      <Stack gap="xl">
        <Title order={2} ta="center" mb="md">
          德语学习中心
        </Title>
        <Grid gutter="xl" p="md">
          {menuItems.map((item, index) => (
            <Grid.Col key={index} span={{ base: 6, sm: 4, lg: 3 }}>
              <Card
                shadow="sm"
                padding="lg"
                radius="md"
                withBorder
                style={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  cursor: "pointer",
                  transition: "transform 0.2s, box-shadow 0.2s",
                  ":hover": {
                    transform: "translateY(-5px)",
                    boxShadow: theme.shadows.md,
                  },
                }}
                onClick={() => handleClick(item.path)}
              >
                <Group mb="md" gap="xs">
                  <Text c={`${item.color}.6`}>{item.icon}</Text>
                  <Title order={4} size="h5">
                    {item.title}
                  </Title>
                </Group>
                <Text size="sm" c="dimmed" style={{ flexGrow: 1 }}>
                  {item.description}
                </Text>
              </Card>
            </Grid.Col>
          ))}
        </Grid>
      </Stack>
    </>
  );
}
