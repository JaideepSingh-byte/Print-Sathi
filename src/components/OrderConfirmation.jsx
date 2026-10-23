/**
 * ============================================================================
 * PRINT-SATHI COMPONENT: Order Confirmation & Counter Pickup Pass
 * ============================================================================
 * 
 * What this component does in plain language:
 * 1. Serves as the official pickup token ticket once payment is simulated.
 * 2. Displays the student's 4-digit Token ID (#PS-XXXX) in large, high-contrast typography.
 * 3. Shows cloud confirmation for Cloud Firestore and Storage.
 * 4. Shows an itemized summary of the print job.
 * 5. Provides a "Queue Another Document" button to reset the form.
 */

import React from 'react';

export default function OrderConfirmation({ order, onReset }) {
  if (!order) return null;

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

        {/* Free Plan / Cloud Storage Info Note */}
        {!order.storageUploaded && (
          <div style={{
            margin: '1.25rem 2rem 0',
            padding: '0.9rem 1.1rem',
            background: '#f0fdf4',
            border: '1.5px solid #bbf7d0',
            borderRadius: '12px',
            fontSize: '0.84rem',
            color: '#166534',
            lineHeight: 1.5
          }}>
            <strong style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
              <span>✅</span> Cloud Firestore Active (100% Free Spark Plan)
            </strong>
            <div>
              Your order metadata, token, and prices are sent live to your Google Cloud Firestore database. You do <strong>not</strong> need to pay or upgrade to the Blaze plan to use Firestore!
            </div>
          </div>
        )}

        {/* The Big 4-Digit Token Hero Box */}
        <div className="token-hero-box">
          <div className="token-hero-label">Your Counter Pickup Token</div>
          <div className="token-hero-id">#{order.orderId}</div>
          <p className="token-hero-instruction">
            Show this 4-digit token <strong>({order.token})</strong> at{' '}
            <span style={{ color: 'var(--primary)', textDecoration: 'underline' }}>
              Counter 1 (Main Student Plaza)
            </span>{' '}
            to collect your fresh prints.
          </p>
        </div>

        {/* Itemized Slip Summary */}
        <div className="slip-details-grid">
          <div className="slip-item">
            <div className="slip-item-label">Document Name</div>
            <div className="slip-item-val" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              📄 {order.fileName}
            </div>
            {order.fileUrl && (
              <a
                href={order.fileUrl}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: '0.74rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: 600, display: 'inline-block', marginTop: '0.2rem' }}
              >
                ↗ View PDF Document
              </a>
            )}
          </div>

          <div className="slip-item">
            <div className="slip-item-label">Pages Printed</div>
            <div className="slip-item-val">
              {order.calculatedPages} page{order.calculatedPages === 1 ? '' : 's'}{' '}
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                ({order.pageRangeMode === 'all' ? 'All' : order.pageRangeString})
              </span>
            </div>
          </div>

          <div className="slip-item">
            <div className="slip-item-label">Copies & Mode</div>
            <div className="slip-item-val">
              {order.copies} {order.copies === 1 ? 'copy' : 'copies'} •{' '}
              {order.colorMode === 'color' ? '🎨 Color' : '⬛ B&W'}
            </div>
          </div>

          <div className="slip-item">
            <div className="slip-item-label">Paper Layout</div>
            <div className="slip-item-val">
              {order.sides === 'double' ? 'Double-Sided (Duplex)' : 'Single-Sided'}
            </div>
          </div>

          <div className="slip-item">
            <div className="slip-item-label">Total Amount Paid</div>
            <div className="slip-item-val" style={{ color: 'var(--success)' }}>
              ₹{order.totalAmount} (via UPI)
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
            TOKEN: #{order.orderId} • {order.firestoreSaved ? 'FIRESTORE_SYNCED' : 'LOCAL_CACHED'}
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
