/**
 * ============================================================================
 * PRINT-SATHI: Firebase Storage & Cloud Firestore Integration Service
 * ============================================================================
 * 
 * 🏢 ARCHITECTURE OVERVIEW:
 * ----------------------------------------------------------------------------
 * 1. Cloud Firestore (100% FREE Spark Plan - No Credit Card Needed):
 *    - Stores structured print job records: Order ID, Token, Copies, Price.
 *    - Collection: `print_jobs`
 *    - Document ID: `orderId` (e.g. "PS-8421")
 * 
 * 2. Real-Time Synchronization (onSnapshot):
 *    - Automatically streams active paid jobs where:
 *      * paymentStatus == "COMPLETED"
 *      * status == "QUEUED"
 *    - Sorts earliest jobs first (FIFO: First-In, First-Out).
 *    - Cleaning up unsubscribe function prevents memory leaks.
 * ============================================================================
 */

import { initializeApp, getApps } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  updateDoc,
  collection,
  query,
  where,
  onSnapshot,
  serverTimestamp 
} from 'firebase/firestore';
import { 
  getStorage, 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from 'firebase/storage';

/**
 * Helper to clean environment variables (strips accidental spaces, quotes, commas, or semicolons)
 */
const cleanEnv = (val) => {
  if (!val) return '';
  return val
    .toString()
    .trim()
    .replace(/[,;]+$/, '')
    .replace(/^["']|["']$/g, '')
    .trim();
};

/**
 * Fast Promise Timeout Guard:
 * Prevents Firebase SDK from hanging for minutes when a cloud bucket isn't provisioned.
 */
const withTimeout = (promise, ms, errorMessage) => {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), ms)
    ),
  ]);
};

