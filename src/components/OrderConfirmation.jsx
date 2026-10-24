/**
 * ============================================================================
 * PRINT-SATHI COMPONENT: Multi-File Order Confirmation & Pickup Pass
 * ============================================================================
 * 
 * Capabilities:
 * 1. Official token pickup slip with high-contrast Token ID (#PS-XXXX).
 * 2. Displays target shop name and exact counter pickup location.
 * 3. Shows itemized breakdown for all documents in the order.
 * 4. Shows Cloud Firestore / Local synchronization status.
 */

import React from 'react';
import { formatCurrency } from '../utils/pricingEngine';

export default function OrderConfirmation({ order, onReset }) {
  if (!order) return null;

  const files = Array.isArray(order.files) && order.files.length > 0
    ? order.files
    : [
        {
          fileName: order.fileName || 'document.pdf',
          fileUrl: order.fileUrl || '',
          calculatedPages: order.calculatedPages || 1,
          copies: order.copies || 1,
          colorMode: order.colorMode || 'bw',
          sides: order.sides || 'single',
          itemTotal: order.totalAmount || 0,
        },
      ];

  const pickupLocation = order.pickupCounter || 'Counter 1 (Main Xerox Center, Student Plaza)';

  return (
    <div className="confirmation-container">
      <div className="token-pass-card">
        {/* Pass Header */}
        <div className="token-pass-header">
          <div className="success-check-bubble">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 className="pass-headline">Print Job Queued Successfully!</h2>
          <p className="pass-subhead">
            {order.firestoreSaved
              ? '🔥 Order record saved in Cloud Firestore Database!'
              : 'Payment Verified • Spooled to campus printer'}
          </p>
        </div>

        {/* The Big 4-Digit Token Hero Box */}
        <div className="token-hero-box">
          <div className="token-hero-label">Your Counter Pickup Token</div>
          <div className="token-hero-id">#{order.orderId}</div>
          <p className="token-hero-instruction">
            Show this 4-digit token <strong>({order.token})</strong> at{' '}
            <span style={{ color: 'var(--primary)', textDecoration: 'underline' }}>
              {pickupLocation}
            </span>{' '}
            to collect your fresh prints.
          </p>
        </div>

        {/* Multi-Document Itemized Slip List */}
        <div style={{ margin: '1.25rem 2rem 0', textAlign: 'left' }}>
          <h4 style={{ fontSize: '0.85rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
            Documents in this Order ({files.length}):
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {files.map((file, idx) => (
              <div
                key={file.fileId || idx}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.65rem 0.9rem',
                  background: 'rgba(30, 41, 59, 0.4)',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  fontSize: '0.82rem'
                }}
              >
                <div>
                  <div style={{ fontWeight: '600', color: '#f8fafc' }}>
                    📄 {idx + 1}. {file.fileName}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '0.15rem' }}>
                    {file.calculatedPages || 1} pgs &bull; {file.copies} {file.copies === 1 ? 'copy' : 'copies'} &bull;{' '}
                    {file.colorMode === 'color' ? '🎨 Color' : '⬛ B&W'} &bull;{' '}
                    {file.sides === 'double' ? 'Duplex' : 'Single'}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontWeight: '600', color: '#38bdf8' }}>
                    {formatCurrency(file.itemTotal || 0)}
                  </span>
                  {file.fileUrl && (
                    <div>
                      <a
                        href={file.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: '0.7rem', color: '#60a5fa', textDecoration: 'none' }}
                      >
                        ↗ View PDF
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Slip Summary Grid */}
        <div className="slip-details-grid" style={{ marginTop: '1.25rem' }}>
          <div className="slip-item">
            <div className="slip-item-label">Pickup Location</div>
            <div className="slip-item-val" style={{ fontSize: '0.85rem' }}>
              📍 {pickupLocation}
            </div>
          </div>

          <div className="slip-item">
            <div className="slip-item-label">Total Amount Paid</div>
            <div className="slip-item-val" style={{ color: 'var(--success)' }}>
              {formatCurrency(order.totalAmount || 0)} (via UPI)
            </div>
          </div>

          <div className="slip-item">
            <div className="slip-item-label">Cloud Firestore Status</div>
            <div className="slip-item-val">
              {order.firestoreSaved ? (
                <span className="status-badge" style={{ background: '#ecfdf5', color: '#047857' }}>
                  🔥 Saved to Firestore
                </span>
              ) : (
                <span className="status-badge queued">
                  <span className="status-dot"></span> In Local Spooler
                </span>
              )}
            </div>
          </div>

          <div className="slip-item">
            <div className="slip-item-label">Order Created</div>
            <div className="slip-item-val" style={{ fontSize: '0.82rem' }}>
              {new Date(order.createdAt || Date.now()).toLocaleTimeString()}
            </div>
          </div>
        </div>

        {/* Barcode Strip Decoration */}
        <div className="barcode-strip">
          <div className="simulated-barcode">
            <span style={{ width: '4px' }}></span>
            <span style={{ width: '2px' }}></span>
            <span style={{ width: '6px' }}></span>
            <span style={{ width: '1px' }}></span>
            <span style={{ width: '3px' }}></span>
            <span style={{ width: '5px' }}></span>
            <span style={{ width: '2px' }}></span>
            <span style={{ width: '4px' }}></span>
            <span style={{ width: '8px' }}></span>
            <span style={{ width: '2px' }}></span>
            <span style={{ width: '5px' }}></span>
            <span style={{ width: '1px' }}></span>
            <span style={{ width: '6px' }}></span>
            <span style={{ width: '3px' }}></span>
            <span style={{ width: '7px' }}></span>
            <span style={{ width: '2px' }}></span>
          </div>
          <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
            TOKEN: #{order.orderId} &bull; {order.firestoreSaved ? 'FIRESTORE_SYNCED' : 'LOCAL_CACHED'}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="confirmation-actions">
        <button
          type="button"
          className="secondary-action-btn"
          onClick={() => window.print()}
        >
          🖨️ Print / Save Token Slip
        </button>
        <button
          type="button"
          className="primary-action-btn"
          onClick={onReset}
        >
          ➕ Queue Another Document
        </button>
      </div>
    </div>
  );
}
