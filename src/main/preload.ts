import { contextBridge, ipcRenderer, webUtils } from 'electron';

async function readAudio(channel: 'file:read' | 'file:readDropped', filePath: string) {
  const result = await ipcRenderer.invoke(channel, filePath);
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
}

// Expose safe APIs to renderer. Paths only come from the open dialog or from
// Files the user dropped, so the page cannot ask to read arbitrary files.
contextBridge.exposeInMainWorld('api', {
  openFileDialog: () => ipcRenderer.invoke('dialog:openFile'),

  readFile: (filePath: string) => readAudio('file:read', filePath),

  readDroppedFile: (file: File) => {
    const filePath = webUtils.getPathForFile(file);
    if (!filePath)
      return Promise.reject(new Error('Drop an audio file from your file manager or use Open file.'));
    return readAudio('file:readDropped', filePath);
  }
});
