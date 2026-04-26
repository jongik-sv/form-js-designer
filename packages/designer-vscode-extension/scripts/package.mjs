#!/usr/bin/env node
/**
 * package.mjs — TSK-04-01: .vsix 패키징 스크립트
 *
 * @vscode/vsce는 scoped name(@scope/pkg)을 거부하므로,
 * package.json의 name을 unscoped name으로 임시 교체 후 vsce package 실행 → name 복원.
 * try/finally로 예외 발생 시에도 name 복원을 보장한다.
 *
 * 사용법:
 *   node scripts/package.mjs [--tag <vscode-ext-vX.Y.Z>]
 *
 * 산출 .vsix 경로를 stdout 마지막 줄에 출력한다.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.resolve(__dirname, '..');
const pkgJsonPath = path.join(pkgRoot, 'package.json');

// CLI 인자에서 태그 추출
const tagIdx = process.argv.indexOf('--tag');
const tag = tagIdx !== -1 ? process.argv[tagIdx + 1] : null;

/**
 * 태그에서 semver 추출 (vscode-ext-vX.Y.Z → X.Y.Z)
 * @param {string | null} tagStr
 * @returns {string | null}
 */
function extractSemver(tagStr) {
  if (!tagStr) return null;
  const m = tagStr.match(/^vscode-ext-v(\d+\.\d+\.\d+.*)$/);
  return m ? m[1] : null;
}

/**
 * 예상 .vsix 파일 경로를 계산한다.
 * @param {string} dir
 * @param {string} version
 * @returns {string}
 */
function resolveVsixPath(dir, version) {
  return path.join(dir, `designer-vscode-extension-${version}.vsix`);
}

/**
 * vsce 실행 커맨드를 탐색한다.
 * 로컬 node_modules → workspace root node_modules 순으로 확인한다.
 * @returns {string}
 */
function resolveVsceCmd() {
  const localVsce = path.join(pkgRoot, 'node_modules/@vscode/vsce/vsce');
  if (fs.existsSync(localVsce)) return `node "${localVsce}"`;

  const workspaceVsce = path.join(pkgRoot, '../../node_modules/@vscode/vsce/vsce');
  if (fs.existsSync(workspaceVsce)) return `node "${workspaceVsce}"`;

  throw new Error('[package] @vscode/vsce를 찾을 수 없습니다. npm install을 실행하세요.');
}

/**
 * package.json의 name을 unscopedName으로 임시 교체하고 callback을 실행한다.
 * callback이 완료되거나 예외가 발생해도 name을 반드시 originalName으로 복원한다.
 * @param {string} originalName
 * @param {string} unscopedName
 * @param {() => void} callback
 */
function withUnscopedName(originalName, unscopedName, callback) {
  const raw = fs.readFileSync(pkgJsonPath, 'utf-8');
  const pkg = JSON.parse(raw);
  pkg.name = unscopedName;
  fs.writeFileSync(pkgJsonPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');

  try {
    callback();
  } finally {
    const current = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
    if (current.name !== originalName) {
      current.name = originalName;
      fs.writeFileSync(pkgJsonPath, JSON.stringify(current, null, 2) + '\n', 'utf-8');
      console.log(`[package] name 복원 완료: ${originalName}`);
    }
  }
}

async function runPackage() {
  const raw = fs.readFileSync(pkgJsonPath, 'utf-8');
  const pkg = JSON.parse(raw);
  const originalName = pkg.name;
  const version = pkg.version;

  // 태그 버전 검증
  const tagSemver = extractSemver(tag);
  if (tag && tagSemver && tagSemver !== version) {
    console.warn(`[WARN] 태그 버전(${tagSemver})과 package.json version(${version})이 불일치합니다.`);
    console.warn(`       태그: ${tag}, package.json version: ${version}`);
    console.warn(`       계속 진행하지만 .vsix 버전은 package.json(${version})을 기준으로 합니다.`);
  }

  const unscopedName = 'designer-vscode-extension';

  console.log(`[package] 원본 name: ${originalName}`);
  console.log(`[package] 임시 name: ${unscopedName}`);
  console.log(`[package] version: ${version}`);

  // --no-dependencies: dist/가 이미 런타임 의존성을 번들링하므로 node_modules 불필요
  console.log('[package] vsce package --no-dependencies 실행 중...');
  const vsceCmd = resolveVsceCmd();

  withUnscopedName(originalName, unscopedName, () => {
    execSync(`${vsceCmd} package --no-dependencies`, {
      cwd: pkgRoot,
      stdio: 'inherit',
    });
  });

  const vsixPath = resolveVsixPath(pkgRoot, version);
  if (!fs.existsSync(vsixPath)) {
    throw new Error(`[package] .vsix 파일을 찾을 수 없습니다: ${vsixPath}`);
  }

  const sizeMB = (fs.statSync(vsixPath).size / 1024 / 1024).toFixed(2);
  console.log(`[package] 성공: ${vsixPath} (${sizeMB} MB)`);

  if (parseFloat(sizeMB) > 5) {
    console.warn(`[WARN] .vsix 크기(${sizeMB} MB)가 5MB를 초과합니다. .vscodeignore를 확인하세요.`);
  }

  // 경로를 stdout 마지막 줄에 출력 (CI에서 파싱 가능)
  console.log(vsixPath);

  return vsixPath;
}

runPackage().catch((err) => {
  console.error('[package] 실패:', err.message ?? err);
  process.exit(1);
});
