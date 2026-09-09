import { contextBridge, ipcRenderer, webUtils } from 'electron';

// Expose safe APIs to renderer
contextBridge.exposeInMainWorld('api', {
  openFileDialog: () => ipcRenderer.invoke('dialog:openFile'),

  readFile: async (filePath: string) => {
    const result = await ipcRenderer.invoke('file:read', filePath);
    // Convert Buffer to ArrayBuffer for Web Audio API
    const arrayBuffer = result.data.buffer.slice(
      result.data.byteOffset,
      result.data.byteOffset + result.data.byteLength
    );
    return {
      buffer: arrayBuffer,
      metadata: result.metadata,
      name: result.name,
      path: result.path
    };
  },

  getDroppedFilePath: (file: File) => webUtils.getPathForFile(file),

  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close')
  }
});
