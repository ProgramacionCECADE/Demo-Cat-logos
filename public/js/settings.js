const ADMIN_HASH_KEY = "adminTokenHash";
const SESSION_UNLOCK_KEY = "adminUnlocked";

const ADMIN_MODAL_ID = "admin-modal";
const ADMIN_TOKEN_INPUT_ID = "admin-token-input";
const ADMIN_TOKEN_VERIFY_BTN_ID = "admin-token-verify-btn";
const ADMIN_TOKEN_MSG_ID = "admin-token-msg";
const ADMIN_CANCEL_BTN_ID = "admin-cancel-btn";
const BG_PANEL_ID = "bg-panel";

function el(id) { return document.getElementById(id); }

function showMsg(text, type = "error") {
  const msgEl = el(ADMIN_TOKEN_MSG_ID);
  if (!msgEl) return;
  msgEl.textContent = text;
  msgEl.style.color = type === "error" ? "#c00" : "#0a7";
}

function openAdminModal() {
  const modal = el(ADMIN_MODAL_ID);
  const input = el(ADMIN_TOKEN_INPUT_ID);
  if (!modal) return;
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  showMsg("", "info");
  if (input) { input.value = ""; setTimeout(() => input.focus(), 50); }
}

function closeAdminModal() {
  const modal = el(ADMIN_MODAL_ID);
  if (!modal) return;
  // If a descendant of the modal currently has focus, move focus out
  // before hiding it. Hiding (aria-hidden=true) while a focused
  // descendant exists causes accessibility/runtime warnings and
  // hides the focused element from assistive tech.
  try {
    const active = document.activeElement;
    if (active && modal.contains(active)) {
      if (typeof active.blur === 'function') active.blur();
      // Try to move focus to a sensible fallback outside the modal.
      // Use #logo-container if present, otherwise body. Temporarily
      // add tabindex to allow focusing non-focusable elements.
      const fallback = document.getElementById('logo-container') || document.body;
      if (fallback && typeof fallback.focus === 'function') {
        const hadTab = fallback.hasAttribute('tabindex');
        if (!hadTab) fallback.setAttribute('tabindex', '-1');
        try { fallback.focus(); } catch (e) { /* ignore */ }
        if (!hadTab) fallback.removeAttribute('tabindex');
      }
    }
  } catch (err) {
    console.error('Error moviendo foco fuera del modal:', err);
  }

  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  showMsg("", "info");
}

function unlockAdminUI() {
  const panel = el(BG_PANEL_ID);
  if (panel) { panel.classList.add("visible"); panel.setAttribute("aria-hidden", "false"); }
  closeAdminModal();
}

function lockAdminUI() {
  const panel = el(BG_PANEL_ID);
  if (panel) { panel.classList.remove("visible"); panel.setAttribute("aria-hidden", "true"); }
  try { sessionStorage.removeItem(SESSION_UNLOCK_KEY); } catch (e) { console.error("sessionStorage no disponible:", e); }
}

async function submitTokenToServer(token) {
  try {
    const defaultServer = 'http://127.0.0.1:3000';
    let origin;
    if (location.protocol === 'file:' || !location.host) {
      origin = defaultServer;
    } else {
      origin = `${location.protocol}//${location.host}`;
    }
    const url = `${origin}/admin/verify`;

    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ token })
    });

    const contentType = resp.headers.get('content-type') || '';
    const bodyText = await resp.text();

    if (contentType.includes('application/json')) {
      let data = {};
      try { data = JSON.parse(bodyText || '{}'); } catch (e) { console.error('Error parseando JSON de respuesta:', e, bodyText); return { ok: false, message: 'Respuesta inválida del servidor.' }; }
      if (resp.ok) return { ok: !!data.ok, message: data.message };
      return { ok: false, message: data.message || 'Token inválido' };
    }

    const snippet = bodyText ? bodyText.slice(0, 1000) : '';
    return { ok: false, message: `Respuesta no JSON del servidor (status ${resp.status}). Respuesta: ${snippet}` };
  } catch (err) {
    console.error('Error enviando token al servidor:', err);
    return { ok: false, message: 'Error de red verificando token.' };
  }
}

