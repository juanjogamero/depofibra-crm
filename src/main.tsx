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
import './corporate-atmosphere.css';
import './dashboard-focus.css';
import './dashboard-centered.css';
import './results-insights.css';
import './finance-analytics.css';
import './catalog-manager.css';
import './transport-route.css';
import './results-clean.css';
import './results-console.css';
import './ux-refinements.css';
import './ux-sales-workflow.css';
import './office-production-flow.css';
import './quote-items-layout.css';
import './qa-hardening.css';
import './topbar-removal.css';
import './agenda-results-minimal.css';
import './catalog-navigation.css';
import './crm-direction-ux-20261125.css';
import './soft-brand-background.css';
import './table-chrome-minimal.css';
import './agenda-readable-layout-20261125.css';
import './results-clarity-nine-reports.css';
import './crm-five-screen-layout-20261126.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <CrmProvider>
        <App />
      </CrmProvider>
    </HashRouter>
  </React.StrictMode>
);