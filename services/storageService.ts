// Storage Service with Puter.js Cloud Storage, IndexedDB support, LocalStorage fallback, Auto-Archiving, and Health Monitoring.

import { SavedStory, StorySegment } from '../types';

const DB_NAME = 'AI_Storyteller_DB';
const DB_VERSION = 1;
const STORIES_STORE = 'stories';
const BLOBS_STORE = 'media_blobs';
const CLOUD_SYNC_KEY = 'vfx_cloud_sync_enabled';
const LOCAL_STORAGE_KEY = 'user-saved-stories';
const PUTER_DIR = 'ai-storyteller/stories';
const PUTER_MEDIA_DIR = 'ai-storyteller/media';

export interface StorageHealth {
  usedBytes: number;
  maxBytes: number;
  percentage: number;
  itemCount: number;
  isQuotaWarning: boolean;
  isCloudSyncEnabled: boolean;
  isPuterAvailable: boolean;
  isPuterSignedIn: boolean;
  puterUser?: string | null;
  formattedUsed: string;
  formattedQuota: string;
  percentUsed: number;
}

// Check if Puter.js is loaded in the browser
export function isPuterAvailable(): boolean {
  return typeof window !== 'undefined' && !!(window as any).puter?.fs;
}

// Check if user is signed in to Puter
export function isPuterSignedIn(): boolean {
  try {
    return typeof window !== 'undefined' && !!(window as any).puter?.auth?.isSignedIn?.();
  } catch {
    return false;
  }
}

// Sign in with Puter
export async function signInPuter(): Promise<any> {
  if (!isPuterAvailable()) throw new Error("Puter.js is not loaded");
  try {
    return await (window as any).puter.auth.signIn();
  } catch (e) {
    console.error("Puter sign-in failed", e);
    throw e;
  }
}

// Get Puter current user info
export async function getPuterUser(): Promise<any> {
  if (!isPuterAvailable()) return null;
  try {
    if ((window as any).puter.auth?.isSignedIn?.()) {
      return await (window as any).puter.auth.getUser();
    }
  } catch {}
  return null;
}

// Helper to convert base64 / data URL to Blob
export function dataURLtoBlob(dataurl: string): Blob {
  const arr = dataurl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

// Upload Media (Image / Audio) to Puter Cloud Object Storage and obtain a public Read URL
export async function uploadMediaToPuter(media: string | Blob | File, filename: string): Promise<string | null> {
  if (!isPuterAvailable()) return null;
  try {
    const puter = (window as any).puter;
    const blob = typeof media === 'string' && media.startsWith('data:') 
      ? dataURLtoBlob(media) 
      : media;
    
    const filePath = `${PUTER_MEDIA_DIR}/${filename}`;
    await puter.fs.write(filePath, blob, {
      createMissingParents: true,
      dedupeName: false
    });

    // Obtain public read URL valid for 7 days
    const readUrl = await puter.fs.getReadURL(filePath, 7 * 24 * 60 * 60 * 1000);
    return readUrl || null;
  } catch (err) {
    console.warn(`Failed to upload media ${filename} to Puter object storage:`, err);
    return null;
  }
}

// Save a single story to Puter Cloud
export async function saveStoryToPuter(story: SavedStory): Promise<boolean> {
  if (!isPuterAvailable()) return false;
  try {
    const puter = (window as any).puter;
    const path = `${PUTER_DIR}/${story.id}.json`;
    const cleanStory = {
      ...story,
      cloudSynced: true,
      puterPath: path
    };
    await puter.fs.write(path, JSON.stringify(cleanStory, null, 2), { 
      createMissingParents: true,
      dedupeName: false 
    });
    return true;
  } catch (err) {
    console.warn(`Failed to save story ${story.id} to Puter cloud:`, err);
    return false;
  }
}

// Delete a single story from Puter Cloud
export async function deleteStoryFromPuter(storyId: string): Promise<boolean> {
  if (!isPuterAvailable()) return false;
  try {
    const puter = (window as any).puter;
    const path = `${PUTER_DIR}/${storyId}.json`;
    await puter.fs.delete(path);
    return true;
  } catch (err) {
    console.warn(`Failed to delete story ${storyId} from Puter:`, err);
    return false;
  }
}

// Load all stories from Puter Cloud
export async function loadStoriesFromPuter(): Promise<SavedStory[]> {
  if (!isPuterAvailable()) return [];
  try {
    const puter = (window as any).puter;
    const exists = await puter.fs.stat(PUTER_DIR).catch(() => null);
    if (!exists) return [];

    const items = await puter.fs.readdir(PUTER_DIR);
    if (!Array.isArray(items)) return [];

    const loadedStories: SavedStory[] = [];
    for (const item of items) {
      if (item.name?.endsWith('.json')) {
        try {
          const blob = await puter.fs.read(item.path || `${PUTER_DIR}/${item.name}`);
          const text = await blob.text();
          const parsed = JSON.parse(text);
          if (parsed && parsed.id && parsed.segments) {
            loadedStories.push({
              ...parsed,
              cloudSynced: true,
              puterPath: item.path
            });
          }
        } catch (readErr) {
          console.warn(`Failed to read Puter story file ${item.name}:`, readErr);
        }
      }
    }
    return loadedStories;
  } catch (err) {
    console.warn("Failed to load stories from Puter cloud directory:", err);
    return [];
  }
}

// Open native Puter File Picker to load a story
export async function showPuterOpenFilePicker(): Promise<SavedStory | null> {
  if (!isPuterAvailable()) throw new Error("Puter.js is not available");
  try {
    const puter = (window as any).puter;
    const file = await puter.ui.showOpenFilePicker();
    if (!file) return null;
    const blob = await file.read();
    const text = await blob.text();
    const parsed = JSON.parse(text);
    if (parsed && parsed.id && parsed.segments) {
      return parsed;
    }
    throw new Error("Invalid storybook JSON structure");
  } catch (err) {
    console.error("Puter open file picker error:", err);
    throw err;
  }
}

// Open native Puter Save File Picker to export story
export async function showPuterSaveFilePicker(story: SavedStory): Promise<string> {
  if (!isPuterAvailable()) throw new Error("Puter.js is not available");
  try {
    const puter = (window as any).puter;
    const fileName = `${(story.title || 'story').toLowerCase().replace(/[^a-z0-9]/g, '_')}_${story.id.slice(0, 6)}.json`;
    const content = JSON.stringify(story, null, 2);
    const file = await puter.ui.showSaveFilePicker(content, fileName);
    return file?.path || fileName;
  } catch (err) {
    console.error("Puter save file picker error:", err);
    throw err;
  }
}

// Open or initialize IndexedDB
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error("IndexedDB is not supported in this environment"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORIES_STORE)) {
        db.createObjectStore(STORIES_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(BLOBS_STORE)) {
        db.createObjectStore(BLOBS_STORE, { keyPath: 'id' });
      }
    };
  });
}

