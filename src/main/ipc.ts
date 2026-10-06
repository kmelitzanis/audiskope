import { BrowserWindow, dialog, ipcMain, IpcMainInvokeEvent, OpenDialogOptions, OpenDialogReturnValue } from 'electron';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { readAudioFile } from './audioFile';

export const INDEX_HTML = path.join(__dirname, '../../src/renderer/index.html');

const AUDIO_EXTENSIONS = ['mp3', 'wav', 'flac', 'm4a', 'ogg', 'aac', 'webm', 'aif', 'aiff', 'aifc', 'alac', 'opus', 'oga', 'caf', 'wma', 'ape', 'wv', 'mp4'];

type ShowOpenDialog = (window: BrowserWindow, options: OpenDialogOptions) => Promise<OpenDialogReturnValue>;

/** Rejects IPC from anything other than the app's own page. */
function assertAppFrame(event: IpcMainInvokeEvent): void {
  const url = event.senderFrame?.url;
  let trusted = false;
  try {
    trusted = !!url && new URL(url).protocol === 'file:' && path.relative(fileURLToPath(url), INDEX_HTML) === '';
  } catch { /* An unparsable URL is untrusted. */ }
  if (!trusted) throw new Error('Blocked a request from an untrusted page.');
}

/** `showOpenDialog` is injectable so UI tests can drive the real handlers. */
export function registerIpcHandlers(showOpenDialog: ShowOpenDialog = (window, options) => dialog.showOpenDialog(window, options)): void {
  // The renderer may only read paths the user chose in the open dialog.
  const chosenPaths = new Set<string>();

  ipcMain.handle('dialog:openFile', async event => {
    assertAppFrame(event);
    const window = BrowserWindow.fromWebContents(event.sender);
    if (!window) return null;
    const result = await showOpenDialog(window, {
      properties: ['openFile'],
      filters: [
        { name: 'Audio Files', extensions: AUDIO_EXTENSIONS },
        { name: 'All Files', extensions: ['*'] }
      ]
    });
    const filePath = result.canceled ? undefined : result.filePaths[0];
    if (!filePath) return null;
    chosenPaths.add(filePath);
    return filePath;
  });

  ipcMain.handle('file:read', (event, filePath: unknown) => {
    assertAppFrame(event);
    if (typeof filePath !== 'string' || !chosenPaths.has(filePath))
      throw new Error('Open the file with Open file or drag and drop.');
    return readAudioFile(filePath);
  });

  // Only the preload sends this, with a path it resolved from a File the user
  // dropped; page scripts cannot reach ipcRenderer or forge a File's path.
  ipcMain.handle('file:readDropped', (event, filePath: unknown) => {
    assertAppFrame(event);
    if (typeof filePath !== 'string')
      throw new Error('Drop an audio file or use Open file.');
    return readAudioFile(filePath);
  });
}