// Read configuration from Vite environment variables (.env file)
const firebaseConfig = {
  apiKey: cleanEnv(import.meta.env.VITE_FIREBASE_API_KEY),
  authDomain: cleanEnv(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN),
  projectId: cleanEnv(import.meta.env.VITE_FIREBASE_PROJECT_ID),
  storageBucket: cleanEnv(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: cleanEnv(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID),
  appId: cleanEnv(import.meta.env.VITE_FIREBASE_APP_ID),
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  firebaseConfig.apiKey.length > 5 &&
  !firebaseConfig.apiKey.includes('your_api_key')
);

// Initialize Firebase instances
let dbInstance = null;
let storageInstance = null;

if (isFirebaseConfigured) {
  try {
    const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
    dbInstance = getFirestore(app);
    storageInstance = getStorage(app);
    console.log('🔥 [Print-Sathi] Firebase initialized for:', firebaseConfig.projectId);
  } catch (error) {
    console.error('⚠️ [Print-Sathi] Firebase initialization error:', error);
  }
}

export const db = dbInstance;
export const storage = storageInstance;

const LOCAL_STORAGE_KEY = 'print_sathi_orders';

/**
 * Generates a unique 4-digit Token & Order ID (e.g. "#PS-8421")
 */
export function generateTokenId() {
  const random4Digit = Math.floor(1000 + Math.random() * 9000).toString();
  return {
    token: random4Digit,
    orderId: `PS-${random4Digit}`,
  };
}

/**
 * Submits a new print job.
 * Guaranteed never to freeze thanks to fast timeout guards.
 */
export async function submitPrintJob(jobConfig, file) {
  const { token, orderId } = generateTokenId();

  // Create immediate local access URL for previewing
  let uploadedFileUrl = file ? URL.createObjectURL(file) : '';
  let storageUploaded = false;
  let firestoreSaved = false;

  // --- STEP 1: ATTEMPT FIREBASE STORAGE (Guard with 3.5s timeout) ---
  if (isFirebaseConfigured && storage && file) {
    try {
      console.log(`📤 [Storage] Attempting upload with 3.5s timeout for ${file.name}...`);
      const storageReference = ref(storage, `print_jobs/${orderId}/${file.name}`);
      
      const uploadPromise = uploadBytes(storageReference, file, {
        contentType: 'application/pdf',
      });

      const uploadResult = await withTimeout(
        uploadPromise,
        3500,
        'Storage bucket not upgraded to Blaze or timed out'
      );

      uploadedFileUrl = await getDownloadURL(uploadResult.ref);
      storageUploaded = true;
      console.log(`✅ [Storage] Uploaded to cloud bucket! Link:`, uploadedFileUrl);
    } catch (storageErr) {
      console.warn(
        `ℹ️ [Storage Skipped] ${storageErr.message}. Storing PDF reference in local memory; continuing directly to Firestore!`
      );
    }
  }

  // --- STEP 2: SAVE TO CLOUD FIRESTORE (100% FREE SPARK PLAN) ---
  const orderPayload = {
    orderId,
    token,
    fileName: file ? file.name : 'document.pdf',
    fileSize: file ? file.size : 0,
    fileUrl: uploadedFileUrl,
    totalPages: jobConfig.totalPages || 1,
    calculatedPages: jobConfig.calculatedPages || 1,
    copies: jobConfig.copies || 1,
    colorMode: jobConfig.colorMode || 'bw',
    pageRangeMode: jobConfig.pageRangeMode || 'all',
    pageRangeString: jobConfig.pageRangeString || 'All Pages',
    sides: jobConfig.sides || 'single',
    ratePerPage: jobConfig.ratePerPage || 1,
    totalAmount: jobConfig.totalAmount || 0,
    paymentStatus: 'COMPLETED', // Standardized payment status
    status: 'QUEUED',          // Standardized queue status
    printStatus: 'QUEUED',
    createdAt: serverTimestamp(),
    pickupCounter: 'Counter 1 (Main Xerox Center, Student Plaza)',
  };

  if (isFirebaseConfigured && db) {
    try {
      console.log(`📝 [Firestore] Saving order PS-${token} to 'print_jobs' collection...`);
      const firestorePromise = setDoc(doc(db, 'print_jobs', orderId), orderPayload);
      await withTimeout(
        firestorePromise,
        4000,
        'Firestore request timed out (verify database is created in Test Mode)'
      );

      firestoreSaved = true;
      console.log(`🎉 [Firestore] Successfully saved into Cloud Firestore collection 'print_jobs'!`);
    } catch (firestoreErr) {
      console.warn('⚠️ [Firestore Warning] Could not reach Firestore in time:', firestoreErr.message);
    }
  }

  const completeOrder = {
    ...orderPayload,
    createdAt: new Date().toISOString(),
    isLiveCloud: firestoreSaved || storageUploaded,
    firestoreSaved,
    storageUploaded,
  };

  // Always save locally in browser storage and broadcast
  try {
    const existing = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
    existing.unshift(completeOrder);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(existing.slice(0, 30)));
    // Notify local listeners
    window.dispatchEvent(new CustomEvent('print-sathi-job-update'));
  } catch (err) {
    console.warn(err);
  }

  return {
    success: true,
    order: completeOrder,
    isLiveCloud: firestoreSaved || storageUploaded,
  };
}

/**
 * ============================================================================
 * REAL-TIME FIRESTORE LISTENER: subscribeToPrintQueue (onSnapshot)
 * ============================================================================
 * 
 * What this does in plain language:
 * 1. Sets up an active, real-time listener using Firestore's `onSnapshot`.
 * 2. Filters documents in the `print_jobs` collection where:
 *    - `paymentStatus == "COMPLETED"`
 *    - `status == "QUEUED"`
 * 3. Sorts the incoming jobs by `createdAt` ascending (Earliest paid jobs first).
 * 4. Returns an `unsubscribe()` function so React components can detach the listener
 *    inside `useEffect` cleanup, preventing memory leaks.
 * 
 * @param {Function} onQueueUpdate - Callback receiving array of queued orders
 * @param {Function} onError - Callback receiving error object if listener fails
 * @returns {Function} Unsubscribe function
 */
