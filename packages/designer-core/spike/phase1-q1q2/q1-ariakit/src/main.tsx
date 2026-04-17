import { render } from 'preact';
import { Demo } from './Demo';

const root = document.getElementById('app');
if (!root) throw new Error('#app not found');
render(<Demo />, root);
