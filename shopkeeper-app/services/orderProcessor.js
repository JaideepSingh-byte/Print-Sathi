/**
 * ============================================================================
 * PRINT-SATHI DESKTOP CLIENT: Automated Multi-File Order Processor
 * ============================================================================
 * 
 * Capabilities:
 * - Sequentially processes multi-file orders (up to 10 files per order).
 * - Downloads, verifies (%PDF- signature), and spools each file with its specific
 *   copies, color mode, and single/duplex configuration.
 * - Atomic claiming per terminal instance.
 * - Dry-Run Mode & Auto-Print Toggle.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');
const http = require('http');
const firebaseService = require('./firebaseService');
const printerService = require('./printerService');

class OrderProcessor {
  constructor(instanceId) {
    this.instanceId = instanceId;
    this.autoPrint = true;
    this.dryRun = true; // Safe dry-run enabled by default
    this.isPaused = false;
    this.selectedPrinter = '';
    this.targetShopId = 'shop_main_xerox'; // Default counter: Main Xerox Center
    this.isProcessing = false;
    this.activeJob = null;
    this.recentHistory = [];
    this.listeners = {
      log: [],
      queueChange: [],
      statusChange: [],
    };

    // Ensure spool directory exists in OS temp
    this.spoolDir = path.join(os.tmpdir(), 'print-sathi-spool');
    if (!fs.existsSync(this.spoolDir)) {
      try {
        fs.mkdirSync(this.spoolDir, { recursive: true });
      } catch (err) {
        console.warn('Could not create spool dir:', err);
      }
    }
  }

  on(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].push(callback);
    }
  }

  log(level, message, details = null) {
    const logItem = {
      id: Date.now().toString(),
      timestamp: new Date().toLocaleTimeString(),
      level, // 'info' | 'success' | 'warn' | 'error'
      message,
      details,
    };
    console.log(`[${logItem.timestamp}] [${level.toUpperCase()}] ${message}`);
    this.listeners.log.forEach((cb) => cb(logItem));
  }

  notifyStatus() {
    const status = {
      autoPrint: this.autoPrint,
      dryRun: this.dryRun,
      isPaused: this.isPaused,
      selectedPrinter: this.selectedPrinter,
      targetShopId: this.targetShopId,
      isProcessing: this.isProcessing,
      activeJob: this.activeJob,
    };
    this.listeners.statusChange.forEach((cb) => cb(status));
  }

  async init() {
    this.log('info', `Initializing Desktop Station (Instance: ${this.instanceId.slice(0, 8)}, Counter: ${this.targetShopId})...`);

    // 1. Recover stale jobs from crashes
    const recovered = await firebaseService.recoverStaleJobs(this.instanceId);
    if (recovered.length > 0) {
      this.log('warn', `Recovered ${recovered.length} stale job(s) into verification state.`);
    }

    // 2. Discover Windows printers
    const { printers, defaultPrinter } = await printerService.getAvailablePrinters();
    this.selectedPrinter = defaultPrinter || printers[0] || 'Microsoft Print to PDF';
    this.log('success', `Physical printer selected: "${this.selectedPrinter}" (${printers.length} detected).`);

    if (this.dryRun) {
      this.log('info', '🛡️ Safe Dry-Run Mode is ACTIVE (Virtual execution without hardware paper spooling).');
    }

    this.notifyStatus();
    return { printers, defaultPrinter: this.selectedPrinter };
  }

  setTargetShopId(shopId) {
    this.targetShopId = shopId || 'ALL';
    this.log('info', `Target counter changed to: "${this.targetShopId}".`);
    this.notifyStatus();
  }

  async handleIncomingQueue(queue, allDocs = []) {
    const payload = {
      pending: queue,
      all: allDocs,
      completed: allDocs.filter((d) => d.status === 'COMPLETED' || d.status === 'PRINTED'),
    };
    this.listeners.queueChange.forEach((cb) => cb(payload));

    if (this.isProcessing || this.isPaused || !this.autoPrint) {
      return;
    }

    if (queue.length === 0) return;

    // Pick next FIFO job
    const nextJob = queue[0];
    await this.processJob(nextJob);
  }

  /**
   * End-to-end multi-file atomic job execution
   */
  async processJob(job) {
    if (this.isProcessing) return;
    this.isProcessing = true;
    this.activeJob = job;
    this.notifyStatus();

    const { orderId, token } = job;
    const files = Array.isArray(job.files) && job.files.length > 0
      ? job.files
      : [
          {
            fileName: job.fileName || 'document.pdf',
            fileUrl: job.fileUrl || '',
            copies: job.copies || 1,
            colorMode: job.colorMode || 'bw',
            sides: job.sides || 'single',
            calculatedPages: job.calculatedPages || 1,
          },
        ];

    this.log('info', `Claiming Order #${token} (${orderId}) with ${files.length} document(s)...`);

    try {
      // 1. ATOMIC CLAIMING
      const claimResult = await firebaseService.claimJobAtomically(orderId, this.instanceId);
      if (!claimResult.success) {
        this.log('warn', `Could not claim Order #${token}: ${claimResult.reason}. Skipping.`);
        this.finishJob(orderId, 'SKIPPED');
        return;
      }

      this.log('info', `Order #${token} claimed. Processing ${files.length} file(s)...`);

      // 2. MARK PRINT SUBMITTED
      await firebaseService.markJobPrintSubmitted(orderId, {
        printerName: this.selectedPrinter,
        isDryRun: this.dryRun,
        totalFiles: files.length,
      });

      // 3. SEQUENTIALLY DOWNLOAD, VALIDATE & SPOOL EVERY FILE
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        this.log('info', `[${i + 1}/${files.length}] Downloading "${file.fileName}"...`);

        const tempPdfPath = await this.downloadDocument(orderId, `${i}_${file.fileName}`, file.fileUrl);
        this.validateDocumentAndSpecs(tempPdfPath, file);

        this.log(
          'info',
          `[${i + 1}/${files.length}] Spooling "${file.fileName}" (${file.copies} copies, ${file.colorMode.toUpperCase()}, ${file.sides})...`
        );

        await printerService.printPdf(tempPdfPath, file, {
          printerName: this.selectedPrinter,
          isDryRun: this.dryRun,
        });
      }

      // 4. MARK ORDER COMPLETED
      await firebaseService.markJobCompleted(orderId, {
        printerName: this.selectedPrinter,
        isDryRun: this.dryRun,
        completedFilesCount: files.length,
      });

      const modeTag = this.dryRun ? '[DRY-RUN]' : '[PRINTED]';
      this.log('success', `🎉 ${modeTag} Order #${token} (${files.length} files) completed successfully!`);
      this.finishJob(orderId, 'COMPLETED');
    } catch (err) {
      this.log('error', `❌ Processing failed for Order #${token}: ${err.message}`);
      await firebaseService.markJobFailed(orderId, err.message);
      this.finishJob(orderId, 'FAILED', err.message);
    }
  }

  finishJob(orderId, status, error = null) {
    if (this.activeJob) {
      this.recentHistory.unshift({
        ...this.activeJob,
        processedAt: new Date().toLocaleTimeString(),
        finalStatus: status,
        error,
      });
      if (this.recentHistory.length > 30) this.recentHistory.pop();
    }
    this.isProcessing = false;
    this.activeJob = null;
    this.notifyStatus();
  }

  /**
   * Downloads remote or local PDF to temp spool directory
   */
  async downloadDocument(orderId, fileName, fileUrl) {
    const safeName = (fileName || 'document.pdf').replace(/[^a-zA-Z0-9._-]/g, '_');
    const localPath = path.join(this.spoolDir, `${orderId}_${safeName}`);

    // If file is already a valid local path
    if (fileUrl && fs.existsSync(fileUrl)) {
      fs.copyFileSync(fileUrl, localPath);
      return localPath;
    }

    // If HTTP / HTTPS download URL
    if (fileUrl && fileUrl.startsWith('http')) {
      return new Promise((resolve, reject) => {
        const client = fileUrl.startsWith('https') ? https : http;
        const fileStream = fs.createWriteStream(localPath);

        const req = client.get(fileUrl, (response) => {
          if (response.statusCode >= 400) {
            return reject(new Error(`Server returned HTTP ${response.statusCode}`));
          }
          response.pipe(fileStream);
          fileStream.on('finish', () => {
            fileStream.close(() => resolve(localPath));
          });
        });

        req.on('error', (err) => {
          fs.unlink(localPath, () => {});
          reject(err);
        });

        req.setTimeout(12000, () => {
          req.destroy(new Error('Download timed out after 12s'));
        });
      });
    }

    // Fallback sample file if local blob
    const sampleFallback = path.resolve(__dirname, '../../sample_documents/Sample_Lecture_Notes_5_Pages.pdf');
    if (fs.existsSync(sampleFallback)) {
      fs.copyFileSync(sampleFallback, localPath);
      return localPath;
    }

    throw new Error('Valid PDF download link or file reference was not found.');
  }

  /**
   * Validates %PDF- signature and configuration limits
   */
  validateDocumentAndSpecs(filePath, fileSpec) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File does not exist on disk: ${filePath}`);
    }

    const stats = fs.statSync(filePath);
    if (stats.size === 0) {
      throw new Error('PDF file is 0 bytes.');
    }
    if (stats.size > 80 * 1024 * 1024) {
      throw new Error(`File exceeds 80MB safety limit.`);
    }

    // Inspect %PDF- signature
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(5);
    fs.readSync(fd, buffer, 0, 5, 0);
    fs.closeSync(fd);

    const header = buffer.toString('utf-8');
    if (!header.startsWith('%PDF-')) {
      throw new Error(`Invalid PDF signature (Found: "${header}").`);
    }

    const copies = parseInt(fileSpec.copies, 10);
    if (isNaN(copies) || copies < 1 || copies > 100) {
      throw new Error(`Invalid copies count: ${fileSpec.copies}.`);
    }
  }

  setAutoPrint(enabled) {
    this.autoPrint = Boolean(enabled);
    this.log('info', `Auto-Print turned ${this.autoPrint ? 'ON' : 'OFF'}.`);
    this.notifyStatus();
  }

  setDryRun(enabled) {
    this.dryRun = Boolean(enabled);
    this.log('warn', `Dry-Run Mode is now ${this.dryRun ? 'ENABLED (Virtual Simulation)' : 'DISABLED (Hardware Printing)'}.`);
    this.notifyStatus();
  }

  setPrinter(printerName) {
    this.selectedPrinter = printerName;
    this.log('info', `Printer changed to: "${printerName}".`);
    this.notifyStatus();
  }

  setPaused(paused) {
    this.isPaused = Boolean(paused);
    this.log(this.isPaused ? 'warn' : 'info', `Queue ${this.isPaused ? 'PAUSED' : 'RESUMED'}.`);
    this.notifyStatus();
  }
}

module.exports = OrderProcessor;
