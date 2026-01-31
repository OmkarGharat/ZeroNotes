
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import 'react-quill/dist/quill.snow.css';
import 'highlight.js/styles/atom-one-dark.css';
import './index.css';

import hljs from 'highlight.js';
(window as any).hljs = hljs;

// Suppress deprecated findDOMNode warning from ReactQuill
const originalError = console.error;
console.error = (...args: any[]) => {
  if (typeof args[0] === 'string' && args[0].includes('findDOMNode is deprecated')) {
    return;
  }
  originalError.call(console, ...args);
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
    <App />
);
