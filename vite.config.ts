import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
    return {
        base: mode === "production" ? "/uni-info-eng-vocab-quiz/" : "/",
    };
});
