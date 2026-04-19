// ============================================
// CONTROLADOR DE PERFIL DE USUARIO
// ============================================

let usuarioActual = null;
let editandoInfo = false;

// basePath usado para resolver rutas relativas cuando la página está en /view/
const basePath = window.location.pathname.includes('/view/') ? '../' : '';

// ============================================
// INICIALIZACIÓN
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('Módulo de Perfil Iniciado');
    
    cargarDatosUsuario();
    cargarActividadReciente();
    cargarEstadisticas();
    
    // Event Listeners
    document.getElementById('btnCambiarFoto').addEventListener('click', () => {
        document.getElementById('inputFoto').click();
    });
    
    document.getElementById('inputFoto').addEventListener('change', handleFotoChange);
    document.getElementById('btnEditarInfo').addEventListener('click', toggleEditarInfo);
    document.getElementById('btnCancelarInfo').addEventListener('click', cancelarEdicion);
    document.getElementById('formInfoPersonal').addEventListener('submit', guardarInfoPersonal);
    document.getElementById('formCambiarPassword').addEventListener('submit', cambiarPassword);
    document.getElementById('inputPasswordNueva').addEventListener('input', verificarFortalezaPassword);

    // cropper modal buttons
    const btnCancel = document.getElementById('cropperCancel');
    const btnApply = document.getElementById('cropperApply');
    if (btnCancel) {
        btnCancel.addEventListener('click', () => {
            console.log('Cropper Cancel clicked');
            hideCropperModal();
        });
    }
    if (btnApply) {
        btnApply.addEventListener('click', () => {
            console.log('Cropper Apply clicked');
            uploadCroppedImage();
        });
    }
});

// ============================================
// CARGAR DATOS DEL USUARIO
// ============================================
async function cargarDatosUsuario() {
    try {
        // Obtener usuario del localStorage
        const userStr = localStorage.getItem('user');
        if (!userStr) {
            window.location.href = '../login.html';
            return;
        }
        
        usuarioActual = JSON.parse(userStr);
        
        // Cargar datos completos desde el servidor
        const response = await fetch('../database/perfil.php?action=getDatos', { credentials:'include' });
        const data = await response.json();
        
        if (data.success) {
            const usuario = data.usuario;
            usuarioActual = usuario;
            
            // Actualizar localStorage
            localStorage.setItem('user', JSON.stringify(usuario));
            
            // Mostrar foto de perfil (puede venir ruta relativa a raíz)
            mostrarFotoPerfil(usuario.foto_perfil);
            
            // Mostrar datos básicos
            document.getElementById('nombreUsuario').textContent = usuario.nombre;
            document.getElementById('rolUsuario').textContent = traducirRol(usuario.rol);
            document.getElementById('emailUsuario').textContent = usuario.email;
            
            // Fecha de creación
            const fechaCreacion = new Date(usuario.creado_en);
            document.getElementById('fechaCreacion').textContent = fechaCreacion.toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            
            // Último acceso
            if (usuario.ultimo_acceso) {
                const ultimoAcceso = new Date(usuario.ultimo_acceso);
                document.getElementById('ultimoAcceso').textContent = formatearFechaRelativa(ultimoAcceso);
            } else {
                document.getElementById('ultimoAcceso').textContent = 'Primera vez';
            }
            
            // Llenar formulario
            document.getElementById('inputNombre').value = usuario.nombre || '';
            document.getElementById('inputEmail').value = usuario.email || '';
            document.getElementById('inputIdentidad').value = usuario.identidad || '';
            document.getElementById('inputTelefono').value = usuario.telefono || '';
            document.getElementById('inputRol').value = traducirRol(usuario.rol);
            document.getElementById('inputDireccion').value = usuario.direccion || '';
            
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('Error al cargar datos del usuario:', error);
        mostrarAlerta('Error al cargar los datos del perfil', 'error');
    }
}

// ============================================
// FOTO DE PERFIL
// ============================================
function mostrarFotoPerfil(fotoUrl) {
    const fotoPerfil = document.getElementById('fotoPerfil');
    const inicialesFoto = document.getElementById('inicialesFoto');
    const imagenPerfil = document.getElementById('imagenPerfil');
    
    if (fotoUrl && fotoUrl !== '' && fotoUrl !== 'null') {
        // Mostrar imagen (prefijar basePath y evitar caché)
        imagenPerfil.src = basePath + fotoUrl + '?t=' + Date.now();
        imagenPerfil.style.display = 'block';
        inicialesFoto.style.display = 'none';
    } else {
        // Mostrar iniciales
        inicialesFoto.textContent = obtenerIniciales(usuarioActual.nombre);
        inicialesFoto.style.display = 'flex';
        imagenPerfil.style.display = 'none';
    }
}

// nuevo flujo: seleccionar archivo, mostrar cropper, luego subir
let cropperInstance = null;

function handleFotoChange(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
        mostrarAlerta('Por favor selecciona una imagen válida', 'error');
        return;
    }
    if (file.size > 5 * 1024 * 1024) {
        mostrarAlerta('La imagen no debe superar los 5MB', 'error');
        return;
    }

    showCropperModal(file);
}