async function onVerifyClick() {
  const input = el(ADMIN_TOKEN_INPUT_ID);
  if (!input) return;
  const token = input.value || "";
  showMsg("Verificando...", "info");
  try {
    const result = await submitTokenToServer(token);
    if (result.ok) {
      showMsg(result.message || "Acceso concedido.", "success");
      setTimeout(() => { unlockAdminUI(); }, 600);
    } else {
      showMsg(result.message || "Token inválido.", "error");
    }
  } catch (err) {
    console.error("Error en onVerifyClick:", err);
    showMsg("Error interno verificando token.", "error");
  }
}

function initSettingsFlow() {
  const modal = el(ADMIN_MODAL_ID);
  const verifyBtn = el(ADMIN_TOKEN_VERIFY_BTN_ID);
  const cancelBtn = el(ADMIN_CANCEL_BTN_ID);

  // Secuencia secreta para abrir el modal de administrador.
  // En escritorio la tercera acción era un dblclick; en móviles ese evento
  // puede no dispararse correctamente, así que aceptamos tanto dblclick
  // como click para el último paso.
  const sequenceSteps = [
    { types: ["click"], selector: "#logo-container" },
    { types: ["click"], selector: "footer" },
    { types: ["dblclick", "click"], selector: "header h1" },
  ];
  const windowTimeoutMs = 8000;

  let seqIndex = 0;
  let seqTimer = null;

  function resetSequence() { seqIndex = 0; if (seqTimer) { clearTimeout(seqTimer); seqTimer = null; } }
  function advanceSequence() { seqIndex += 1; if (seqIndex >= sequenceSteps.length) { resetSequence(); openAdminModal(); return; } if (seqTimer) clearTimeout(seqTimer); seqTimer = setTimeout(() => { resetSequence(); }, windowTimeoutMs); }

  sequenceSteps.forEach((step, idx) => {
    const elStep = document.querySelector(step.selector);
    if (!elStep) return;
    const types = Array.isArray(step.types) ? step.types : [step.type || 'click'];
    types.forEach((t) => {
      elStep.addEventListener(t, (ev) => {
        if (idx === seqIndex) {
          advanceSequence();
        } else {
          resetSequence();
          if (idx === 0) { advanceSequence(); }
        }
      });
    });
  });

  document.addEventListener("keydown", (ev) => {
    const active = document.activeElement;
    const inInput = active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable);
    if (inInput) return;
    if (ev.ctrlKey && ev.shiftKey && (ev.key === "A" || ev.key === "a")) {
      ev.preventDefault();
      openAdminModal();
    }
  });

  if (verifyBtn) { verifyBtn.addEventListener("click", (e) => { e.preventDefault(); onVerifyClick(); }); }
  if (cancelBtn) { cancelBtn.addEventListener("click", (e) => { e.preventDefault(); closeAdminModal(); }); }

  const input = el(ADMIN_TOKEN_INPUT_ID);
  if (input) {
    input.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") { ev.preventDefault(); onVerifyClick(); } else if (ev.key === "Escape") { closeAdminModal(); }
    });
  }

  if (modal) {
    modal.addEventListener("click", (ev) => { if (ev.target === modal) { closeAdminModal(); } });
  }

  lockAdminUI();
  initDiscountPanel();
}

