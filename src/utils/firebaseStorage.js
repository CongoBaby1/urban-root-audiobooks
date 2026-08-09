/**
 * Firebase Storage utility for uploading & retrieving audiobook sample previews.
 * Uploads the 30-second WAV preview to Firebase Storage and returns a permanent
 * public download URL that works across all browsers and devices.
 */

import { storage } from '../firebase';
import { ref, uploadString, getDownloadURL, uploadBytes } from 'firebase/storage';

/**
 * Uploads a base64 data URL (WAV) to Firebase Storage.
 * Returns the permanent public download URL, or null on failure.
 *
 * @param {string} bookId - The unique audiobook ID
 * @param {string} dataUrl - The base64 data URL of the WAV preview (data:audio/wav;base64,...)
 * @returns {Promise<string|null>}
 */
export async function uploadSampleToStorage(bookId, dataUrl) {
  try {
    if (!bookId || !dataUrl || !dataUrl.startsWith('data:')) return null;

    const storageRef = ref(storage, `samples/${bookId}_preview.wav`);

    // Convert data URL to Blob for upload
    const response = await fetch(dataUrl);
    const blob = await response.blob();

    const snapshot = await uploadBytes(storageRef, blob, {
      contentType: 'audio/wav',
      cacheControl: 'public, max-age=31536000',
    });

    const downloadUrl = await getDownloadURL(snapshot.ref);
    console.log(`✅ Firebase Storage: Uploaded sample for "${bookId}" → ${downloadUrl}`);
    return downloadUrl;
  } catch (err) {
    console.warn('Firebase Storage upload notice:', err);
    return null;
  }
}

/**
 * Gets the permanent download URL for a stored sample.
 * @param {string} bookId
 * @returns {Promise<string|null>}
 */
export async function getSampleDownloadUrl(bookId) {
  try {
    const storageRef = ref(storage, `samples/${bookId}_preview.wav`);
    const url = await getDownloadURL(storageRef);
    return url;
  } catch (_) {
    return null;
  }
}

/**
 * Uploads a base64 cover image (data:image/...) to Firebase Storage.
 * Returns a permanent public https:// URL, or null on failure.
 * Storing the cloud URL in Firestore keeps document size tiny and enables
 * cross-device cover persistence.
 *
 * @param {string} bookId
 * @param {string} dataUrl - base64 data URL of the cover image
 * @returns {Promise<string|null>}
 */
export async function uploadCoverToStorage(bookId, dataUrl) {
  try {
    if (!bookId || !dataUrl || !dataUrl.startsWith('data:image')) return null;
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const ext = blob.type.includes('png') ? 'png' : 'jpg';
    const storageRef = ref(storage, `covers/${bookId}_cover.${ext}`);
    const snapshot = await uploadBytes(storageRef, blob, {
      contentType: blob.type || 'image/jpeg',
      cacheControl: 'public, max-age=31536000',
    });
    const downloadUrl = await getDownloadURL(snapshot.ref);
    console.log(`✅ Firebase Storage: Uploaded cover for "${bookId}" → ${downloadUrl}`);
    return downloadUrl;
  } catch (err) {
    console.warn('Firebase Storage cover upload notice:', err);
    return null;
  }
}
