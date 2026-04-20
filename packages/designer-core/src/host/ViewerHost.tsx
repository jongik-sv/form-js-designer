/**
 * ViewerHost — TSK-03-03
 *
 * @bpmn-io/form-js-viewer의 Form 인스턴스를 감싸는 Preact 컴포넌트.
 * ADR-0001 §3 D1/D5 단일 파이프라인 유지.
 *
 * lifecycle:
 * - useLayoutEffect([]) — Form 생성 + importSchema(schema, data) + on('changed')
 * - useEffect([schema])  — schema 변경 시 importSchema 재호출
 * - useEffect([data])    — data 변경 시 _update({ data }) 또는 importSchema fallback
 * - cleanup              — form.destroy() 1회 호출 (중복 방지 플래그)
 */

import { h } from 'preact';
import { useLayoutEffect, useEffect, useRef } from 'preact/hooks';
import { LocaleProvider } from '../i18n/LocaleProvider';
import type { ViewerHostProps } from './hostTypes';

// ---------------------------------------------------------------------------
// form-js-viewer Form 타입 (static import)
// ---------------------------------------------------------------------------
import { Form as FormJsForm } from '@bpmn-io/form-js-viewer';

interface FormInstance {
  importSchema(schema: unknown, data?: unknown): Promise<{ warnings: unknown[] }>;
  _update?(opts: { data: unknown }): void;
  destroy(): void;
  on(event: string, handler: (e: unknown) => void): void;
}

type FormConstructor = new (opts: { container: HTMLElement; additionalModules?: unknown[] }) => FormInstance;

const FormClass = FormJsForm as unknown as FormConstructor;

// ---------------------------------------------------------------------------
// 헬퍼 — 컴포넌트 외부에 정의하여 매 렌더마다 재생성하지 않음
// ---------------------------------------------------------------------------

/** storeData + data 머지 — 런타임 data가 storeData보다 우선 */
function mergeData(
  sd?: Record<string, unknown>,
  d?: Record<string, unknown>,
): Record<string, unknown> {
  return { ...(sd ?? {}), ...(d ?? {}) };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function ViewerHost({
  schema,
  data,
  storeData,
  locale,
  additionalModules,
  onChange,
  onImport,
  onError,
  containerRef,
}: ViewerHostProps) {
  const internalRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<FormInstance | null>(null);
  const destroyedRef = useRef(false);
  // 초기 마운트 여부 추적 — useEffect([schema]) / useEffect([data]) 이중 호출 방지
  const schemaInitialRef = useRef(true);
  const dataInitialRef = useRef(true);
  // stale closure 방지: onChange 최신 참조를 항상 ref에 유지
  const onChangeRef = useRef(onChange);

  // onChange가 바뀔 때마다 ref를 최신 값으로 갱신 (리스너 재등록 불필요)
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // 외부 containerRef 지원
  const resolvedRef = (containerRef ?? internalRef) as typeof internalRef;

  // -------------------------------------------------------------------------
  // Mount: Form 생성 + 초기 importSchema
  // -------------------------------------------------------------------------
  useLayoutEffect(() => {
    destroyedRef.current = false;
    const el = resolvedRef.current;
    if (!el) return;

    let form: FormInstance | null = null;

    (async () => {
      try {
        form = new FormClass({ container: el, additionalModules });
        formRef.current = form;

        // changed 이벤트 등록 — onChangeRef를 통해 항상 최신 콜백 참조 (stale closure 방지)
        form.on('changed', (e: unknown) => {
          if (onChangeRef.current) {
            const ev = e as { data?: Record<string, unknown>; schema?: unknown; errors?: Record<string, unknown> };
            onChangeRef.current({
              data: ev.data ?? {},
              schema: ev.schema as typeof schema,
              errors: ev.errors ?? {},
            });
          }
        });

        // schema가 없으면 importSchema 미호출
        if (schema == null) {
          console.warn('[ViewerHost] schema prop is undefined or null; skipping importSchema.');
          return;
        }

        const result = await form.importSchema(schema, mergeData(storeData, data));
        if (!destroyedRef.current) {
          onImport?.(result);
        }
      } catch (err) {
        onError?.(err);
      }
    })();

    return () => {
      if (!destroyedRef.current && form) {
        destroyedRef.current = true;
        form.destroy();
        formRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -------------------------------------------------------------------------
  // Schema 변경 시 importSchema 재호출 (초기 마운트 제외)
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (schemaInitialRef.current) {
      schemaInitialRef.current = false;
      return;
    }
    const form = formRef.current;
    if (!form || destroyedRef.current || schema == null) return;

    form.importSchema(schema, mergeData(storeData, data)).then((result) => {
      if (!destroyedRef.current) {
        onImport?.(result);
      }
    }).catch((err) => {
      onError?.(err);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schema]);

  // -------------------------------------------------------------------------
  // Data 변경 시 _update (없으면 importSchema fallback) (초기 마운트 제외)
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (dataInitialRef.current) {
      dataInitialRef.current = false;
      return;
    }
    const form = formRef.current;
    if (!form || destroyedRef.current || schema == null) return;

    const merged = mergeData(storeData, data);
    if (typeof form._update === 'function') {
      form._update({ data: merged });
    } else {
      // _update 미존재 fallback
      form.importSchema(schema, merged).catch((err) => {
        onError?.(err);
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, storeData]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  const content = <div ref={resolvedRef} class="fjs-viewer-host" />;

  if (locale) {
    return (
      <LocaleProvider lang={locale.lang} t={locale.t}>
        {content}
      </LocaleProvider>
    );
  }

  return content;
}
