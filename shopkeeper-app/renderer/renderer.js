/**
 * ============================================================================
 * PRINT-SATHI DESKTOP CLIENT: Renderer Controller (renderer.js)
 * ============================================================================
 */

// DOM Elements
const shopSelect = document.getElementById('shopSelect');
const printerSelect = document.getElementById('printerSelect');
const toggleAutoPrintBtn = document.getElementById('toggleAutoPrintBtn');
const autoPrintText = document.getElementById('autoPrintText');
const toggleDryRunBtn = document.getElementById('toggleDryRunBtn');
const dryRunText = document.getElementById('dryRunText');
const pauseQueueBtn = document.getElementById('pauseQueueBtn');
const openFolderBtn = document.getElementById('openFolderBtn');
const clearLogsBtn = document.getElementById('clearLogsBtn');

const tabPendingBtn = document.getElementById('tabPendingBtn');
const tabCompletedBtn = document.getElementById('tabCompletedBtn');
const queueSubtext = document.getElementById('queueSubtext');

const activeJobSection = document.getElementById('activeJobSection');
const activeJobTitle = document.getElementById('activeJobTitle');
const activeJobFile = document.getElementById('activeJobFile');
const activeJobCopies = document.getElementById('activeJobCopies');
const activeJobColor = document.getElementById('activeJobColor');
const activeJobSides = document.getElementById('activeJobSides');
const activeJobPages = document.getElementById('activeJobPages');

const queueTableBody = document.getElementById('queueTableBody');
const queueCount = document.getElementById('queueCount');
const completedCount = document.getElementById('completedCount');
const logFeed = document.getElementById('logFeed');

const firebaseBadge = document.getElementById('firebaseBadge');
const firebaseStatusText = document.getElementById('firebaseStatusText');
const modeBadge = document.getElementById('modeBadge');

let currentStatus = {
  autoPrint: true,
  dryRun: true,
  isPaused: false,
  selectedPrinter: '',
  targetShopId: 'shop_main_xerox',
  isProcessing: false,
  activeJob: null,
};

let currentTab = 'pending'; // 'pending' | 'completed'
let cachedPending = [];
let cachedCompleted = [];

// 1. INITIALIZE CLIENT
async function initDashboard() {
  try {
    const status = await window.desktopAPI.getStatus();
    updateStatusUI(status);

    if (shopSelect && status.targetShopId) {
      shopSelect.value = status.targetShopId;
    }

    const { printers, defaultPrinter } = await window.desktopAPI.getPrinters();
    populatePrinters(printers, status.selectedPrinter || defaultPrinter);

    if (status.isConfigured) {
      firebaseBadge.className = 'badge badge-success';
      firebaseStatusText.textContent = 'Firebase: Connected';
    } else {
      firebaseBadge.className = 'badge badge-warning';
      firebaseStatusText.textContent = 'Demo Mode (Offline)';
    }
  } catch (err) {
    console.error('Failed to init dashboard:', err);
  }
}

// 2. POPULATE PRINTER SELECTOR
function populatePrinters(printers, selected) {
  printerSelect.innerHTML = '';
  if (!printers || printers.length === 0) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = 'No printers detected';
    printerSelect.appendChild(opt);
    return;
  }

  printers.forEach((name) => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    if (name === selected) opt.selected = true;
    printerSelect.appendChild(opt);
  });
}

