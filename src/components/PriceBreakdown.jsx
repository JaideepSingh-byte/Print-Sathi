/**
 * ============================================================================
 * PRINT-SATHI COMPONENT: Live Price Calculation & Summary Card
 * ============================================================================
 * 
 * What this component does in plain language:
 * 1. Computes the live total cost in real-time as users adjust:
 *    - Number of copies
 *    - Color mode (₹1 for B&W vs ₹5 for Color)
 *    - Selected pages (All or Custom Range)
 * 2. Uses the required pricing formula:
 *    Total = (Calculated Pages) × (Number of Copies) × (Rate)
 * 3. Shows a transparent, itemized mathematical breakdown.
 * 4. Provides the primary "Proceed to Payment & Submit" trigger button.
 */

import React from 'react';

export default function PriceBreakdown({
  isFileActive,
  calculatedPages,
  copies,
  colorMode,
  sides,
  pageRangeMode,
  customRangeString,
  onProceedToPayment,
}) {
  // Determine rate per page based on chosen color mode
  const ratePerPage = colorMode === 'color' ? 5 : 1;

  // Calculate total amount in ₹
  const totalPagesToPrint = isFileActive ? calculatedPages : 0;
  const totalAmount = totalPagesToPrint * copies * ratePerPage;

  // Sheet estimate based on duplex vs single
  const sheetsNeeded =
    sides === 'double'
      ? Math.ceil(totalPagesToPrint / 2) * copies
      : totalPagesToPrint * copies;

  // Is form valid for checkout?
  const canProceed = isFileActive && calculatedPages > 0;

  return (
    <div className="sticky-column">
      <div className="price-card">
        <div className="price-header">
          <h3 className="price-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <line x1="2" y1="10" x2="22" y2="10" />
            </svg>
            Live Cost Breakdown
          </h3>
        </div>

        {/* Itemized parameters */}
        <div className="cost-breakdown-list">
          <div className="breakdown-row">
            <span className="breakdown-label">
              <span>📄</span> Active Pages:
            </span>
            <span className="breakdown-value">
              {isFileActive
                ? `${calculatedPages} page${calculatedPages === 1 ? '' : 's'}`
                : 'No file selected'}
            </span>
          </div>

          <div className="breakdown-row">
            <span className="breakdown-label">
              <span>📑</span> Number of Copies:
            </span>
            <span className="breakdown-value">
              {copies} {copies === 1 ? 'copy' : 'copies'}
            </span>
          </div>

          <div className="breakdown-row">
            <span className="breakdown-label">
              <span>🎨</span> Print Mode Rate:
            </span>
            <span className="breakdown-value">
              {colorMode === 'color' ? '₹5 / page (Color)' : '₹1 / page (B&W)'}
            </span>
          </div>

          <div className="breakdown-row">
            <span className="breakdown-label">
              <span>🔄</span> Print Layout:
            </span>
            <span className="breakdown-value">
              {sides === 'double' ? 'Double-Sided' : 'Single-Sided'}
            </span>
          </div>

          <div className="breakdown-row">
            <span className="breakdown-label">
              <span>📦</span> Estimated Paper Sheets:
            </span>
            <span className="breakdown-value">
              {isFileActive ? `~${sheetsNeeded} sheets` : '0 sheets'}
            </span>
          </div>
        </div>

        {/* Clear Mathematical Formula Display */}
        <div className="formula-box">
          <div className="formula-label">Itemized Calculation:</div>
          <div className="formula-math">
            <span>{totalPagesToPrint} pgs</span>
            <span>×</span>
            <span>{copies} {copies === 1 ? 'copy' : 'copies'}</span>
            <span>×</span>
            <span>₹{ratePerPage}</span>
            <span>=</span>
            <span style={{ color: 'var(--text-main)' }}>₹{totalAmount}</span>
          </div>
        </div>

        {/* Big Total Due Display */}
        <div className="total-due-box">
          <div>
            <div className="total-label">Total Amount Due</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Subsidized Campus Student Rate
            </div>
          </div>
          <div className="total-price">₹{totalAmount}</div>
        </div>

        {/* Proceed to Payment CTA */}
        <button
          type="button"
          className="submit-order-btn"
          disabled={!canProceed}
          onClick={() => onProceedToPayment(totalAmount, ratePerPage)}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
            <line x1="1" y1="10" x2="23" y2="10" />
          </svg>
          Proceed to Payment & Submit
        </button>

        {!isFileActive && (
          <p style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--danger)', marginTop: '0.65rem' }}>
            * Please upload a valid .pdf file to continue
          </p>
        )}

        {isFileActive && calculatedPages === 0 && (
          <p style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--danger)', marginTop: '0.65rem' }}>
            * Please enter a valid page range to calculate cost
          </p>
        )}

        {/* Campus Xerox Info Card */}
        <div className="campus-info-card">
          <div className="info-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <div>
            <div className="info-text-title">Queue & Pickup Guarantee</div>
            <p className="info-text-desc">
              Your document is assigned a unique 4-digit token. Pick up your prints at Counter 1 (Main Student Plaza) without waiting in line!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
