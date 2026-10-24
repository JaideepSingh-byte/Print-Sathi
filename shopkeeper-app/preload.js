/**
 * ============================================================================
 * PRINT-SATHI DESKTOP CLIENT: Secure Preload Script (preload.js)
 * ============================================================================
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopAPI', {
  // Config & State
  getPrinters: () => ipcRenderer.invoke('get-printers'),
  getStatus: () => ipcRenderer.invoke('get-status'),
  setAutoPrint: (enabled) => ipcRenderer.invoke('set-auto-print', enabled),
  setDryRun: (enabled) => ipcRenderer.invoke('set-dry-run', enabled),
  setPrinter: (printerName) => ipcRenderer.invoke('set-printer', printerName),
  setPaused: (paused) => ipcRenderer.invoke('set-paused', paused),
  openSpoolFolder: () => ipcRenderer.invoke('open-spool-folder'),
  retryJob: (orderId) => ipcRenderer.invoke('retry-job', orderId),
  setTargetShop: (shopId) => ipcRenderer.invoke('set-target-shop', shopId),
  getTargetShop: () => ipcRenderer.invoke('get-target-shop'),

  // Real-time Event Subscriptions
  onQueueUpdate: (callback) => {
    const handler = (_event, queue) => callback(queue);
    ipcRenderer.on('queue-update', handler);
    return () => ipcRenderer.removeListener('queue-update', handler);
  },
  onStatusUpdate: (callback) => {
    const handler = (_event, status) => callback(status);
    ipcRenderer.on('status-update', handler);
    return () => ipcRenderer.removeListener('status-update', handler);
  },
  onLog: (callback) => {
    const handler = (_event, logItem) => callback(logItem);
    ipcRenderer.on('log-message', handler);
    return () => ipcRenderer.removeListener('log-message', handler);
  },
});
