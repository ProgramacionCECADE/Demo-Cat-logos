import { readDiscounts, writeDiscounts } from './_lib/storage.js';
import { isAdmin } from './_lib/auth.js';
import { setCorsHeaders, handleOptions } from './_lib/cors.js';

/**
 * Vercel serverless function for /api/discounts
 * GET: Return global discounts (public)
 * POST: Update discounts (requires admin cookie)
 */
export default async function handler(req, res) {
    // Handle CORS
    setCorsHeaders(req, res);
    if (handleOptions(req, res)) return;

    try {
        if (req.method === 'GET') {
            // Public endpoint - return discounts
            const discounts = await readDiscounts();
            return res.status(200).json(discounts || {});
        }

        if (req.method === 'POST') {
            // Protected endpoint - require admin cookie
            console.log('[POST /api/discounts] cookies:', req.headers.cookie);

            if (!isAdmin(req)) {
                console.log('[POST /api/discounts] Unauthorized - admin cookie not found or invalid');
                return res.status(401).json({ ok: false, message: 'No autorizado' });
            }

            const body = req.body || {};

            // Expect an object mapping productId => { percent, expiresAt }
            if (!body || typeof body !== 'object') {
                return res.status(400).json({ ok: false, message: 'Payload inválido' });
            }

            const ok = await writeDiscounts(body);

            if (!ok) {
                return res.status(500).json({ ok: false, message: 'No se pudo guardar descuentos' });
            }

            return res.status(200).json({ ok: true, message: 'Descuentos guardados' });
        }

        // Method not allowed
        return res.status(405).json({ error: 'Method not allowed' });
    } catch (err) {
        console.error('Error en /api/discounts:', err);
        return res.status(500).json({ ok: false, message: 'Error interno' });
    }
}
