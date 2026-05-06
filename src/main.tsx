import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './ui/App';
import './style.css'; // Optional, keeping it if it exists

ReactDOM.createRoot(document.getElementById('app')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
