/**
 * Runs one job in a fresh module worker and terminates it afterwards, so a
 * late reply from a timed-out job can never answer a newer request.
 */
export function runWorkerJob<T>(url: URL, message: unknown, timeoutMs = 60000): Promise<T> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(url, { type: 'module' });
    const finish = () => { clearTimeout(timer); worker.terminate(); };
    const timer = setTimeout(() => { finish(); reject(new Error('Audio analysis timed out.')); }, timeoutMs);
    worker.onmessage = (event: MessageEvent<T>) => { finish(); resolve(event.data); };
    worker.onerror = event => { finish(); reject(new Error(event.message || 'Audio analysis failed.')); };
    worker.onmessageerror = () => { finish(); reject(new Error('Audio analysis returned unreadable data.')); };
    worker.postMessage(message);
  });
}
