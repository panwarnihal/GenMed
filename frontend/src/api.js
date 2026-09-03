// GenMed API Bridge
// Express Gateway default at http://localhost:5000, falling back to FastAPI at http://localhost:8000 if needed.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
const BACKEND_FASTAPI_URL = 'http://localhost:8000';

async function fetchWithFallback(endpoint, options = {}) {
  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, options);
    if (res.ok) return res;
    // If gateway returns 404 or connection failure, attempt direct backend fallback
    if (res.status === 404 || res.status >= 500) {
      try {
        const fallbackRes = await fetch(`${BACKEND_FASTAPI_URL}${endpoint}`, options);
        if (fallbackRes.ok) return fallbackRes;
        return fallbackRes;
      } catch {
        // fallback also failed — return original gateway response
        return res;
      }
    }
    return res;
  } catch {
    // Gateway is completely unreachable — try FastAPI directly
    try {
      const fallbackRes = await fetch(`${BACKEND_FASTAPI_URL}${endpoint}`, options);
      return fallbackRes;
    } catch {
      throw new Error(
        'Both the API gateway (port 5000) and backend (port 8000) are unreachable. ' +
        'Please start the GenMed servers using start-all.ps1 or start-all.bat.'
      );
    }
  }
}

/**
 * Upload pharmacy invoice image (multipart/form-data)
 * POST /api/v1/scanner/upload
 * @param {File} imageFile 
 * @returns {Promise<object>} FinalAuditReport JSON
 */
export async function uploadInvoice(imageFile) {
  const formData = new FormData();
  formData.append('file', imageFile);

  const response = await fetchWithFallback('/api/v1/scanner/upload', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Invoice upload failed with status ${response.status}`);
  }

  return response.json();
}

/**
 * Alias for uploadInvoice for backward compatibility
 */
export async function uploadInvoiceImage(imageFile) {
  return uploadInvoice(imageFile);
}

/**
 * Search generic alternative for a brand name / query
 * POST /api/v1/mapping/match
 * @param {string|object} queryOrPayload - Brand query string or payload object
 * @param {string} [extractedSalt=''] - Optional extracted chemical salt composition
 * @returns {Promise<object>} MappingResponse JSON { match_found: boolean, top_alternative: object|null, requires_pharmacist_verification: boolean }
 */
export async function searchGeneric(queryOrPayload, extractedSalt = '') {
  let bodyData = {};
  if (typeof queryOrPayload === 'object' && queryOrPayload !== null) {
    bodyData = {
      query: queryOrPayload.query || '',
      extracted_salt: queryOrPayload.extracted_salt || queryOrPayload.extractedSalt || '',
    };
  } else {
    bodyData = {
      query: String(queryOrPayload || ''),
      extracted_salt: extractedSalt,
    };
  }

  const response = await fetchWithFallback('/api/v1/mapping/match', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bodyData),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Generic search failed with status ${response.status}`);
  }

  return response.json();
}

/**
 * Alias for searchGeneric for backward compatibility
 */
export async function matchGenericAlternative(query, extractedSalt = '') {
  return searchGeneric(query, extractedSalt);
}

/**
 * POST /api/v1/scanner/manual
 * Manually audit line items
 * @param {Array<{brand_name: string, paid_price: number, printed_mrp?: number, quantity_units?: number, extracted_salt?: string}>} lineItems
 * @returns {Promise<object>} FinalAuditReport JSON
 */
export async function auditManualInvoice(lineItems) {
  const response = await fetchWithFallback('/api/v1/scanner/manual', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ line_items: lineItems }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Manual audit failed with status ${response.status}`);
  }

  return response.json();
}

/**
 * GET /api/v1/mapping/autocomplete?q=<prefix>
 * Returns up to 8 brand name suggestions for typeahead UI
 * @param {string} q - At least 2 characters
 * @returns {Promise<string[]>} Array of matching brand names
 */
export async function autocomplete(q) {
  if (!q || q.trim().length < 2) return [];
  try {
    const response = await fetchWithFallback(
      `/api/v1/mapping/autocomplete?q=${encodeURIComponent(q.trim())}`,
      { method: 'GET' }
    );
    if (!response.ok) return [];
    const data = await response.json();
    return data.suggestions || [];
  } catch {
    return [];
  }
}

/**
 * GET /api/v1/verify-batch/{batchNumber}
 * Checks a batch number against the CDSCO NSQ/Spurious blacklist
 * @param {string} batchNumber
 * @returns {Promise<object>} { status, safety_level, message, ... }
 */
export async function verifyBatch(batchNumber) {
  if (!batchNumber || !batchNumber.trim()) {
    throw new Error('Batch number is required');
  }
  const response = await fetchWithFallback(
    `/api/v1/verify-batch/${encodeURIComponent(batchNumber.trim().toUpperCase())}`,
    { method: 'GET' }
  );
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Batch verification failed with status ${response.status}`);
  }
  return response.json();
}

/**
 * Health check endpoint
 * GET /
 * @returns {Promise<object>}
 */
export async function checkHealth() {
  try {
    const response = await fetchWithFallback('/', { method: 'GET' });
    if (!response.ok) throw new Error('Backend offline');
    return response.json();
  } catch (err) {
    throw new Error('Backend offline');
  }
}
