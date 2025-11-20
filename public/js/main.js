import { catalogConfig } from "../data/catalog-data.js";

// Exponer configuración en window para facilitar consumos desde otros módulos no-modulares
window.catalogConfig = catalogConfig;

let currentProduct = null;
let currentSlide = 0;

function initCatalog() {
  const catalogGrid = document.getElementById("catalog");

  try {
    const logoImg = document.getElementById("business-logo");
    if (logoImg && catalogConfig && catalogConfig.logo) {
      if (typeof catalogConfig.logo === "string") {
        logoImg.src = catalogConfig.logo;
        logoImg.alt = catalogConfig.businessName || "Logo de la empresa";
      } else if (typeof catalogConfig.logo === "object" && catalogConfig.logo.src) {
        logoImg.src = catalogConfig.logo.src;
        logoImg.alt = catalogConfig.logo.alt || catalogConfig.businessName || "Logo de la empresa";
      }
      logoImg.style.display = logoImg.src ? "block" : "none";
    }
  } catch (err) {
    console.error("Error al renderizar el logo:", err);
  }

  if (!catalogConfig || !Array.isArray(catalogConfig.products)) {
    console.error("catalogConfig.products no está disponible o no es un arreglo");
    return;
  }

  catalogConfig.products.forEach((product) => {
    const card = createProductCard(product);
    catalogGrid.appendChild(card);
  });

  setupModal();
}

function createProductCard(product) {
  const card = document.createElement("div");
  card.className = "product-card";
  card.dataset.productId = product.id;
  card.onclick = () => openModal(product);

  const mediaItem = product.media[0];
  let mediaContent = "";

  if (mediaItem.type === "image") {
    mediaContent = `<img src="${mediaItem.content}" alt="${product.name}" class="product-image">`;
  } else if (mediaItem.type === "placeholder") {
    mediaContent = `<div class="product-image">${mediaItem.content}</div>`;
  }

  card.innerHTML = `
        ${mediaContent}
        <div class="product-info">
            <h3>${product.name}</h3>
            <p>${product.description}</p>
            <div class="product-price">${renderPriceHTML(product)}</div>
            <div class="discount-timer" data-product-id="${product.id}" aria-live="polite"></div>
        </div>
    `;

  return card;
}

function getTimeRemaining(expiresAt) {
  const now = Date.now();
  const t = expiresAt - now;
  if (t <= 0) return null;
  const seconds = Math.floor((t / 1000) % 60);
  const minutes = Math.floor((t / 1000 / 60) % 60);
  const hours = Math.floor((t / (1000 * 60 * 60)) % 24);
  const days = Math.floor(t / (1000 * 60 * 60 * 24));
  return { total: t, days, hours, minutes, seconds };
}

function formatTimeRemaining(tr) {
  if (!tr) return '';
  const parts = [];
  if (tr.days) parts.push(`${tr.days}d`);
  if (tr.hours) parts.push(`${tr.hours}h`);
  if (tr.minutes) parts.push(`${tr.minutes}m`);
  parts.push(`${tr.seconds}s`);
  return parts.join(' ');
}

// Función reutilizable para actualizar cualquier elemento de timer
function updateTimerElement(element, productId, textPrefix = 'La oferta termina en: ') {
  if (!element) return false;
  
  const discounts = loadDiscountsFromStorage();
  const meta = discounts && discounts[productId];
  
  if (meta && meta.expiresAt && Date.now() < meta.expiresAt) {
    const tr = getTimeRemaining(meta.expiresAt);
    element.textContent = `${textPrefix}${formatTimeRemaining(tr)}`;
    element.style.display = '';
    return false; // No expirado
  } else {
    element.textContent = '';
    element.style.display = 'none';
    return meta && meta.expiresAt && Date.now() >= meta.expiresAt; // true si expiró
  }
}

function updateDiscountTimers() {
  const timers = document.querySelectorAll('.discount-timer');
  let expiredFound = false;

  // Actualizar timers del catálogo
  timers.forEach((el) => {
    const pid = el.dataset.productId;
    const expired = updateTimerElement(el, pid, 'La oferta termina en:  ');
    if (expired) expiredFound = true;
  });

  // Actualizar timer del modal si está abierto
  const modal = document.getElementById('modal');
  if (modal && modal.style.display === 'block' && currentProduct) {
    const modalTimer = document.getElementById('modal-discount-timer');
    updateTimerElement(modalTimer, currentProduct.id);
  }

  // Refrescar catálogo si alguna oferta expiró
  if (expiredFound) {
    const catalogGrid = document.getElementById('catalog');
    if (catalogGrid) {
      catalogGrid.innerHTML = '';
      catalogConfig.products.forEach((product) => {
        const card = createProductCard(product);
        catalogGrid.appendChild(card);
      });
    }
  }
}

