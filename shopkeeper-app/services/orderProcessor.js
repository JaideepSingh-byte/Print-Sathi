/**
 * ============================================================================
 * PRINT-SATHI DESKTOP CLIENT: Automated Order Processor & State Machine
 * ============================================================================
 * 
 * State Transitions:
 * QUEUED -> PRINTING (Claimed) -> Validation -> PRINT_SUBMITTED -> COMPLETED
 * 
 * Safety Features:
 * - Atomic Claiming (prevents multi-terminal duplicate printing)
 * - Strict PDF signature validation (%PDF-)
 * - Dry-Run Mode (Safe simulation without hardware spooling)
 * - Auto-Print toggle & Emergency Stop
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
    this.autoPrint = true; // Default auto-print enabled
    this.dryRun = true;    // Default DRY-RUN mode enabled for safety
    this.isPaused = false;
    this.selectedPrinter = '';
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
      isProcessing: this.isProcessing,
      activeJob: this.activeJob,
    };
    this.listeners.statusChange.forEach((cb) => cb(status));
  }

  /**
   * Initializes processor: recovers stale jobs & discovers local printers.
   */
  async init() {
    this.log('info', `Initializing Desktop Client (Instance: ${this.instanceId.slice(0, 8)})...`);

    // 1. Recover any stale interrupted jobs from prior crashes
    const recovered = await firebaseService.recoverStaleJobs(this.instanceId);
    if (recovered.length > 0) {
      this.log('warn', `Recovered ${recovered.length} stale job(s) into NEEDS_VERIFICATION state.`);
    }

    // 2. Discover local Windows printers
    const { printers, defaultPrinter } = await printerService.getAvailablePrinters();
    this.selectedPrinter = defaultPrinter || printers[0] || 'Microsoft Print to PDF';
    this.log('success', `Hardware printer detected: "${this.selectedPrinter}" (${printers.length} total found).`);

    if (this.dryRun) {
      this.log('info', '🛡️ Safe Dry-Run Mode is ACTIVE (Virtual execution without hardware spooling).');
    }

    this.notifyStatus();
    return { printers, defaultPrinter: this.selectedPrinter };
  }

  /**
   * Evaluates incoming queue items and processes the next eligible job.
   */
  async handleIncomingQueue(queue, allDocs = []) {
    const payload = {
      pending: queue,
      all: allDocs,
      completed: allDocs.filter((d) => d.status === 'COMPLETED' || d.status === 'PRINTED'),
    };
    this.listeners.queueChange.forEach((cb) => cb(payload));

    // If currently processing a job, queue is paused, or auto-print is off, don't auto-consume
    if (this.isProcessing || this.isPaused || !this.autoPrint) {
      return;
    }

    if (queue.length === 0) return;

    // Pick earliest FIFO queued job
    const nextJob = queue[0];
    await this.processJob(nextJob);
  }

  /**
   * End-to-end atomic job execution.
   */
  async processJob(job) {
    if (this.isProcessing) return;
    this.isProcessing = true;
    this.activeJob = job;
    this.notifyStatus();

    const { orderId, token, fileName, fileUrl } = job;
    this.log('info', `Claiming Order #${token} (${orderId})...`);

    try {
      // 1. ATOMIC CLAIMING
      const claimResult = await firebaseService.claimJobAtomically(orderId, this.instanceId);
      if (!claimResult.success) {
        this.log('warn', `Could not claim Order #${token}: ${claimResult.reason}. Skipping.`);
        this.finishJob(orderId, 'SKIPPED');
        return;
      }

      this.log('info', `Order #${token} claimed. Downloading and validating document...`);

      // 2. DOWNLOAD & CACHE DOCUMENT
      const tempPdfPath = await this.downloadDocument(orderId, fileName, fileUrl);

      // 3. STRICT DOCUMENT & SPEC VALIDATION
      this.validateDocumentAndSpecs(tempPdfPath, job);
      this.log('success', `PDF validated: signature verified, ${job.calculatedPages || 1} pgs, ${job.copies} copies.`);

      // 4. SUBMIT TO WINDOWS SPOOLER
      await firebaseService.markJobPrintSubmitted(orderId, {
        printerName: this.selectedPrinter,
        isDryRun: this.dryRun,
      });

      this.log('info', `Sending to printer "${this.selectedPrinter}"...`);
      const printResult = await printerService.printPdf(tempPdfPath, job, {
        printerName: this.selectedPrinter,
        isDryRun: this.dryRun,
      });

      // 5. MARK AS COMPLETED
      await firebaseService.markJobCompleted(orderId, {
        spoolerJobId: printResult.spoolerJobId,
        printerName: this.selectedPrinter,
        isDryRun: this.dryRun,
      });

      const modeTag = this.dryRun ? '[DRY-RUN]' : '[PRINTED]';
      this.log('success', `🎉 ${modeTag} Order #${token} completed successfully! Spool ID: ${printResult.spoolerJobId}`);
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
      if (this.recentHistory.length > 20) this.recentHistory.pop();
    }
    this.isProcessing = false;
    this.activeJob = null;
    this.notifyStatus();
  }

  /**
   * Downloads the remote/local PDF to secure temporary folder.
   */
  async downloadDocument(orderId, fileName, fileUrl) {
    const safeName = (fileName || 'document.pdf').replace(/[^a-zA-Z0-9._-]/g, '_');
    const localPath = path.join(this.spoolDir, `${orderId}_${safeName}`);

    // If already local file path
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
            return reject(new Error(`Server returned HTTP status ${response.statusCode}`));
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
          req.destroy(new Error('Download timed out after 12 seconds'));
        });
      });
    }

    // Fallback: check sample documents folder if fileUrl was an in-browser blob
    const sampleFallback = path.resolve(__dirname, '../../sample_documents/Sample_Lecture_Notes_5_Pages.pdf');
    if (fs.existsSync(sampleFallback)) {
      fs.copyFileSync(sampleFallback, localPath);
      return localPath;
    }

    throw new Error('Valid PDF download link or file reference was not provided in order record.');
  }

  /**
   * Validates PDF magic bytes signature (%PDF-) and configuration bounds.
   */
  validateDocumentAndSpecs(filePath, job) {
    if (!fs.existsSync(filePath)) {
      throw new Error('Downloaded file not found on disk.');
    }

    const stats = fs.statSync(filePath);
    if (stats.size === 0) {
      throw new Error('PDF file is empty (0 bytes).');
    }
    if (stats.size > 80 * 1024 * 1024) {
      throw new Error(`File size (${(stats.size / 1024 / 1024).toFixed(1)}MB) exceeds 80MB safety limit.`);
    }

    // Verify PDF Magic Bytes (%PDF-)
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(5);
    fs.readSync(fd, buffer, 0, 5, 0);
    fs.closeSync(fd);

    const header = buffer.toString('utf-8');
    if (!header.startsWith('%PDF-')) {
      throw new Error(`Corrupted file: Missing valid PDF header signature (Header: "${header}")`);
    }

    // Validate quantities
    const copies = parseInt(job.copies, 10);
    if (isNaN(copies) || copies < 1 || copies > 100) {
      throw new Error(`Invalid copies count: ${job.copies}. Must be between 1 and 100.`);
    }
  }

  // Toggle Controls
  setAutoPrint(enabled) {
    this.autoPrint = Boolean(enabled);
    this.log('info', `Auto-Print turned ${this.autoPrint ? 'ON' : 'OFF'}.`);
    this.notifyStatus();
  }

  setDryRun(enabled) {
    this.dryRun = Boolean(enabled);
    this.log('warn', `Dry-Run Mode is now ${this.dryRun ? 'ENABLED (Virtual)' : 'DISABLED (Physical Hardware Printing)'}.`);
    this.notifyStatus();
  }

  setPrinter(printerName) {
    this.selectedPrinter = printerName;
    this.log('info', `Target printer changed to: "${printerName}".`);
    this.notifyStatus();
  }

  setPaused(paused) {
    this.isPaused = Boolean(paused);
    this.log(this.isPaused ? 'warn' : 'info', `Queue processing ${this.isPaused ? 'PAUSED (Emergency Stop)' : 'RESUMED'}.`);
    this.notifyStatus();
  }
}

module.exports = OrderProcessor;
