// =================================================================
//  bodega-context.js  —  Gestor de Contexto de Bodega Activa
//  Ubicación: controllers/bodega-context.js
//
//  Implementa el modelo de "Bodega Activa" para Jefes de Bodega:
//  - Selector de bodegas (propias + compartidas)
//  - Persistencia en sessionStorage
//  - Event bus para notificar cambios a módulos
//  - API helpers filtrados por bodega activa
// =================================================================
'use strict';

// ── CONSTANTES ────────────────────────────────────────────────
const BC_STORAGE_KEY = 'pst_bodega_activa';
const BC_EVENT       = 'bodega:cambio';
const API_MI_BODEGA  = '../database/mi_bodega.php';
const API_BODEGA     = '../database/bodega.php';

// ── ESTADO INTERNO ────────────────────────────────────────────
const BodegaContext = (() => {

  let _bodegaActiva = null;   // { id, nombre, tipo: 'propia'|'compartida', nivel_permiso }
  let _listaBodegas = [];     // Todas las bodegas disponibles para este usuario
  let _inicializado = false;

  // ── PERSISTENCIA ──────────────────────────────────────────
  function _guardar(bodega) {
    try { sessionStorage.setItem(BC_STORAGE_KEY, JSON.stringify(bodega)); }
    catch(e) {}
  }

  function _recuperar() {
    try {
      const raw = sessionStorage.getItem(BC_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch(e) { return null; }
  }

  // ── EVENT BUS ─────────────────────────────────────────────
  function _emitir(bodega) {
    window.dispatchEvent(new CustomEvent(BC_EVENT, { detail: bodega }));
  }

  // ── API ───────────────────────────────────────────────────
  async function _cargarBodegas() {
    const usuario = _obtenerUsuario();
    if (!usuario || usuario.rol !== 'jefe_bodega') return [];

    const bodegas = [];

    try {
      // 1. Bodega propia (asignada)
      const rPropia = await fetch(`${API_MI_BODEGA}?action=mi_bodega`, { credentials: 'include' });
      const dPropia = await rPropia.json();
      if (dPropia.success && dPropia.data) {
        bodegas.push({
          id:            dPropia.data.id,
          nombre:        dPropia.data.nombre,
          descripcion:   dPropia.data.descripcion || '',
          tipo:          'propia',
          nivel_permiso: 'eliminacion',   // Control total sobre la propia
          icono:         '🏠'
        });
      }
    } catch(e) { console.warn('[BodegaContext] Error cargando bodega propia:', e); }

    try {
      // 2. Bodegas compartidas (aceptadas)
      const rComp = await fetch(`${API_MI_BODEGA}?action=bodegas_compartidas`, { credentials: 'include' });
      const dComp = await rComp.json();
      if (dComp.success && Array.isArray(dComp.data)) {
        dComp.data.forEach(bc => {
          bodegas.push({
            id:            bc.bodega_id,
            nombre:        bc.bodega_nombre,
            descripcion:   `Compartida por ${bc.propietario_nombre}`,
            tipo:          'compartida',
            nivel_permiso: bc.nivel_permiso,
            propietario:   bc.propietario_nombre,
            icono:         '🤝'
          });
        });
      }
    } catch(e) { console.warn('[BodegaContext] Error cargando bodegas compartidas:', e); }

    return bodegas;
  }

  function _obtenerUsuario() {
    try { return JSON.parse(localStorage.getItem('user') || '{}'); }
    catch(e) { return {}; }
  }

  // ── API PÚBLICA ───────────────────────────────────────────

  /**
   * Inicializa el contexto. Llamar una vez al cargar la app.
   * Retorna la bodega activa actual.
   */
  async function inicializar() {
    if (_inicializado) return _bodegaActiva;

    const usuario = _obtenerUsuario();
    if (!usuario || usuario.rol !== 'jefe_bodega') {
      _inicializado = true;
      return null;
    }

    _listaBodegas = await _cargarBodegas();

    // Intentar restaurar la selección previa
    const guardada = _recuperar();
    if (guardada && _listaBodegas.find(b => b.id === guardada.id)) {
      _bodegaActiva = guardada;
    } else if (_listaBodegas.length > 0) {
      // Seleccionar la bodega propia por defecto
      _bodegaActiva = _listaBodegas.find(b => b.tipo === 'propia') || _listaBodegas[0];
      _guardar(_bodegaActiva);
    }

    _inicializado = true;
    return _bodegaActiva;
  }

  /**
   * Cambia la bodega activa y notifica a todos los módulos suscritos.
   */
  function seleccionar(bodegaId) {
    const bodega = _listaBodegas.find(b => b.id === bodegaId || b.id === parseInt(bodegaId));
    if (!bodega) return false;

    _bodegaActiva = bodega;
    _guardar(bodega);
    _emitir(bodega);
    return true;
  }

  /** Retorna la bodega activa actual (o null). */
  function obtenerActiva() { return _bodegaActiva; }

  /** Retorna el ID de la bodega activa (o null). */
  function obtenerIdActivo() { return _bodegaActiva?.id || null; }

  /** Retorna todas las bodegas disponibles para este usuario. */
  function obtenerLista() { return [..._listaBodegas]; }

  /**
   * Retorna el nivel de permiso sobre la bodega activa.
   * 'eliminacion' > 'edicion' > 'lectura'
   */
  function obtenerPermiso() { return _bodegaActiva?.nivel_permiso || 'lectura'; }

  /** ¿Puede editar en la bodega activa? */
  function puedeEditar() {
    const p = obtenerPermiso();
    return p === 'edicion' || p === 'eliminacion';
  }

  /** ¿Puede eliminar en la bodega activa? */
  function puedeEliminar() { return obtenerPermiso() === 'eliminacion'; }

  /** ¿Es la bodega activa propia del usuario? */
  function esBodegaPropia() { return _bodegaActiva?.tipo === 'propia'; }

  /**
   * Suscribirse a cambios de bodega activa.
   * Retorna función para desuscribirse.
   */
  function onChange(callback) {
    const handler = (e) => callback(e.detail);
    window.addEventListener(BC_EVENT, handler);
    return () => window.removeEventListener(BC_EVENT, handler);
  }

  /**
   * Recarga la lista de bodegas (útil tras aceptar una nueva invitación).
   */
  async function recargar() {
    _inicializado = false;
    return await inicializar();
  }

  return {
    inicializar,
    seleccionar,
    obtenerActiva,
    obtenerIdActivo,
    obtenerLista,
    obtenerPermiso,
    puedeEditar,
    puedeEliminar,
    esBodegaPropia,
    onChange,
    recargar
  };
})();

// Exponer globalmente
window.BodegaContext = BodegaContext;