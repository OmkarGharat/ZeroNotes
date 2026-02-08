
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import 'highlight.js/styles/atom-one-dark.css';
import './index.css';

import hljs from 'highlight.js';
(window as any).hljs = hljs;


const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
    <App />
);
