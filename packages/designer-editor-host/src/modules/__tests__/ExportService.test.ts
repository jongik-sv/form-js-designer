/**
 * ExportService 단위 테스트 — TSK-06-02
 * 6 케이스: Blob 생성 + URL.createObjectURL mock, validate 실패 시 confirm 경로,
 *           buildPublishCommand 문자열
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ExportService } from '../ExportService';

// Blob + URL.createObjectURL + createElement mock
function setupBrowserMocks() {
  const mockObjectURL = 'blob:http://localhost/test-uuid';
  const mockRevoke = vi.fn();
  const mockClick = vi.fn();

  globalThis.URL = {
    createObjectURL: vi.fn().mockReturnValue(mockObjectURL),
    revokeObjectURL: mockRevoke,
  } as unknown as typeof URL;

  const mockAnchor = {
    href: '',
    download: '',
    click: mockClick,
    style: { display: '' },
  };

  const origCreateElement = document.createElement.bind(document);
  vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
    if (tag === 'a') return mockAnchor as unknown as HTMLElement;
    return origCreateElement(tag);
  });

  const mockAppendChild = vi.fn();
  const mockRemoveChild = vi.fn();
  vi.spyOn(document.body, 'appendChild').mockImplementation(mockAppendChild);
  vi.spyOn(document.body, 'removeChild').mockImplementation(mockRemoveChild);

  return { mockObjectURL, mockRevoke, mockClick, mockAnchor };
}

function makeDeps(validateResult = { ok: true, errors: [], warnings: [] }) {
  return {
    formEditor: {
      getSchema: vi.fn().mockReturnValue({ id: 'my-form', type: 'default', components: [] }),
    },
    validateService: {
      validate: vi.fn().mockReturnValue(validateResult),
    },
  };
}

describe('ExportService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Case 1: downloadJson() — Blob 생성 + URL.createObjectURL 호출
  it('1: downloadJson() 호출 시 URL.createObjectURL이 호출됨', () => {
    const { mockObjectURL } = setupBrowserMocks();
    const deps = makeDeps();
    const service = new ExportService(deps.formEditor, deps.validateService);
    service.downloadJson();
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(mockObjectURL).toBeTruthy();
  });

  // Case 2: downloadJson() — 앵커 클릭 트리거
  it('2: downloadJson() 호출 시 <a download> 클릭이 트리거됨', () => {
    const { mockClick } = setupBrowserMocks();
    const deps = makeDeps();
    const service = new ExportService(deps.formEditor, deps.validateService);
    service.downloadJson();
    expect(mockClick).toHaveBeenCalled();
  });

  // Case 3: validate 실패 시 confirm 경로 — confirm(false)이면 다운로드 미실행
  it('3: validate 실패 + confirm 취소 시 다운로드가 발생하지 않음', () => {
    const { mockClick } = setupBrowserMocks();
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const deps = makeDeps({ ok: false, errors: [{ path: 'f1', code: 'ERR', message: 'error' }], warnings: [] });
    const service = new ExportService(deps.formEditor, deps.validateService);
    service.downloadJson();
    expect(mockClick).not.toHaveBeenCalled();
  });

  // Case 4: validate 실패 + confirm(true) → 다운로드 진행
  it('4: validate 실패 + confirm 승인 시 다운로드 진행', () => {
    const { mockClick } = setupBrowserMocks();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const deps = makeDeps({ ok: false, errors: [{ path: 'f1', code: 'ERR', message: 'error' }], warnings: [] });
    const service = new ExportService(deps.formEditor, deps.validateService);
    service.downloadJson();
    expect(mockClick).toHaveBeenCalled();
  });

  // Case 5: buildPublishCommand('static') 문자열 확인
  it('5: buildPublishCommand("static") 가 올바른 CLI 명령 문자열 반환', () => {
    const deps = makeDeps();
    const service = new ExportService(deps.formEditor, deps.validateService);
    const cmd = service.buildPublishCommand('static');
    expect(cmd).toContain('designer-cli publish');
    expect(cmd).toContain('--target static');
  });

  // Case 6: buildPublishCommand('api') 문자열 — url 포함
  it('6: buildPublishCommand("api", url) 가 url 포함 명령 반환', () => {
    const deps = makeDeps();
    const service = new ExportService(deps.formEditor, deps.validateService);
    const cmd = service.buildPublishCommand('api', 'https://api.example.com');
    expect(cmd).toContain('--target api');
    expect(cmd).toContain('--url https://api.example.com');
  });
});
