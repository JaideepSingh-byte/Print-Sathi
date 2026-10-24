/**
 * ============================================================================
 * PRINT-SATHI COMPONENT: Print Configuration Form
 * ============================================================================
 * 
 * Supports:
 * 1. Global batch configuration applied to all uploaded files, or
 * 2. Per-document specific overrides (Copies, Color/B&W, Single/Double, Page Range).
 * 3. Full backwards-compatibility with legacy single-file parent state.
 */

import React, { useEffect, useState } from 'react';
import { parsePageRange } from '../utils/pdfHelper';

export default function PrintConfig({
  filesList = [],
  setFilesList,
  // Backwards compatibility props:
  totalPages = 1,
  copies = 1,
  setCopies,
  colorMode = 'bw',
  setColorMode,
  pageRangeMode = 'all',
  setPageRangeMode,
  customRangeString = '',
  setCustomRangeString,
  sides = 'single',
  setSides,
  setCalculatedPages,
  isFileActive = true,
  supportedServices = null,
}) {
  const [selectedTarget, setSelectedTarget] = useState('all'); // 'all' or file.id
  const [rangeValidation, setRangeValidation] = useState({
    isValid: true,
    error: null,
    count: totalPages,
  });

  const allowsBw = supportedServices ? supportedServices.bw !== false : true;
  const allowsColor = supportedServices ? supportedServices.color !== false : true;
  const allowsSingle = supportedServices ? supportedServices.single !== false : true;
  const allowsDuplex = supportedServices ? supportedServices.duplex !== false : true;

  // Auto-correct mode if counter does not support active option
  useEffect(() => {
    if (!allowsColor && colorMode === 'color') {
      if (setColorMode) setColorMode('bw');
      syncToFiles({ colorMode: 'bw' });
    } else if (!allowsBw && colorMode === 'bw') {
      if (setColorMode) setColorMode('color');
      syncToFiles({ colorMode: 'color' });
    }

    if (!allowsDuplex && sides === 'double') {
      if (setSides) setSides('single');
      syncToFiles({ sides: 'single' });
    } else if (!allowsSingle && sides === 'single') {
      if (setSides) setSides('double');
      syncToFiles({ sides: 'double' });
    }
  }, [supportedServices, colorMode, sides, allowsBw, allowsColor, allowsSingle, allowsDuplex]);

  const activeDoc = filesList.find((f) => f.id === selectedTarget) || filesList[0] || null;
  const currentTotalPages = activeDoc ? activeDoc.totalPages : totalPages;

  // Whenever range mode, custom range text, or total pages change, re-evaluate:
  useEffect(() => {
    if (pageRangeMode === 'all') {
      if (setCalculatedPages) setCalculatedPages(currentTotalPages);
      setRangeValidation({ isValid: true, error: null, count: currentTotalPages });
    } else {
      const result = parsePageRange(customRangeString, currentTotalPages);
      setRangeValidation(result);
      if (setCalculatedPages) {
        setCalculatedPages(result.isValid ? result.count : 0);
      }
    }
  }, [pageRangeMode, customRangeString, currentTotalPages, setCalculatedPages]);

  // Synchronize changes to filesList
  const syncToFiles = (updates) => {
    if (!setFilesList || filesList.length === 0) return;

    const updated = filesList.map((item) => {
      if (selectedTarget === 'all' || item.id === selectedTarget) {
        const newCopies = updates.copies !== undefined ? updates.copies : item.copies;
        const newColor = updates.colorMode !== undefined ? updates.colorMode : item.colorMode;
        const newSides = updates.sides !== undefined ? updates.sides : item.sides;
        const newRangeMode = updates.pageRangeMode !== undefined ? updates.pageRangeMode : item.pageRangeMode;
        const newRangeStr = updates.customRangeString !== undefined ? updates.customRangeString : item.pageRangeString;

        let calcPages = item.totalPages;
        if (newRangeMode === 'custom') {
          const parsed = parsePageRange(newRangeStr, item.totalPages);
          calcPages = parsed.isValid ? parsed.count : 0;
        }

        return {
          ...item,
          copies: newCopies,
          colorMode: newColor,
          sides: newSides,
          pageRangeMode: newRangeMode,
          pageRangeString: newRangeMode === 'all' ? `All (${item.totalPages} pgs)` : newRangeStr,
          calculatedPages: calcPages,
        };
      }
      return item;
    });

    setFilesList(updated);
  };

  // Stepper handlers for copies
  const handleDecrementCopies = () => {
    if (copies > 1) {
      const next = copies - 1;
      if (setCopies) setCopies(next);
      syncToFiles({ copies: next });
    }
  };

  const handleIncrementCopies = () => {
    if (copies < 100) {
      const next = copies + 1;
      if (setCopies) setCopies(next);
      syncToFiles({ copies: next });
    }
  };

  const handleCopiesInputChange = (e) => {
    const val = parseInt(e.target.value, 10);
    const next = isNaN(val) ? 1 : Math.max(1, Math.min(100, val));
    if (setCopies) setCopies(next);
    syncToFiles({ copies: next });
  };

  const handleColorModeChange = (mode) => {
    if (setColorMode) setColorMode(mode);
    syncToFiles({ colorMode: mode });
  };

  const handleSidesChange = (newSides) => {
    if (setSides) setSides(newSides);
    syncToFiles({ sides: newSides });
  };

  const handleRangeModeChange = (mode) => {
    if (setPageRangeMode) setPageRangeMode(mode);
    syncToFiles({ pageRangeMode: mode });
  };

  const handleCustomRangeTextChange = (e) => {
    const text = e.target.value;
    if (setCustomRangeString) setCustomRangeString(text);
    syncToFiles({ customRangeString: text });
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

      {/* Target File Selector if more than 1 file is uploaded */}
      {filesList.length > 1 && (
        <div style={{ marginBottom: '1rem', paddingBottom: '0.8rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>
            Applying Configuration To:
          </label>
          <select
            value={selectedTarget}
            onChange={(e) => setSelectedTarget(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem',
              borderRadius: '6px',
              background: '#1e293b',
              border: '1px solid #334155',
              color: '#f8fafc',
              fontSize: '0.85rem'
            }}
          >
            <option value="all">⚡ All Documents ({filesList.length} files simultaneously)</option>
            {filesList.map((f, i) => (
              <option key={f.id} value={f.id}>
                📄 File {i + 1}: {f.name} ({f.totalPages} pgs)
              </option>
            ))}
          </select>
        </div>
      )}

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

      {/* 2. COLOR MODE */}
      <div className="config-group">
        <label className="config-label">Color Mode</label>
        <div className="segmented-control">
          <button
            type="button"
            className={`segmented-btn ${colorMode === 'bw' ? 'active' : ''}`}
            onClick={() => allowsBw && handleColorModeChange('bw')}
            disabled={!allowsBw}
            style={{ opacity: allowsBw ? 1 : 0.45, cursor: allowsBw ? 'pointer' : 'not-allowed' }}
          >
            <span className="option-title">Black & White</span>
            <span className="option-subtitle">
              {allowsBw ? 'Campus Saver (~₹1-2/pg)' : '(Not offered at counter)'}
            </span>
          </button>
          <button
            type="button"
            className={`segmented-btn ${colorMode === 'color' ? 'active' : ''}`}
            onClick={() => allowsColor && handleColorModeChange('color')}
            disabled={!allowsColor}
            style={{ opacity: allowsColor ? 1 : 0.45, cursor: allowsColor ? 'pointer' : 'not-allowed' }}
          >
            <span className="option-title">Full Color</span>
            <span className="option-subtitle">
              {allowsColor ? 'High Quality Presentation' : '(Not offered at counter)'}
            </span>
          </button>
        </div>
      </div>

      {/* 3. PRINT RANGE */}
      <div className="config-group">
        <label className="config-label">Page Selection</label>
        <div className="segmented-control">
          <button
            type="button"
            className={`segmented-btn ${pageRangeMode === 'all' ? 'active' : ''}`}
            onClick={() => handleRangeModeChange('all')}
          >
            <span className="option-title">All Pages</span>
            <span className="option-subtitle">Full Document</span>
          </button>
          <button
            type="button"
            className={`segmented-btn ${pageRangeMode === 'custom' ? 'active' : ''}`}
            onClick={() => handleRangeModeChange('custom')}
          >
            <span className="option-title">Custom Range</span>
            <span className="option-subtitle">e.g. 1-5, 8, 12</span>
          </button>
        </div>

        {pageRangeMode === 'custom' && (
          <div style={{ marginTop: '0.65rem' }}>
            <input
              type="text"
              placeholder="e.g. 1-3, 5, 7-9"
              value={customRangeString}
              onChange={handleCustomRangeTextChange}
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem',
                borderRadius: '6px',
                background: '#0f172a',
                border: rangeValidation.isValid ? '1px solid #334155' : '1px solid #ef4444',
                color: '#f8fafc',
                fontSize: '0.85rem'
              }}
            />
            {rangeValidation.error && (
              <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.25rem', display: 'block' }}>
                {rangeValidation.error}
              </span>
            )}
          </div>
        )}
      </div>

      {/* 4. SIDES (DUPLEX) */}
      <div className="config-group">
        <label className="config-label">Paper Layout</label>
        <div className="segmented-control">
          <button
            type="button"
            className={`segmented-btn ${sides === 'single' ? 'active' : ''}`}
            onClick={() => allowsSingle && handleSidesChange('single')}
            disabled={!allowsSingle}
            style={{ opacity: allowsSingle ? 1 : 0.45, cursor: allowsSingle ? 'pointer' : 'not-allowed' }}
          >
            <span className="option-title">Single-Sided</span>
            <span className="option-subtitle">
              {allowsSingle ? 'One side per sheet' : '(Not offered at counter)'}
            </span>
          </button>
          <button
            type="button"
            className={`segmented-btn ${sides === 'double' ? 'active' : ''}`}
            onClick={() => allowsDuplex && handleSidesChange('double')}
            disabled={!allowsDuplex}
            style={{ opacity: allowsDuplex ? 1 : 0.45, cursor: allowsDuplex ? 'pointer' : 'not-allowed' }}
          >
            <span className="option-title">Double-Sided (Duplex)</span>
            <span className="option-subtitle">
              {allowsDuplex ? 'Eco-friendly • Saves paper' : '(Not offered at counter)'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