function showCropperModal(file) {
    const modal = document.getElementById('cropperModal');
    const img = document.getElementById('cropperImage');

    const url = URL.createObjectURL(file);
    img.src = url;

    // inicializar cropper cuando la imagen carga
    img.onload = () => {
        cropperInstance = new Cropper(img, {
            aspectRatio: 1,
            viewMode: 1,
            background: false,
            movable: true,
            zoomable: true,
            rotatable: false,
            scalable: false,
            autoCropArea: 1,
            responsive: true
        });
    };

    modal.style.display = 'flex';
}

function hideCropperModal() {
    const modal = document.getElementById('cropperModal');
    const img = document.getElementById('cropperImage');
    modal.style.display = 'none';
    if (cropperInstance) {
        cropperInstance.destroy();
        cropperInstance = null;
    }
    // liberar URL temporal
    if (img && img.src.startsWith('blob:')) {
        URL.revokeObjectURL(img.src);
    }
    img.src = '';
    document.getElementById('inputFoto').value = '';
}

async function uploadCroppedImage() {
    if (!cropperInstance) return;
    mostrarLoading();
    try {
        const canvas = cropperInstance.getCroppedCanvas({ width: 300, height: 300 });
        canvas.toBlob(async blob => {
            const formData = new FormData();
            formData.append('foto', blob, 'profile.png');
            formData.append('action', 'cambiarFoto');

            const response = await fetch('../database/perfil.php', {
                method: 'POST',
                credentials: 'include',
                body: formData
            });

            const data = await response.json();
            if (data.success) {
                mostrarFotoPerfil(data.foto_url);
                usuarioActual.foto_perfil = data.foto_url;
                localStorage.setItem('user', JSON.stringify(usuarioActual));
                mostrarAlerta('Foto de perfil actualizada correctamente', 'success');
            } else {
                throw new Error(data.message);
            }
        }, 'image/png');
    } catch (error) {
        console.error('Error al cambiar foto:', error);
        mostrarAlerta('Error al actualizar la foto de perfil', 'error');
    } finally {
        ocultarLoading();
        hideCropperModal();
    }
}


// ============================================
// EDITAR INFORMACIÓN PERSONAL
// ============================================
function toggleEditarInfo() {
    editandoInfo = !editandoInfo;
    
    const inputs = [
        'inputNombre',
        'inputTelefono',
        'inputDireccion'
    ];
    
    inputs.forEach(id => {
        const input = document.getElementById(id);
        input.disabled = !editandoInfo;
    });
    
    const formActions = document.querySelector('.form-actions');
    formActions.style.display = editandoInfo ? 'flex' : 'none';
    
    const btnEditar = document.getElementById('btnEditarInfo');
    if (editandoInfo) {
        btnEditar.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>Cancelar';
        btnEditar.style.background = '#FEE2E2';
        btnEditar.style.color = '#DC2626';
    } else {
        btnEditar.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>Editar';
        btnEditar.style.background = '';
        btnEditar.style.color = '';
    }
}

function cancelarEdicion() {
    toggleEditarInfo();
    cargarDatosUsuario();
}

