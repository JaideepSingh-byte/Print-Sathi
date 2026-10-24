/**
 * ============================================================================
 * PRINT-SATHI DESKTOP CLIENT: Electron Main Process (main.js)
 * ============================================================================
 */

const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const firebaseService = require('./services/firebaseService');
const printerService = require('./services/printerService');
const OrderProcessor = require('./services/orderProcessor');

// Unique instance ID for atomic claiming & startup recovery
const instanceId = `${os.hostname()}-${crypto.randomBytes(4).toString('hex')}`;
const processor = new OrderProcessor(instanceId);

let mainWindow = null;
let queueUnsubscribe = null;
let currentTargetShopId = process.env.PRINT_SATHI_SHOP_ID || 'shop_main_xerox';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1140,
    height: 800,
    minWidth: 920,
    minHeight: 680,
    title: 'Print-Sathi | Unattended Station Printing Console',
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startQueueSubscription() {
  if (typeof queueUnsubscribe === 'function') {
    queueUnsubscribe();
  }

  queueUnsubscribe = firebaseService.subscribeToEligibleQueue(
    currentTargetShopId,
    (queue, allDocs) => {
      processor.handleIncomingQueue(queue, allDocs);
    },
    (err) => {
      processor.log('error', `Firestore subscription error: ${err.message}`);
    },
    (rawDocs) => {
      processor.log(
        'info',
        `📡 Firestore Diagnostics: ${rawDocs.length} total orders found (Station Counter: "${currentTargetShopId}").`
      );
    }
  );
}

// IPC Handlers
ipcMain.handle('get-printers', async () => {
  return await printerService.getAvailablePrinters();
});

ipcMain.handle('get-status', () => {
  return {
    instanceId,
    autoPrint: processor.autoPrint,
    dryRun: processor.dryRun,
    isPaused: processor.isPaused,
    selectedPrinter: processor.selectedPrinter,
    targetShopId: currentTargetShopId,
    isProcessing: processor.isProcessing,
    activeJob: processor.activeJob,
    isConfigured: firebaseService.isConfigured,
  };
});

ipcMain.handle('set-auto-print', (_event, enabled) => {
  processor.setAutoPrint(enabled);
  return true;
});

ipcMain.handle('set-dry-run', (_event, enabled) => {
  processor.setDryRun(enabled);
  return true;
});

ipcMain.handle('set-printer', (_event, printerName) => {
  processor.setPrinter(printerName);
  return true;
});

ipcMain.handle('set-paused', (_event, paused) => {
  processor.setPaused(paused);
  return true;
});

ipcMain.handle('set-target-shop', (_event, shopId) => {
  currentTargetShopId = shopId;
  processor.setTargetShopId(shopId);
  startQueueSubscription();
  return true;
});

ipcMain.handle('get-target-shop', () => {
  return currentTargetShopId;
});

ipcMain.handle('open-spool-folder', async () => {
  await shell.openPath(processor.spoolDir);
  return true;
});

ipcMain.handle('retry-job', async (_event, orderId) => {
  processor.log('info', `Manually retrying Order #${orderId}...`);
  return true;
});

app.whenReady().then(async () => {
  createWindow();

  // Forward processor events to UI
  processor.on('log', (logItem) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('log-message', logItem);
    }
  });

  processor.on('statusChange', (status) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('status-update', status);
    }
  });

  processor.on('queueChange', (queue) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('queue-update', queue);
    }
  });

  // Initialize processor
  await processor.init();

  // Subscribe to live queue
  startQueueSubscription();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (typeof queueUnsubscribe === 'function') {
    queueUnsubscribe();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
