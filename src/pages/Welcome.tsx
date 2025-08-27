import {
  Container,
  Title,
  Text,
  Button,
  Group,
  Stack,
  Card,
  rem,
  useMantineTheme,
  BackgroundImage,
  Center,
  Overlay,
  Flex,
} from "@mantine/core";
import { SignedIn, SignedOut } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { useGlobalState } from "../contexts/GlobalStateContext_bak";
import {
  BookOpen,
  Mic,
  Edit3,
  ArrowRight,
  UserPlus,
  LogIn,
} from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "../hooks/useTranslation";

function Welcome() {
  const navigate = useNavigate();
  const theme = useMantineTheme();
  const {
    state: { language },
    setLanguage,
  } = useGlobalState();

  useEffect(() => {
    const userLanguage = navigator.language || "en";
    console.log("User language:", userLanguage);

    const primaryLanguage = userLanguage.split("-")[0] as "en" | "de" | "zh";

    if (language !== primaryLanguage) {
      setLanguage(primaryLanguage);
    }
  }, [language, setLanguage]);

  const { t } = useTranslation();
  return (
    <BackgroundImage
      src="/assets/welcome-bg.jpg"
      radius="sm"
      style={{
        minHeight: "100vh",
        position: "relative",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
        backgroundColor: theme.colors.gray[9],
        backgroundRepeat: "no-repeat",
      }}
    >
      <Overlay
        gradient={`linear-gradient(45deg, ${theme.colors.blue[7]} 0%, ${theme.colors.cyan[5]} 100%)`}
        opacity={0.75}
        zIndex={0}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          height: "100%",
          width: "100%",
        }}
      />

      <Container
        size="lg"
        py={rem(80)}
        style={{
          position: "relative",
          zIndex: 1,
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Stack gap="xl" align="center">
          <Title
            order={1}
            size={rem(48)}
            ta="center"
            c="white"
            style={{
              fontWeight: 800,
              textShadow: "0 2px 4px rgba(0,0,0,0.1)",
            }}
          >
            {t("welcome")}
          </Title>

          <Text
            size="xl"
            ta="center"
            maw={rem(700)}
            c="white"
            style={{ lineHeight: 1.6 }}
          >
            Deine interaktive Plattform für effektives Deutschlernen. Entdecke
            maßgeschneiderte Übungen, intelligente Wiederholungen und
            personalisierte Lernpfade.
          </Text>

          <SignedOut>
            <Group justify="center" mt={rem(20)} gap="lg">
              <Button
                size="xl"
                radius="xl"
                color="white"
                variant="filled"
                onClick={() => navigate("/Login")}
                leftSection={<LogIn size={20} />}
                style={{ color: theme.colors.blue[7], fontWeight: 600 }}
              >
                Login
              </Button>
              <Button
                size="xl"
                radius="xl"
                variant="white"
                color="dark"
                onClick={() => navigate("/Signup")}
                leftSection={<UserPlus size={20} />}
                style={{ fontWeight: 600 }}
              >
                Kostenlos registrieren
              </Button>
            </Group>
          </SignedOut>

          <SignedIn>
            <Button
              size="xl"
              radius="xl"
              variant="white"
              color="dark"
              onClick={() => navigate("/home")}
              mt={rem(20)}
              rightSection={<ArrowRight size={20} />}
              style={{ fontWeight: 600 }}
            >
              Zum Dashboard
            </Button>
          </SignedIn>

          <Flex
            gap="xl"
            mt={rem(60)}
            wrap="wrap"
            justify="center"
            style={{ width: "100%" }}
          >
            <FeatureCard
              icon={<BookOpen size={40} />}
              title="Vokabeltrainer"
              description="Lerne neue Wörter mit unserem intelligenten Spaced-Repetition-System."
              color="blue"
            />
            <FeatureCard
              icon={<Mic size={40} />}
              title="Sprachübungen"
              description="Verbessere deine Aussprache mit Audioaufnahmen und KI-Analyse."
              color="cyan"
            />
            <FeatureCard
              icon={<Edit3 size={40} />}
              title="Grammatik-Tests"
              description="Meistere die deutsche Grammatik mit interaktiven Übungen."
              color="indigo"
            />
          </Flex>
        </Stack>
      </Container>
    </BackgroundImage>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  color = "blue",
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  color?: string;
}) {
  return (
    <Card
      shadow="md"
      padding="xl"
      radius="lg"
      withBorder
      style={{
        width: rem(300),
        backgroundColor: "rgba(255,255,255,0.95)",
        transition: "transform 0.2s",
        ":hover": {
          transform: "translateY(-5px)",
        },
      }}
    >
      <Center mb="md" c={`${color}.6`}>
        {icon}
      </Center>
      <Title
        order={3}
        size={rem(20)}
        mb="sm"
        ta="center"
        style={{ fontWeight: 600 }}
      >
        {title}
      </Title>
      <Text c="dimmed" size="sm" ta="center" style={{ lineHeight: 1.5 }}>
        {description}
      </Text>
    </Card>
  );
}

export default Welcome;