// Toggle Cloud Sync (IndexedDB & Puter storage mode)
export function isCloudSyncEnabled(): boolean {
  try {
    const val = localStorage.getItem(CLOUD_SYNC_KEY);
    return val === null ? true : val === 'true';
  } catch {
    return true;
  }
}

export function setCloudSyncEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(CLOUD_SYNC_KEY, enabled ? 'true' : 'false');
  } catch (e) {
    console.warn("Could not save cloud sync preference", e);
  }
}

// Strip heavy base64 media to save space
export function stripBase64Media(storyList: SavedStory[]): SavedStory[] {
  return storyList.map(story => ({
    ...story,
    segments: story.segments.map(s => ({
      ...s,
      audioUrl: s.audioUrl?.startsWith('data:') ? undefined : s.audioUrl,
      imageUrl: s.imageUrl?.startsWith('data:') ? undefined : s.imageUrl,
    }))
  }));
}

// Automatically compress segment metadata when saving larger story collections
export function compressStoryMetadata(stories: SavedStory[]): SavedStory[] {
  return stories.map(story => ({
    ...story,
    segments: story.segments.map(seg => ({
      ...seg,
      paragraph: seg.paragraph?.length > 1500 ? seg.paragraph.slice(0, 1500) + '...' : seg.paragraph,
      imageUrl: seg.imageUrl?.startsWith('data:') ? undefined : seg.imageUrl,
      audioUrl: seg.audioUrl?.startsWith('data:') ? undefined : seg.audioUrl,
    }))
  }));
}

// Lazy-load stories with pagination support
export async function loadStoriesPaginated(page: number = 1, pageSize: number = 10): Promise<{ stories: SavedStory[]; totalCount: number; hasMore: boolean }> {
  const allStories = await loadStories();
  const totalCount = allStories.length;
  const start = (page - 1) * pageSize;
  const paginated = allStories.slice(start, start + pageSize);
  return {
    stories: paginated,
    totalCount,
    hasMore: start + pageSize < totalCount
  };
}

