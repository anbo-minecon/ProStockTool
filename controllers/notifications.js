// ==================== SISTEMA DE NOTIFICACIONES GLOBAL ====================
// Uso: mostrarNotificacion('Mensaje', 'success' | 'error' | 'warning' | 'info')

class SistemaNotificaciones {
  constructor() {
    this.contenedor = null;
    this.inicializar();
  }

  inicializar() {
    // Verificar si ya existe el contenedor
    if (document.getElementById('contenedor-notificaciones')) {
      this.contenedor = document.getElementById('contenedor-notificaciones');
      return;
    }

    // Crear contenedor de notificaciones
    this.contenedor = document.createElement('div');
    this.contenedor.id = 'contenedor-notificaciones';
    this.contenedor.className = 'contenedor-notificaciones';
    document.body.appendChild(this.contenedor);

    // Agregar estilos si no existen
    if (!document.getElementById('estilos-notificaciones')) {
      const estilos = document.createElement('style');
      estilos.id = 'estilos-notificaciones';
      estilos.textContent = `
        .contenedor-notificaciones {
          position: fixed;
          top: 80px;
          right: 20px;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          gap: 12px;
          pointer-events: none;
        }

        .notificacion {
          min-width: 320px;
          max-width: 420px;
          padding: 16px 20px;
          border-radius: 12px;
          color: #fff;
          font-weight: 600;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 12px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
          animation: slideInRight 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
          pointer-events: auto;
          position: relative;
          overflow: hidden;
          border-left: 4px solid rgba(255, 255, 255, 0.3);
        }

        .notificacion::before {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: rgba(255, 255, 255, 0.3);
          animation: progress 4s linear;
        }

        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(100px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes progress {
          from {
            transform: scaleX(1);
          }
          to {
            transform: scaleX(0);
          }
        }

        .notificacion.saliendo {
          animation: slideOutRight 0.3s ease forwards;
        }

        @keyframes slideOutRight {
          from {
            opacity: 1;
            transform: translateX(0);
          }
          to {
            opacity: 0;
            transform: translateX(100px);
          }
        }

        .notificacion.success {
          background: linear-gradient(135deg, #10b981, #059669);
        }

        .notificacion.error {
          background: linear-gradient(135deg, #ef4444, #dc2626);
        }

        .notificacion.warning {
          background: linear-gradient(135deg, #f59e0b, #d97706);
        }

        .notificacion.info {
          background: linear-gradient(135deg, #4a90e2, #3577c9);
        }

        .notificacion-icono {
          width: 24px;
          height: 24px;
          flex-shrink: 0;
        }

        .notificacion-icono svg {
          width: 100%;
          height: 100%;
          stroke: currentColor;
          fill: none;
          stroke-width: 2.5;
        }

        .notificacion-contenido {
          flex: 1;
          line-height: 1.4;
          word-wrap: break-word;
        }

        .notificacion-cerrar {
          width: 24px;
          height: 24px;
          background: rgba(255, 255, 255, 0.2);
          border: none;
          border-radius: 6px;
          color: #fff;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }

        .notificacion-cerrar:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: scale(1.1);
        }

        .notificacion-cerrar svg {
          width: 16px;
          height: 16px;
          stroke: currentColor;
          stroke-width: 2;
        }

        @media (max-width: 768px) {
          .contenedor-notificaciones {
            top: 70px;
            left: 10px;
            right: 10px;
            max-width: none;
          }

          .notificacion {
            min-width: auto;
            max-width: none;
            width: 100%;
          }
        }
      `;
      document.head.appendChild(estilos);
    }
  }

  obtenerIcono(tipo) {
    const iconos = {
      success: `
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      `,
      error: `
        <svg viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2.5"/>
          <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
          <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
        </svg>
      `,
      warning: `
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          <line x1="12" y1="9" x2="12" y2="13" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
          <circle cx="12" cy="17" r="0.5" fill="currentColor" stroke="currentColor" stroke-width="1"/>
        </svg>
      `,
      info: `
        <svg viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2.5"/>
          <line x1="12" y1="16" x2="12" y2="12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
          <circle cx="12" cy="8" r="0.5" fill="currentColor" stroke="currentColor" stroke-width="1"/>
        </svg>
      `
    };

    return iconos[tipo] || iconos.info;
  }

  mostrar(mensaje, tipo = 'success', duracion = 4000) {
    // Validar tipo
    const tiposValidos = ['success', 'error', 'warning', 'info'];
    if (!tiposValidos.includes(tipo)) {
      tipo = 'info';
    }

    // Crear elemento de notificación
    const notificacion = document.createElement('div');
    notificacion.className = `notificacion ${tipo}`;
    
    notificacion.innerHTML = `
      <div class="notificacion-icono">
        ${this.obtenerIcono(tipo)}
      </div>
      <div class="notificacion-contenido">${this.escaparHtml(mensaje)}</div>
      <button class="notificacion-cerrar" type="button" aria-label="Cerrar notificación">
        <svg viewBox="0 0 24 24" fill="none">
          <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-linecap="round"/>
          <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-linecap="round"/>
        </svg>
      </button>
    `;

    // Agregar al contenedor
    this.contenedor.appendChild(notificacion);

    // Evento para cerrar manualmente
    const btnCerrar = notificacion.querySelector('.notificacion-cerrar');
    btnCerrar.addEventListener('click', () => {
      this.cerrar(notificacion);
    });

    // Auto-cerrar después de la duración
    setTimeout(() => {
      this.cerrar(notificacion);
    }, duracion);

    return notificacion;
  }

  cerrar(notificacion) {
    if (!notificacion || !notificacion.parentElement) return;

    notificacion.classList.add('saliendo');
    
    setTimeout(() => {
      if (notificacion.parentElement) {
        notificacion.remove();
      }
    }, 300);
  }

  escaparHtml(texto) {
    const mapa = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return String(texto || '').replace(/[&<>"']/g, m => mapa[m]);
  }

  // Métodos específicos para cada tipo
  exito(mensaje, duracion) {
    return this.mostrar(mensaje, 'success', duracion);
  }

  error(mensaje, duracion) {
    return this.mostrar(mensaje, 'error', duracion);
  }

  advertencia(mensaje, duracion) {
    return this.mostrar(mensaje, 'warning', duracion);
  }

  informacion(mensaje, duracion) {
    return this.mostrar(mensaje, 'info', duracion);
  }
}

// Crear instancia global
const notificaciones = new SistemaNotificaciones();

// Exportar función principal para usar en otros módulos
function mostrarNotificacion(mensaje, tipo = 'success', duracion = 4000) {
  return notificaciones.mostrar(mensaje, tipo, duracion);
}

// Exportar métodos específicos
function notificarExito(mensaje, duracion) {
  return notificaciones.exito(mensaje, duracion);
}

function notificarError(mensaje, duracion) {
  return notificaciones.error(mensaje, duracion);
}

function notificarAdvertencia(mensaje, duracion) {
  return notificaciones.advertencia(mensaje, duracion);
}

function notificarInfo(mensaje, duracion) {
  return notificaciones.informacion(mensaje, duracion);
}

// Hacer funciones disponibles globalmente
window.mostrarNotificacion = mostrarNotificacion;
window.notificarExito = notificarExito;
window.notificarError = notificarError;
window.notificarAdvertencia = notificarAdvertencia;
window.notificarInfo = notificarInfo;