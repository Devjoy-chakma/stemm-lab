import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';

import app from './firebase';

const storage = getStorage(app);

/**
 * Upload a local file (file:// URI from expo-camera or similar) to
 * Firebase Storage and return its public download URL.
 *
 * @param localUri - Local file URI (file://...)
 * @param remotePath - Where to store in the bucket, e.g.
 *                     'videos/parachute/12345_abc123.mov'
 * @returns The downloadable URL of the uploaded file
 */
export async function uploadVideo(
  localUri: string,
  remotePath: string
): Promise<string> {
  // React Native fetch can read file:// URIs and produce a Blob that
  // firebase/storage accepts. (Documented Firebase pattern for RN.)
  const response = await fetch(localUri);
  const blob = await response.blob();

  const storageRef = ref(storage, remotePath);
  await uploadBytes(storageRef, blob, {
    contentType: blob.type || 'video/mp4',
  });

  return await getDownloadURL(storageRef);
}

/**
 * Build a unique storage path for a parachute drop video, preserving
 * the original file extension so playback clients know the format.
 */
export function makeParachuteVideoPath(originalUri: string): string {
  const ext = (originalUri.split('.').pop() || 'mov').toLowerCase();
  const stamp = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  return `videos/parachute/${stamp}_${rand}.${ext}`;
}
