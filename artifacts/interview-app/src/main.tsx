import { createRoot } from "react-dom/client";
import { setBaseUrl, setAuthTokenGetter } from "@workspace/api-client-react";
import { initReducedMotion } from "@/hooks/use-reduced-motion";
import App from "./App";
import "./index.css";

initReducedMotion();

// Automatically use the same host/IP that the browser used to open the app.
// This means it works on localhost, on LAN (192.168.x.x), and on any public IP
// without needing to hardcode anything.
const apiUrl =
  import.meta.env.VITE_API_URL ??
  `${window.location.protocol}//${window.location.hostname}:5000`;

setBaseUrl(apiUrl);

// Set up auth token getter
setAuthTokenGetter(() => {
  const token = localStorage.getItem("auth_token");
  return token || null;
});

createRoot(document.getElementById("root")!).render(<App />);
