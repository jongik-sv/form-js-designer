/**
 * main.tsx — Preact 앱 부트스트랩
 * TSK-06-01
 */

import { h, render } from 'preact';
import { App } from './App';
import { WatermarkMonitor } from '@form-js-designer/designer-runtime/watermark';

const appEl = document.getElementById('app');
if (!appEl) {
  throw new Error('[designer-editor-host] #app element not found');
}

render(h(App, {}), appEl);

if (process.env.NODE_ENV === 'production') {
  new WatermarkMonitor().start();
}
