import { useState, useRef, useCallback } from 'react';

export interface PerformanceStats {
  taskName: string;
  startTime: number;
  totalElapsedMs: number;
  itemCount: number;
  avgItemMs: number;
  jpegQuality: number;
  isSlowDevice: boolean;
  logs: string[];
}

export class PerformanceTracker {
  private taskName: string;
  private startTime: number;
  private itemTimes: number[] = [];
  private thresholdMsPerItem: number;
  private totalThresholdMs: number;
  private currentJpegQuality: number;
  private logs: string[] = [];

  constructor(
    taskName: string, 
    thresholdMsPerItem = 250, 
    totalThresholdMs = 12000, 
    initialQuality = 0.92
  ) {
    this.taskName = taskName;
    this.startTime = performance.now();
    this.thresholdMsPerItem = thresholdMsPerItem;
    this.totalThresholdMs = totalThresholdMs;
    this.currentJpegQuality = initialQuality;
    this.log(`Started performance tracking for ${taskName}`);
  }

  log(message: string): string {
    const elapsed = Math.round(performance.now() - this.startTime);
    const entry = `[${elapsed}ms] ${message}`;
    this.logs.push(entry);
    return entry;
  }

  recordItem(itemIndex: number, durationMs: number): number {
    this.itemTimes.push(durationMs);
    const avgMs = this.itemTimes.reduce((a, b) => a + b, 0) / this.itemTimes.length;
    const totalElapsed = performance.now() - this.startTime;

    // Automatically lower JPEG quality if processing is slow to prevent UI hangs
    if (durationMs > this.thresholdMsPerItem || totalElapsed > this.totalThresholdMs) {
      if (this.currentJpegQuality > 0.75) {
        this.currentJpegQuality = 0.70;
        this.log(`Slow execution detected (${Math.round(durationMs)}ms/item). Lowering JPEG quality to 0.70 to prevent hangs.`);
      } else if (this.currentJpegQuality > 0.55 && totalElapsed > this.totalThresholdMs * 1.5) {
        this.currentJpegQuality = 0.50;
        this.log(`Extended rendering loop detected. Scaling down JPEG quality to 0.50 for speed.`);
      }
    }

    return this.currentJpegQuality;
  }

  getJpegQuality(): number {
    return this.currentJpegQuality;
  }

  getLogs(): string[] {
    return [...this.logs];
  }

  getStats(): PerformanceStats {
    const totalElapsedMs = performance.now() - this.startTime;
    const itemCount = this.itemTimes.length;
    const avgItemMs = itemCount > 0 ? this.itemTimes.reduce((a, b) => a + b, 0) / itemCount : 0;
    
    return {
      taskName: this.taskName,
      startTime: this.startTime,
      totalElapsedMs,
      itemCount,
      avgItemMs,
      jpegQuality: this.currentJpegQuality,
      isSlowDevice: avgItemMs > this.thresholdMsPerItem || totalElapsedMs > this.totalThresholdMs,
      logs: [...this.logs]
    };
  }
}

export function usePerformanceMonitor(taskName = 'Generation Task') {
  const trackerRef = useRef<PerformanceTracker | null>(null);
  const [stats, setStats] = useState<PerformanceStats | null>(null);
  const [jpegQuality, setJpegQuality] = useState<number>(0.92);
  const [logs, setLogs] = useState<string[]>([]);

  const startMonitoring = useCallback((name?: string, initialQuality = 0.92) => {
    const nameToUse = name || taskName;
    const tracker = new PerformanceTracker(nameToUse, 250, 10000, initialQuality);
    trackerRef.current = tracker;
    setJpegQuality(initialQuality);
    setLogs(tracker.getLogs());
    setStats(tracker.getStats());
    return tracker;
  }, [taskName]);

  const recordStep = useCallback((itemIndex: number, durationMs: number) => {
    if (!trackerRef.current) return 0.92;
    const newQuality = trackerRef.current.recordItem(itemIndex, durationMs);
    setJpegQuality(newQuality);
    setLogs(trackerRef.current.getLogs());
    setStats(trackerRef.current.getStats());
    return newQuality;
  }, []);

  const addLog = useCallback((msg: string) => {
    if (trackerRef.current) {
      trackerRef.current.log(msg);
      setLogs(trackerRef.current.getLogs());
      setStats(trackerRef.current.getStats());
    } else {
      setLogs(prev => [...prev, `[0ms] ${msg}`]);
    }
  }, []);

  const finishMonitoring = useCallback(() => {
    if (trackerRef.current) {
      trackerRef.current.log('Task processing complete');
      const finalStats = trackerRef.current.getStats();
      setStats(finalStats);
      setLogs(finalStats.logs);
      return finalStats;
    }
    return null;
  }, []);

  return {
    startMonitoring,
    recordStep,
    addLog,
    finishMonitoring,
    jpegQuality,
    stats,
    logs,
  };
}
