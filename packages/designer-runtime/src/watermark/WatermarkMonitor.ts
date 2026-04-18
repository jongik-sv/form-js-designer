export type Dispose = () => void;

export interface MonitorOptions {
  selector?: string;
  isProduction?: () => boolean;
  onViolation?: (element: Element) => void;
}

export interface WatermarkViolationDetail {
  kind: 'removed' | 'hidden';
  reason: string;
  targetPath?: string;
}

function isProductionEnv(): boolean {
  if (typeof process !== 'undefined' && process.env) {
    return process.env['NODE_ENV'] === 'production';
  }
  return false;
}

export class WatermarkMonitor {
  private observer: MutationObserver | null = null;
  private doc: Document | null = null;
  private readonly selector: string;
  private readonly checkProduction: () => boolean;
  private lastViolationAt = 0;
  private static readonly THROTTLE_MS = 500;

  constructor(opts?: MonitorOptions) {
    this.selector = opts?.selector ?? '.fjs-powered-by';
    this.checkProduction = opts?.isProduction ?? isProductionEnv;
  }

  start(doc: Document = document): void {
    if (!this.checkProduction()) return;
    if (this.observer) return;

    this.doc = doc;
    this.observer = new MutationObserver((records) => this.onMutation(records));
    this.observer.observe(doc.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class', 'hidden'],
    });
  }

  stop(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.doc = null;
  }

  isWatching(): boolean {
    return this.observer !== null;
  }

  private onMutation(records: MutationRecord[]): void {
    for (const record of records) {
      if (record.type === 'childList') {
        for (const node of Array.from(record.removedNodes)) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;
          const el = node as Element;
          if (el.matches(this.selector) || el.querySelector(this.selector)) {
            this.emitViolation({ kind: 'removed', reason: 'watermark element removed from DOM', targetPath: this.selector });
          }
        }
      } else if (record.type === 'attributes') {
        const el = record.target as Element;
        if (!el.matches(this.selector)) continue;
        if (!this.assertVisible(el)) {
          this.emitViolation({ kind: 'hidden', reason: `style attribute changed: ${record.attributeName}`, targetPath: this.selector });
        }
      }
    }
  }

  private assertVisible(el: Element): boolean {
    const style = (el as HTMLElement).style;
    if (!style) return true;
    if (style.display === 'none') return false;
    if (style.visibility === 'hidden') return false;
    const opacity = parseFloat(style.opacity);
    if (!isNaN(opacity) && opacity <= 0.1) return false;
    return true;
  }

  private emitViolation(detail: WatermarkViolationDetail): void {
    const now = Date.now();
    if (now - this.lastViolationAt < WatermarkMonitor.THROTTLE_MS) return;
    this.lastViolationAt = now;

    console.warn('[watermark] violation detected', detail);
    const target = this.doc?.defaultView ?? (typeof window !== 'undefined' ? window : null);
    if (target) {
      target.dispatchEvent(new CustomEvent('designer:watermark-violation', { detail }));
    }
  }
}

export function initWatermarkMonitor(opts?: MonitorOptions): Dispose {
  const monitor = new WatermarkMonitor(opts);
  monitor.start();
  return () => monitor.stop();
}
