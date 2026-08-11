// Storage Service with IndexedDB support, LocalStorage fallback, Auto-Archiving, and Health Monitoring.

import { SavedStory, StorySegment } from '../types';

const DB_NAME = 'AI_Storyteller_DB';
const DB_VERSION = 1;
const STORIES_STORE = 'stories';
const BLOBS_STORE = 'media_blobs';
const CLOUD_SYNC_KEY = 'vfx_cloud_sync_enabled';
const LOCAL_STORAGE_KEY = 'user-saved-stories';

export interface StorageHealth {
  usedBytes: number;
  maxBytes: number;
  percentage: number;
  itemCount: number;
  isQuotaWarning: boolean;
  isCloudSyncEnabled: boolean;
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

// Toggle Cloud Sync (IndexedDB storage mode)
export function isCloudSyncEnabled(): boolean {
  try {
    return localStorage.getItem(CLOUD_SYNC_KEY) === 'true';
  } catch {
    return false;
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

// Save stories with IndexedDB offloading & LocalStorage fallback
export async function saveStories(stories: SavedStory[]): Promise<{ success: boolean; cloudSync: boolean; autoArchivedCount: number }> {
  const useCloudSync = isCloudSyncEnabled();
  let autoArchivedCount = 0;

  if (useCloudSync) {
    try {
      const db = await openDB();
      const tx = db.transaction(STORIES_STORE, 'readwrite');
      const store = tx.objectStore(STORIES_STORE);
      
      // Save stories to IndexedDB
      for (const story of stories) {
        store.put(story);
      }
      
      // Mirror lightweight index to localStorage for instant initial render
      const lightweight = stripBase64Media(stories.slice(-10));
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(lightweight));
      } catch {}

      return { success: true, cloudSync: true, autoArchivedCount: 0 };
    } catch (err) {
      console.warn("IndexedDB save failed, falling back to LocalStorage with auto-archive:", err);
    }
  }

  // LocalStorage path with auto-archive system
  let currentStories = [...stories];
  let attempt = 0;

  while (attempt < 5 && currentStories.length > 0) {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(currentStories));
      return { success: true, cloudSync: false, autoArchivedCount };
    } catch (quotaError) {
      attempt++;
      console.warn(`LocalStorage quota hit (Attempt ${attempt}). Auto-archiving oldest story...`);
      
      if (currentStories.length > 1) {
        // Auto-archive: drop oldest story
        currentStories.shift();
        autoArchivedCount++;
      } else {
        // If single story is too heavy, strip base64 images/audio from it
        currentStories = stripBase64Media(currentStories);
      }
    }
  }

  return { success: false, cloudSync: false, autoArchivedCount };
}

// Load stories from IndexedDB or LocalStorage
export async function loadStories(): Promise<SavedStory[]> {
  const useCloudSync = isCloudSyncEnabled();

  if (useCloudSync) {
    try {
      const db = await openDB();
      const tx = db.transaction(STORIES_STORE, 'readonly');
      const store = tx.objectStore(STORIES_STORE);
      const stories: SavedStory[] = await new Promise((resolve) => {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });

      if (stories.length > 0) {
        return stories.sort((a, b) => b.timestamp - a.timestamp);
      }
    } catch (e) {
      console.warn("Failed to load stories from IndexedDB, reading LocalStorage:", e);
    }
  }

  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed: SavedStory[] = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch (e) {
    console.error("Failed to parse stories from localStorage:", e);
  }

  return [];
}

// Measure Storage Health
export async function getStorageHealth(): Promise<StorageHealth> {
  let usedBytes = 0;
  const maxBytes = 5 * 1024 * 1024; // Standard 5MB LocalStorage cap
  let itemCount = 0;

  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY) || '';
    usedBytes = raw.length * 2; // UTF-16 bytes approx
    const parsed = JSON.parse(raw || '[]');
    if (Array.isArray(parsed)) itemCount = parsed.length;
  } catch {}

  // Check if browser quota estimation API is supported
  if (navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      if (estimate.usage) {
        usedBytes = Math.max(usedBytes, estimate.usage);
      }
    } catch {}
  }

  const percentage = Math.min(100, Math.round((usedBytes / maxBytes) * 100));

  return {
    usedBytes,
    maxBytes,
    percentage,
    itemCount,
    isQuotaWarning: percentage >= 80,
    isCloudSyncEnabled: isCloudSyncEnabled(),
  };
}

// Clear non-essential cache (temporary canvas buffers, cached media blobs, non-active state)
export async function clearNonEssentialCache(): Promise<void> {
  try {
    // Clear temporary localStorage keys except user stories & settings
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && !key.includes('user-saved-stories') && !key.includes('gemini') && !key.includes('settings')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));

    // Clear IndexedDB blobs store
    const db = await openDB();
    const tx = db.transaction(BLOBS_STORE, 'readwrite');
    tx.objectStore(BLOBS_STORE).clear();
  } catch (e) {
    console.warn("Error clearing non-essential cache:", e);
  }
}

// Clear all storage cache
export async function clearAllCache(): Promise<void> {
  try {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    const db = await openDB();
    const tx = db.transaction([STORIES_STORE, BLOBS_STORE], 'readwrite');
    tx.objectStore(STORIES_STORE).clear();
    tx.objectStore(BLOBS_STORE).clear();
  } catch (e) {
    console.warn("Error clearing all cache:", e);
  }
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
