import bcrypt from 'bcrypt';

/**
 * Check if the request has a valid admin cookie
 * @param {Object} req - Request object (Vercel request)
 * @returns {boolean} True if admin cookie is present and valid
 */
export function isAdmin(req) {
    const cookieHeader = req.headers.cookie || '';
    return cookieHeader.split(';').map(s => s.trim()).some(c => c === 'admin=1');
}

/**
 * Verify a token against the stored hash
 * @param {string} token - Plain text token to verify
 * @param {string} hash - Bcrypt hash to compare against
 * @returns {Promise<boolean>} True if token matches hash
 */
export async function verifyToken(token, hash) {
    try {
        return await bcrypt.compare(token.trim(), hash);
    } catch (err) {
        console.error('Error verifying token:', err);
        return false;
    }
}

/**
 * Set admin cookie on response
 * @param {Object} res - Response object (Vercel response)
 */
export function setAdminCookie(res) {
    // Set cookie with secure defaults
    // In production with HTTPS, secure should be true
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieValue = [
        'admin=1',
        'HttpOnly',
        'SameSite=Lax',
        'Path=/',
        `Max-Age=${60 * 30}`, // 30 minutes
        isProduction ? 'Secure' : ''
    ].filter(Boolean).join('; ');

    res.setHeader('Set-Cookie', cookieValue);
}
