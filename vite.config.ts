import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// Stamped once per build. Ships both baked into the JS bundle (as
// __APP_BUILD_VERSION__) and as a tiny static file (version.json) fetched
// with cache: 'no-store' at runtime — see src/hooks/useStaleBundleGuard.ts.
// Lets clients stuck on a stale cached bundle detect the mismatch and
// self-heal with a hard reload, instead of silently running old code forever.
const BUILD_VERSION = String(Date.now());

function versionFilePlugin(): Plugin {
  return {
    name: "version-file",
    transformIndexHtml: {
      order: "pre",
      handler() {
        const bootstrap = `(function(){var V=${JSON.stringify(BUILD_VERSION)},K='_v',P='stale-bundle-reload:';function clean(){try{var u=new URL(location.href);if(u.searchParams.get(K)===V){u.searchParams.delete(K);history.replaceState(history.state,'',u.pathname+u.search+u.hash)}}catch(e){}}fetch('/version.json?t='+Date.now(),{cache:'no-store'}).then(function(r){return r.ok?r.json():null}).then(function(d){if(!d||typeof d.version!=='string'||d.version===V){clean();return}var u=new URL(location.href);if(u.searchParams.get(K)===d.version)return;try{if(sessionStorage.getItem(P+d.version))return;sessionStorage.setItem(P+d.version,'1')}catch(e){}var purge='caches'in window?caches.keys().then(function(ns){return Promise.allSettled(ns.map(function(n){return caches.delete(n)}))}).catch(function(){}):Promise.resolve();return purge.then(function(){u.searchParams.set(K,d.version);location.replace(u.toString())})}).catch(function(){clean()})})();`;
        return [{ tag: "script", children: bootstrap, injectTo: "head-prepend" }];
      },
    },
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "version.json",
        source: JSON.stringify({ version: BUILD_VERSION }),
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  define: {
    __APP_BUILD_VERSION__: JSON.stringify(BUILD_VERSION),
  },
  plugins: [react(), mode === "development" && componentTagger(), versionFilePlugin()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));
