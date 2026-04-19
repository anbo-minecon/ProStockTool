// =================================================================
//  notificaciones-bodega.js  —  Gestor de Notificaciones para Bodegas
//  Ubicación: controllers/notificaciones-bodega.js
//  Uso: Centraliza todas las notificaciones relacionadas con 
//       invitaciones y compartición de bodegas
// =================================================================
'use strict';

const NotificacionesBodega = {
  
  /**
   * Invitación enviada correctamente
   */
  invitacionEnviada: function(nombreJefe) {
    mostrarNotificacion(
      `✓ Invitación enviada a ${nombreJefe}`,
      'success',
      4000
    );
  },

  /**
   * Error al enviar invitación
   */
  errorEnviarInvitacion: function(error) {
    mostrarNotificacion(
      `Error al enviar: ${error}`,
      'error',
      5000
    );
  },

  /**
   * Acceso revocado
   */
  accesoRevocado: function(nombreJefe) {
    mostrarNotificacion(
      `✓ Acceso revocado a ${nombreJefe}`,
      'success',
      4000
    );
  },

  /**
   * Error al revocar acceso
   */
  errorRevocar: function(error) {
    mostrarNotificacion(
      `Error al revocar: ${error}`,
      'error',
      5000
    );
  },

  /**
   * Permiso actualizado
   */
  permisoActualizado: function(nuevoNivel) {
    const labels = {
      lectura: 'Lectura',
      edicion: 'Edición',
      eliminacion: 'Eliminación'
    };
    mostrarNotificacion(
      `✓ Permiso cambiado a ${labels[nuevoNivel] || nuevoNivel}`,
      'success',
      4000
    );
  },

  /**
   * Error al actualizar permiso
   */
  errorActualizarPermiso: function(error) {
    mostrarNotificacion(
      `Error al actualizar permiso: ${error}`,
      'error',
      5000
    );
  },

  /**
   * Error de conexión
   */
  errorConexion: function() {
    mostrarNotificacion(
      'Error de conexión. Intenta de nuevo.',
      'error',
      5000
    );
  },

  /**
   * Validación fallida
   */
  validacionFallida: function(mensaje) {
    mostrarNotificacion(
      mensaje,
      'warning',
      4000
    );
  },

  /**
   * Invitación nueva recibida (para notificaciones en tiempo real)
   */
  invitacionRecibida: function(nombreJefe, bodega) {
    mostrarNotificacion(
      `📧 ${nombreJefe} te compartió acceso a bodega ${bodega}`,
      'info',
      6000
    );
  },

  /**
   * Invitación aceptada
   */
  invitacionAceptada: function(nombreJefe) {
    mostrarNotificacion(
      `✓ ${nombreJefe} aceptó tu invitación`,
      'success',
      4000
    );
  },

  /**
   * Invitación rechazada
   */
  invitacionRechazada: function(nombreJefe) {
    mostrarNotificacion(
      `✗ ${nombreJefe} rechazó tu invitación`,
      'warning',
      4000
    );
  },

  /**
   * Cambio de permiso por otro jefe
   */
  permisoCambiado: function(nombreJefe, nuevoNivel) {
    const labels = {
      lectura: 'Lectura',
      edicion: 'Edición',
      eliminacion: 'Eliminación'
    };
    mostrarNotificacion(
      `ℹ ${nombreJefe} cambió tu permiso a ${labels[nuevoNivel] || nuevoNivel}`,
      'info',
      5000
    );
  },

  /**
   * Acceso revocado por otro jefe
   */
  accesoRevocadoPor: function(nombreJefe, bodega) {
    mostrarNotificacion(
      `✗ ${nombreJefe} revocó tu acceso a bodega ${bodega}`,
      'warning',
      5000
    );
  }
};

// Exportar para uso global
window.NotificacionesBodega = NotificacionesBodega;
