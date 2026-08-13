import { createRoot } from 'react-dom/client';
import { Welcome } from './Welcome';
import './welcome.css';

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(<Welcome />);
}
