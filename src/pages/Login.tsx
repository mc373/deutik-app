import { SignIn } from "@clerk/clerk-react";
import { MantineProvider, Title } from "@mantine/core";

export default function Login() {
  return (
    <MantineProvider>
      <div style={{ maxWidth: "400px", margin: "0 auto" }}>
        <Title mb="md"></Title>
        <SignIn
          routing="path"
          path="/login"
          signUpUrl="/signup"
          fallbackRedirectUrl="/" // 默认登录后跳首页
          // forceRedirectUrl="/admin" // 如果需要强制跳转
        />
      </div>
    </MantineProvider>
  );
}
