/**
 * ============================================================================
 * PRINT-SATHI UTILITY: PDF Helper & Page Calculation Engine
 * ============================================================================
 * 
 * Features:
 * 1. Counts actual pages inside an uploaded PDF directly in the browser.
 * 2. Strict PDF signature (%PDF-) inspection via binary magic bytes.
 * 3. Enforces enterprise upload limits:
 *    - Max 10 files per order
 *    - Max 20 MB per individual file
 *    - Max 50 MB total combined order payload
 * 4. Parses custom page ranges (like "1-5, 8, 11-13") with boundary validation.
 * 5. Formats raw byte sizes (e.g. "2.34 MB").
 */

export const MAX_FILES_COUNT = 10;
export const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB
export const MAX_TOTAL_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

/**
 * Formats bytes into human-friendly strings (KB, MB)
 * @param {number} bytes - Raw file size in bytes
 * @returns {string} Formatted size string
 */
export function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 KB';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Strictly inspects the first 5 bytes of a file to verify the "%PDF-" header signature.
 * Prevents disguised files (e.g., .exe or .png renamed to .pdf).
 * 
 * @param {File} file 
 * @returns {Promise<{ isValid: boolean, error?: string }>}
 */
export async function validatePdfMagicBytes(file) {
  if (!file) return { isValid: false, error: 'No file provided.' };

  try {
    const slice = file.slice(0, 5);
    const arrayBuffer = await slice.arrayBuffer();
    const header = new TextDecoder('latin1').decode(arrayBuffer);

    if (header.startsWith('%PDF-')) {
      return { isValid: true };
    }
    return {
      isValid: false,
      error: `File "${file.name}" lacks a valid PDF header signature (Found: "${header}").`,
    };
  } catch (err) {
    return { isValid: false, error: `Could not read file header: ${err.message}` };
  }
}

/**
 * Full file validation against size, type, count, and magic bytes.
 * 
 * @param {File} file 
 * @param {Array} existingFiles 
 * @returns {Promise<{ isValid: boolean, error?: string }>}
 */
export async function validatePdfFile(file, existingFiles = []) {
  if (!file) return { isValid: false, error: 'File is missing.' };

  // 1. Extension check
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    return {
      isValid: false,
      error: `"${file.name}" is not a PDF. Only .pdf files are supported.`,
    };
  }

  // 2. MIME type check
  if (file.type && file.type !== 'application/pdf') {
    return {
      isValid: false,
      error: `"${file.name}" has invalid MIME type: ${file.type}. Expected application/pdf.`,
    };
  }

  // 3. Max files count check
  if (existingFiles.length >= MAX_FILES_COUNT) {
    return {
      isValid: false,
      error: `Maximum file limit reached (${MAX_FILES_COUNT} files per order).`,
    };
  }

  // 4. Duplicate name check
  if (existingFiles.some((f) => f.name === file.name && f.size === file.size)) {
    return {
      isValid: false,
      error: `"${file.name}" is already in your upload queue.`,
    };
  }

  // 5. Individual file size limit (20 MB)
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      isValid: false,
      error: `"${file.name}" (${formatFileSize(file.size)}) exceeds the 20 MB per-file limit.`,
    };
  }

  // 6. Total combined size limit (50 MB)
  const currentTotal = existingFiles.reduce((acc, f) => acc + (f.size || 0), 0);
  if (currentTotal + file.size > MAX_TOTAL_SIZE_BYTES) {
    return {
      isValid: false,
      error: `Adding "${file.name}" would exceed the total order limit of 50 MB.`,
    };
  }

  // 7. Binary signature check (%PDF-)
  const magicCheck = await validatePdfMagicBytes(file);
  if (!magicCheck.isValid) {
    return magicCheck;
  }

  return { isValid: true };
}

/**
 * Inspects a PDF file binary client-side to detect its page count.
 * 
 * @param {File} file - The uploaded .pdf File object
 * @returns {Promise<number>} Number of pages detected (defaults to 1 if unreadable)
 */
