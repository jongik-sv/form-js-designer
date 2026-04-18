/**
 * LivePreviewService — TSK-06-02
 *
 * DI 주입: eventBus, formEditor
 * mount(target) 시 ViewerHost를 preact.render로 마운트하고
 * commandStack.changed / elements.changed 이벤트를 구독하여 스키마 변경을 즉시 반영한다.
 * ADR-0001 §3 D5 Viewport·Theme·Data·Locale 패리티 준수.
 */

import { h, render } from 'preact';
import { ViewerHost } from '@form-js-designer/designer-core';

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
  }

  private _onEditorChange(): void {
    this.currentSchema = this.formEditor.getSchema();
    this._renderViewer();
  }

  private _renderViewer(): void {
    if (!this.target) return;

    render(
      h(ViewerHost as Parameters<typeof h>[0], {
        schema: this.currentSchema,
        data: {},
      }),
      this.target,
    );
  }
}
