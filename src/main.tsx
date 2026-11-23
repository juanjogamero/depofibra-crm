import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { CrmProvider } from './store';
import App from './App';
import './styles.css';
import './corporate.css';
import './sidebar-reference.css';
import './sidebar-motion.css';
import './dashboard-reference.css';
import './typography.css';
import './dashboard-hr.css';
import './crm-typography.css';
import './dashboard-workqueue.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <CrmProvider>
        <App />
      </CrmProvider>
    </HashRouter>
  </React.StrictMode>
);