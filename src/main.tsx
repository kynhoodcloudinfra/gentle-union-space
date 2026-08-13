import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import { registerUpdateWorker } from "./lib/updateCoordinator";

const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(
    <HelmetProvider>
      <App />
    </HelmetProvider>
  );
}

// See public/sw.js: this exists purely to force already-open stale sessions
// to reload the moment a new deploy is discovered. updateViaCache: 'none'
// so the SW script itself is never served stale, which would otherwise
// defeat the entire point.
window.addEventListener("load", () => void registerUpdateWorker());