// 3. UPDATE STATUS UI
function updateStatusUI(status) {
  currentStatus = { ...currentStatus, ...status };

  // Auto-Print Button
  if (currentStatus.autoPrint) {
    toggleAutoPrintBtn.className = 'toggle-btn active';
    autoPrintText.textContent = 'Auto-Print: ON';
  } else {
    toggleAutoPrintBtn.className = 'toggle-btn';
    autoPrintText.textContent = 'Auto-Print: OFF';
  }

  // Dry-Run Button & Badge
  if (currentStatus.dryRun) {
    toggleDryRunBtn.className = 'toggle-btn dryrun-active';
    dryRunText.textContent = 'Dry-Run: ON (Safe)';
    modeBadge.className = 'badge badge-warning';
    modeBadge.innerHTML = '<span>🛡️ DRY-RUN: Virtual Spooling</span>';
  } else {
    toggleDryRunBtn.className = 'toggle-btn active';
    dryRunText.textContent = 'Physical Printing: ACTIVE';
    modeBadge.className = 'badge badge-success';
    modeBadge.innerHTML = '<span class="dot pulse"></span><span>⚡ HARDWARE PRINTING LIVE</span>';
  }

  // Pause Queue Button
  if (currentStatus.isPaused) {
    pauseQueueBtn.textContent = '▶️ Resume';
    pauseQueueBtn.className = 'action-btn';
    pauseQueueBtn.style.color = '#10b981';
  } else {
    pauseQueueBtn.textContent = '⏸️ Pause';
    pauseQueueBtn.className = 'action-btn warning-btn';
    pauseQueueBtn.style.color = '';
  }

  // Active Job Hero Card
  if (currentStatus.activeJob) {
    activeJobSection.classList.remove('hidden');
    const job = currentStatus.activeJob;
    const fileCount = job.files?.length || 1;
    const firstFileName = job.files?.[0]?.fileName || job.fileName || 'document.pdf';

    activeJobTitle.textContent = `Processing Order #${job.token || job.orderId}`;
    activeJobFile.textContent = `📄 ${firstFileName}${fileCount > 1 ? ` (+${fileCount - 1} more)` : ''}`;
    activeJobCopies.textContent = `📑 ${job.copies} ${job.copies === 1 ? 'Copy' : 'Copies'}`;
    activeJobColor.textContent = job.colorMode === 'color' ? '🎨 Full Color' : '⬛ B&W';
    activeJobSides.textContent = job.sides === 'double' ? '🔄 Duplex' : '📄 Single';
    activeJobPages.textContent = `📊 ~${job.pricingSnapshot?.totalSheets || job.calculatedPages || 1} sheets`;
  } else {
    activeJobSection.classList.add('hidden');
  }
}

// 4. RENDER QUEUE TABLE
function updateQueueData(data) {
  if (Array.isArray(data)) {
    cachedPending = data;
    cachedCompleted = [];
  } else if (data && data.pending) {
    cachedPending = data.pending || [];
    cachedCompleted = data.completed || [];
  }

  queueCount.textContent = cachedPending.length;
  completedCount.textContent = cachedCompleted.length;

  renderActiveTableView();
}

