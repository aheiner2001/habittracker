/**
 * Firebase Client & Cloud Sync Layer for LifeQuest / Become RPG
 * Project: sandbox-ed1e2
 */

export const firebaseConfig = {
  apiKey: "AIzaSyCyXhVv05H51JMmtZ3gQ_zSWPQ_3PIHwfk",
  authDomain: "sandbox-ed1e2.firebaseapp.com",
  projectId: "sandbox-ed1e2",
  storageBucket: "sandbox-ed1e2.firebasestorage.app",
  messagingSenderId: "741844679458",
  appId: "1:741844679458:web:ad88427955e1ad24ac837b"
};

let firebaseApp = null;
let authInstance = null;
let firestoreInstance = null;
let currentUser = null;
let syncTimeout = null;

export async function initFirebase(onUserReady = null) {
  if (typeof window === 'undefined') {
    return { ok: false, reason: 'SSR/Node environment' };
  }

  try {
    const { initializeApp, getApps } = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js');
    const { getAuth, signInAnonymously, onAuthStateChanged, GoogleAuthProvider, linkWithPopup } = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js');
    const { getFirestore, doc, setDoc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js');

    if (!getApps().length) {
      firebaseApp = initializeApp(firebaseConfig);
    } else {
      firebaseApp = getApps()[0];
    }

    authInstance = getAuth(firebaseApp);
    firestoreInstance = getFirestore(firebaseApp);

    onAuthStateChanged(authInstance, async (user) => {
      currentUser = user;
      if (!user) {
        try {
          const cred = await signInAnonymously(authInstance);
          currentUser = cred.user;
        } catch (authErr) {
          console.warn('Firebase anonymous sign-in error:', authErr);
        }
      }
      if (onUserReady && currentUser) {
        onUserReady(currentUser);
      }
    });

    return {
      ok: true,
      app: firebaseApp,
      auth: authInstance,
      db: firestoreInstance,
      getUid: () => currentUser?.uid || null,
      isAnonymous: () => currentUser?.isAnonymous ?? true
    };
  } catch (err) {
    console.warn('Firebase initialization skipped or failed (offline mode):', err);
    return { ok: false, error: err };
  }
}

export function debounceCloudSync(state, delayMs = 2000) {
  if (syncTimeout) {
    clearTimeout(syncTimeout);
  }

  syncTimeout = setTimeout(async () => {
    if (!firestoreInstance || !currentUser) return;
    try {
      const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js');
      const userRef = doc(firestoreInstance, 'users', currentUser.uid);
      await setDoc(userRef, {
        updatedAt: new Date().toISOString(),
        rpg: state.rpg || {},
        settings: state.settings || {},
        habits: state.habits || [],
        habitCompletions: state.habitCompletions || {},
        foodLogs: state.foodLogs || {},
        thoughtRecords: state.thoughtRecords || [],
        whyWall: state.whyWall || [],
        fasts: state.fasts || []
      }, { merge: true });
      console.log('Synced state to Firebase Cloud Firestore for user:', currentUser.uid);
    } catch (syncErr) {
      console.warn('Firebase cloud sync failed (will retry on next change):', syncErr);
    }
  }, delayMs);
}

export async function linkGoogleAccount() {
  if (!authInstance || !currentUser) {
    throw new Error('Firebase authentication is not ready.');
  }
  const { GoogleAuthProvider, linkWithPopup } = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js');
  const provider = new GoogleAuthProvider();
  return await linkWithPopup(currentUser, provider);
}
