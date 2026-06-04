// Thin wrapper around Firebase Anonymous Authentication.
//
// We don't ask the kids to register or log into Firebase — the team
// PIN flow stays exactly as it was. But every signed-in team session
// is silently backed by a Firebase Auth anonymous UID so Firestore
// writes are authenticated (and the rules can be tightened to
// `request.auth != null` once we're out of dev).

import { signInAnonymously } from 'firebase/auth';

import { auth } from './firebase';

/**
 * Make sure the app has an authenticated Firebase user. Returns the
 * UID on success, or null on failure (e.g. offline / Auth service
 * disabled). Safe to call repeatedly — reuses the existing session
 * if one is already in memory.
 */
export async function ensureAnonymousAuth(): Promise<string | null> {
  try {
    if (auth.currentUser) return auth.currentUser.uid;
    const cred = await signInAnonymously(auth);
    return cred.user.uid;
  } catch (e) {
    console.warn('Anonymous Firebase auth failed:', e);
    return null;
  }
}
