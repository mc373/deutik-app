// import { SignIn } from "@clerk/clerk-react";
// import { MantineProvider, Title } from "@mantine/core";

// export default function Login() {
//   return (
//     <MantineProvider>
//       <div style={{ maxWidth: "400px", margin: "0 auto" }}>
//         <Title mb="md"></Title>
//         <SignIn
//           routing="path"
//           path="/login"
//           signUpUrl="/signup"
//           fallbackRedirectUrl="/" // 默认登录后跳首页
//           // forceRedirectUrl="/admin" // 如果需要强制跳转
//         />
//       </div>
//     </MantineProvider>
//   );
// }

import { SignIn } from "@clerk/clerk-react";
import { MantineProvider, Container, Paper, createTheme } from "@mantine/core";

const theme = createTheme({
  components: {
    SignIn: {
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

export default function Login() {
  return (
    <MantineProvider theme={theme}>
      <Container size={420} my={40}>
        <Paper withBorder shadow="md" radius="md">
          <SignIn
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
              },
            }}
          />
        </Paper>
      </Container>
    </MantineProvider>
  );
}
