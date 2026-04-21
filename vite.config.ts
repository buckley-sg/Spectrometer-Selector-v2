import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// When building for GitHub Pages, the app is served from
// https://buckley-sg.github.io/Spectrometer-Selector-v2/ so the base path
// needs the repo name prefix. For local dev and Electron builds, use "./"
// so assets resolve relative to index.html.
const isGitHubPages = process.env.GITHUB_PAGES === "true";

export default defineConfig({
  plugins: [react()],
  base: isGitHubPages ? "/Spectrometer-Selector-v2/" : "./",
})
