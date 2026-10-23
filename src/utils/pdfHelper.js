/**
 * ============================================================================
 * PRINT-SATHI UTILITY: PDF Helper & Page Calculation Engine
 * ============================================================================
 * 
 * What this file does in plain language:
 * 1. Counts the actual number of pages inside an uploaded PDF directly in the 
 *    browser without needing an expensive backend server.
 * 2. Parses custom page ranges (like "1-5, 8, 11-13") entered by students into
 *    an exact count of unique pages to print.
 * 3. Formats raw byte sizes (e.g. 2,450,000 bytes) into human-readable text 
 *    (e.g. "2.34 MB").
 */

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
 * Inspects a PDF file binary client-side to detect its page count.
 * 
 * How it works:
 * - Every standard PDF contains internal dictionaries specifying page nodes.
 * - The root pages dictionary includes "/Type /Pages /Count N".
 * - This function quickly scans the binary array buffer using a standard Latin-1 decoder.
 * 
 * @param {File} file - The uploaded .pdf File object
 * @returns {Promise<number>} Number of pages detected (defaults to 1 if unreadable)
 */
export async function getPdfPageCount(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    // Latin-1 preserves all 8-bit characters without corruption
    const text = new TextDecoder('latin1').decode(arrayBuffer);

    // Technique A: Look for /Type /Pages ... /Count X
    const pagesCountMatches = [...text.matchAll(/\/Type\s*\/Pages[\s\S]*?\/Count\s+(\d+)/gi)];
    if (pagesCountMatches.length > 0) {
      const counts = pagesCountMatches
        .map((m) => parseInt(m[1], 10))
        .filter((num) => !isNaN(num) && num > 0);
      if (counts.length > 0) {
        // The root catalog has the maximum count
        return Math.max(...counts);
      }
    }

    // Technique B: Match individual "/Type /Page" tokens (excluding "/Pages")
    const individualPageMatches = text.match(/\/Type\s*\/Page\b(?!\s*s)/gi);
    if (individualPageMatches && individualPageMatches.length > 0) {
      return individualPageMatches.length;
    }

    // Default safe fallback if document is encrypted or dynamically rendered
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
