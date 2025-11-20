import { verifyToken, setAdminCookie } from './_lib/auth.js';
import { setCorsHeaders, handleOptions } from './_lib/cors.js';

/**
 * Vercel serverless function for /api/verify
 * POST: Verify admin token and set cookie
 */
export default async function handler(req, res) {
    // Handle CORS
    setCorsHeaders(req, res);
    if (handleOptions(req, res)) return;

    // Only POST allowed
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        console.log('[api/verify] incoming', {
            method: req.method,
            origin: req.headers.origin,
            contentType: req.headers['content-type']
        });

        const token = req.body && req.body.token;
        const storedHash = process.env.ADMIN_TOKEN_HASH || null;

        if (!token) {
            return res.status(400).json({ ok: false, message: 'Token requerido' });
        }

        if (!storedHash) {
            console.error('[api/verify] ADMIN_TOKEN_HASH not configured in environment');
            return res.status(500).json({
                ok: false,
                message: 'No hay token configurado en el servidor'
            });
        }

        const ok = await verifyToken(token, storedHash);

        if (ok) {
            // Set admin cookie
            setAdminCookie(res);
            console.log('[api/verify] Cookie admin=1 establecida');
            return res.status(200).json({ ok: true });
        }

        return res.status(401).json({ ok: false, message: 'Token inválido' });
    } catch (err) {
        console.error('Error verificando token:', err);
        return res.status(500).json({ ok: false, message: 'Error interno' });
    }
}
