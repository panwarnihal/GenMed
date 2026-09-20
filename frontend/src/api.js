// GenMed API Bridge
// Reads dynamic backend URL from environment variables, defaulting to local FastAPI (http://localhost:8000)
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/+$/, '');
const FALLBACK_GATEWAY_URL = 'http://localhost:5000';

async function fetchWithFallback(endpoint, options = {}) {
  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, options);
    if (res.ok) return res;
    // If running in development and primary endpoint returned 404/5xx, try local fallback
    if (import.meta.env.DEV && (res.status === 404 || res.status >= 500) && API_BASE_URL.includes('localhost')) {
      try {
        const fallbackRes = await fetch(`${FALLBACK_GATEWAY_URL}${endpoint}`, options);
        if (fallbackRes.ok) return fallbackRes;
      } catch {
        // Fallback failed, return original response
      }
    }
    return res;
  } catch (err) {
    // If running in local dev and gateway might be on port 5000, try local fallback
    if (import.meta.env.DEV && API_BASE_URL.includes('localhost')) {
      try {
        const fallbackRes = await fetch(`${FALLBACK_GATEWAY_URL}${endpoint}`, options);
        return fallbackRes;
      } catch {
        throw new Error(
          'GenMed backend server is unreachable. Please ensure your backend is running.'
        );
      }
    }
    throw new Error(
      'Unable to connect to GenMed API. Please check your network connection or backend status.'
    );
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
 * GET /api/v1/autocomplete?q=<prefix>
 * Returns up to 8 brand name suggestions for typeahead UI
 * @param {string} q - At least 2 characters
 * @returns {Promise<string[]>} Array of matching brand names
 */
export async function fetchAutocomplete(q) {
  if (!q || q.trim().length < 2) return [];
  try {
    const response = await fetchWithFallback(
      `/api/v1/autocomplete?q=${encodeURIComponent(q.trim())}`,
      { method: 'GET' }
    );
    if (!response.ok) return [];
    const data = await response.json();
    // Return data directly since the endpoint returns a simple array
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/**
 * Backwards compatibility for old autocomplete calls
 */
export async function autocomplete(q) {
  return fetchAutocomplete(q);
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

/**
 * GET /api/v1/kendras/nearby
 * Find nearby PMBJK kendras based on coordinates
 * @param {number} lat
 * @param {number} lng
 * @param {number} radius in meters (default 5000)
 * @returns {Promise<object>}
 */
export async function getNearbyKendras(lat, lng, radius = 5000) {
  if (lat == null || lng == null) throw new Error('Latitude and Longitude are required');
  const response = await fetchWithFallback(
    `/api/v1/kendras/nearby?lat=${lat}&lng=${lng}&radius=${radius}`,
    { method: 'GET' }
  );
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to fetch nearby kendras with status ${response.status}`);
  }
  return response.json();
}

/**
 * GET /api/v1/reviews
 * Fetch user reviews from MongoDB backend
 * @returns {Promise<object>} { status, count, reviews }
 */
export async function fetchReviews() {
  const response = await fetchWithFallback('/api/v1/reviews', { method: 'GET' });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to fetch reviews with status ${response.status}`);
  }
  return response.json();
}

/**
 * POST /api/v1/reviews
 * Submit a new user review to MongoDB backend
 * @param {object} reviewData { name, email, rating, category, message }
 * @returns {Promise<object>} { status, message, review }
 */
export async function submitReview(reviewData) {
  const response = await fetchWithFallback('/api/v1/reviews', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reviewData),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to submit review with status ${response.status}`);
  }
  return response.json();
}

/**
 * POST /api/v1/audit/comprehensive
 * MediCheck: Run a comprehensive audit on a list of medicine names
 * @param {string[]} medicines - Array of medicine brand names
 * @returns {Promise<object>} ComprehensiveAuditResponse JSON
 */
export async function runComprehensiveAudit(medicines) {
  if (!medicines || !medicines.length) {
    throw new Error('At least one medicine name is required');
  }
  const response = await fetchWithFallback('/api/v1/audit/comprehensive', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ medicines }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Comprehensive audit failed with status ${response.status}`);
  }
  return response.json();
}
