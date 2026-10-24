/**
 * ============================================================================
 * PRINT-SATHI: Management Web App Entry Point (management-main.jsx)
 * ============================================================================
 * 
 * Mounts the Print Sathi Operations & Counter Management Portal:
 * - Counter Desk Console for shopkeepers
 * - Campus Administrator Console for operations
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import ManagementApp from './components/management/ManagementApp';
import './App.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ManagementApp />
  </React.StrictMode>
);
