import { SavedStory } from '../types';

/**
 * Utility to strip heavy base64 strings (images & audio data URLs) from saved stories
 * to preserve text, metadata, chapters, and choices while reducing storage size by up to 98%.
 */
export function stripBase64MediaFromStories(stories: SavedStory[]): SavedStory[] {
  return stories.map(story => ({
    ...story,
    segments: story.segments.map(s => ({
      ...s,
      audioUrl: s.audioUrl?.startsWith('data:') ? undefined : s.audioUrl,
      imageUrl: s.imageUrl?.startsWith('data:') ? undefined : s.imageUrl,
    }))
  }));
}

/**
 * Estimates total LocalStorage usage in bytes
 */
export function getLocalStorageUsageBytes(): number {
  let total = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      const val = localStorage.getItem(key) || '';
      total += (key.length + val.length) * 2; // ~2 bytes per UTF-16 char
    }
  }
  return total;
}

/**
 * Cleanup utility that compresses old stories in LocalStorage by removing
 * high-res binary base64 media when the browser quota is nearly exceeded.
 */
export function compressAndCleanLocalStorage(): { freedBytes: number; compressedCount: number } {
  const initialBytes = getLocalStorageUsageBytes();
  const savedKey = 'user-saved-stories';
  const raw = localStorage.getItem(savedKey);
  
  if (!raw) return { freedBytes: 0, compressedCount: 0 };

  try {
    const stories: SavedStory[] = JSON.parse(raw);
    if (stories.length === 0) return { freedBytes: 0, compressedCount: 0 };

    // Sort stories by timestamp ascending (oldest first)
    const sorted = [...stories].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    const activeStoryId = sorted[sorted.length - 1]?.id;

    // Keep the active/latest story intact, compress all older stories
    let compressedCount = 0;
    const cleanedStories = stories.map(story => {
      if (story.id === activeStoryId) {
        return story; // preserve active story media
      }
      
      const hasBase64 = story.segments.some(s => 
        s.imageUrl?.startsWith('data:') || s.audioUrl?.startsWith('data:')
      );

      if (hasBase64) {
        compressedCount++;
        return {
          ...story,
          segments: story.segments.map(s => ({
            ...s,
            imageUrl: s.imageUrl?.startsWith('data:') ? undefined : s.imageUrl,
            audioUrl: s.audioUrl?.startsWith('data:') ? undefined : s.audioUrl,
          }))
        };
      }
      return story;
    });

    localStorage.setItem(savedKey, JSON.stringify(cleanedStories));
    const finalBytes = getLocalStorageUsageBytes();
    const freedBytes = Math.max(0, initialBytes - finalBytes);

    console.log(`[StorageManager] Compressed ${compressedCount} older stories, freed ${(freedBytes / 1024).toFixed(1)} KB.`);
    return { freedBytes, compressedCount };

  } catch (err) {
    console.error("[StorageManager] Error compressing LocalStorage stories:", err);
    return { freedBytes: 0, compressedCount: 0 };
  }
}

/**
 * Safe save utility with multi-tier quota fallback
 */
export function saveStoriesSafelyWithQuotaProtection(stories: SavedStory[]): { success: boolean; wasCompressed: boolean } {
  const savedKey = 'user-saved-stories';

  // Tier 1: Direct Save
  try {
    localStorage.setItem(savedKey, JSON.stringify(stories));
    return { success: true, wasCompressed: false };
  } catch (err1) {
    console.warn("[StorageManager] Quota exceeded on direct save. Triggering automatic compression...", err1);
  }

  // Tier 2: Compress older stories in array and retry
  try {
    const compressed = stripBase64MediaFromStories(stories);
    localStorage.setItem(savedKey, JSON.stringify(compressed));
    return { success: true, wasCompressed: true };
  } catch (err2) {
    console.warn("[StorageManager] Secondary compression failed. Retrying with recent 6 stories...", err2);
  }

  // Tier 3: Keep only the 6 most recent lightweight stories
  try {
    const recentLightweight = stripBase64MediaFromStories(stories.slice(-6));
    localStorage.setItem(savedKey, JSON.stringify(recentLightweight));
    return { success: true, wasCompressed: true };
  } catch (err3) {
    console.error("[StorageManager] Critical quota lock. Retrying with active story text only...", err3);
    try {
      const activeOnly = stripBase64MediaFromStories(stories.slice(-1));
      localStorage.setItem(savedKey, JSON.stringify(activeOnly));
      return { success: true, wasCompressed: true };
    } catch (err4) {
      console.error("[StorageManager] Storage quota strictly locked by browser.", err4);
      return { success: false, wasCompressed: true };
    }
  }
}