function renderActiveTableView() {
  const isPendingView = currentTab === 'pending';
  const list = isPendingView ? cachedPending : cachedCompleted;

  if (isPendingView) {
    queueSubtext.textContent = 'Auto-processed in FIFO order';
  } else {
    queueSubtext.textContent = 'History of completed/printed orders';
  }

  if (list.length === 0) {
    queueTableBody.innerHTML = `
      <tr class="empty-row">
        <td colspan="5">
          <div class="empty-state">
            <span class="empty-icon">${isPendingView ? '☕' : '📭'}</span>
            <p>${isPendingView ? 'Pending queue is clear. Waiting for student orders...' : 'No completed orders yet.'}</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  queueTableBody.innerHTML = list
    .map((job) => {
      const timeStr = formatTime(job.createdAt);
      const isColor = job.colorMode === 'color';
      const isFinished = job.status === 'COMPLETED' || job.status === 'PRINTED';
      const fileCount = job.files?.length || 1;
      const firstFileName = job.files?.[0]?.fileName || job.fileName || 'document.pdf';
      const displayDoc = fileCount > 1 ? `${firstFileName} (+${fileCount - 1} more)` : firstFileName;
      const totalSheets = job.pricingSnapshot?.totalSheets || job.calculatedPages || 1;

      return `
        <tr>
          <td class="token-cell">
            #${job.token || job.orderId}
            ${isFinished ? '<span style="font-size:0.65rem; color:#10b981; display:block; font-family:var(--font-main);">✓ PRINTED</span>' : ''}
          </td>
          <td>
            <div style="font-weight: 700; max-width: 190px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${firstFileName}">
              📄 ${displayDoc}
            </div>
            <div style="font-size: 0.72rem; color: var(--text-muted);">
              ${fileCount} file${fileCount > 1 ? 's' : ''} • ₹${job.totalAmount || 0}
            </div>
          </td>
          <td>
            <span style="font-weight: 700;">${job.copies || 1}×</span>
            <span style="font-size: 0.72rem; color: ${isColor ? '#f472b6' : 'var(--text-muted)'}; margin-left: 0.25rem;">
              (${isColor ? 'Color' : 'B&W'})
            </span>
          </td>
          <td>
            <span style="font-size: 0.8rem; font-weight: 600; color: #f8fafc;">
              ~${totalSheets} sh
            </span>
          </td>
          <td style="color: var(--text-muted); font-size: 0.76rem;">
            ${timeStr}
          </td>
        </tr>
      `;
    })
    .join('');
}

function formatTime(timestamp) {
  if (!timestamp) return 'Just now';
  const date = timestamp?.toMillis ? new Date(timestamp.toMillis()) : new Date(timestamp);
  return isNaN(date.getTime()) ? 'Just now' : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// 5. APPEND LOG FEED
function appendLog(logItem) {
  const entry = document.createElement('div');
  entry.className = `log-entry ${logItem.level}`;
  entry.innerHTML = `
    <span class="log-time">[${logItem.timestamp}]</span>
    <span class="log-msg">${escapeHtml(logItem.message)}</span>
  `;
  logFeed.appendChild(entry);
  logFeed.scrollTop = logFeed.scrollHeight;
}

function escapeHtml(str) {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// 6. EVENT LISTENERS
if (shopSelect) {
  shopSelect.addEventListener('change', (e) => {
    window.desktopAPI.setTargetShop(e.target.value);
  });
}

tabPendingBtn.addEventListener('click', () => {
  currentTab = 'pending';
  tabPendingBtn.className = 'tab-pill active';
  tabCompletedBtn.className = 'tab-pill';
  renderActiveTableView();
});

tabCompletedBtn.addEventListener('click', () => {
  currentTab = 'completed';
  tabCompletedBtn.className = 'tab-pill active';
  tabPendingBtn.className = 'tab-pill';
  renderActiveTableView();
});

printerSelect.addEventListener('change', (e) => {
  window.desktopAPI.setPrinter(e.target.value);
});

toggleAutoPrintBtn.addEventListener('click', () => {
  window.desktopAPI.setAutoPrint(!currentStatus.autoPrint);
});

toggleDryRunBtn.addEventListener('click', () => {
  if (currentStatus.dryRun) {
    const confirmed = confirm(
      '⚠️ SWITCH TO PHYSICAL HARDWARE PRINTING?\n\n' +
      'Raw print commands will be sent to your connected Windows printer. Ensure paper and toner are ready!'
    );
    if (confirmed) {
      window.desktopAPI.setDryRun(false);
    }
  } else {
    window.desktopAPI.setDryRun(true);
  }
});

pauseQueueBtn.addEventListener('click', () => {
  window.desktopAPI.setPaused(!currentStatus.isPaused);
});

openFolderBtn.addEventListener('click', () => {
  window.desktopAPI.openSpoolFolder();
});

clearLogsBtn.addEventListener('click', () => {
  logFeed.innerHTML = '';
});

// Real-Time Subscriptions from Main Process
window.desktopAPI.onStatusUpdate((status) => updateStatusUI(status));
window.desktopAPI.onQueueUpdate((data) => updateQueueData(data));
window.desktopAPI.onLog((logItem) => appendLog(logItem));

// Startup
initDashboard();
