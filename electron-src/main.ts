/**
 * Electron main process for Evolve Selector.
 *
 * Creates a frameless-menu BrowserWindow that loads the Vite-built
 * React app. In development, loads from the Vite dev server URL;
 * in production, loads the static dist/index.html.
 */
import { app, BrowserWindow, Menu } from "electron";
import path from "node:path";

// Remove the default menu bar for a clean, branded look
Menu.setApplicationMenu(null);

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1024,
    height: 768,
    minWidth: 600,
    minHeight: 500,
    title: "Evolve Selector",
    icon: path.join(__dirname, "../public/icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // In dev: load Vite dev server; in production: load built files
  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  app.quit();
});