function initDiscountPanel() {
  const select = document.getElementById('discount-product-select');
  const percentInput = document.getElementById('discount-percent');
  const daysInput = document.getElementById('discount-days');
  const applyBtn = document.getElementById('discount-apply-btn');
  const msg = document.getElementById('discount-msg');

  if (!select || !applyBtn) return;
  try {
    if (window.catalogConfig && Array.isArray(window.catalogConfig.products)) {
      select.innerHTML = '';
      window.catalogConfig.products.forEach((p) => {
        const opt = document.createElement('option'); opt.value = p.id; opt.textContent = p.name; select.appendChild(opt);
      });
    }
  } catch (err) { console.error('Error poblando select de descuentos:', err); }

  applyBtn.addEventListener('click', async (ev) => {
    ev.preventDefault();
    const productId = select.value;
    const percent = parseFloat(percentInput.value);
    const days = parseInt(daysInput.value, 10);

    if (!productId) { showDiscountMsg('Seleccione un producto.', 'error'); return; }
    if (!percent || percent <= 0 || percent >= 100) { showDiscountMsg('Ingrese un porcentaje válido (1-99).', 'error'); return; }
    if (!days || days <= 0) { showDiscountMsg('Ingrese una duración en días válida.', 'error'); return; }

    const discounts = loadDiscounts();
    const expiresAt = Date.now() + days * 24 * 60 * 60 * 1000;
    discounts[productId] = { percent, expiresAt };
    try {
      // Save locally first
      localStorage.setItem('productDiscounts', JSON.stringify(discounts));
      window.dispatchEvent(new StorageEvent('storage', { key: 'productDiscounts', newValue: JSON.stringify(discounts) }));
      // Try to persist globally on the server. If it fails, keep local change.
      try {
        await updateDiscountsOnServer(discounts);
        showDiscountMsg('Descuento aplicado globalmente.', 'success');
      } catch (err) {
        console.warn('No se pudo guardar descuentos en el servidor:', err);
        showDiscountMsg('Descuento aplicado localmente (no fue posible guardar en el servidor).', 'success');
      }
      percentInput.value = ''; daysInput.value = '';
    } catch (err) { console.error('Error guardando descuento:', err); showDiscountMsg('No se pudo guardar el descuento.', 'error'); }
  });

  const observer = new MutationObserver(() => {
    const panel = document.getElementById(BG_PANEL_ID);
    const discountPanel = document.getElementById('discount-panel');
    if (!panel || !discountPanel) return;
    const visible = panel.classList.contains('visible');
    if (visible) { discountPanel.setAttribute('aria-hidden', 'false'); } else { discountPanel.setAttribute('aria-hidden', 'true'); }
  });
  const target = document.getElementById(BG_PANEL_ID);
  if (target) observer.observe(target, { attributes: true, attributeFilter: ['class'] });
}

// Determine API origin similarly a submitTokenToServer
function getApiOrigin() {
  try {
    const defaultServer = 'http://127.0.0.1:3000';
    if (location.protocol === 'file:' || !location.host) return defaultServer;
    return `${location.protocol}//${location.host}`;
  } catch (e) {
    return 'http://127.0.0.1:3000';
  }
}

async function updateDiscountsOnServer(discounts) {
  const origin = getApiOrigin();
  const url = `${origin}/api/discounts`;
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(discounts)
    });
    const contentType = resp.headers.get('content-type') || '';
    if (!resp.ok) {
      // Try to capture message from body
      let bodyText = await resp.text();
      throw new Error(`Status ${resp.status} - ${bodyText}`);
    }
    if (contentType.includes('application/json')) {
      return await resp.json();
    }
    return { ok: true };
  } catch (err) {
    throw err;
  }
}

function showDiscountMsg(text, type = 'error') { const el = document.getElementById('discount-msg'); if (!el) return; el.textContent = text; el.style.color = type === 'success' ? '#0a7' : '#c00'; }

function loadDiscounts() { try { const raw = localStorage.getItem('productDiscounts'); return raw ? JSON.parse(raw) : {}; } catch (err) { console.error('Error leyendo descuentos:', err); return {}; } }

if (document.readyState === "loading") { document.addEventListener("DOMContentLoaded", initSettingsFlow, { once: true }); } else { initSettingsFlow(); }
