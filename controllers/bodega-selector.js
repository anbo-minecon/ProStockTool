// =================================================================
//  bodega-selector.js  —  Componente UI del Selector de Bodega
//  Ubicación: controllers/bodega-selector.js
//
//  Renderiza el selector de bodega activa en el header y el
//  banner contextual en cada página de módulo.
//  Depende de: bodega-context.js (debe cargarse primero)
// =================================================================
'use strict';

const BodegaSelector = (() => {

  let _wrap = null;
  let _destruirOnChange = null;

  // ── HELPERS ──────────────────────────────────────────────
  function _nivelLabel(nivel) {
    return { eliminacion: 'Control total', edicion: 'Edición', lectura: 'Solo lectura' }[nivel] || nivel;
  }

  function _nivelIcono(nivel) {
    const icons = {
      eliminacion: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
      edicion:     `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
      lectura:     `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`
    };
    return icons[nivel] || icons.lectura;
  }

  // ── RENDER DEL TRIGGER ───────────────────────────────────
  function _renderTrigger(bodega) {
    if (!bodega) {
      return `
        <div class="bc-trigger-icon">🏚️</div>
        <div class="bc-trigger-texts">
          <span class="bc-trigger-label">Bodega activa</span>
          <span class="bc-trigger-name" style="color:#9ca3af">Sin selección</span>
        </div>
        <svg class="bc-trigger-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="6 9 12 15 18 9"/>
        </svg>`;
    }
    return `
      <div class="bc-trigger-icon">${bodega.icono || '🏭'}</div>
      <div class="bc-trigger-texts">
        <span class="bc-trigger-label">Bodega activa</span>
        <span class="bc-trigger-name">${_esc(bodega.nombre)}</span>
      </div>
      <svg class="bc-trigger-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <polyline points="6 9 12 15 18 9"/>
      </svg>`;
  }

  // ── RENDER DEL DROPDOWN ──────────────────────────────────
  function _renderDropdown(lista, activa) {
    const propias    = lista.filter(b => b.tipo === 'propia');
    const compartidas= lista.filter(b => b.tipo === 'compartida');

    const renderItem = (b) => {
      const isActiva = activa && b.id === activa.id;
      return `
        <div class="bc-item ${isActiva ? 'activa' : ''}" data-id="${b.id}">
          <div class="bc-item-icon ${b.tipo}">${b.icono || '🏭'}</div>
          <div class="bc-item-texts">
            <div class="bc-item-nombre">${_esc(b.nombre)}</div>
            <div class="bc-item-desc">${_esc(b.descripcion || '')}</div>
          </div>
          <span class="bc-permiso ${b.nivel_permiso}">
            ${_nivelIcono(b.nivel_permiso)} ${_nivelLabel(b.nivel_permiso)}
          </span>
          <svg class="bc-item-check" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>`;
    };

    let html = `
      <div class="bc-dropdown-header">
        <div class="bc-dropdown-title">Seleccionar bodega de trabajo</div>
      </div>
      <div class="bc-list">`;

    if (propias.length) {
      html += `<div class="bc-group-label">Mi bodega</div>`;
      html += propias.map(renderItem).join('');
    }

    if (compartidas.length) {
      html += `<div class="bc-group-label">Bodegas compartidas</div>`;
      html += compartidas.map(renderItem).join('');
    }

    if (!lista.length) {
      html += `<div style="text-align:center;padding:24px;color:#9ca3af;font-size:13px">Sin bodegas disponibles</div>`;
    }

    html += `</div>
      <div class="bc-dropdown-footer">
        <button class="bc-footer-btn" id="bcBtnMiBodega">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
          Gestionar bodegas compartidas
        </button>
      </div>`;

    return html;
  }

  // ── INYECTAR EN HEADER ───────────────────────────────────
  function _inyectarEnHeader() {
    const headerRight = document.querySelector('.header-right');
    if (!headerRight) return;

    // Crear wrapper
    _wrap = document.createElement('div');
    _wrap.className = 'bc-selector-wrap';
    _wrap.id = 'bcSelectorWrap';

    // Trigger button
    const trigger = document.createElement('button');
    trigger.className = 'bc-trigger';
    trigger.id = 'bcTrigger';
    trigger.type = 'button';
    trigger.setAttribute('aria-label', 'Seleccionar bodega activa');

    // Dropdown
    const dropdown = document.createElement('div');
    dropdown.className = 'bc-dropdown';
    dropdown.id = 'bcDropdown';

    _wrap.appendChild(trigger);
    _wrap.appendChild(dropdown);

    // Insertar antes del botón de notificaciones
    const notifBtn = headerRight.querySelector('.notification-icon');
    if (notifBtn) {
      headerRight.insertBefore(_wrap, notifBtn);
    } else {
      headerRight.insertBefore(_wrap, headerRight.firstChild);
    }
  }

  // ── ACTUALIZAR UI ────────────────────────────────────────
  function _actualizar() {
    const activa = BodegaContext.obtenerActiva();
    const lista  = BodegaContext.obtenerLista();

    const trigger  = document.getElementById('bcTrigger');
    const dropdown = document.getElementById('bcDropdown');

    if (trigger)  trigger.innerHTML  = _renderTrigger(activa);
    if (dropdown) dropdown.innerHTML = _renderDropdown(lista, activa);

    // Event listeners para items
    if (dropdown) {
      dropdown.querySelectorAll('.bc-item').forEach(item => {
        item.addEventListener('click', () => {
          const id = parseInt(item.dataset.id);
          BodegaContext.seleccionar(id);
          _cerrarDropdown();
          _actualizar();
          // Actualizar banner si existe en la página
          _actualizarBanner();
        });
      });

      // Link a Mi Bodega
      const btnMiBodega = dropdown.querySelector('#bcBtnMiBodega');
      if (btnMiBodega) {
        btnMiBodega.addEventListener('click', () => {
          window.location.href = '../view/mi-bodega.html';
        });
      }
    }
  }

  // ── TOGGLE DROPDOWN ──────────────────────────────────────
  function _toggleDropdown() {
    const wrap = document.getElementById('bcSelectorWrap');
    if (!wrap) return;
    const isOpen = wrap.classList.contains('open');
    if (isOpen) _cerrarDropdown();
    else        _abrirDropdown();
  }

  function _abrirDropdown() {
    document.getElementById('bcSelectorWrap')?.classList.add('open');
  }

  function _cerrarDropdown() {
    document.getElementById('bcSelectorWrap')?.classList.remove('open');
  }

  // ── BANNER CONTEXTUAL ────────────────────────────────────
  function _actualizarBanner() {
    const banners = document.querySelectorAll('.bc-context-banner');
    banners.forEach(banner => {
      const bodega = BodegaContext.obtenerActiva();
      if (!bodega) { banner.style.display = 'none'; return; }
      banner.style.display = '';
      const iconEl  = banner.querySelector('.bc-banner-icon');
      const nameEl  = banner.querySelector('.bc-banner-name');
      const metaEl  = banner.querySelector('.bc-banner-meta');
      const permEl  = banner.querySelector('.bc-banner-perm');
      if (iconEl) iconEl.textContent = bodega.icono || '🏭';
      if (nameEl) nameEl.textContent = bodega.nombre;
      if (metaEl) metaEl.textContent = bodega.descripcion || '';
      if (permEl) {
        permEl.className = `bc-banner-perm ${bodega.nivel_permiso}`;
        permEl.innerHTML = `${_nivelIcono(bodega.nivel_permiso)} ${_nivelLabel(bodega.nivel_permiso)}`;
      }
    });
  }

  // ── RENDER BANNER EN PÁGINA ──────────────────────────────
  /**
   * Inserta un banner de contexto en el elemento destino.
   * @param {string|HTMLElement} destino - selector CSS o elemento
   */
  function insertarBanner(destino) {
    const container = typeof destino === 'string'
      ? document.querySelector(destino)
      : destino;
    if (!container) return;

    const bodega = BodegaContext.obtenerActiva();
    const banner = document.createElement('div');
    banner.className = 'bc-context-banner';
    if (!bodega) banner.style.display = 'none';

    banner.innerHTML = `
      <div class="bc-banner-icon">${bodega?.icono || '🏭'}</div>
      <div class="bc-banner-texts">
        <div class="bc-banner-label">Bodega activa</div>
        <div class="bc-banner-name">${_esc(bodega?.nombre || '—')}</div>
        <div class="bc-banner-meta">${_esc(bodega?.descripcion || '')}</div>
      </div>
      <div class="bc-banner-actions">
        <span class="bc-banner-perm ${bodega?.nivel_permiso || 'lectura'}">
          ${_nivelIcono(bodega?.nivel_permiso || 'lectura')}
          ${_nivelLabel(bodega?.nivel_permiso || 'lectura')}
        </span>
      </div>`;

    container.insertBefore(banner, container.firstChild);
    return banner;
  }

  // ── HELPERS ──────────────────────────────────────────────
  function _esc(t) {
    return String(t ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  // ── INICIALIZACIÓN ───────────────────────────────────────
  async function inicializar() {
    const usuario = (() => {
      try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch(e) { return {}; }
    })();

    // Solo para Jefes de Bodega
    if (usuario.rol !== 'jefe_bodega') return;

    // Asegurar que el CSS está cargado
    if (!document.querySelector('link[href*="bodega-selector.css"]')) {
      const link = document.createElement('link');
      link.rel  = 'stylesheet';
      link.href = '../styles/bodega-selector.css';
      document.head.appendChild(link);
    }

    // Inicializar contexto
    await BodegaContext.inicializar();

    // Inyectar en header
    _inyectarEnHeader();

    // Render inicial
    _actualizar();

    // Click en trigger
    document.addEventListener('click', (e) => {
      const trigger = document.getElementById('bcTrigger');
      const wrap    = document.getElementById('bcSelectorWrap');
      if (trigger && (trigger === e.target || trigger.contains(e.target))) {
        _toggleDropdown();
      } else if (wrap && !wrap.contains(e.target)) {
        _cerrarDropdown();
      }
    });

    // Cerrar con Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') _cerrarDropdown();
    });

    // Suscribirse a cambios de bodega
    _destruirOnChange = BodegaContext.onChange((bodega) => {
      _actualizar();
      _actualizarBanner();
    });
  }

  return {
    inicializar,
    insertarBanner,
    actualizarBanner: _actualizarBanner
  };
})();

window.BodegaSelector = BodegaSelector;