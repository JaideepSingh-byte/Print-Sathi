/**
 * ============================================================================
 * PRINT-SATHI COMPONENT: Print Configuration Form
 * ============================================================================
 * 
 * What this component does in plain language:
 * 1. Lets students configure their print job:
 *    - Copies Stepper: Increment, decrement, or type number of copies (1-100).
 *    - Color Mode Selector: Black & White (₹1/page) or Vibrant Color (₹5/page).
 *    - Print Range: "All Pages" or "Custom Range".
 *    - Custom Range Input: Automatically parses patterns like "1-5, 8, 11-13"
 *      and calculates the exact number of pages to print.
 *    - Sides Selection: "Single-Sided" or "Double-Sided" (eco-friendly campus standard).
 */

import React, { useEffect, useState } from 'react';
import { parsePageRange } from '../utils/pdfHelper';

export default function PrintConfig({
  totalPages,
  copies,
  setCopies,
  colorMode,
  setColorMode,
  pageRangeMode,
  setPageRangeMode,
  customRangeString,
  setCustomRangeString,
  sides,
  setSides,
  setCalculatedPages,
  isFileActive,
}) {
  const [rangeValidation, setRangeValidation] = useState({
    isValid: true,
    error: null,
    count: totalPages,
  });

  // Whenever range mode, custom range text, or total pages change, re-evaluate:
  useEffect(() => {
    if (pageRangeMode === 'all') {
      setCalculatedPages(totalPages);
      setRangeValidation({ isValid: true, error: null, count: totalPages });
    } else {
      const result = parsePageRange(customRangeString, totalPages);
      setRangeValidation(result);
      if (result.isValid) {
        setCalculatedPages(result.count);
      } else {
        setCalculatedPages(0);
      }
    }
  }, [pageRangeMode, customRangeString, totalPages, setCalculatedPages]);

  // Stepper handlers for copies
  const handleDecrementCopies = () => {
    if (copies > 1) {
      setCopies(copies - 1);
    }
  };

  const handleIncrementCopies = () => {
    if (copies < 100) {
      setCopies(copies + 1);
    }
  };

  const handleCopiesInputChange = (e) => {
    const val = parseInt(e.target.value, 10);
    if (isNaN(val)) {
      setCopies(1);
    } else {
      // Clamp between 1 and 100
      const clamped = Math.max(1, Math.min(100, val));
      setCopies(clamped);
    }
  };

  return (
    <div className="panel-card">
      <div className="panel-header">
        <h2 className="panel-title">
          <span className="panel-title-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </span>
          2. Print Configuration
        </h2>
        <span className="step-tag">Step 2 of 3</span>
      </div>

      {/* 1. NUMBER OF COPIES */}
      <div className="config-group">
        <div className="config-label-row">
          <label className="config-label" htmlFor="copies-input">
            Number of Copies
          </label>
          <span className="config-hint">Default: 1 (Max: 100)</span>
        </div>
        <div className="stepper-container">
          <button
            type="button"
            className="stepper-btn"
            onClick={handleDecrementCopies}
            disabled={copies <= 1}
            aria-label="Decrease copies"
          >
            -
          </button>
          <input
            id="copies-input"
            type="number"
            min="1"
            max="100"
            value={copies}
            onChange={handleCopiesInputChange}
            className="stepper-input"
          />
          <button
            type="button"
            className="stepper-btn"
            onClick={handleIncrementCopies}
            disabled={copies >= 100}
            aria-label="Increase copies"
          >
            +
          </button>
        </div>
      </div>

      {/* 2. COLOR MODE SELECTOR */}
      <div className="config-group">
        <div className="config-label-row">
          <span className="config-label">Color Mode</span>
          <span className="config-hint">Campus subsidized rates</span>
        </div>
        <div className="options-grid">
          {/* Black & White Card */}
          <div
            className={`option-card ${colorMode === 'bw' ? 'active' : ''}`}
            onClick={() => setColorMode('bw')}
            role="radio"
            aria-checked={colorMode === 'bw'}
            tabIndex={0}
          >
            <div className="option-top">
              <span className="option-title">⬛ Black & White</span>
              <span className="price-tag-badge">₹1 / page</span>
            </div>
            <p className="option-desc">Ideal for study notes, syllabi & assignments</p>
          </div>

          {/* Color Card */}
          <div
            className={`option-card ${colorMode === 'color' ? 'active' : ''}`}
            onClick={() => setColorMode('color')}
            role="radio"
            aria-checked={colorMode === 'color'}
            tabIndex={0}
          >
            <div className="option-top">
              <span className="option-title">🎨 Color Print</span>
              <span className="price-tag-badge">₹5 / page</span>
            </div>
            <p className="option-desc">Perfect for diagrams, charts & presentations</p>
          </div>
        </div>
      </div>

      {/* 3. PRINT RANGE (ALL VS CUSTOM) */}
      <div className="config-group">
        <div className="config-label-row">
          <span className="config-label">Page Selection</span>
          <span className="config-hint">
            {isFileActive ? `Document has ${totalPages} pages` : 'Upload PDF first'}
          </span>
        </div>
        <div className="options-grid">
          {/* All Pages */}
          <div
            className={`option-card ${pageRangeMode === 'all' ? 'active' : ''}`}
            onClick={() => setPageRangeMode('all')}
            role="radio"
            aria-checked={pageRangeMode === 'all'}
            tabIndex={0}
          >
            <div className="option-top">
              <span className="option-title">📑 All Pages</span>
              <span className="price-tag-badge">{totalPages} pgs</span>
            </div>
            <p className="option-desc">Print entire document from page 1 to {totalPages}</p>
          </div>

          {/* Custom Range */}
          <div
            className={`option-card ${pageRangeMode === 'custom' ? 'active' : ''}`}
            onClick={() => setPageRangeMode('custom')}
            role="radio"
            aria-checked={pageRangeMode === 'custom'}
            tabIndex={0}
          >
            <div className="option-top">
              <span className="option-title">🎯 Custom Range</span>
              <span className="price-tag-badge">Specific</span>
            </div>
            <p className="option-desc">Choose specific page numbers or spans</p>
          </div>
        </div>

        {/* Custom Range Input Box (Revealed when "Custom Range" is chosen) */}
        {pageRangeMode === 'custom' && (
          <div className="range-input-wrapper">
            <input
              type="text"
              className="range-text-input"
              placeholder="e.g., 1-5, 8, 11-13"
              value={customRangeString}
              onChange={(e) => setCustomRangeString(e.target.value)}
            />
            {/* Live feedback on parsed custom pages */}
            {rangeValidation.isValid ? (
              <span className="range-feedback valid">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {rangeValidation.count} unique page{rangeValidation.count === 1 ? '' : 's'} selected: [
                {rangeValidation.pages ? rangeValidation.pages.slice(0, 10).join(', ') : ''}
                {rangeValidation.pages && rangeValidation.pages.length > 10 ? '...' : ''}]
              </span>
            ) : (
              <span className="range-feedback invalid">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {rangeValidation.error}
              </span>
            )}
          </div>
        )}
      </div>

      {/* 4. SIDES (SINGLE VS DOUBLE SIDED) */}
      <div className="config-group">
        <div className="config-label-row">
          <span className="config-label">Print Sides</span>
          <span className="config-hint">Paper layout</span>
        </div>
        <div className="options-grid">
          {/* Single-Sided */}
          <div
            className={`option-card ${sides === 'single' ? 'active' : ''}`}
            onClick={() => setSides('single')}
            role="radio"
            aria-checked={sides === 'single'}
            tabIndex={0}
          >
            <div className="option-top">
              <span className="option-title">📄 Single-Sided</span>
            </div>
            <p className="option-desc">One side printed per sheet of paper</p>
          </div>

          {/* Double-Sided */}
          <div
            className={`option-card ${sides === 'double' ? 'active' : ''}`}
            onClick={() => setSides('double')}
            role="radio"
            aria-checked={sides === 'double'}
            tabIndex={0}
          >
            <div className="option-top">
              <span className="option-title">📑 Double-Sided</span>
              <span className="price-tag-badge" style={{ background: '#ecfdf5', color: '#047857', borderColor: '#a7f3d0' }}>
                🌱 Eco-Friendly
              </span>
            </div>
            <p className="option-desc">Back-to-back duplex printing saves paper</p>
          </div>
        </div>
      </div>
    </div>
  );
}