setInterval(updateDiscountTimers, 1000);

function renderPriceHTML(product) {
  const info = getPriceInfo(product);
  if (!info) return `<span class="price-discounted">${product.price || ''}</span>`;

  if (info.isDiscounted) {
    return `
      <span class="price-original">${info.currency}${info.formattedOriginal}</span>
      <span class="price-discounted">${info.currency}${info.formattedDiscounted}</span>
    `;
  }

  return `<span class="price-discounted">${info.currency}${info.formattedOriginal}</span>`;
}

function parsePriceString(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const match = raw.match(/^(\D*)([0-9.,]+)/);
  if (!match) return null;
  const currency = match[1] || '';
  const numStr = match[2].replace(/,/g, '');
  const value = parseFloat(numStr);
  if (Number.isNaN(value)) return null;
  return { currency, value };
}

function formatValue(value) {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(2);
}

function getPriceInfo(product) {
  const raw = product && product.price ? product.price : '';
  const parsed = parsePriceString(raw);
  if (!parsed) return null;

  const discounts = loadDiscountsFromStorage();
  const meta = discounts && discounts[product.id];

  const info = {
    currency: parsed.currency,
    original: parsed.value,
    formattedOriginal: formatValue(parsed.value),
    isDiscounted: false,
    discounted: null,
    formattedDiscounted: null,
    percent: 0,
  };

  if (meta && meta.percent && meta.expiresAt && Date.now() < meta.expiresAt) {
    const discounted = +(parsed.value * (1 - meta.percent / 100));
    info.isDiscounted = true;
    info.discounted = +discounted.toFixed(2);
    info.formattedDiscounted = formatValue(info.discounted);
    info.percent = meta.percent;
  }

  return info;
}

function loadDiscountsFromStorage() {
  try {
    const raw = localStorage.getItem('productDiscounts');
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    console.error('Error leyendo descuentos desde localStorage:', err);
    return {};
  }
}

window.addEventListener('storage', (ev) => {
  if (ev.key === 'productDiscounts') {
    const catalogGrid = document.getElementById('catalog');
    if (!catalogGrid) return;
    catalogGrid.innerHTML = '';
    catalogConfig.products.forEach((product) => {
      const card = createProductCard(product);
      catalogGrid.appendChild(card);
    });
  }
});

function setupModal() {
  const modal = document.getElementById("modal");
  const closeBtn = document.querySelector(".close");
  const prevBtn = document.querySelector(".carousel-btn.prev");
  const nextBtn = document.querySelector(".carousel-btn.next");
  const orderBtn = document.getElementById("order-btn");

  closeBtn.onclick = closeModal;

  window.onclick = (event) => {
    if (event.target === modal) {
      closeModal();
    }
  };

  prevBtn.onclick = () => changeSlide(-1);
  nextBtn.onclick = () => changeSlide(1);

  orderBtn.onclick = sendWhatsAppOrder;
}

function openModal(product) {
  currentProduct = product;
  currentSlide = 0;

  document.getElementById("modal-title").textContent = product.name;
  document.getElementById("modal-description").textContent = product.description;
  const priceEl = document.getElementById("modal-price");
  const info = getPriceInfo(product);
  if (info) {
    if (info.isDiscounted) {
      priceEl.innerHTML = `<span class="price-original">${info.currency}${info.formattedOriginal}</span> <span class="price-discounted">${info.currency}${info.formattedDiscounted}</span>`;
    } else {
      priceEl.textContent = `${info.currency}${info.formattedOriginal}`;
    }
  } else {
    priceEl.textContent = product.price;
  }

  const carouselItems = document.getElementById("carousel-items");
  carouselItems.innerHTML = "";

  product.media.forEach((mediaItem) => {
    const item = document.createElement("div");
    item.className = "carousel-item";

    if (mediaItem.type === "image") {
      item.innerHTML = `<img src="${mediaItem.content}" alt="${product.name}">`;
    } else if (mediaItem.type === "video") {
      item.innerHTML = `<video src="${mediaItem.content}" controls></video>`;
    } else if (mediaItem.type === "placeholder") {
      item.classList.add("placeholder");
      item.textContent = mediaItem.content;
    }

    carouselItems.appendChild(item);
  });

  updateCarousel();

  // Inicializar timer del modal (se actualizará automáticamente cada segundo)
  const modalTimer = document.getElementById('modal-discount-timer');
  updateTimerElement(modalTimer, product.id);

  const modal = document.getElementById("modal");
  modal.style.display = "block";
}

