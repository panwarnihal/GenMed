// GenMed API client — calls FastAPI directly at http://127.0.0.1:8000
const BASE_URL = 'http://127.0.0.1:8000';

/**
 * POST /api/v1/mapping/match
 * @param {string} query - Brand name / free-text query
 * @param {string} extractedSalt - Chemical composition string
 * @returns {{ match_found: boolean, top_alternative: object|null }}
 */
export async function matchGenericAlternative(query, extractedSalt = '') {
  const response = await fetch(`${BASE_URL}/api/v1/mapping/match`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, extracted_salt: extractedSalt }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `API error ${response.status}`);
  }

  return response.json();
}

/**
 * GET / — health check
 * @returns {{ status: string }}
 */
export async function checkHealth() {
  const response = await fetch(`${BASE_URL}/`, { method: 'GET' });
  if (!response.ok) throw new Error('Backend offline');
  return response.json();
}
