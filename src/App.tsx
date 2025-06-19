import "@mantine/core/styles.css";
import { MantineProvider } from "@mantine/core";
import { theme } from "./theme";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
} from "react-router-dom";
import Home from "./pages/Home";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import { ClerkProvider, useAuth } from "@clerk/clerk-react";

// 子组件：保护路由（检查登录状态）
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isSignedIn } = useAuth();

  // 如果未登录，重定向到 /login
  if (!isSignedIn) {
    return <Navigate to="/login" replace />;
  }

  // 已登录，渲染子组件（如 Home）
  return children;
}
// PublicRoute 组件：包裹仅允许未登录用户访问的页面
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isSignedIn } = useAuth();

  // 已登录用户尝试访问公开路由时，重定向到首页
  if (isSignedIn) {
    return <Navigate to="/" replace />;
  }

  // 未登录用户正常访问
  return children;
}
export default function App() {
  const { isSignedIn } = useAuth();
  return (
    <MantineProvider theme={theme}>
      <Router>
        <Routes>
          <Route
            path="/signup"
            element={
              <PublicRoute>
                <Signup />
              </PublicRoute>
            }
          />
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />
          {/* 其他路由未匹配时，重定向到登录或首页 */}
          <Route
            path="*"
            element={<Navigate to={isSignedIn ? "/" : "/login"} replace />}
          />
        </Routes>
      </Router>
    </MantineProvider>
  );
}
