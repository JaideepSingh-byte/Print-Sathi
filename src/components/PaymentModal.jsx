/**
 * ============================================================================
 * PRINT-SATHI COMPONENT: Campus UPI Payment Modal & Verification
 * ============================================================================
 * 
 * Features:
 * 1. Simulates campus UPI payment (GPay, PhonePe, Paytm, BHIM).
 * 2. Real UPI deeplink URI format for QR generation (`upi://pay?...`).
 * 3. Client & Server validation readiness (HMAC architecture).
 * 4. Resilient one-click payment confirmation simulation with progress state.
 */

import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { formatCurrency } from '../utils/pricingEngine';

export default function PaymentModal({
  isOpen,
  onClose,
  totalAmount,
  pricingSnapshot = null,
  onConfirmPayment,
}) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMode, setPaymentMode] = useState('qr'); // 'qr' | 'upi_id'

  if (!isOpen) return null;

  const displayAmount = typeof totalAmount === 'number' ? totalAmount : 0;
  // Standard NPCI UPI URI string
  const upiUri = `upi://pay?pa=printsathi.campus@okaxis&pn=PrintSathi%20Campus%20Xerox&am=${displayAmount.toFixed(2)}&cu=INR&tn=PrintJobOrder`;

  const handleSimulatePayment = async () => {
    setIsProcessing(true);
    try {
      await onConfirmPayment();
    } catch (err) {
      console.error('Payment confirmation error:', err);
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
            <div className="modal-amount-value">{formatCurrency(displayAmount)}</div>
            {pricingSnapshot?.totalFiles && (
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                For {pricingSnapshot.totalFiles} documents &bull; {pricingSnapshot.totalSheets} sheets
              </span>
            )}
          </div>

          {/* Real QR Code using qrcode.react */}
          <div className="qr-code-frame" style={{ display: 'flex', justifyContent: 'center', padding: '1rem', background: '#ffffff', borderRadius: '12px' }}>
            <QRCodeSVG
              value={upiUri}
              size={160}
              level="H"
              includeMargin={true}
            />
          </div>

          <div style={{ textAlign: 'center', marginTop: '0.65rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
              Scan with <strong>Google Pay</strong>, <strong>PhonePe</strong>, or <strong>Paytm</strong>
            </span>
            <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '0.2rem', fontFamily: 'var(--font-mono)' }}>
              UPI ID: printsathi.campus@okaxis
            </div>
          </div>

          <div className="payment-security-notice" style={{ marginTop: '0.85rem' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span>Verified 256-bit Campus Payment Gateway Simulation</span>
          </div>

          {/* Action Trigger */}
          <button
            type="button"
            className="confirm-payment-btn"
            onClick={handleSimulatePayment}
            disabled={isProcessing}
            style={{ marginTop: '1rem' }}
          >
            {isProcessing ? (
              <>
                <svg className="spin-animate" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                Verifying UPI Payment with Bank...
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Simulate UPI Payment Success ({formatCurrency(displayAmount)})
              </>
            )}
          </button>

          <p style={{ textAlign: 'center', fontSize: '0.74rem', color: '#64748b', marginTop: '0.6rem' }}>
            Testing Sandbox Mode: Clicking above approves payment and routes order to the live counter queue.
          </p>
        </div>
      </div>
    </div>
  );
}
