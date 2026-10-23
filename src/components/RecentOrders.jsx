/**
 * ============================================================================
 * PRINT-SATHI COMPONENT: Recent Orders & Campus Queue Tracker
 * ============================================================================
 * 
 * What this component does in plain language:
 * 1. Reads the saved print job history from storage / Firestore cache.
 * 2. Displays each order with its unique Token ID, file name, copies, and live status.
 * 3. Allows students to check tokens they generated earlier today.
 */

import React from 'react';
import { clearOrderHistory } from '../services/firebase';

export default function RecentOrders({ orders, onSelectOrder, onBackToForm, onRefreshOrders }) {
  const handleClear = () => {
    if (window.confirm('Clear your saved local print history on this device?')) {
      clearOrderHistory();
      onRefreshOrders();
    }
  };

  return (
    <div className="panel-card" style={{ maxWidth: '850px', margin: '0 auto' }}>
      <div className="panel-header">
        <h2 className="panel-title">
          <span className="panel-title-icon">📋</span>
          My Campus Print Queue
        </h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {orders.length > 0 && (
            <button
              type="button"
              className="remove-btn"
              onClick={handleClear}
            >
              Clear History
            </button>
          )}
          <button
            type="button"
            className="secondary-action-btn"
            style={{ padding: '0.4rem 0.85rem', fontSize: '0.82rem' }}
            onClick={onBackToForm}
          >
            ← Back to Print Form
          </button>
        </div>
      </div>

      {orders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📭</div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.35rem' }}>
            No Print Orders in Queue Yet
          </h3>
          <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            Upload a PDF document to queue your first campus print job!
          </p>
          <button
            type="button"
            className="primary-action-btn"
            style={{ display: 'inline-flex', padding: '0.65rem 1.25rem' }}
            onClick={onBackToForm}
          >
            Upload PDF & Print Now
          </button>
        </div>
      ) : (
        <div className="orders-table-wrapper">
          <table className="orders-table">
            <thead>
              <tr>
                <th>Token ID</th>
                <th>Document</th>
                <th>Config</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.orderId}>
                  <td>
                    <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--primary)' }}>
                      #{order.orderId}
                    </strong>
                  </td>
                  <td style={{ maxWidth: '180px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {order.fileName}
                  </td>
                  <td>
                    {order.copies}× • {order.colorMode === 'color' ? 'Color' : 'B&W'} • {order.sides}
                  </td>
                  <td>
                    <strong style={{ fontFamily: 'var(--font-mono)' }}>₹{order.totalAmount}</strong>
                  </td>
                  <td>
                    <span className="status-badge queued">
                      <span className="status-dot"></span> Ready for Pickup
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="secondary-action-btn"
                      style={{ padding: '0.3rem 0.65rem', fontSize: '0.76rem' }}
                      onClick={() => onSelectOrder(order)}
                    >
                      View Token Slip
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
