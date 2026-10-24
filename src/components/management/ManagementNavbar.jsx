/**
 * ============================================================================
 * PRINT-SATHI: Operations & Counter Management Navbar
 * ============================================================================
 * 
 * Top-level navigation for the dedicated Management Web App:
 * - Switching between Shopkeeper Desk Console and Campus Admin Portal
 * - Live Firebase connection status
 * - Active session indicators (Admin identity / Shopkeeper identity)
 * - Safe navigation link back to the Student Portal
 */

import React from 'react';
import { isFirebaseConfigured } from '../../services/firebase';

export default function ManagementNavbar({
  activeView,
  onSelectView,
  adminUser,
  shopkeeperUser,
  onLogoutAdmin,
  onLogoutShopkeeper
}) {
  return (
    <header className="navbar" style={{ borderBottom: '2px solid #e0e7ff' }}>
      <div className="navbar-inner">
        {/* Brand Logo & Title */}
        <div 
          className="brand-wrapper" 
          onClick={() => onSelectView('desk')}
          role="button" 
          tabIndex={0}
        >
          <div 
            className="brand-icon" 
            style={{ 
              background: 'linear-gradient(135deg, #0284c7, #4f46e5)',
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)'
            }}
          >
            <svg 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
          </div>
          <div>
            <h1 className="brand-title">
              Print<span>Sathi</span>
              <span 
                style={{ 
                  fontSize: '0.65rem', 
                  background: '#e0e7ff', 
                  color: '#4338ca', 
                  padding: '0.15rem 0.5rem', 
                  borderRadius: '999px', 
                  fontWeight: 800,
                  textTransform: 'uppercase', 
                  letterSpacing: '0.06em' 
                }}
              >
                Ops & Counters
              </span>
            </h1>
            <p className="brand-subtitle">Shopkeeper Console & Admin Operations</p>
          </div>
        </div>

        {/* Navigation & Controls */}
        <div className="navbar-stats" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          {/* Firebase Active Pill */}
          {isFirebaseConfigured ? (
            <div 
              className="campus-pill" 
              style={{ background: '#ecfdf5', color: '#047857', borderColor: '#a7f3d0' }}
              title="Connected to Firebase Cloud Firestore"
            >
              <span className="status-dot"></span>
              <span>🔥 Firebase Active</span>
            </div>
          ) : (
            <div 
              className="campus-pill" 
              style={{ background: '#f8fafc', color: '#64748b', borderColor: '#e2e8f0' }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#94a3b8', display: 'inline-block' }}></span>
              <span>Demo Mode</span>
            </div>
          )}

          {/* View Switcher: Desk Console */}
          <button
            type="button"
            onClick={() => onSelectView('desk')}
            style={{
              padding: '0.45rem 0.85rem',
              fontSize: '0.82rem',
              fontWeight: '700',
              borderRadius: '8px',
              border: activeView === 'desk' ? '1px solid #0284c7' : '1px solid #e2e8f0',
              background: activeView === 'desk' ? '#0284c7' : '#ffffff',
              color: activeView === 'desk' ? '#ffffff' : '#334155',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'all 0.18s ease'
            }}
          >
            <span>🏪 Desk Console</span>
            {shopkeeperUser && (
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80' }}></span>
            )}
          </button>

          {/* View Switcher: Admin Operations */}
          <button
            type="button"
            onClick={() => onSelectView('admin')}
            style={{
              padding: '0.45rem 0.85rem',
              fontSize: '0.82rem',
              fontWeight: '700',
              borderRadius: '8px',
              border: activeView === 'admin' ? '1px solid #4f46e5' : '1px solid #e2e8f0',
              background: activeView === 'admin' ? '#4f46e5' : '#ffffff',
              color: activeView === 'admin' ? '#ffffff' : '#334155',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'all 0.18s ease'
            }}
          >
            <span>🛡️ Admin Portal</span>
            {adminUser && (
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#a5b4fc' }}></span>
            )}
          </button>

          {/* Active Session Indicator & Quick Logout */}
          {activeView === 'admin' && adminUser && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span 
                style={{ 
                  fontSize: '0.74rem', 
                  fontWeight: 600, 
                  color: '#4338ca', 
                  background: '#e0e7ff', 
                  padding: '0.3rem 0.6rem', 
                  borderRadius: '6px' 
                }}
              >
                👤 {adminUser.displayName || 'Jaideep Singh'}
              </span>
              <button
                type="button"
                onClick={onLogoutAdmin}
                style={{
                  padding: '0.3rem 0.55rem',
                  fontSize: '0.72rem',
                  fontWeight: '600',
                  color: '#dc2626',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
                title="Log out of Administrator Session"
              >
                Sign Out
              </button>
            </div>
          )}

          {activeView === 'desk' && shopkeeperUser && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span 
                style={{ 
                  fontSize: '0.74rem', 
                  fontWeight: 600, 
                  color: '#0369a1', 
                  background: '#e0f2fe', 
                  padding: '0.3rem 0.6rem', 
                  borderRadius: '6px' 
                }}
              >
                🏪 {shopkeeperUser.email?.split('@')[0]}
              </span>
              <button
                type="button"
                onClick={onLogoutShopkeeper}
                style={{
                  padding: '0.3rem 0.55rem',
                  fontSize: '0.72rem',
                  fontWeight: '600',
                  color: '#dc2626',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
                title="Log out of Counter Desk"
              >
                Sign Out
              </button>
            </div>
          )}

          {/* Return to Student Portal Link */}
          <a
            href="/"
            style={{
              textDecoration: 'none',
              padding: '0.45rem 0.75rem',
              fontSize: '0.8rem',
              fontWeight: '600',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#f8fafc',
              color: '#475569',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
            title="Open Student-Facing Print Portal"
          >
            <span>🌐 Student Portal &rarr;</span>
          </a>
        </div>
      </div>
    </header>
  );
}