export function subscribeToPrintQueue(onQueueUpdate, onError) {
  // Option A: Real Firestore Listener
  if (isFirebaseConfigured && db) {
    try {
      console.log('📡 [Firestore] Attaching real-time onSnapshot listener to "print_jobs"...');
      
      // Query constraints: paymentStatus == 'COMPLETED' and status == 'QUEUED'
      const q = query(
        collection(db, 'print_jobs'),
        where('paymentStatus', '==', 'COMPLETED'),
        where('status', '==', 'QUEUED')
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const liveQueue = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            liveQueue.push({
              id: docSnap.id,
              orderId: docSnap.id,
              ...data,
            });
          });

          // Sort ascending by creation timestamp (FIFO: Earliest orders at the top)
          liveQueue.sort((a, b) => {
            const timeA = a.createdAt?.toMillis
              ? a.createdAt.toMillis()
              : new Date(a.createdAt || 0).getTime();
            const timeB = b.createdAt?.toMillis
              ? b.createdAt.toMillis()
              : new Date(b.createdAt || 0).getTime();
            return timeA - timeB;
          });

          console.log(`📥 [Firestore Real-Time Sync] ${liveQueue.length} jobs currently QUEUED.`);
          onQueueUpdate(liveQueue);
        },
        (error) => {
          console.error('❌ [Firestore onSnapshot Error]:', error);
          if (onError) onError(error);
          // Graceful fallback to local queue if cloud query experiences connection issues
          fallbackLocalQueue(onQueueUpdate);
        }
      );

      return unsubscribe;
    } catch (err) {
      console.error('Error establishing Firestore onSnapshot:', err);
    }
  }

  // Option B: Resilient Local Fallback Listener (Demo mode / Offline)
  return fallbackLocalQueue(onQueueUpdate);
}

/**
 * Helper for local real-time queue syncing when Firebase keys are not present
 */
function fallbackLocalQueue(onQueueUpdate) {
  const readQueue = () => {
    try {
      const allOrders = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
      const activeQueue = allOrders.filter(
        (o) =>
          (o.status === 'QUEUED' || o.printStatus === 'queued' || o.printStatus === 'QUEUED') &&
          (o.paymentStatus === 'COMPLETED' || o.paymentStatus === 'paid')
      );
      // Sort ascending (earliest first)
      activeQueue.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
      onQueueUpdate(activeQueue);
    } catch (err) {
      onQueueUpdate([]);
    }
  };

  readQueue();

  const handleUpdate = () => readQueue();
  window.addEventListener('print-sathi-job-update', handleUpdate);
  window.addEventListener('storage', handleUpdate);

  return () => {
    window.removeEventListener('print-sathi-job-update', handleUpdate);
    window.removeEventListener('storage', handleUpdate);
  };
}

/**
 * ============================================================================
 * FIRESTORE ACTION: markJobAsPrinted
 * ============================================================================
 * 
 * What this does in plain language:
 * 1. Updates the order document in Firestore to set `status: "PRINTED"`.
 * 2. Because the onSnapshot listener filters for `status == "QUEUED"`,
 *    this update automatically causes the item to disappear from the shopkeeper's
 *    live queue in real time without any page refresh!
 * 
 * @param {string} orderId - Unique document ID (e.g. "PS-8421")
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function markJobAsPrinted(orderId) {
  console.log(`🖨️ [Firestore] Marking order ${orderId} as PRINTED...`);

  // 1. Update in Cloud Firestore
  if (isFirebaseConfigured && db) {
    try {
      const docRef = doc(db, 'print_jobs', orderId);
      await updateDoc(docRef, {
        status: 'PRINTED',
        printStatus: 'PRINTED',
        printedAt: serverTimestamp(),
      });
      console.log(`✅ [Firestore] Document ${orderId} updated to PRINTED in cloud!`);
    } catch (cloudErr) {
      console.warn('⚠️ [Firestore Update Warning]:', cloudErr.message);
    }
  }

  // 2. Always update local cache so demo mode & offline views stay in sync
  try {
    const existing = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
    const updated = existing.map((order) => {
      if (order.orderId === orderId || order.id === orderId) {
        return {
          ...order,
          status: 'PRINTED',
          printStatus: 'PRINTED',
          printedAt: new Date().toISOString(),
        };
      }
      return order;
    });
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('print-sathi-job-update'));
  } catch (err) {
    console.warn(err);
  }

  return { success: true };
}

/**
 * Retrieves the list of recent jobs
 */
export function getRecentPrintJobs() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
  } catch (err) {
    return [];
  }
}

/**
 * Clears saved local queue
 */
export function clearOrderHistory() {
  try {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  } catch (err) {
    console.warn(err);
  }
}
