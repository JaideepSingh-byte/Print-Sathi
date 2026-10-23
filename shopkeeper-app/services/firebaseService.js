/**
 * ============================================================================
 * PRINT-SATHI DESKTOP CLIENT: Firebase & Firestore Integration Service
 * ============================================================================
 * 
 * Responsibilities:
 * 1. Loads Firebase configuration from the root .env file.
 * 2. Connects to Firestore `print_jobs` collection.
 * 3. Diagnostic Logging & Flexible Casing Match:
 *    - Logs raw snapshot document count and data.
 *    - Gracefully handles case differences:
 *      * Payment: 'COMPLETED', 'completed', 'paid', 'PAID'
 *      * Status: 'QUEUED', 'queued', 'pending'
 * 4. Atomic Claiming & Lifecycle Management.
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
 * Atomic Claiming using Firestore Transaction.
 */
async function claimJobAtomically(orderId, instanceId) {
  if (!db) {
    return { success: true, order: { orderId, status: 'PRINTING' } };
  }

  const orderRef = doc(db, 'print_jobs', orderId);

  try {
    const claimedOrder = await runTransaction(db, async (transaction) => {
      const orderDoc = await transaction.get(orderRef);

      if (!orderDoc.exists()) {
        throw new Error('ORDER_NOT_FOUND');
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

      // If already claimed by another instance
      if (data.status === 'PRINTING' && data.claimedBy && data.claimedBy !== instanceId) {
        throw new Error(`ORDER_ALREADY_CLAIMED: Claimed by ${data.claimedBy}`);
      }

      // Transition to PRINTING state
      transaction.update(orderRef, {
        status: 'PRINTING',
        printStatus: 'PRINTING',
        claimedBy: instanceId,
        claimedAt: serverTimestamp(),
      });

      return { id: orderDoc.id, ...data, status: 'PRINTING', claimedBy: instanceId };
    });

    return { success: true, order: claimedOrder };
  } catch (error) {
    return { success: false, reason: error.message };
  }
}

async function markJobPrintSubmitted(orderId, metadata = {}) {
  if (!db) return;
  const orderRef = doc(db, 'print_jobs', orderId);
  await updateDoc(orderRef, {
    status: 'PRINT_SUBMITTED',
    printStatus: 'PRINT_SUBMITTED',
    spoolerSubmittedAt: serverTimestamp(),
    ...metadata,
  });
}

async function markJobCompleted(orderId, metadata = {}) {
  if (!db) return;
  const orderRef = doc(db, 'print_jobs', orderId);
  await updateDoc(orderRef, {
    status: 'COMPLETED',
    printStatus: 'COMPLETED',
    printCompletedAt: serverTimestamp(),
    ...metadata,
  });
}

async function markJobFailed(orderId, errorReason, metadata = {}) {
  if (!db) return;
  const orderRef = doc(db, 'print_jobs', orderId);
  await updateDoc(orderRef, {
    status: 'FAILED',
    printStatus: 'FAILED',
    failureReason: errorReason,
    failedAt: serverTimestamp(),
    ...metadata,
  });
}

async function markJobNeedsVerification(orderId, reason) {
  if (!db) return;
  const orderRef = doc(db, 'print_jobs', orderId);
  await updateDoc(orderRef, {
    status: 'NEEDS_VERIFICATION',
    printStatus: 'NEEDS_VERIFICATION',
    verificationReason: reason,
    flaggedAt: serverTimestamp(),
  });
}

async function recoverStaleJobs(instanceId) {
  if (!db) return [];
  try {
    const q = query(
      collection(db, 'print_jobs'),
      where('status', '==', 'PRINTING'),
      where('claimedBy', '==', instanceId)
    );

    const snapshot = await getDocs(q);
    const recovered = [];

    for (const docSnap of snapshot.docs) {
      await markJobNeedsVerification(
        docSnap.id,
        'App restarted while order was in PRINTING state. Verify physical printer tray before retrying.'
      );
      recovered.push(docSnap.id);
    }

    if (recovered.length > 0) {
      console.warn(`[Startup Recovery] Flagged ${recovered.length} interrupted job(s) for verification:`, recovered);
    }
    return recovered;
  } catch (err) {
    console.error('[Startup Recovery] Error checking stale jobs:', err.message);
    return [];
  }
}

/**
 * ============================================================================
 * DIAGNOSTIC & REAL-TIME QUEUE LISTENER: subscribeToEligibleQueue
 * ============================================================================
 * 
 * 1. Listens to the `print_jobs` collection.
 * 2. Emits raw diagnostic logs showing document IDs and fields.
 * 3. Categorizes documents into:
 *    - `pendingQueue`: Active jobs awaiting printing (QUEUED / PENDING)
 *    - `completedList`: History of printed / completed jobs (COMPLETED / PRINTED)
 * 4. Sorts pending queue by creation timestamp (FIFO).
 */
function subscribeToEligibleQueue(onQueueUpdate, onError, onRawDiagnostics) {
  if (!db) {
    return () => {};
  }

  // Raw collection reference (avoids strict case mismatch and composite index dropouts)
  const collectionRef = collection(db, 'print_jobs');

  return onSnapshot(
    collectionRef,
    (snapshot) => {
      // Step 1: Raw Diagnostics Logging (as requested)
      console.log('--- FIRESTORE DIAGNOSTICS ---');
      console.log('Raw docs count received:', snapshot.docs.length);

      const allDocs = [];
      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data();
        console.log('Doc ID:', docSnap.id, 'Data:', {
          token: data.token,
          fileName: data.fileName,
          status: data.status,
          printStatus: data.printStatus,
          paymentStatus: data.paymentStatus,
          createdAt: data.createdAt,
        });

        allDocs.push({
          id: docSnap.id,
          orderId: docSnap.id,
          ...data,
        });
      });

      if (typeof onRawDiagnostics === 'function') {
        onRawDiagnostics(allDocs);
      }

      // Step 2: Re-apply exact targeted filter criteria with resilient case handling
      const eligibleQueue = allDocs.filter((data) => {
        // Must be paid
        const paid = isPaymentVerified(data.paymentStatus);
        // Must be in active queue (QUEUED or PENDING) and not yet finished
        const queued = isJobQueued(data.status, data.printStatus);
        const notFinished = data.status !== 'COMPLETED' && data.status !== 'PRINTED';

        return paid && queued && notFinished;
      });

      // Step 3: Sort by createdAt ascending (FIFO - Earliest orders first)
      eligibleQueue.sort((a, b) => {
        const timeA = a.createdAt?.toMillis
          ? a.createdAt.toMillis()
          : new Date(a.createdAt || 0).getTime();
        const timeB = b.createdAt?.toMillis
          ? b.createdAt.toMillis()
          : new Date(b.createdAt || 0).getTime();
        return (timeA || 0) - (timeB || 0);
      });

      console.log(`[Queue Filter] Filtered ${eligibleQueue.length} eligible queued job(s) out of ${allDocs.length} total.`);
      onQueueUpdate(eligibleQueue, allDocs);
    },
    (error) => {
      console.error('Firestore listener error:', error);
      if (onError) onError(error);
    }
  );
}

module.exports = {
  db,
  isConfigured,
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
