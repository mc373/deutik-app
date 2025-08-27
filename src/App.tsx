import "@mantine/core/styles.css";
import { MantineProvider, LoadingOverlay } from "@mantine/core";
import { theme } from "./theme";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
} from "react-router-dom";
import Signup from "./pages/Signup";
import Login from "./pages/Login";

import Welcome from "./pages/Welcome";
import { Suspense } from "react";
import Home from "./pages/Home";

// 认证状态加载组件
function AuthLoading() {
  return (
    <div style={{ position: "relative", height: "100vh" }}>
      <LoadingOverlay visible overlayProps={{ blur: 2 }} />
    </div>
  );
}

export default function App() {
  return (
    <MantineProvider theme={theme}>
      <Router>
        <Suspense fallback={<AuthLoading />}>
          <Routes>
            <Route path="/welcome" element={<Welcome />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/login" element={<Login />} />
            <Route path="/*" element={<Home />} />
            {/* 未匹配路由处理 */}
            <Route path="*" element={<Navigate to="/Home" replace />} />
          </Routes>
        </Suspense>
      </Router>
    </MantineProvider>
  );
}
