import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WatermarkMonitor } from '../WatermarkMonitor';

function flushMutations(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('WatermarkMonitor', () => {
  let doc: Document;
  let watermarkEl: HTMLElement;
  let monitor: WatermarkMonitor;

  beforeEach(() => {
    doc = document;
    watermarkEl = doc.createElement('div');
    watermarkEl.className = 'fjs-powered-by';
    doc.body.appendChild(watermarkEl);
    monitor = new WatermarkMonitor();
  });

  afterEach(() => {
    monitor.stop();
    if (watermarkEl.parentNode) watermarkEl.parentNode.removeChild(watermarkEl);
    vi.unstubAllEnvs();
  });

  describe('production environment', () => {
    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'production');
    });

    it('starts observing and isWatching returns true', () => {
      monitor.start(doc);
      expect(monitor.isWatching()).toBe(true);
    });

    it('dispatches violation event with kind=removed when .fjs-powered-by is removed', async () => {
      monitor.start(doc);
      const events: CustomEvent[] = [];
      window.addEventListener('designer:watermark-violation', (e) => events.push(e as CustomEvent));

      watermarkEl.remove();
      await flushMutations();

      expect(events.length).toBeGreaterThan(0);
      expect(events[0]!.detail.kind).toBe('removed');
      window.removeEventListener('designer:watermark-violation', (e) => events.push(e as CustomEvent));
    });

    it('dispatches violation event with kind=hidden when display set to none', async () => {
      monitor.start(doc);
      const events: CustomEvent[] = [];
      const handler = (e: Event) => events.push(e as CustomEvent);
      window.addEventListener('designer:watermark-violation', handler);

      watermarkEl.style.display = 'none';
      await flushMutations();

      expect(events.length).toBeGreaterThan(0);
      expect(events[0]!.detail.kind).toBe('hidden');
      window.removeEventListener('designer:watermark-violation', handler);
    });

    it('dispatches violation event with kind=hidden when visibility set to hidden', async () => {
      monitor.start(doc);
      const events: CustomEvent[] = [];
      const handler = (e: Event) => events.push(e as CustomEvent);
      window.addEventListener('designer:watermark-violation', handler);

      watermarkEl.style.visibility = 'hidden';
      await flushMutations();

      expect(events.length).toBeGreaterThan(0);
      expect(events[0]!.detail.kind).toBe('hidden');
      window.removeEventListener('designer:watermark-violation', handler);
    });

    it('dispatches violation event with kind=hidden when opacity set to 0', async () => {
      monitor.start(doc);
      const events: CustomEvent[] = [];
      const handler = (e: Event) => events.push(e as CustomEvent);
      window.addEventListener('designer:watermark-violation', handler);

      watermarkEl.style.opacity = '0';
      await flushMutations();

      expect(events.length).toBeGreaterThan(0);
      expect(events[0]!.detail.kind).toBe('hidden');
      window.removeEventListener('designer:watermark-violation', handler);
    });

    it('stop disconnects observer and isWatching returns false', () => {
      monitor.start(doc);
      expect(monitor.isWatching()).toBe(true);
      monitor.stop();
      expect(monitor.isWatching()).toBe(false);
    });

    it('stop can be called multiple times without error', () => {
      monitor.start(doc);
      expect(() => {
        monitor.stop();
        monitor.stop();
        monitor.stop();
      }).not.toThrow();
    });
  });

  describe('development environment', () => {
    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'development');
    });

    it('does not start observing in non-production env', () => {
      monitor.start(doc);
      expect(monitor.isWatching()).toBe(false);
    });

    it('does not dispatch events when node is removed', async () => {
      monitor.start(doc);
      const events: CustomEvent[] = [];
      const handler = (e: Event) => events.push(e as CustomEvent);
      window.addEventListener('designer:watermark-violation', handler);

      watermarkEl.remove();
      await flushMutations();

      expect(events.length).toBe(0);
      window.removeEventListener('designer:watermark-violation', handler);
    });
  });
});
