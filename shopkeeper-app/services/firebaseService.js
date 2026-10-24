/**
 * ============================================================================
 * PRINT-SATHI DESKTOP CLIENT: Firebase & Firestore Integration Service
 * ============================================================================
 * 
 * Responsibilities:
 * 1. Loads Firebase configuration from the root .env file.
 * 2. Connects to Firestore `orders` collection (with dual-read fallback to `print_jobs`).
 * 3. Filters orders by `shopId` for multi-shop counter segregation.
 * 4. Dual-read adapter normalizes multi-file and legacy single-file jobs.
 * 5. Atomic Claiming & Lifecycle Management via transactions.
 */

const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const { initializeApp, getApps } = require('firebase/app');
const {
  getFirestore,
  doc,
  collection,
  query,
  where,
  onSnapshot,
  runTransaction,
  updateDoc,
  getDocs,
  serverTimestamp,
} = require('firebase/firestore');

// Attempt to load .env from shopkeeper-app directory or parent root
const rootEnvPath = path.resolve(__dirname, '../../.env');
const localEnvPath = path.resolve(__dirname, '../.env');

if (fs.existsSync(localEnvPath)) {
  dotenv.config({ path: localEnvPath });
} else if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
}

const cleanEnv = (val) => {
  if (!val) return '';
  return val.toString().trim().replace(/[,;]+$/, '').replace(/^["']|["']$/g, '').trim();
};

const firebaseConfig = {
  apiKey: cleanEnv(process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY),
  authDomain: cleanEnv(process.env.VITE_FIREBASE_AUTH_DOMAIN || process.env.FIREBASE_AUTH_DOMAIN),
  projectId: cleanEnv(process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID),
  storageBucket: cleanEnv(process.env.VITE_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET),
  messagingSenderId: cleanEnv(process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || process.env.FIREBASE_MESSAGING_SENDER_ID),
  appId: cleanEnv(process.env.VITE_FIREBASE_APP_ID || process.env.FIREBASE_APP_ID),
};

const isConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  firebaseConfig.apiKey.length > 5 &&
  !firebaseConfig.apiKey.includes('your_api_key')
);

let db = null;

if (isConfigured) {
  try {
    const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
    db = getFirestore(app);
    console.log('🔥 [FirebaseService] Connected to Cloud Firestore for project:', firebaseConfig.projectId);
  } catch (err) {
    console.error('❌ [FirebaseService] Initialization failed:', err.message);
  }
} else {
  console.warn('⚠️ [FirebaseService] Firebase keys not configured. Running in Local Simulation Mode.');
}

/**
 * Normalizes payment status check (handles 'COMPLETED', 'PAID', 'paid', 'completed')
 */
function isPaymentVerified(paymentStatus) {
  if (!paymentStatus) return false;
  const normalized = paymentStatus.toString().trim().toUpperCase();
  return normalized === 'COMPLETED' || normalized === 'PAID';
}

/**
 * Normalizes queued status check (handles 'QUEUED', 'queued', 'pending')
 */
function isJobQueued(status, printStatus) {
  const s = (status || '').toString().trim().toUpperCase();
  const ps = (printStatus || '').toString().trim().toUpperCase();
  return s === 'QUEUED' || s === 'PENDING' || ps === 'QUEUED';
}

/**
 * Dual-Read Normalization Adapter for Desktop Client
 */
function normalizeDesktopOrder(docData) {
  if (!docData) return null;

  const orderId = docData.orderId || docData.id || 'PS-0000';
  const token = docData.token || orderId.replace(/^PS-/, '') || '0000';
  const shopId = docData.shopId || 'shop_main_xerox';
  const status = (docData.status || docData.printStatus || 'QUEUED').toUpperCase();
  const paymentStatus = (docData.paymentStatus || 'COMPLETED').toUpperCase();

  let files = [];
  if (Array.isArray(docData.files) && docData.files.length > 0) {
    files = docData.files.map((f, i) => ({
      fileId: f.fileId || `file_${i}`,
      fileName: f.fileName || f.name || 'document.pdf',
      fileUrl: f.fileUrl || '',
      fileSize: f.fileSize || f.size || 0,
      totalPages: f.totalPages || 1,
      calculatedPages: f.calculatedPages || 1,
      copies: f.copies || 1,
      colorMode: f.colorMode || 'bw',
      sides: f.sides || 'single',
      pageRangeMode: f.pageRangeMode || 'all',
      pageRangeString: f.pageRangeString || `All (${f.totalPages || 1} pgs)`,
      ratePerPage: f.ratePerPage || 2,
      itemTotal: f.itemTotal || 0,
    }));
  } else {
    // Legacy single-file synthesis
    files = [
      {
        fileId: 'file_0',
        fileName: docData.fileName || 'document.pdf',
        fileUrl: docData.fileUrl || '',
        fileSize: docData.fileSize || 0,
        totalPages: docData.totalPages || 1,
        calculatedPages: docData.calculatedPages || docData.totalPages || 1,
        copies: docData.copies || 1,
        colorMode: docData.colorMode || 'bw',
        sides: docData.sides || 'single',
        pageRangeMode: docData.pageRangeMode || 'all',
        pageRangeString: docData.pageRangeString || `All (${docData.totalPages || 1} pgs)`,
        ratePerPage: docData.ratePerPage || 2,
        itemTotal: docData.totalAmount || 0,
      },
    ];
  }

  return {
    ...docData,
    id: orderId,
    orderId,
    token,
    shopId,
    status,
    paymentStatus,
    files,
    fileName: files[0]?.fileName || docData.fileName || 'document.pdf',
    fileUrl: files[0]?.fileUrl || docData.fileUrl || '',
    calculatedPages: docData.calculatedPages || files.reduce((acc, f) => acc + (f.calculatedPages || 1), 0),
    copies: files[0]?.copies || docData.copies || 1,
    colorMode: files[0]?.colorMode || docData.colorMode || 'bw',
    sides: files[0]?.sides || docData.sides || 'single',
  };
}

/**
 * Atomic Claiming using Firestore Transaction (Checks 'orders' first, then 'print_jobs')
 */
async function claimJobAtomically(orderId, instanceId) {
  if (!db) {
    return { success: true, order: { orderId, status: 'PRINTING' } };
  }

  // Determine target collection
  let targetCollection = 'orders';
  let orderRef = doc(db, 'orders', orderId);

  try {
    const claimedOrder = await runTransaction(db, async (transaction) => {
      let orderDoc = await transaction.get(orderRef);

      if (!orderDoc.exists()) {
        // Fallback to legacy print_jobs collection
        targetCollection = 'print_jobs';
        orderRef = doc(db, 'print_jobs', orderId);
        orderDoc = await transaction.get(orderRef);

        if (!orderDoc.exists()) {
          throw new Error('ORDER_NOT_FOUND');
        }
      }

      const data = orderDoc.data();

      // Guard 1: Verify payment flag
      if (!isPaymentVerified(data.paymentStatus)) {
        throw new Error(`PAYMENT_UNVERIFIED: Status is "${data.paymentStatus}"`);
      }

      // Guard 2: Verify queue state
      if (!isJobQueued(data.status, data.printStatus) && data.status !== 'PRINTING') {
        throw new Error(`ORDER_NOT_QUEUED: Current status is "${data.status}"`);
      }

      // Guard 3: If already claimed by another instance
      if (data.status === 'PRINTING' && data.claimedBy && data.claimedBy !== instanceId) {
        throw new Error(`ORDER_ALREADY_CLAIMED: Claimed by ${data.claimedBy}`);
      }

      // Transition to PRINTING state
      const updatePayload = {
        status: 'PRINTING',
        printStatus: 'PRINTING',
        claimedBy: instanceId,
        claimedAt: serverTimestamp(),
      };

      transaction.update(orderRef, updatePayload);

      // Dual-sync update to both collections if possible
      try {
        const otherColl = targetCollection === 'orders' ? 'print_jobs' : 'orders';
        const otherRef = doc(db, otherColl, orderId);
        transaction.update(otherRef, updatePayload);
      } catch (e) {}

      return normalizeDesktopOrder({ id: orderDoc.id, ...data, status: 'PRINTING', claimedBy: instanceId });
    });

    return { success: true, order: claimedOrder };
  } catch (error) {
    return { success: false, reason: error.message };
  }
}

async function updateBothCollections(orderId, updateData) {
  if (!db) return;
  try {
    await updateDoc(doc(db, 'orders', orderId), updateData);
  } catch (e) {}
  try {
    await updateDoc(doc(db, 'print_jobs', orderId), updateData);
  } catch (e) {}
}

async function markJobPrintSubmitted(orderId, metadata = {}) {
  await updateBothCollections(orderId, {
    status: 'PRINT_SUBMITTED',
    printStatus: 'PRINT_SUBMITTED',
    spoolerSubmittedAt: serverTimestamp(),
    ...metadata,
  });
}

async function markJobCompleted(orderId, metadata = {}) {
  await updateBothCollections(orderId, {
    status: 'COMPLETED',
    printStatus: 'COMPLETED',
    printCompletedAt: serverTimestamp(),
    ...metadata,
  });
}

async function markJobFailed(orderId, errorReason, metadata = {}) {
  await updateBothCollections(orderId, {
    status: 'FAILED',
    printStatus: 'FAILED',
    failureReason: errorReason,
    failedAt: serverTimestamp(),
    ...metadata,
  });
}

async function markJobNeedsVerification(orderId, reason) {
  await updateBothCollections(orderId, {
    status: 'NEEDS_VERIFICATION',
    printStatus: 'NEEDS_VERIFICATION',
    verificationReason: reason,
    flaggedAt: serverTimestamp(),
  });
}

async function recoverStaleJobs(instanceId) {
  if (!db) return [];
  const recovered = [];

  const collectionsToCheck = ['orders', 'print_jobs'];
  for (const colName of collectionsToCheck) {
    try {
      const q = query(
        collection(db, colName),
        where('status', '==', 'PRINTING'),
        where('claimedBy', '==', instanceId)
      );

      const snapshot = await getDocs(q);
      for (const docSnap of snapshot.docs) {
        if (!recovered.includes(docSnap.id)) {
          await markJobNeedsVerification(
            docSnap.id,
            'App restarted while order was in PRINTING state. Verify physical printer tray before retrying.'
          );
          recovered.push(docSnap.id);
        }
      }
    } catch (err) {
      console.warn(`[Startup Recovery] Warning checking ${colName}:`, err.message);
    }
  }

  if (recovered.length > 0) {
    console.warn(`[Startup Recovery] Flagged ${recovered.length} interrupted job(s) for verification:`, recovered);
  }
  return recovered;
}

/**
 * ============================================================================
 * DIAGNOSTIC & REAL-TIME QUEUE LISTENER: subscribeToEligibleQueue
 * ============================================================================
 * 
 * Subscribes to `orders` collection filtered by target `shopId` (or all if not specified).
 * If `orders` returns 0 docs, also inspects `print_jobs` for backwards compatibility.
 */
function subscribeToEligibleQueue(targetShopId, onQueueUpdate, onError, onRawDiagnostics) {
  if (!db) {
    return () => {};
  }

  // Listen to `orders` collection
  const ordersRef = collection(db, 'orders');

  return onSnapshot(
    ordersRef,
    async (snapshot) => {
      console.log('--- DESK CONSOLE FIRESTORE SNAPSHOT ---');
      console.log(`Raw orders received: ${snapshot.docs.length} (Filter shopId: "${targetShopId || 'ALL'}")`);

      let allDocs = [];
      snapshot.docs.forEach((docSnap) => {
        const normalized = normalizeDesktopOrder({ id: docSnap.id, ...docSnap.data() });
        if (normalized) {
          allDocs.push(normalized);
        }
      });

      // If orders collection is empty, check legacy print_jobs collection
      if (allDocs.length === 0) {
        try {
          const legacySnapshot = await getDocs(collection(db, 'print_jobs'));
          legacySnapshot.forEach((docSnap) => {
            const normalized = normalizeDesktopOrder({ id: docSnap.id, ...docSnap.data() });
            if (normalized) allDocs.push(normalized);
          });
        } catch (legacyErr) {
          console.warn('Legacy query skipped:', legacyErr.message);
        }
      }

      if (typeof onRawDiagnostics === 'function') {
        onRawDiagnostics(allDocs);
      }

      // Filter eligible queue items
      const eligibleQueue = allDocs.filter((data) => {
        // Shop filter: if targetShopId is set and data has a shopId, match it
        const matchesShop = !targetShopId || !data.shopId || data.shopId === targetShopId || targetShopId === 'ALL';
        // Payment verified
        const paid = isPaymentVerified(data.paymentStatus);
        // Active queue state
        const queued = isJobQueued(data.status, data.printStatus);
        const notFinished = data.status !== 'COMPLETED' && data.status !== 'PRINTED';

        return matchesShop && paid && queued && notFinished;
      });

      // FIFO sort by creation timestamp
      eligibleQueue.sort((a, b) => {
        const timeA = a.createdAt?.toMillis
          ? a.createdAt.toMillis()
          : new Date(a.createdAt || 0).getTime();
        const timeB = b.createdAt?.toMillis
          ? b.createdAt.toMillis()
          : new Date(b.createdAt || 0).getTime();
        return (timeA || 0) - (timeB || 0);
      });

      console.log(`[Queue Filter] ${eligibleQueue.length} eligible job(s) ready for spooling.`);
      onQueueUpdate(eligibleQueue, allDocs);
    },
    (error) => {
      console.error('Firestore listener error in Desk Console:', error);
      if (onError) onError(error);
    }
  );
}

module.exports = {
  db,
  isConfigured,
  normalizeDesktopOrder,
  claimJobAtomically,
  markJobPrintSubmitted,
  markJobCompleted,
  markJobFailed,
  markJobNeedsVerification,
  recoverStaleJobs,
  subscribeToEligibleQueue,
  isPaymentVerified,
  isJobQueued,
};
