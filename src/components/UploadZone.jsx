/**
 * ============================================================================
 * PRINT-SATHI COMPONENT: Document Upload Zone
 * ============================================================================
 * 
 * What this component does in plain language:
 * 1. Provides a smooth Drag & Drop zone as well as a "Browse Files" button.
 * 2. Enforces a strict validation check: Only `.pdf` files are allowed.
 * 3. Shows a prominent badge: "Only PDF format supported (.pdf)".
 * 4. Shows a friendly inline error message if someone accidentally drops a .png,
 *    .docx, .jpg, etc.
 * 5. Automatically detects and displays file metadata:
 *    - File Name
 *    - Formatted File Size (e.g. 1.45 MB)
 *    - Estimated total page count calculated client-side
 * 6. Provides a "Remove / Replace File" button to easily switch files.
 */

import React, { useState, useRef } from 'react';
import { formatFileSize, getPdfPageCount } from '../utils/pdfHelper';

export default function UploadZone({ activeFile, setActiveFile, setTotalPages, totalPages }) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef(null);

  /**
   * Validates whether a file is strictly a PDF.
   * Checks both file extension and MIME type.
   */
  const validateAndProcessFile = async (file) => {
    setErrorMessage(null);

    if (!file) return;

    // Check 1: File extension
    const hasPdfExtension = file.name.toLowerCase().endsWith('.pdf');
    // Check 2: MIME type
    const isPdfMime = file.type === 'application/pdf' || file.type === '';

    if (!hasPdfExtension || !isPdfMime) {
      setErrorMessage(
        `Oops! "${file.name}" is not a PDF. Print-Sathi currently supports ONLY PDF files (.pdf) for reliable formatting.`
      );
      return;
    }

    // Process valid PDF file
    setIsAnalyzing(true);
    setActiveFile(file);

    try {
      const detectedPages = await getPdfPageCount(file);
      setTotalPages(detectedPages);
    } catch (err) {
      console.error('Error analyzing PDF:', err);
      setTotalPages(1);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handle Drag & Drop events
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      validateAndProcessFile(droppedFile);
    }
  };

  // Handle manual input change
  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndProcessFile(e.target.files[0]);
    }
  };

  // Remove active file and reset state
  const handleRemoveFile = () => {
    setActiveFile(null);
    setTotalPages(1);
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Trigger file browser click
  const triggerBrowse = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="panel-card">
      <div className="panel-header">
        <h2 className="panel-title">
          <span className="panel-title-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="18" x2="12" y2="12" />
              <line x1="9" y1="15" x2="15" y2="15" />
            </svg>
          </span>
          1. Upload Document
        </h2>
        <span className="step-tag">Step 1 of 3</span>
      </div>

      {/* Case A: No file uploaded yet -> Show Drag & Drop Zone */}
      {!activeFile ? (
        <div
          className={`upload-dropzone ${isDragActive ? 'drag-active' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={triggerBrowse}
          role="button"
          tabIndex={0}
        >
          {/* Hidden real file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleFileInputChange}
            className="hidden-file-input"
          />

          <div className="upload-icon-bubble">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>

          <p className="upload-instruction">
            {isDragActive ? 'Release to drop your PDF here' : 'Drag & drop your PDF file here'}
          </p>
          <p className="upload-subtext">or click anywhere in this box to browse from your device</p>

          <button
            type="button"
            className="browse-btn"
            onClick={(e) => {
              e.stopPropagation();
              triggerBrowse();
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            Browse PDF File
          </button>

          {/* Strict restriction badge */}
          <div>
            <span className="format-notice-badge">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              Only PDF format supported (.pdf)
            </span>
          </div>
        </div>
      ) : (
        /* Case B: File is Active -> Display Metadata & Actions */
        <div className="active-file-card">
          <div className="file-header-row">
            <div className="pdf-icon-box">
              <span>PDF</span>
            </div>
            <div className="file-details">
              <h4 className="file-name-text" title={activeFile.name}>
                {activeFile.name}
              </h4>
              <div className="file-meta-row">
                <span className="meta-pill">
                  📊 {formatFileSize(activeFile.size)}
                </span>
                <span className="meta-pill">
                  📄 {isAnalyzing ? 'Counting pages...' : `${totalPages} Page${totalPages > 1 ? 's' : ''}`}
                </span>
              </div>
            </div>
          </div>

          <div className="file-actions-row">
            <div className="verified-badge">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              PDF Verified & Ready for Queue
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                className="secondary-action-btn"
                style={{ padding: '0.4rem 0.85rem', fontSize: '0.82rem' }}
                onClick={triggerBrowse}
              >
                Replace
              </button>
              <button
                type="button"
                className="remove-btn"
                onClick={handleRemoveFile}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
                Remove
              </button>
            </div>
          </div>

          {/* Hidden input for replace action */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleFileInputChange}
            className="hidden-file-input"
          />
        </div>
      )}

      {/* Friendly Inline Error Alert for invalid file formats */}
      {errorMessage && (
        <div className="inline-error-alert" role="alert">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
}
