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
import './dashboard-photo-banner.css';
import './calendar-interaction.css';
import './dashboard-requests-focus.css';
import './dashboard-vektora-v2.css';
import './opportunities-dashboard.css';
import './quotes-dashboard.css';
import './clients-dashboard.css';
import './orders-dashboard.css';
import './commissions-dashboard.css';
import './agenda-dashboard.css';
import './results-dashboard.css';
import './remaining-crm-screens.css';
import './laptop-layout.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <CrmProvider>
        <App />
      </CrmProvider>
    </HashRouter>
  </React.StrictMode>
);