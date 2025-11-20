/**
 * Set CORS headers on response
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
export function setCorsHeaders(req, res) {
    const origin = req.headers.origin || '*';
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
}

/**
 * Handle OPTIONS preflight request
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {boolean} True if OPTIONS was handled, false otherwise
 */
export function handleOptions(req, res) {
    if (req.method === 'OPTIONS') {
        setCorsHeaders(req, res);
        res.status(204).end();
        return true;
    }
    return false;
}
