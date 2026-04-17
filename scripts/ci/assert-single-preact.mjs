#!/usr/bin/env node
/**
 * assert-single-preact.mjs
 *
 * TSK-04-02 R3 CI 게이트: preact 단일 인스턴스 강제 확인
 *
 * `npm ls preact` 출력을 파싱하여 2개 이상의 preact 인스턴스가 감지되면 exit 1.
 * monorepo root의 `overrides.preact` 설정이 올바르면 항상 1개만 감지된다.
 *
 * 사용법: node scripts/ci/assert-single-preact.mjs
 */

import { execSync } from 'child_process';

function getPreactInstances() {
  try {
    const output = execSync('npm ls preact --all --json 2>/dev/null', {
      encoding: 'utf8',
    });
    const tree = JSON.parse(output);
    return collectVersions(tree, []);
  } catch (err) {
    // npm ls can exit non-zero for peer dep warnings; parse JSON from stdout
    const errOutput = /** @type {{ stdout?: string }} */ (err);
    if (errOutput.stdout) {
      try {
        const tree = JSON.parse(errOutput.stdout);
        return collectVersions(tree, []);
      } catch {
        // fallback to text parsing
      }
    }
    // Fallback: text parsing
    const textOutput = execSync('npm ls preact --all 2>/dev/null || true', {
      encoding: 'utf8',
    });
    return parseTextOutput(textOutput);
  }
}

/**
 * Recursively collect preact version strings from npm ls JSON tree.
 * @param {Record<string, unknown>} node
 * @param {string[]} versions
 */
function collectVersions(node, versions) {
  if (node && typeof node === 'object') {
    const deps = /** @type {Record<string, unknown>} */ (node['dependencies'] ?? {});
    for (const [name, dep] of Object.entries(deps)) {
      if (name === 'preact') {
        const version = /** @type {{ version?: string }} */ (dep)['version'];
        if (version && !versions.includes(version)) {
          versions.push(version);
        }
      }
      collectVersions(dep, versions);
    }
  }
  return versions;
}

/**
 * Parse text output from `npm ls preact` to find unique versions.
 * @param {string} text
 */
function parseTextOutput(text) {
  const versions = new Set();
  const lines = text.split('\n');
  for (const line of lines) {
    const match = line.match(/preact@(\d+\.\d+\.\S+)/);
    if (match) {
      versions.add(match[1]);
    }
  }
  return [...versions];
}

const versions = getPreactInstances();

if (versions.length === 0) {
  console.error('ERROR: preact not found in dependency tree. Is it installed?');
  process.exit(1);
}

if (versions.length > 1) {
  console.error(
    `ERROR: Multiple preact instances detected: [${versions.join(', ')}]`,
  );
  console.error(
    'Fix: Ensure root package.json has "overrides": { "preact": "<single-version>" }',
  );
  process.exit(1);
}

console.log(`OK: Single preact instance detected: ${versions[0]}`);
process.exit(0);
