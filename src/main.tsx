import ReactDOM from "react-dom/client";
import App from "./App.tsx";
const clerk_key = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
import { ClerkProvider } from "@clerk/clerk-react";
if (!clerk_key) {
  throw new Error(
    "VITE_CLERK_PUBLISHABLE_KEY is not defined. Please set it in your .env file."
  );
}
ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <ClerkProvider publishableKey={clerk_key}>
    <App />
  </ClerkProvider>
);
