const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktop", {
  appInfo: () => ipcRenderer.invoke("desktop:appInfo"),
  exportData: (payload) => ipcRenderer.invoke("desktop:exportData", payload),
  ping: () => ipcRenderer.invoke("desktop:ping"),
});
