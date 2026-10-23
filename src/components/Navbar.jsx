/**
 * ============================================================================
 * PRINT-SATHI COMPONENT: Navbar
 * ============================================================================
 */

import React from 'react';
import { isFirebaseConfigured } from '../services/firebase';

export default function Navbar({ activeTab, setActiveTab, ordersCount }) {
  return (
    <header className="navbar">
      <div className="navbar-inner">
        {/* Brand Logo & Title */}
        <div 
          className="brand-wrapper" 
          onClick={() => setActiveTab('queue')}
          role="button"
          tabIndex={0}
        >
          <div className="brand-icon">
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
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
          </div>
          <div>
            <h1 className="brand-title">
              Print<span>Sathi</span>
            </h1>
            <p className="brand-subtitle">Campus Smart Print Queue</p>
          </div>
        </div>

        {/* Live Status & Quick Navigation */}
        <div className="navbar-stats">
          {/* Visual Indicator of Firebase Connection */}
          {isFirebaseConfigured ? (
            <div 
              className="campus-pill" 
              style={{ background: '#ecfdf5', color: '#047857', borderColor: '#a7f3d0' }}
              title="Connected to Firebase Cloud"
            >
              <span className="status-dot"></span>
              <span>🔥 Firebase Active</span>
            </div>
          ) : (
            <div 
              className="campus-pill" 
              style={{ background: '#f8fafc', color: '#64748b', borderColor: '#e2e8f0' }}
              title="Add Firebase API keys to .env to enable Cloud upload"
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#94a3b8', display: 'inline-block' }}></span>
              <span>Demo Mode</span>
            </div>
          )}


          <button
            type="button"
            className="secondary-action-btn"
            style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem' }}
            onClick={() => setActiveTab(activeTab === 'orders' ? 'queue' : 'orders')}
          >
            {activeTab === 'orders' ? '← Back' : `📋 Orders (${ordersCount})`}
          </button>
        </div>
      </div>
    </header>
  );
}
