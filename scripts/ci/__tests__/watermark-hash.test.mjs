import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const SCRIPT = resolve(__dirname, '../watermark-hash.mjs');
const REPO_ROOT = resolve(__dirname, '../../..');
const BASELINE = join(REPO_ROOT, '.watermark-hash');
const DIST = join(REPO_ROOT, 'node_modules/@bpmn-io/form-js-viewer/dist/index.es.js');

function runScript(args = []) {
  try {
    const stdout = execFileSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf-8' });
    return { code: 0, stdout, stderr: '' };
  } catch (err) {
    return { code: err.status ?? 1, stdout: err.stdout ?? '', stderr: err.stderr ?? '' };
  }
}

describe('watermark-hash', () => {
  it('matches baseline — exit 0', () => {
    const { code, stdout } = runScript();
    assert.equal(code, 0);
    assert.match(stdout, /OK: watermark hash matches/);
  });

  it('wrong baseline — exit 1 with both hashes', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'wh-bad-'));
    const badBaseline = join(tmpDir, '.bad-hash');
    writeFileSync(badBaseline, 'deadbeefdeadbeef\n');
    const { code, stderr } = runScript([`--baseline=${badBaseline}`]);
    assert.equal(code, 1);
    assert.match(stderr, /deadbeefdeadbeef/);
  });

  it('missing baseline — exit 1 with "baseline missing" message', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'wh-miss-'));
    const missingBaseline = join(tmpDir, '.missing-hash');
    const { code, stderr } = runScript([`--baseline=${missingBaseline}`]);
    assert.equal(code, 1);
    assert.match(stderr, /--write/);
  });

  it('--write records current hash to file', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'wh-write-'));
    const outBaseline = join(tmpDir, '.out-hash');
    const { code, stdout } = runScript([`--write`, `--baseline=${outBaseline}`]);
    assert.equal(code, 0);
    const written = readFileSync(outBaseline, 'utf-8').trim();
    assert.match(written, /^[0-9a-f]{64}$/);
    assert.match(stdout, /기록 완료/);
  });
});
