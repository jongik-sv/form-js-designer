/**
 * LivePreviewService — TSK-06-02
 *
 * DI 주입: eventBus, formEditor
 * mount(target) 시 ViewerHost를 preact.render로 마운트하고
 * commandStack.changed / elements.changed 이벤트를 구독하여 스키마 변경을 즉시 반영한다.
 * ADR-0001 §3 D5 Viewport·Theme·Data·Locale 패리티 준수.
 */

import { h, render } from 'preact';
import { ViewerHost, DesignerContainerModule } from '@form-js-designer/designer-core';
import { DesignerComponentsModule } from '@form-js-designer/designer-components';
import { LayoutHeightModule } from '@form-js-designer/designer-runtime';

// Viewer에도 에디터와 동일한 커스텀 container/component 모듈을 주입해야
// tabs/tabPanel/card/modal 등이 렌더링되고, 삭제 시 잔여 DOM 없이 깔끔하게
// 재임포트된다. Button 과 Table 은 form-js native 컴포넌트를 그대로 사용한다.
// DesignerContainerModule: formLayouter override (커스텀 container 렌더 필수)
// DesignerComponentsModule: 커스텀 컴포넌트 타입 등록
// LayoutHeightModule: layout.height DOM inline style 주입 (TSK-12-02)
const VIEWER_ADDITIONAL_MODULES: unknown[] = [
  DesignerContainerModule,
  DesignerComponentsModule,
  LayoutHeightModule,
];

// 안정된 빈 data 참조 — 매 렌더마다 새 `{}`를 넘기면 ViewerHost의
// useEffect([data])가 불필요하게 발화해 importSchema 진행 중
// form._update 가 호출돼 race condition이 발생한다.
const EMPTY_DATA: Record<string, unknown> = Object.freeze({});

interface EventBusLike {
  on(event: string, handler: (...args: unknown[]) => void): void;
  off(event: string, handler: (...args: unknown[]) => void): void;
}

interface FormEditorLike {
  getSchema(): Record<string, unknown>;
}

const CHANGE_EVENTS = ['commandStack.changed', 'elements.changed'];

export class LivePreviewService {
  static inject = ['eventBus', 'formEditor'];

  private readonly eventBus: EventBusLike;
  private readonly formEditor: FormEditorLike;
  private target: HTMLElement | null = null;
  private currentSchema: Record<string, unknown> | null = null;
  private boundOnChange: (() => void) | null = null;
  // 동일 tick에 발생하는 commandStack.changed/elements.changed(복수)를 한 번만 렌더
  private rerenderScheduled = false;

  constructor(eventBus: EventBusLike, formEditor: FormEditorLike) {
    this.eventBus = eventBus;
    this.formEditor = formEditor;
  }

  /**
   * 지정 DOM 요소에 ViewerHost를 마운트하고 변경 이벤트 구독을 시작한다.
   */
  mount(target: HTMLElement): void {
    // 이미 마운트된 경우 이전 리스너 정리
    if (this.target && this.boundOnChange) {
      for (const event of CHANGE_EVENTS) {
        this.eventBus.off(event, this.boundOnChange);
      }
    }

    this.target = target;
    this.currentSchema = this.formEditor.getSchema();
    this._renderViewer();

    this.boundOnChange = this._onEditorChange.bind(this);
    for (const event of CHANGE_EVENTS) {
      this.eventBus.on(event, this.boundOnChange);
    }
  }

  /**
   * 언마운트 및 리스너 제거.
   */
  destroy(): void {
    if (this.boundOnChange) {
      for (const event of CHANGE_EVENTS) {
        this.eventBus.off(event, this.boundOnChange);
      }
      this.boundOnChange = null;
    }

    if (this.target) {
      render(null, this.target);
      this.target = null;
    }
    this.rerenderScheduled = false;
  }

  private _onEditorChange(): void {
    if (this.rerenderScheduled) return;
    this.rerenderScheduled = true;
    const schedule =
      typeof requestAnimationFrame === 'function'
        ? requestAnimationFrame
        : (cb: FrameRequestCallback) => setTimeout(() => cb(0), 0) as unknown as number;
    schedule(() => {
      this.rerenderScheduled = false;
      if (!this.target) return;
      this.currentSchema = this.formEditor.getSchema();
      this._renderViewer();
    });
  }

  private _renderViewer(): void {
    if (!this.target) return;

    render(
      h(ViewerHost as Parameters<typeof h>[0], {
        schema: this.currentSchema,
        data: EMPTY_DATA,
        additionalModules: VIEWER_ADDITIONAL_MODULES,
      }),
      this.target,
    );
  }
}
