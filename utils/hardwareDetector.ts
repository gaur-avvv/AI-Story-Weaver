export interface DeviceProfile {
  isLowEnd: boolean;
  hasWebGPU: boolean;
  ramGB: number;
  cpuCores: number;
  textEngine: 'cloud' | 'local';
  imageEngine: 'cloud' | 'local';
  audioEngine: 'native' | 'cloud' | 'local';
  maxVideoResolution: '480p' | '720p' | '1080p';
  vfxQuality: 'minimal' | 'full';
  memoryPressureCritical: boolean;
}

export interface MemoryPressureStatus {
  isCritical: boolean;
  usedJSHeapMB?: number;
  totalJSHeapMB?: number;
  jsHeapLimitMB?: number;
}

/**
 * Monitors memory pressure in real time.
 * If heap memory usage exceeds 80% or if device RAM is critically constrained,
 * returns isCritical: true to trigger immediate lightweight cloud execution and resolution scaling.
 */
export function checkMemoryPressure(): MemoryPressureStatus {
  if (typeof window === 'undefined') {
    return { isCritical: false };
  }

  const perfMemory = (performance as any)?.memory;
  if (perfMemory) {
    const usedMB = Math.round(perfMemory.usedJSHeapSize / (1024 * 1024));
    const totalMB = Math.round(perfMemory.totalJSHeapSize / (1024 * 1024));
    const limitMB = Math.round(perfMemory.jsHeapSizeLimit / (1024 * 1024));
    const usageRatio = limitMB > 0 ? perfMemory.usedJSHeapSize / perfMemory.jsHeapSizeLimit : 0;

    const isCritical = usageRatio > 0.78 || (limitMB > 0 && limitMB - usedMB < 120);

    return {
      isCritical,
      usedJSHeapMB: usedMB,
      totalJSHeapMB: totalMB,
      jsHeapLimitMB: limitMB,
    };
  }

  // Fallback for browsers without performance.memory (e.g. Firefox, Safari)
  const deviceMemory = (navigator as any)?.deviceMemory || 8;
  const isCritical = deviceMemory <= 2;

  return {
    isCritical,
  };
}

/**
 * Checks client hardware capabilities and returns an optimized profile.
 */
export async function checkDeviceProfile(): Promise<DeviceProfile> {
  const hasWebGPU = typeof navigator !== 'undefined' && !!(navigator as any).gpu;
  const ramGB = typeof navigator !== 'undefined' ? ((navigator as any).deviceMemory || 8) : 8;
  const cpuCores = typeof navigator !== 'undefined' ? (navigator.hardwareConcurrency || 4) : 4;
  const memoryStatus = checkMemoryPressure();

  // Strict thresholding for device classification
  // Low-end devices lack WebGPU, have < 6GB RAM, have < 4 cores, or suffer critical memory pressure
  const isLowEnd = !hasWebGPU || ramGB < 6 || cpuCores < 4 || memoryStatus.isCritical;

  return {
    isLowEnd,
    hasWebGPU,
    ramGB,
    cpuCores,
    textEngine: 'cloud',
    imageEngine: 'cloud',
    audioEngine: isLowEnd ? 'native' : 'cloud',
    maxVideoResolution: isLowEnd ? '480p' : '1080p',
    vfxQuality: isLowEnd ? 'minimal' : 'full',
    memoryPressureCritical: memoryStatus.isCritical,
  };
}