// Store heavy media blob in IndexedDB
export async function storeBlobInIDB(id: string, dataUrl: string): Promise<string> {
  try {
    const db = await openDB();
    const tx = db.transaction(BLOBS_STORE, 'readwrite');
    const store = tx.objectStore(BLOBS_STORE);
    await new Promise((resolve, reject) => {
      const req = store.put({ id, dataUrl, timestamp: Date.now() });
      req.onsuccess = resolve;
      req.onerror = reject;
    });
    return `idb-blob://${id}`;
  } catch (e) {
    console.warn("Failed to store blob in IndexedDB:", e);
    return dataUrl;
  }
}

// Retrieve heavy media blob from IndexedDB
export async function getBlobFromIDB(id: string): Promise<string | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(BLOBS_STORE, 'readonly');
    const store = tx.objectStore(BLOBS_STORE);
    return new Promise((resolve) => {
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result?.dataUrl || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

// Save stories with Puter Cloud Sync, IndexedDB offloading & LocalStorage fallback
export async function saveStories(stories: SavedStory[]): Promise<{ success: boolean; cloudSync: boolean; puterSync: boolean; autoArchivedCount: number }> {
  const useCloudSync = isCloudSyncEnabled();
  let autoArchivedCount = 0;
  let puterSyncSuccess = false;

  // 1. Sync to Puter Cloud storage if available and enabled
  if (useCloudSync && isPuterAvailable()) {
    try {
      const latestStory = stories[0];
      if (latestStory) {
        await saveStoryToPuter(latestStory);
        puterSyncSuccess = true;
      }
    } catch (e) {
      console.warn("Puter cloud auto-save skipped:", e);
    }
  }

  // 2. Save to IndexedDB
  if (useCloudSync) {
    try {
      const db = await openDB();
      const tx = db.transaction(STORIES_STORE, 'readwrite');
      const store = tx.objectStore(STORIES_STORE);
      
      for (const story of stories) {
        store.put(story);
      }
      
      const lightweight = stripBase64Media(stories.slice(-15));
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(lightweight));
      } catch {}

      return { success: true, cloudSync: true, puterSync: puterSyncSuccess, autoArchivedCount: 0 };
    } catch (err) {
      console.warn("IndexedDB save failed, falling back to LocalStorage with auto-archive:", err);
    }
  }

  // 3. LocalStorage path with auto-archive system
  let currentStories = [...stories];
  let attempt = 0;

  while (attempt < 5 && currentStories.length > 0) {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(currentStories));
      return { success: true, cloudSync: false, puterSync: puterSyncSuccess, autoArchivedCount };
    } catch (quotaError) {
      attempt++;
      console.warn(`LocalStorage quota hit (Attempt ${attempt}). Auto-archiving oldest story...`);
      
      if (currentStories.length > 1) {
        currentStories.shift();
        autoArchivedCount++;
      } else {
        currentStories = stripBase64Media(currentStories);
      }
    }
  }

  return { success: false, cloudSync: false, puterSync: puterSyncSuccess, autoArchivedCount };
}

// Load stories from Puter Cloud, IndexedDB, or LocalStorage (hybrid merge)
export async function loadStories(): Promise<SavedStory[]> {
  const storyMap = new Map<string, SavedStory>();

  // 1. Read LocalStorage for instant initial state
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed: SavedStory[] = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.forEach(s => { if (s?.id) storyMap.set(s.id, s); });
      }
    }
  } catch (e) {
    console.error("Failed to parse stories from localStorage:", e);
  }

  // 2. Read IndexedDB if enabled
  if (isCloudSyncEnabled()) {
    try {
      const db = await openDB();
      const tx = db.transaction(STORIES_STORE, 'readonly');
      const store = tx.objectStore(STORIES_STORE);
      const idbStories: SavedStory[] = await new Promise((resolve) => {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });

      idbStories.forEach(s => {
        if (s?.id) storyMap.set(s.id, s);
      });
    } catch (e) {
      console.warn("IndexedDB read skipped:", e);
    }
  }

  // 3. Read Puter Cloud Storage if available
  if (isPuterAvailable()) {
    try {
      const puterStories = await loadStoriesFromPuter();
      puterStories.forEach(s => {
        if (s?.id) {
          storyMap.set(s.id, {
            ...s,
            cloudSynced: true
          });
        }
      });
    } catch (e) {
      console.warn("Puter stories load skipped:", e);
    }
  }

  const allStories = Array.from(storyMap.values());
  return allStories.sort((a, b) => b.timestamp - a.timestamp);
}

