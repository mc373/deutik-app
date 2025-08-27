import { SignUp } from "@clerk/clerk-react";
import { MantineProvider, Container, Paper, createTheme } from "@mantine/core";

const theme = createTheme({
  components: {
    SignUp: {
      styles: {
        root: {
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
          borderRadius: "8px",
        },
        card: {
          padding: "2rem",
        },
      },
    },
  },
});

export default function Signup() {
  return (
    <MantineProvider theme={theme}>
      <Container size={420} my={40}>
        {/* <Title ta="center" mb={10}>
          创建账户
        </Title> */}
        <Paper withBorder shadow="md" radius="md">
          <SignUp
            appearance={{
              elements: {
                card: {
                  boxShadow: "none",
                  width: "100%",
                  maxWidth: "100%",
                  margin: 0,
                },
                formFieldInput: {
                  fontSize: "16px",
                },
                headerTitle: {
                  fontSize: "1.5rem",
                },
                headerSubtitle: {
                  fontSize: "1rem",
                },
              },
            }}
            routing="path"
            path="/signup"
            signInUrl="/login"
            fallbackRedirectUrl="/welcome" // 注册后默认跳转
            forceRedirectUrl="/welcome" // 强制跳转（优先级更高）
          />
        </Paper>
      </Container>
    </MantineProvider>
  );
}
