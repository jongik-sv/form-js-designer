#!/usr/bin/env node
/**
 * designer-cli — form-js 스키마 검증 및 임포트 CLI
 *
 * 사용법:
 *   designer-cli validate <file>
 *   designer-cli import <file> --to <project-path>
 */
import { runValidate } from '../src/commands/validate.js';
import { runImport } from '../src/commands/import.js';

const argv = process.argv.slice(2);
const subcommand = argv[0];

/**
 * argv 배열에서 --key value 쌍을 추출한다.
 * @param {string[]} args - 파싱할 인수 배열
 * @param {string[]} keys - 추출할 플래그 이름 목록 (예: ['--to', '--locale'])
 * @returns {Record<string, string>} 추출된 옵션 맵
 */
function parseFlags(args, keys) {
  /** @type {Record<string, string>} */
  const result = {};
  for (let i = 0; i < args.length; i++) {
    if (keys.includes(args[i]) && args[i + 1]) {
      result[args[i].replace(/^--/, '')] = args[i + 1];
      i++;
    }
  }
  return result;
}

if (!subcommand || subcommand === '--help' || subcommand === '-h') {
  process.stdout.write(`designer-cli — form-js designer schema tool

Usage:
  designer-cli validate <file>
  designer-cli import <file> --to <project-path>

Commands:
  validate  Validate a form schema JSON file (Ajv + i18n check)
  import    Import an AI-generated form schema into a project

Options:
  -h, --help  Show this help message
`);
  process.exit(0);
}

async function main() {
  const restArgs = argv.slice(2);

  if (subcommand === 'validate') {
    const filePath = argv[1];
    if (!filePath) {
      process.stderr.write('Error: file path required\nUsage: designer-cli validate <file>\n');
      process.exit(1);
    }
    const flags = parseFlags(restArgs, ['--locale']);
    const code = await runValidate(filePath, { locale: flags['locale'] });
    process.exit(code);
  } else if (subcommand === 'import') {
    const filePath = argv[1];
    if (!filePath) {
      process.stderr.write('Error: file path required\nUsage: designer-cli import <file> --to <project-path>\n');
      process.exit(1);
    }
    const flags = parseFlags(restArgs, ['--to']);
    const code = await runImport(filePath, { to: flags['to'] ?? '' });
    process.exit(code);
  } else {
    process.stderr.write(`Error: unknown command "${subcommand}"\nRun designer-cli --help for usage.\n`);
    process.exit(1);
  }
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
