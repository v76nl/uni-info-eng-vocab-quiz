import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
    return {
        base: mode === "production" ? "/uni-info-eng-vocab-quiz/" : "/",
        server: {
            allowedHosts: true, // localtunnel等の外部ホストからのアクセスを許可
        },
    };
});