function closeModal() {
  const modal = document.getElementById("modal");
  modal.style.display = "none";
  currentProduct = null;
  currentSlide = 0;
}

function changeSlide(direction) {
  if (!currentProduct) return;

  const totalSlides = currentProduct.media.length;
  currentSlide = (currentSlide + direction + totalSlides) % totalSlides;
  updateCarousel();
}

function updateCarousel() {
  const carouselItems = document.getElementById("carousel-items");
  const offset = -currentSlide * 100;
  carouselItems.style.transform = `translateX(${offset}%)`;
}

function sendWhatsAppOrder() {
  if (!currentProduct) return;

  const business = catalogConfig.businessName || "";
  const greeting = business ? `Hola ${business}, ` : "Hola, ";

  const priceInfo = getPriceInfo(currentProduct);
  let priceLabel = currentProduct.price;
  let discountNote = '';
  if (priceInfo) {
    if (priceInfo.isDiscounted) {
      priceLabel = `${priceInfo.currency}${priceInfo.formattedDiscounted} (antes ${priceInfo.currency}${priceInfo.formattedOriginal})`;
      const discounts = loadDiscountsFromStorage();
      const meta = discounts && discounts[currentProduct.id];
      if (meta && meta.expiresAt && Date.now() < meta.expiresAt) {
        const tr = getTimeRemaining(meta.expiresAt);
        if (tr) discountNote = `\nTiempo restante de oferta: ${formatTimeRemaining(tr)}`;
      }
    } else {
      priceLabel = `${priceInfo.currency}${priceInfo.formattedOriginal}`;
    }
  }

  const message = `${greeting}estoy interesado en:\n\n*${currentProduct.name}*\nPrecio: ${priceLabel}${discountNote}\n\n¿Está disponible?`;

  let rawNumber = (catalogConfig.whatsappNumber || "").toString();
  const digits = rawNumber.replace(/[^0-9]/g, "");

  if (!digits) {
    console.error("Número de WhatsApp no configurado o inválido en catalogConfig.whatsappNumber");
    alert("Lo sentimos, el número de WhatsApp del negocio no está disponible en este momento.");
    return;
  }

  const encodedMessage = encodeURIComponent(message);
  const whatsappURL = `https://wa.me/${digits}?text=${encodedMessage}`;

  window.open(whatsappURL, "_blank");
}

document.addEventListener("DOMContentLoaded", () => {
  (async () => {
    try {
      await syncDiscountsFromServer();
    } catch (e) {
      // Ignore server sync errors; fall back to localStorage
      console.warn('No se sincronizaron descuentos desde el servidor:', e);
    }
    try {
      initCatalog();
    } catch (err) {
      console.error("Error iniciando el catálogo:", err);
    }
  })();
});

// Try to fetch global discounts from server and write them to localStorage so
// the UI becomes consistent across clients. Gracefully degrades if server
// is not available (e.g., opened via file://)
async function getApiOrigin() {
  try {
    const defaultServer = 'http://127.0.0.1:3000';
    if (location.protocol === 'file:' || !location.host) return defaultServer;
    if (location.hostname === 'localhost') {
      const port = location.port || 3000;
      return `${location.protocol}//127.0.0.1:${port}`;
    }
    return `${location.protocol}//${location.host}`;
  } catch (e) {
    return 'http://127.0.0.1:3000';
  }
}

async function syncDiscountsFromServer() {
  const origin = await getApiOrigin();
  const url = `${origin}/api/discounts`;
  try {
    const resp = await fetch(url, { method: 'GET', credentials: 'same-origin' });
    const contentType = resp.headers.get('content-type') || '';
    if (!resp.ok) throw new Error(`Status ${resp.status}`);
    if (contentType.includes('application/json')) {
      const data = await resp.json();
      try {
        localStorage.setItem('productDiscounts', JSON.stringify(data || {}));
        // Notify other parts of the app
        window.dispatchEvent(new StorageEvent('storage', { key: 'productDiscounts', newValue: JSON.stringify(data || {}) }));
      } catch (e) {
        console.warn('No se pudo escribir productDiscounts en localStorage tras sincronizar:', e);
      }
    }
  } catch (err) {
    // Propagate error to allow fallback handling upstream
    throw err;
  }
}
