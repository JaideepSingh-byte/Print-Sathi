/**
 * ============================================================================
 * PRINT-SATHI COMPONENT: Payment Simulation Modal (UPI QR Code)
 * ============================================================================
 * 
 * What this component does in plain language:
 * 1. Simulates a standard Indian campus UPI checkout flow (GPay, PhonePe, Paytm).
 * 2. Renders an interactive QR Code badge displaying the exact calculated ₹ total.
 * 3. Shows an action button: "Simulate UPI Payment Success".
 * 4. Triggers the backend/Firestore submission workflow and moves the student
 *    to the official Order Confirmation & Counter Token screen.
 */

import React, { useState } from 'react';

export default function PaymentModal({
  isOpen,
  onClose,
  totalAmount,
  onConfirmPayment,
}) {
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleSimulatePayment = async () => {
    setIsProcessing(true);
    try {
      await onConfirmPayment();
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title">Campus UPI Fast Pay</div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {/* Price display */}
          <div className="modal-amount-display">
            <span className="modal-amount-label">Amount to Pay</span>
            <div className="modal-amount-value">₹{totalAmount}</div>
          </div>

          {/* Simulated UPI QR Code Frame */}
          <div className="qr-code-frame">
            {/* SVG Crisp QR Pattern */}
            <svg width="150" height="150" viewBox="0 0 100 100" fill="#0f172a">
              {/* Corner Targets */}
              <rect x="0" y="0" width="28" height="28" rx="4" fill="#0f172a" />
              <rect x="4" y="4" width="20" height="20" rx="2" fill="#ffffff" />
              <rect x="8" y="8" width="12" height="12" fill="#4f46e5" />

              <rect x="72" y="0" width="28" height="28" rx="4" fill="#0f172a" />
              <rect x="76" y="4" width="20" height="20" rx="2" fill="#ffffff" />
              <rect x="80" y="8" width="12" height="12" fill="#4f46e5" />

              <rect x="0" y="72" width="28" height="28" rx="4" fill="#0f172a" />
              <rect x="4" y="76" width="20" height="20" rx="2" fill="#ffffff" />
              <rect x="8" y="80" width="12" height="12" fill="#4f46e5" />

              {/* Data Blocks */}
              <rect x="34" y="4" width="6" height="6" fill="#0f172a" />
              <rect x="46" y="4" width="12" height="6" fill="#0f172a" />
              <rect x="62" y="4" width="4" height="6" fill="#0f172a" />

              <rect x="34" y="14" width="10" height="6" fill="#0f172a" />
              <rect x="50" y="14" width="6" height="6" fill="#0f172a" />
              <rect x="60" y="14" width="6" height="6" fill="#0f172a" />

              <rect x="34" y="24" width="6" height="6" fill="#0f172a" />
              <rect x="44" y="24" width="8" height="6" fill="#0f172a" />
              <rect x="58" y="24" width="8" height="6" fill="#0f172a" />

              <rect x="4" y="34" width="6" height="12" fill="#0f172a" />
              <rect x="16" y="34" width="12" height="6" fill="#0f172a" />
              <rect x="34" y="34" width="32" height="32" rx="4" fill="#4f46e5" />
              <circle cx="50" cy="50" r="10" fill="#ffffff" />
              <circle cx="50" cy="50" r="5" fill="#4f46e5" />

              <rect x="72" y="34" width="8" height="12" fill="#0f172a" />
              <rect x="86" y="34" width="10" height="6" fill="#0f172a" />

              <rect x="4" y="52" width="14" height="6" fill="#0f172a" />
              <rect x="22" y="52" width="6" height="12" fill="#0f172a" />
              <rect x="72" y="52" width="12" height="6" fill="#0f172a" />
              <rect x="88" y="52" width="8" height="12" fill="#0f172a" />

              <rect x="34" y="72" width="8" height="12" fill="#0f172a" />
              <rect x="48" y="72" width="14" height="6" fill="#0f172a" />
              <rect x="68" y="72" width="8" height="10" fill="#0f172a" />
              <rect x="82" y="72" width="14" height="6" fill="#0f172a" />

              <rect x="34" y="88" width="16" height="8" fill="#0f172a" />
              <rect x="56" y="88" width="10" height="8" fill="#0f172a" />
              <rect x="72" y="88" width="24" height="8" fill="#0f172a" />
            </svg>

            <span className="qr-scan-badge">SCAN TO PAY</span>
          </div>

          {/* Supported UPI Apps */}
          <div className="simulated-upi-apps">
            <span className="upi-app-pill">Google Pay</span>
            <span className="upi-app-pill">PhonePe</span>
            <span className="upi-app-pill">Paytm</span>
            <span className="upi-app-pill">BHIM</span>
          </div>

          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            UPI ID: <strong>printsathi.central@upi</strong>
          </p>

          {/* Simulate Action Button */}
          <button
            type="button"
            className="simulate-pay-btn"
            disabled={isProcessing}
            onClick={handleSimulatePayment}
          >
            {isProcessing ? (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="status-dot">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
                Processing & Writing to Firestore...
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Simulate Payment Success (₹{totalAmount})
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
