"use strict";

const STORAGE_KEY = "catalogBackground";
const FILE_INPUT_ID = "bg-file-input";
const RESET_BTN_ID = "bg-reset-btn";

function applyBackground(dataUrl) {
  const body = document.body;
  if (dataUrl) {
    body.style.backgroundImage = `url("${dataUrl}")`;
    body.style.backgroundSize = "cover";
    body.style.backgroundRepeat = "no-repeat";
    body.style.backgroundPosition = "center center";
  } else {
    body.style.backgroundImage = "";
  }
}

function saveBackgroundToStorage(dataUrl) {
  try {
    localStorage.setItem(STORAGE_KEY, dataUrl);
    return true;
  } catch (err) {
    console.error("No se pudo guardar el fondo en localStorage:", err);
    return false;
  }
}

function removeBackgroundFromStorage() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (err) {
    console.error("Error eliminando fondo de localStorage:", err);
    return false;
  }
}

function handleFile(file) {
  if (!file) return;
  if (!file.type || !file.type.startsWith("image/")) {
    alert("Por favor selecciona un archivo de imagen.");
    return;
  }

  const reader = new FileReader();

  reader.onload = function (evt) {
    const dataUrl = evt && evt.target && evt.target.result;
    if (typeof dataUrl !== "string") {
      console.error("Resultado inesperado de FileReader:", dataUrl);
      return;
    }

    applyBackground(dataUrl);
    const ok = saveBackgroundToStorage(dataUrl);
    if (!ok) {
      // noop
    }
  };

  reader.onerror = function (err) {
    console.error("Error leyendo el archivo seleccionado:", err);
    alert("Ocurrió un error al leer el archivo seleccionado.");
  };

  reader.readAsDataURL(file);
}

function initBackgroundControls() {
  const fileInput = document.getElementById(FILE_INPUT_ID);
  const resetBtn = document.getElementById(RESET_BTN_ID);

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) applyBackground(stored);
  } catch (err) {
    console.error("No se pudo acceder a localStorage al inicializar:", err);
  }

  if (fileInput) {
    fileInput.addEventListener("change", (e) => {
      const files = e && e.target && e.target.files;
      if (!files || files.length === 0) return;
      handleFile(files[0]);
    });
  } else {
    console.warn(`Input file con id "${FILE_INPUT_ID}" no encontrado en el DOM.`);
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      applyBackground(null);
      removeBackgroundFromStorage();
      if (fileInput) fileInput.value = "";
    });
  } else {
    console.warn(`Botón de reset con id "${RESET_BTN_ID}" no encontrado en el DOM.`);
  }

  function onDragOver(ev) {
    ev.preventDefault();
  }
  function onDrop(ev) {
    ev.preventDefault();
    const dt = ev.dataTransfer;
    if (!dt) return;
    const files = dt.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file && file.type && file.type.startsWith("image/")) {
        handleFile(file);
      }
    }
  }

  document.addEventListener("dragover", onDragOver);
  document.addEventListener("drop", onDrop, false);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initBackgroundControls, { once: true });
} else {
  initBackgroundControls();
}
