import { render } from 'preact';
import { Demo } from './Demo';
import './styles.css';

const root = document.getElementById('root');
if (root) render(<Demo />, root);
