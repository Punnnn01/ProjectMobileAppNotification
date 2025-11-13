// src/main.tsx
import { render } from 'preact';
import App from './App';
import './style.css';

const root = document.getElementById('app')!;
render(<App />, root);
