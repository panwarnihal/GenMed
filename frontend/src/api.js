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
      const fallbackRes = await fetch(`${BACKEND_FASTAPI_URL}${endpoint}`, options);
      if (fallbackRes.ok) return fallbackRes;
    }
    return res;
  } catch (err) {
    // Retry on FastAPI directly if gateway server fails to connect
    const fallbackRes = await fetch(`${BACKEND_FASTAPI_URL}${endpoint}`, options);
    return fallbackRes;
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


