import express from "express";
// Cargar variables de entorno desde .env si existe (development)
import 'dotenv/config';
import path from "path";
import { fileURLToPath } from "url";
import { catalogConfig } from "../public/data/catalog-data.js";
import fs from 'fs/promises';
import bcrypt from 'bcrypt';
import cookieParser from 'cookie-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Root of the static site (one level up from this server folder)
const staticRoot = path.join(__dirname, "..", "public");

const app = express();

// Simple request logger
app.use((req, res, next) => {
  const now = new Date().toISOString();
  console.log(`[${now}] ${req.method} ${req.url}`);
  next();
});

// Enable cookie parsing (must be before routes that use cookies)
app.use(cookieParser());

// JSON body parser for API endpoints
app.use(express.json());

// Serve static assets (index.html, main.js, styles.css, images, etc.)
app.use(express.static(staticRoot, { extensions: ["html"] }));

// Basic CORS headers for the API (allow local dev)
app.use("/api", (req, res, next) => {
  const origin = req.get('origin') || '*';
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept",
  );
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// API: return full catalog config
app.get("/api/catalog", (req, res) => {
  // Return the catalogConfig as JSON
  res.setHeader("Content-Type", "application/json");
  res.json(catalogConfig);
});

// Discounts persistence (simple file-backed storage)
const discountsFile = path.join(__dirname, 'discounts.json');

async function readDiscounts() {
  try {
    const txt = await fs.readFile(discountsFile, 'utf8');
    return txt ? JSON.parse(txt) : {};
  } catch (err) {
    // If file doesn't exist, return empty object
    return {};
  }
}

async function writeDiscounts(obj) {
  try {
    await fs.writeFile(discountsFile, JSON.stringify(obj, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error writing discounts file:', err);
    return false;
  }
}

// GET /api/discounts - return global discounts (public)
app.get('/api/discounts', async (req, res) => {
  try {
    const discounts = await readDiscounts();
    res.json(discounts || {});
  } catch (err) {
    console.error('Error reading discounts:', err);
    res.status(500).json({ error: 'Error leyendo descuentos' });
  }
});

// POST /api/discounts - replace discounts object (requires admin cookie)
app.post('/api/discounts', async (req, res) => {
  try {
    // Basic protection: require admin cookie set by /admin/verify
    console.log('[POST /api/discounts] cookies:', req.cookies);
    const isAdmin = req.cookies && req.cookies.admin === '1';
    if (!isAdmin) {
      console.log('[POST /api/discounts] Unauthorized - admin cookie not found or invalid');
      return res.status(401).json({ ok: false, message: 'No autorizado' });
    }

    const body = req.body || {};
    // Expect an object mapping productId => { percent, expiresAt }
    if (!body || typeof body !== 'object') return res.status(400).json({ ok: false, message: 'Payload inválido' });

    const ok = await writeDiscounts(body);
    if (!ok) return res.status(500).json({ ok: false, message: 'No se pudo guardar descuentos' });
    return res.json({ ok: true, message: 'Descuentos guardados' });
  } catch (err) {
    console.error('Error en POST /api/discounts:', err);
    return res.status(500).json({ ok: false, message: 'Error interno' });
  }
});

// API: get single product by id
app.get("/api/products/:id", (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: "Invalid product id" });
  }

  const product = Array.isArray(catalogConfig.products)
    ? catalogConfig.products.find((p) => p.id === id)
    : null;

  if (!product) {
    return res.status(404).json({ error: "Product not found" });
  }

  res.json(product);
});

// Admin verification endpoints (option 1: verify token server-side + set HttpOnly cookie)
// Expect process.env.ADMIN_TOKEN_HASH to contain a bcrypt hash of the admin token.
// Add CORS handling for /admin to avoid browser "Failed to fetch" (dev use).

// CORS + OPTIONS preflight handling for admin endpoints (development-friendly)
app.use('/admin', (req, res, next) => {
  const origin = req.get('origin') || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  // Allow cookie credentials in case the client uses them in same-origin mode
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  // Debug logging to help diagnose requests coming from the UI
  try {
    console.log('[admin CORS] method=%s url=%s origin=%s content-type=%s', req.method, req.originalUrl, req.get('origin'), req.get('content-type'));
  } catch (e) {
    console.error('Error logging admin request info', e);
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// POST /admin/verify { token }
app.post('/admin/verify', async (req, res) => {
  // Debug: log request arrival and headers/body to help trace why the UI
  // might be receiving index.html instead of JSON.
  try {
    console.log('[admin.verify] incoming', { method: req.method, path: req.path, origin: req.get('origin'), contentType: req.get('content-type') });
    // body may be parsed already by express.json()
    console.log('[admin.verify] body preview:', JSON.stringify(req.body).slice(0, 1000));
  } catch (e) {
    console.error('Error logging admin.verify request:', e);
  }

  const token = req.body && req.body.token;
  const storedHash = process.env.ADMIN_TOKEN_HASH || null;
  if (!token) return res.status(400).json({ ok: false, message: 'Token requerido' });
  if (!storedHash) return res.status(500).json({ ok: false, message: 'No hay token configurado en el servidor' });

  try {
    const ok = await bcrypt.compare(token.trim(), storedHash);
    if (ok) {
      // Set a simple admin cookie (value doesn't contain the token)
      // sameSite: 'lax' works for same-origin requests (localhost <-> localhost)
      // secure: false in dev to allow http
      res.cookie('admin', '1', {
        httpOnly: true,
        secure: false, // Set to true in production with HTTPS
        sameSite: 'lax',
        maxAge: 1000 * 60 * 30 // 30 minutes
      });
      console.log('[admin.verify] Cookie admin=1 establecida con sameSite=lax');
      return res.json({ ok: true });
    }
    return res.status(401).json({ ok: false, message: 'Token inválido' });
  } catch (err) {
    console.error('Error verificando token:', err);
    return res.status(500).json({ ok: false, message: 'Error interno' });
  }
});

// GET /admin/status -> { admin: boolean }
app.get('/admin/status', (req, res) => {
  const cookieHeader = req.headers.cookie || '';
  const isAdmin = cookieHeader.split(';').map(s => s.trim()).some(c => c === 'admin=1');
  res.json({ admin: !!isAdmin });
});

// Health check
app.get("/_health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Fallback: for any non-API route, serve index.html (useful for SPA)
app.get("*", (req, res) => {
  if (
    req.path.startsWith("/api/") ||
    req.path === "/api" ||
    req.path.startsWith("/_")
  ) {
    return res.status(404).json({ error: "Not found" });
  }
  res.sendFile(path.join(staticRoot, "index.html"));
});

// Start server
const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
  console.log("Static root:", staticRoot);
  console.log("Available endpoints:");
  console.log("  GET /            -> index.html (static)");
  console.log("  GET /api/catalog -> full catalog JSON");
  console.log("  GET /api/products/:id -> single product JSON");
  console.log("  GET /_health     -> health check");
});
