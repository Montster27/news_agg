const { app, BrowserWindow, Menu, dialog, ipcMain } = require("electron");
const fs = require("node:fs/promises");
const path = require("node:path");

const DEV_SERVER_URL = process.env.ELECTRON_RENDERER_URL ?? "http://127.0.0.1:3000";

let mainWindow = null;

function isLocalHttpUrl(value) {
  try {
    const url = new URL(value);
    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      (url.hostname === "127.0.0.1" || url.hostname === "localhost")
    );
  } catch {
    return false;
  }
}

function productionEntry() {
  const staticIndex = path.join(app.getAppPath(), "out", "index.html");

  return fs
    .access(staticIndex)
    .then(() => ({ type: "file", value: staticIndex }))
    .catch(() => {
      const configuredUrl = process.env.NEXT_APP_URL;

      if (configuredUrl && isLocalHttpUrl(configuredUrl)) {
        return { type: "url", value: configuredUrl };
      }

      return {
        type: "html",
        value: `
          <main style="font-family: system-ui; padding: 32px; color: #0f172a;">
            <h1>Tech Command Center</h1>
            <p>Packaged offline assets are not configured in Phase 1.</p>
            <p>Run the Next app locally or set NEXT_APP_URL to a localhost URL.</p>
          </main>
        `,
      };
    });
}

async function loadRenderer(window) {
  if (!app.isPackaged) {
    await window.loadURL(DEV_SERVER_URL);
    return;
  }

  const entry = await productionEntry();

  if (entry.type === "file") {
    await window.loadFile(entry.value);
  } else if (entry.type === "url") {
    await window.loadURL(entry.value);
  } else {
    await window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(entry.value)}`);
  }
}

async function exportPayload(payload, parentWindow) {
  const result = await dialog.showSaveDialog(parentWindow, {
    title: "Export Current Data",
    defaultPath: `tech-command-center-${new Date().toISOString().slice(0, 10)}.json`,
    filters: [{ name: "JSON", extensions: ["json"] }],
  });

  if (result.canceled || !result.filePath) {
    return { success: false, error: "Export canceled" };
  }

  await fs.writeFile(result.filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return { success: true, path: result.filePath };
}

function createMenu() {
  const template = [
    ...(process.platform === "darwin"
      ? [
          {
            label: app.name,
            submenu: [{ role: "about" }, { type: "separator" }, { role: "quit" }],
          },
        ]
      : []),
    {
      label: "File",
      submenu: [
        {
          label: "Export Current Data",
          accelerator: "CmdOrCtrl+E",
          click: async () => {
            await exportPayload(
              {
                exportedAt: new Date().toISOString(),
                source: "application-menu",
                note: "Renderer state export is handled by the in-app Export button.",
              },
              mainWindow,
            ).catch((error) => {
              dialog.showErrorBox("Export failed", error.message);
            });
          },
        },
        { type: "separator" },
        process.platform === "darwin" ? { role: "close" } : { role: "quit" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 950,
    minWidth: 1100,
    minHeight: 720,
    show: false,
    backgroundColor: "#f8fafc",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  await loadRenderer(mainWindow);
}

ipcMain.handle("desktop:appInfo", () => ({
  name: app.getName(),
  version: app.getVersion(),
  platform: process.platform,
}));

ipcMain.handle("desktop:ping", () => "pong");

ipcMain.handle("desktop:exportData", async (event, payload) => {
  const parentWindow = BrowserWindow.fromWebContents(event.sender) ?? mainWindow;

  try {
    return await exportPayload(payload, parentWindow);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown export error",
    };
  }
});

app.whenReady().then(async () => {
  createMenu();
  await createWindow();

  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