async function guardarInfoPersonal(event) {
    event.preventDefault();
    
    const nombre = document.getElementById('inputNombre').value.trim();
    const telefono = document.getElementById('inputTelefono').value.trim();
    const direccion = document.getElementById('inputDireccion').value.trim();
    
    if (!nombre) {
        mostrarAlerta('El nombre es obligatorio', 'error');
        return;
    }
    
    mostrarLoading();
    
    try {
        const formData = new FormData();
        formData.append('action', 'actualizarInfo');
        formData.append('nombre', nombre);
        formData.append('telefono', telefono);
        formData.append('direccion', direccion);
        
        const response = await fetch('../database/perfil.php', {
            method: 'POST',
            credentials: 'include',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            usuarioActual.nombre = nombre;
            usuarioActual.telefono = telefono;
            usuarioActual.direccion = direccion;
            localStorage.setItem('user', JSON.stringify(usuarioActual));
            
            document.getElementById('nombreUsuario').textContent = nombre;
            
            toggleEditarInfo();
            mostrarAlerta('Información actualizada correctamente', 'success');
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('Error al guardar información:', error);
        mostrarAlerta('Error al actualizar la información', 'error');
    } finally {
        ocultarLoading();
    }
}

// ============================================
// CAMBIAR CONTRASEÑA
// ============================================
async function cambiarPassword(event) {
    event.preventDefault();
    
    const passwordActual = document.getElementById('inputPasswordActual').value;
    const passwordNueva = document.getElementById('inputPasswordNueva').value;
    const passwordConfirmar = document.getElementById('inputPasswordConfirmar').value;
    
    // Validaciones
    if (passwordNueva.length < 8) {
        mostrarAlerta('La nueva contraseña debe tener al menos 8 caracteres', 'error');
        return;
    }
    
    if (passwordNueva !== passwordConfirmar) {
        mostrarAlerta('Las contraseñas no coinciden', 'error');
        return;
    }
    
    mostrarLoading();
    
    try {
        const formData = new FormData();
        formData.append('action', 'cambiarPassword');
        formData.append('password_actual', passwordActual);
        formData.append('password_nueva', passwordNueva);
        
        const response = await fetch('../database/perfil.php', {
            method: 'POST',
            credentials: 'include',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('formCambiarPassword').reset();
            document.getElementById('passwordStrength').className = 'password-strength';
            mostrarAlerta('Contraseña cambiada correctamente', 'success');
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('Error al cambiar contraseña:', error);
        mostrarAlerta(error.message || 'Error al cambiar la contraseña', 'error');
    } finally {
        ocultarLoading();
    }
}

function verificarFortalezaPassword() {
    const password = document.getElementById('inputPasswordNueva').value;
    const strengthIndicator = document.getElementById('passwordStrength');
    
    if (password.length === 0) {
        strengthIndicator.className = 'password-strength';
        return;
    }
    
    let fuerza = 0;
    
    // Criterios de fortaleza
    if (password.length >= 8) fuerza++;
    if (password.length >= 12) fuerza++;
    if (/[a-z]/.test(password)) fuerza++;
    if (/[A-Z]/.test(password)) fuerza++;
    if (/[0-9]/.test(password)) fuerza++;
    if (/[^a-zA-Z0-9]/.test(password)) fuerza++;
    
    if (fuerza <= 2) {
        strengthIndicator.className = 'password-strength weak';
    } else if (fuerza <= 4) {
        strengthIndicator.className = 'password-strength medium';
    } else {
        strengthIndicator.className = 'password-strength strong';
    }
}

// ============================================
// ACTIVIDAD RECIENTE
// ============================================
async function cargarActividadReciente() {
    try {
        const response = await fetch('../database/perfil.php?action=getActividad', { credentials:'include' });
        const data = await response.json();
        
        if (data.success && data.actividad.length > 0) {
            const actividadLista = document.getElementById('actividadLista');
            actividadLista.innerHTML = data.actividad.map(item => `
                <div class="actividad-item">
                    <div class="actividad-icono" style="background: ${obtenerColorActividad(item.accion)};">
                        ${obtenerIconoActividad(item.accion)}
                    </div>
                    <div class="actividad-content">
                        <p class="actividad-titulo">${item.accion}</p>
                        <span class="actividad-fecha">${formatearFechaRelativa(new Date(item.creado_en))}</span>
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error al cargar actividad:', error);
    }
}

// ============================================
// ESTADÍSTICAS
// ============================================
async function cargarEstadisticas() {
    try {
        const response = await fetch('../database/perfil.php?action=getEstadisticas', { credentials:'include' });
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('estatSesiones').textContent = data.estadisticas.sesiones;
            document.getElementById('estatAcciones').textContent = data.estadisticas.acciones;
            document.getElementById('estatDias').textContent = data.estadisticas.diasEnSistema;
            
            const estadoBadge = document.getElementById('estatEstado');
            const estado = usuarioActual.estado;
            const badgeClass = estado === 'activo' ? 'badge-success' : 
                               estado === 'inactivo' ? 'badge-warning' : 'badge-danger';
            estadoBadge.innerHTML = `<span class="badge ${badgeClass}">${estado.charAt(0).toUpperCase() + estado.slice(1)}</span>`;
        }
    } catch (error) {
        console.error('Error al cargar estadísticas:', error);
    }
}

// ============================================
// UTILIDADES
// ============================================
function obtenerIniciales(nombre) {
    if (!nombre) return 'U';
    const partes = nombre.trim().split(' ');
    return partes.length === 1 
        ? partes[0][0].toUpperCase()
        : (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

function traducirRol(rol) {
    const roles = {
        'admin': 'Administrador',
        'usuario': 'Usuario',
        'supervisor': 'Supervisor'
    };
    return roles[rol] || 'Usuario';
}

function formatearFechaRelativa(fecha) {
    const ahora = new Date();
    const diff = ahora - fecha;
    const segundos = Math.floor(diff / 1000);
    const minutos = Math.floor(segundos / 60);
    const horas = Math.floor(minutos / 60);
    const dias = Math.floor(horas / 24);
    
    if (dias > 7) {
        return fecha.toLocaleDateString('es-ES', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } else if (dias > 0) {
        return `Hace ${dias} día${dias > 1 ? 's' : ''}`;
    } else if (horas > 0) {
        return `Hace ${horas} hora${horas > 1 ? 's' : ''}`;
    } else if (minutos > 0) {
        return `Hace ${minutos} minuto${minutos > 1 ? 's' : ''}`;
    } else {
        return 'Hace unos momentos';
    }
}

function obtenerColorActividad(accion) {
    const colores = {
        'login': '#D1FAE5; color: #059669',
        'logout': '#FEE2E2; color: #DC2626',
        'actualizacion': '#E0E7FF; color: #4F46E5',
        'default': '#F3F4F6; color: #6B7280'
    };
    
    const tipo = accion.toLowerCase();
    if (tipo.includes('login') || tipo.includes('ingreso')) return colores.login;
    if (tipo.includes('logout') || tipo.includes('salida')) return colores.logout;
    if (tipo.includes('actualiza') || tipo.includes('modifica')) return colores.actualizacion;
    return colores.default;
}

function obtenerIconoActividad(accion) {
    const tipo = accion.toLowerCase();
    
    if (tipo.includes('login') || tipo.includes('ingreso')) {
        return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
            <polyline points="10 17 15 12 10 7"/>
            <line x1="15" y1="12" x2="3" y2="12"/>
        </svg>`;
    } else if (tipo.includes('logout') || tipo.includes('salida')) {
        return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>`;
    } else {
        return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
        </svg>`;
    }
}

function mostrarAlerta(mensaje, tipo = 'info') {
    const alerta = document.createElement('div');
    alerta.className = `alert alert-${tipo}`;
    alerta.innerHTML = `
        <span>${mensaje}</span>
        <button class="alert-close" onclick="this.parentElement.remove()">×</button>
    `;
    alerta.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: ${tipo === 'success' ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)' : 
                     tipo === 'error' ? 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)' :
                     'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)'};
        color: white;
        padding: 16px 20px;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        display: flex;
        align-items: center;
        gap: 12px;
        z-index: 10000;
        animation: slideIn 0.3s ease;
        max-width: 400px;
    `;
    
    document.body.appendChild(alerta);
    
    setTimeout(() => {
        alerta.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => alerta.remove(), 300);
    }, 5000);
}

function mostrarLoading() {
    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    overlay.id = 'loadingOverlay';
    overlay.innerHTML = '<div class="loading-spinner"></div>';
    document.body.appendChild(overlay);
}

function ocultarLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.remove();
}

// ============================================
// TOGGLE PASSWORD VISIBILITY
// ============================================
window.togglePassword = function(inputId) {
    const input = document.getElementById(inputId);
    input.type = input.type === 'password' ? 'text' : 'password';
};

// ============================================
// MODAL
// ============================================
window.cerrarModal = function() {
    document.getElementById('modalConfirmar').style.display = 'none';
};