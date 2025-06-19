import { SignUp } from "@clerk/clerk-react";
import { MantineProvider, Title } from "@mantine/core";

export default function Signup() {
  return (
    <MantineProvider>
      <div style={{ maxWidth: "400px", margin: "0 auto" }}>
        <Title mb="md">Create Account</Title>
        <SignUp
          routing="path"
          path="/signup"
          signInUrl="/login"
          fallbackRedirectUrl="/login" // 注册后默认跳转
          // forceRedirectUrl="/welcome"   // 强制跳转（优先级最高）
        />
      </div>
    </MantineProvider>
  );
}
