import { describe, it, expect, afterEach } from 'vitest';
import {
  withoutProcessGlobal,
  withoutProcessGlobalAsync,
  assertBrowserEnvContract,
  assertBrowserEnvContractAsync,
  BrowserEnvContractViolation,
} from '../browserEnvContract';

type G = { process?: unknown };

describe('browserEnvContract helpers', () => {
  afterEach(() => {
    // Make sure we never leak a deleted process out of a failing test.
    const globals = globalThis as unknown as G;
    if (!('process' in globals)) {
      // Restore a plausible minimal shape if something blew away the global.
      globals.process = { env: {} };
    }
  });

  describe('withoutProcessGlobal', () => {
    it('deletes globalThis.process for the duration of the callback', () => {
      let sawProcess: unknown = 'SENTINEL';
      withoutProcessGlobal(() => {
        sawProcess = (globalThis as unknown as G).process;
      });
      expect(sawProcess).toBeUndefined();
    });

    it('restores process after the callback completes', () => {
      const before = (globalThis as unknown as G).process;
      withoutProcessGlobal(() => undefined);
      expect((globalThis as unknown as G).process).toBe(before);
    });

    it('restores process even if the callback throws', () => {
      const before = (globalThis as unknown as G).process;
      expect(() =>
        withoutProcessGlobal(() => {
          throw new Error('boom');
        }),
      ).toThrow('boom');
      expect((globalThis as unknown as G).process).toBe(before);
    });

    it('forwards the return value', () => {
      const result = withoutProcessGlobal(() => 42);
      expect(result).toBe(42);
    });
  });

  describe('withoutProcessGlobalAsync', () => {
    it('awaits the async callback and restores process', async () => {
      const before = (globalThis as unknown as G).process;
      const result = await withoutProcessGlobalAsync(async () => {
        await Promise.resolve();
        expect((globalThis as unknown as G).process).toBeUndefined();
        return 'ok';
      });
      expect(result).toBe('ok');
      expect((globalThis as unknown as G).process).toBe(before);
    });

    it('restores process if the async callback rejects', async () => {
      const before = (globalThis as unknown as G).process;
      await expect(
        withoutProcessGlobalAsync(async () => {
          throw new Error('async boom');
        }),
      ).rejects.toThrow('async boom');
      expect((globalThis as unknown as G).process).toBe(before);
    });
  });

  describe('assertBrowserEnvContract', () => {
    it('passes when the subject does not touch process', () => {
      expect(() => assertBrowserEnvContract(() => 1 + 1)).not.toThrow();
    });

    it('passes when the subject accesses process only via typeof guard', () => {
      expect(() =>
        assertBrowserEnvContract(() => {
          const g = globalThis as unknown as G;
          return typeof g.process !== 'undefined' ? 'node' : 'browser';
        }),
      ).not.toThrow();
    });

    it('translates direct process ReferenceError into BrowserEnvContractViolation', () => {
      const offending = (): never => {
        // eslint-disable-next-line no-new-func
        const readProcess = new Function('return process.env.NODE_ENV;') as () => unknown;
        readProcess();
        throw new Error('unreachable');
      };

      let caught: unknown;
      try {
        assertBrowserEnvContract(offending);
      } catch (err) {
        caught = err;
      }

      expect(caught).toBeInstanceOf(BrowserEnvContractViolation);
      expect(caught).toBeInstanceOf(Error);
      const violation = caught as BrowserEnvContractViolation;
      expect(violation.name).toBe('BrowserEnvContractViolation');
      expect(violation.message).toMatch(/ADR-0001 §3 D7/);
      expect(violation.message).toMatch(/isProductionEnv/);
      expect(violation.cause).toBeInstanceOf(ReferenceError);
    });

    it('re-throws unrelated errors verbatim (must not swallow other failures)', () => {
      class Unrelated extends Error {}
      expect(() =>
        assertBrowserEnvContract(() => {
          throw new Unrelated('not a process thing');
        }),
      ).toThrow(Unrelated);
    });

    it('does not translate non-process ReferenceErrors', () => {
      expect(() =>
        assertBrowserEnvContract(() => {
          // eslint-disable-next-line no-new-func
          const readUnknown = new Function('return unknownGlobalSymbol;') as () => unknown;
          readUnknown();
        }),
      ).toThrow(/unknownGlobalSymbol/);
    });

    it('restores process after a violation is thrown', () => {
      const before = (globalThis as unknown as G).process;
      try {
        assertBrowserEnvContract(() => {
          // eslint-disable-next-line no-new-func
          (new Function('return process.env;') as () => unknown)();
        });
      } catch {
        /* swallow, we just need the finally in the helper to have run */
      }
      expect((globalThis as unknown as G).process).toBe(before);
    });
  });

  describe('assertBrowserEnvContractAsync', () => {
    it('handles async subjects that pass', async () => {
      await expect(
        assertBrowserEnvContractAsync(async () => {
          await Promise.resolve();
          return 'ok';
        }),
      ).resolves.toBeUndefined();
    });

    it('translates async process ReferenceError to BrowserEnvContractViolation', async () => {
      await expect(
        assertBrowserEnvContractAsync(async () => {
          await Promise.resolve();
          // eslint-disable-next-line no-new-func
          (new Function('return process.env;') as () => unknown)();
        }),
      ).rejects.toBeInstanceOf(BrowserEnvContractViolation);
    });
  });
});
