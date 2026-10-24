/**
 * ============================================================================
 * PRINT-SATHI: Dedicated Management Web Application (ManagementApp.jsx)
 * ============================================================================
 * 
 * Standalone web application for:
 * 1. Counter Desk Console:
 *    - Shopkeeper registration (with full quantity-tier rates and service toggles)
 *    - Counter login and session management
 *    - Live incoming Firestore queue (onSnapshot) and printing controls
 *    - QR standee generator and availability toggle
 * 
 * 2. Campus Administrator Portal:
 *    - Secure Firebase Authentication login (admin.jaideep@printsathi.campus)
 *    - Real-time review of all registered campus shops
 *    - Consequential approval, rejection (with reason), suspension, and reactivations
 *    - Direct provisioning of campus counters
 * 
 * 3. Strict Authorization Boundary:
 *    - Partitioned views and role checks prevent unauthorized access.
 */

import React, { useState, useEffect } from 'react';
import ManagementNavbar from './ManagementNavbar';
import ShopkeeperAuth from '../ShopkeeperAuth';
import ShopkeeperDashboard from '../ShopkeeperDashboard';
import AdminConsole from '../AdminConsole';
import { 
  subscribeToAuth, 
  logoutUser, 
  getAdminSession, 
  logoutAdmin 
} from '../../services/firebase';

export default function ManagementApp() {
  // Initialize view from URL hash (#admin or #desk) or search params
  const getInitialView = () => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.toLowerCase();
      if (hash.includes('admin')) return 'admin';
      if (hash.includes('desk')) return 'desk';
      const params = new URLSearchParams(window.location.search);
      if (params.get('view') === 'admin') return 'admin';
    }
    return 'desk';
  };

  const [activeView, setActiveView] = useState(getInitialView);
  const [shopkeeperUser, setShopkeeperUser] = useState(null);
  const [checkingShopAuth, setCheckingShopAuth] = useState(true);
  const [adminUser, setAdminUser] = useState(null);

  // Sync hash when activeView changes
  const handleSelectView = (view) => {
    setActiveView(view);
    if (typeof window !== 'undefined') {
      window.location.hash = view;
    }
  };

  // Listen to hash changes in window
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.toLowerCase();
      if (hash.includes('admin') && activeView !== 'admin') {
        setActiveView('admin');
      } else if (hash.includes('desk') && activeView !== 'desk') {
        setActiveView('desk');
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [activeView]);

  // Check stored Admin session
  useEffect(() => {
    const session = getAdminSession();
    if (session) {
      setAdminUser(session);
    }
  }, []);

  // Listen to Firebase Auth state for Shopkeeper
  useEffect(() => {
    const unsubscribe = subscribeToAuth((user) => {
      setShopkeeperUser(user);
      setCheckingShopAuth(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogoutShopkeeper = async () => {
    try {
      await logoutUser();
      setShopkeeperUser(null);
    } catch (err) {
      console.warn('Shopkeeper logout error:', err);
    }
  };

  const handleLogoutAdmin = async () => {
    try {
      await logoutAdmin();
      setAdminUser(null);
    } catch (err) {
      console.warn('Admin logout error:', err);
    }
  };

  return (
    <div className="app-container" style={{ background: '#f8fafc', minHeight: '100vh' }}>
      {/* Top Management Navbar */}
      <ManagementNavbar
        activeView={activeView}
        onSelectView={handleSelectView}
        adminUser={adminUser}
        shopkeeperUser={shopkeeperUser}
        onLogoutAdmin={handleLogoutAdmin}
        onLogoutShopkeeper={handleLogoutShopkeeper}
      />

      {/* Main Operations Content */}
      <main className="main-content" style={{ padding: '2rem 1.25rem 4rem' }}>
        {/* VIEW 1: Counter Desk Console */}
        {activeView === 'desk' && (
          <div>
            {checkingShopAuth ? (
              <div 
                style={{ 
                  textAlign: 'center', 
                  padding: '5rem 2rem', 
                  color: '#64748b',
                  background: '#ffffff',
                  borderRadius: '16px',
                  border: '1px solid #e2e8f0',
                  maxWidth: '540px',
                  margin: '2rem auto'
                }}
              >
                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🔄</div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>
                  Verifying Counter Session...
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.4rem' }}>
                  Connecting to Print Sathi Counter Authentication
                </p>
              </div>
            ) : !shopkeeperUser ? (
              <ShopkeeperAuth 
                onAuthSuccess={(user) => setShopkeeperUser(user)} 
              />
            ) : (
              <ShopkeeperDashboard 
                user={shopkeeperUser} 
                onLogout={handleLogoutShopkeeper} 
              />
            )}
          </div>
        )}

        {/* VIEW 2: Campus Administrator Console */}
        {activeView === 'admin' && (
          <div>
            <AdminConsole 
              adminUser={adminUser}
              onLoginSuccess={(u) => setAdminUser(u)}
              onLogout={() => setAdminUser(null)}
            />
          </div>
        )}
      </main>

      {/* Management Footer */}
      <footer 
        className="app-footer" 
        style={{ 
          background: '#ffffff', 
          borderTop: '1px solid #e2e8f0', 
          padding: '1.5rem', 
          textAlign: 'center' 
        }}
      >
        <p style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>
          <strong>Print-Sathi</strong> &bull; Counter Operations & Campus Administration Portal
        </p>
        <p style={{ marginTop: '0.35rem', fontSize: '0.76rem', color: '#94a3b8' }}>
          Dedicated Management Client &bull; Live Firestore Queue Spooler &bull; Real-time Shop Verification
        </p>
      </footer>
    </div>
  );
}