// Delete a single story from ALL storage layers (LocalStorage, IndexedDB, Puter Cloud)
export async function deleteStory(storyId: string): Promise<boolean> {
  let success = false;

  // 1. Delete from LocalStorage
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const stories: SavedStory[] = JSON.parse(raw);
      const updated = stories.filter(s => s.id !== storyId);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      success = true;
    }
  } catch (e) {
    console.warn("Error deleting story from LocalStorage:", e);
  }

  // 2. Delete from IndexedDB
  try {
    const db = await openDB();
    const tx = db.transaction(STORIES_STORE, 'readwrite');
    tx.objectStore(STORIES_STORE).delete(storyId);
    success = true;
  } catch (e) {
    console.warn("Error deleting story from IndexedDB:", e);
  }

  // 3. Delete from Puter Cloud
  if (isPuterAvailable()) {
    try {
      await deleteStoryFromPuter(storyId);
    } catch (e) {
      console.warn("Error deleting story from Puter Cloud:", e);
    }
  }

  return success;
}

// Delete multiple stories in batch
export async function deleteStoriesBatch(storyIds: string[]): Promise<boolean> {
  const idsSet = new Set(storyIds);

  // 1. LocalStorage
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const stories: SavedStory[] = JSON.parse(raw);
      const updated = stories.filter(s => !idsSet.has(s.id));
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    }
  } catch {}

  // 2. IndexedDB
  try {
    const db = await openDB();
    const tx = db.transaction(STORIES_STORE, 'readwrite');
    const store = tx.objectStore(STORIES_STORE);
    storyIds.forEach(id => store.delete(id));
  } catch {}

  // 3. Puter Cloud
  if (isPuterAvailable()) {
    for (const id of storyIds) {
      deleteStoryFromPuter(id).catch(() => {});
    }
  }

  return true;
}

// Clear all stories from ALL storage layers
export async function clearAllStories(): Promise<void> {
  try {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    const db = await openDB();
    const tx = db.transaction([STORIES_STORE, BLOBS_STORE], 'readwrite');
    tx.objectStore(STORIES_STORE).clear();
    tx.objectStore(BLOBS_STORE).clear();
  } catch (e) {
    console.warn("Error clearing local cache:", e);
  }

  // Clear Puter stories
  if (isPuterAvailable()) {
    try {
      const puter = (window as any).puter;
      const items = await puter.fs.readdir(PUTER_DIR).catch(() => []);
      if (Array.isArray(items)) {
        for (const item of items) {
          if (item.name?.endsWith('.json')) {
            await puter.fs.delete(item.path || `${PUTER_DIR}/${item.name}`).catch(() => {});
          }
        }
      }
    } catch (e) {
      console.warn("Error clearing Puter stories:", e);
    }
  }
}

// Measure Storage Health
export async function getStorageHealth(): Promise<StorageHealth> {
  let usedBytes = 0;
  const maxBytes = 5 * 1024 * 1024; // Standard 5MB LocalStorage cap
  let itemCount = 0;

  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY) || '';
    usedBytes = raw.length * 2;
    const parsed = JSON.parse(raw || '[]');
    if (Array.isArray(parsed)) itemCount = parsed.length;
  } catch {}

  if (navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      if (estimate.usage) {
        usedBytes = Math.max(usedBytes, estimate.usage);
      }
    } catch {}
  }

  const percentage = Math.min(100, Math.round((usedBytes / maxBytes) * 100));
  const puterAvail = isPuterAvailable();
  const puterSigned = isPuterSignedIn();
  let puterUser: string | null = null;

  if (puterSigned) {
    try {
      const u = await getPuterUser();
      puterUser = u?.username || u?.email || null;
    } catch {}
  }

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return {
    usedBytes,
    maxBytes,
    percentage,
    itemCount,
    isQuotaWarning: percentage >= 80,
    isCloudSyncEnabled: isCloudSyncEnabled(),
    isPuterAvailable: puterAvail,
    isPuterSignedIn: puterSigned,
    puterUser,
    formattedUsed: formatBytes(usedBytes),
    formattedQuota: formatBytes(maxBytes),
    percentUsed: percentage,
  };
}

// Clear non-essential cache
export async function clearNonEssentialCache(): Promise<void> {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && !key.includes('user-saved-stories') && !key.includes('gemini') && !key.includes('settings')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));

    const db = await openDB();
    const tx = db.transaction(BLOBS_STORE, 'readwrite');
    tx.objectStore(BLOBS_STORE).clear();
  } catch (e) {
    console.warn("Error clearing non-essential cache:", e);
  }
}

// Clear all storage cache
export async function clearAllCache(): Promise<void> {
  await clearAllStories();
}

// Export Full Story Backup as JSON
export function downloadStoriesJSON(stories: SavedStory[]): void {
  try {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(stories, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `ai_storyteller_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  } catch (err) {
    console.error("Failed to export stories JSON:", err);
  }
}