export async function getPdfPageCount(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const text = new TextDecoder('latin1').decode(arrayBuffer);

    // Technique A: Look for /Type /Pages ... /Count X
    const pagesCountMatches = [...text.matchAll(/\/Type\s*\/Pages[\s\S]*?\/Count\s+(\d+)/gi)];
    if (pagesCountMatches.length > 0) {
      const counts = pagesCountMatches
        .map((m) => parseInt(m[1], 10))
        .filter((num) => !isNaN(num) && num > 0);
      if (counts.length > 0) {
        return Math.max(...counts);
      }
    }

    // Technique B: Match individual "/Type /Page" tokens (excluding "/Pages")
    const individualPageMatches = text.match(/\/Type\s*\/Page\b(?!\s*s)/gi);
    if (individualPageMatches && individualPageMatches.length > 0) {
      return individualPageMatches.length;
    }

    return 1;
  } catch (error) {
    console.warn('[Print-Sathi] Could not parse PDF page count automatically:', error);
    return 1;
  }
}

/**
 * Parses user input strings like "1-5, 8, 11-13" and calculates
 * the total number of unique pages selected.
 * 
 * @param {string} rangeString - The user's typed string
 * @param {number} maxPages - The maximum total pages in the active PDF
 * @returns {{ count: number, isValid: boolean, error: string | null, pages: number[] }}
 */
export function parsePageRange(rangeString, maxPages = 1) {
  if (!rangeString || rangeString.trim() === '') {
    return {
      count: 0,
      isValid: false,
      error: 'Please enter page numbers (e.g. 1-3, 5)',
      pages: [],
    };
  }

  const cleanInput = rangeString.trim();
  const segments = cleanInput.split(',');
  const selectedPages = new Set();

  for (let segment of segments) {
    const trimmed = segment.trim();
    if (!trimmed) continue;

    // Check for range format like "1-5" or "10 - 15"
    if (trimmed.includes('-')) {
      const parts = trimmed.split('-').map((p) => p.trim());
      if (parts.length !== 2) {
        return {
          count: 0,
          isValid: false,
          error: `Invalid range format: "${trimmed}". Use format like 1-5.`,
          pages: [],
        };
      }

      const start = parseInt(parts[0], 10);
      const end = parseInt(parts[1], 10);

      if (isNaN(start) || isNaN(end) || start < 1 || end < 1) {
        return {
          count: 0,
          isValid: false,
          error: `Page numbers must be positive numbers: "${trimmed}"`,
          pages: [],
        };
      }

      const lower = Math.min(start, end);
      const upper = Math.max(start, end);

      if (maxPages && upper > maxPages) {
        return {
          count: 0,
          isValid: false,
          error: `Page ${upper} exceeds document total of ${maxPages} pages.`,
          pages: [],
        };
      }

      for (let i = lower; i <= upper; i++) {
        selectedPages.add(i);
      }
    } else {
      // Single page number like "8"
      const pageNum = parseInt(trimmed, 10);
      if (isNaN(pageNum) || pageNum < 1) {
        return {
          count: 0,
          isValid: false,
          error: `Invalid page number: "${trimmed}"`,
          pages: [],
        };
      }

      if (maxPages && pageNum > maxPages) {
        return {
          count: 0,
          isValid: false,
          error: `Page ${pageNum} exceeds document total of ${maxPages} pages.`,
          pages: [],
        };
      }

      selectedPages.add(pageNum);
    }
  }

  if (selectedPages.size === 0) {
    return {
      count: 0,
      isValid: false,
      error: 'No valid pages found in range.',
      pages: [],
    };
  }

  const sortedPages = Array.from(selectedPages).sort((a, b) => a - b);
  return {
    count: sortedPages.length,
    isValid: true,
    error: null,
    pages: sortedPages,
  };
}
