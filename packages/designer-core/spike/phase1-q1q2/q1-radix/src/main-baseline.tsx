import { render } from 'preact';
import { Baseline } from './Baseline';

const root = document.getElementById('app');
if (!root) throw new Error('#app not found');
render(<Baseline />, root);
