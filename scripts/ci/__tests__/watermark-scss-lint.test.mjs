import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const SCRIPT = resolve(__dirname, '../watermark-scss-lint.mjs');
const FIXTURES_DIR = resolve(__dirname, '../fixtures/watermark-scss');

function runScript(args = []) {
  try {
    const stdout = execFileSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf-8' });
    return { code: 0, stdout, stderr: '' };
  } catch (err) {
    return { code: err.status ?? 1, stdout: err.stdout ?? '', stderr: err.stderr ?? '' };
  }
}

describe('watermark-scss-lint', () => {
  it('ok.scss — exit 0', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'scss-ok-'));
    writeFileSync(join(tmpDir, 'ok.scss'), '.fjs-powered-by { color: #333; }\n');
    const { code } = runScript([`--root=${tmpDir}`]);
    assert.equal(code, 0);
  });

  it('violation-display.scss — exit 1 with file:line info', () => {
    const { code, stderr } = runScript([`--root=${FIXTURES_DIR}`]);
    assert.equal(code, 1);
    assert.match(stderr, /violation-display\.scss/);
  });

  it('violation-opacity.scss — exit 1', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'scss-opacity-'));
    writeFileSync(join(tmpDir, 'violation.scss'), '.fjs-powered-by { opacity: 0; }\n');
    const { code } = runScript([`--root=${tmpDir}`]);
    assert.equal(code, 1);
  });

  it('visibility:hidden — exit 1', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'scss-vis-'));
    writeFileSync(join(tmpDir, 'v.scss'), '.fjs-powered-by { visibility: hidden; }\n');
    const { code } = runScript([`--root=${tmpDir}`]);
    assert.equal(code, 1);
  });

  it('.other { display:none } — exit 0 (not .fjs-powered-by)', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'scss-other-'));
    writeFileSync(join(tmpDir, 'other.scss'), '.other-class { display: none; }\n');
    const { code } = runScript([`--root=${tmpDir}`]);
    assert.equal(code, 0);
  });

  it('empty directory — exit 0 with "0 files scanned"', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'scss-empty-'));
    const { code, stdout } = runScript([`--root=${tmpDir}`]);
    assert.equal(code, 0);
    assert.match(stdout, /0 files scanned/);
  });
});
