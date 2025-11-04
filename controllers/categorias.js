// Variables globales
let selectedColor = '#2e6df6';
let editCategoryId = null;
let editSubcategoryId = null;
let allCategories = [];
let allSubcategories = [];
let currentMode = 'categorias'; // 'categorias' o 'subcategorias'
let selectedCategoryForSubcat = null;

// SVG Icon para categorías
const categoryIcon = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    </svg>
`;

// Mostrar alerta de notificación
function showAlerta(msg, type = 'success') {
    const alerta = document.getElementById('alertaNotificacion');
    alerta.textContent = msg;
    alerta.className = `alerta-notificacion ${type}`;
    alerta.style.display = 'block';
    setTimeout(() => alerta.style.display = 'none', 3500);
}

// Abrir modal
function openModal() {
    const overlay = document.getElementById('modalOverlay');
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    document.getElementById('catName').focus();
}

// Cerrar modal
function closeModal() {
    const overlay = document.getElementById('modalOverlay');
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
    
    // Restaurar contenido original del formulario
    const formBody = document.querySelector('.modal-body');
    if (formBody.dataset.originalContent) {
        formBody.innerHTML = formBody.dataset.originalContent;
        delete formBody.dataset.originalContent;
    }
    
    document.getElementById('createCategoryForm').reset();
    selectedColor = '#2e6df6';
    updateColorSwatch();
    editCategoryId = null;
    editSubcategoryId = null;
    selectedCategoryForSubcat = null;
    document.getElementById('modalTitle').textContent = 'Nueva categoría';
}

// Actualizar visual del color seleccionado
function updateColorSwatch() {
    document.querySelectorAll('.swatch').forEach(s => {
        if (s.dataset.color === selectedColor) {
            s.classList.add('selected');
        } else {
            s.classList.remove('selected');
        }
    });
}

// Escapar HTML para seguridad
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// Cargar categorías desde la base de datos
async function cargarCategorias(filtro = '') {
    try {
        const response = await fetch(`../database/categorias.php?_=${Date.now()}`, { cache: 'no-store' });
        const data = await response.json();
        
        if (data.success) {
            allCategories = data.data;
            mostrarCategorias(filtro);
        } else {
            showAlerta('Error al cargar categorías', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showAlerta('Error de conexión', 'error');
    }
}

// Mostrar categorías en el grid
function mostrarCategorias(filtro = '') {
    const lista = document.getElementById('listaCategorias');
    
    let categoriasFiltradas = allCategories.filter(cat =>
        cat.nombre.toLowerCase().includes(filtro.toLowerCase())
    );

    if (categoriasFiltradas.length === 0) {
        lista.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                </svg>
                <p>No hay categorías disponibles</p>
            </div>
        `;
        return;
    }

    lista.innerHTML = categoriasFiltradas.map(cat => `
        <div class="category-card" data-id="${cat.id}">
            <div class="card-actions">
                <button class="edit-btn" title="Editar" type="button">
                <svg     width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z"/>
                        </svg>
                    </button>
                    
                <button class="delete-btn" title="Eliminar" type="button">
                <svg     width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/>
                        </svg>
                    </button>
            </div>
            <div class="category-icon" style="background-color: ${cat.color};">
                ${categoryIcon}
            </div>
            <div class="category-title">${escapeHtml(cat.nombre)}</div>
            <div class="category-description">${escapeHtml(cat.descripcion || 'Sin descripción')}</div>
            <div class="category-footer">
                <span class="product-count">0 productos</span>
                <span class="status-badge status-${cat.estado.toLowerCase()}">${cat.estado}</span>
            </div>
        </div>
    `).join('');

    // Event listeners para editar y eliminar
    document.querySelectorAll('.category-card').forEach(card => {
        card.querySelector('.edit-btn').addEventListener('click', () => editarCategoria(card));
        card.querySelector('.delete-btn').addEventListener('click', () => eliminarCategoria(card));
    });
}

// Editar categoría
function editarCategoria(card) {
    const id = card.dataset.id;
    const categoria = allCategories.find(c => c.id == id);
    
    if (categoria) {
        editCategoryId = id;
        document.getElementById('modalTitle').textContent = 'Editar categoría';
        document.getElementById('catName').value = categoria.nombre;
        document.getElementById('catDesc').value = categoria.descripcion;
        selectedColor = categoria.color;
        updateColorSwatch();
        document.getElementById('catEstado').value = categoria.estado;
        openModal();
    }
}

// Eliminar categoría
async function eliminarCategoria(card) {
    if (!confirm('¿Seguro que deseas eliminar esta categoría?')) return;
    
    const id = Number(card.dataset.id);
    if (Number.isNaN(id)) { showAlerta('ID inválido para eliminar', 'error'); return; }
    
    try {
        const response = await fetch('../database/categorias.php', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        
        const data = await response.json();
        if (data.success) {
            showAlerta('Categoría eliminada correctamente', 'success');
            cargarCategorias();
        } else {
            showAlerta(data.error || 'Error al eliminar', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showAlerta('Error de conexión', 'error');
    }
}

// Cargar subcategorías desde la base de datos
async function cargarSubcategorias(filtro = '') {
    try {
        const response = await fetch(`../database/subcategorias.php?_=${Date.now()}`, { cache: 'no-store' });
        const data = await response.json();
        
        if (data.success) {
            allSubcategories = data.data;
            mostrarSubcategorias(filtro);
        } else {
            showAlerta('Error al cargar subcategorías', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showAlerta('Error de conexión', 'error');
    }
}

// Mostrar subcategorías en el grid
function mostrarSubcategorias(filtro = '') {
    const lista = document.getElementById('listaCategorias');
    
    let subcategoriasFiltradas = allSubcategories.filter(subcat =>
        subcat.nombre.toLowerCase().includes(filtro.toLowerCase())
    );

    if (subcategoriasFiltradas.length === 0) {
        lista.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                </svg>
                <p>No hay subcategorías disponibles</p>
            </div>
        `;
        return;
    }

    lista.innerHTML = subcategoriasFiltradas.map(subcat => {
        const categoria = allCategories.find(c => c.id == subcat.categoria_id);
        const categoriaNombre = categoria ? categoria.nombre : 'Sin categoría';
        
        return `
            <div class="category-card" data-id="${subcat.id}">
                <div class="card-actions">
                    <button class="edit-btn" title="Editar" type="button">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z"/>
                        </svg>
                    </button>
                    
                    <button class="delete-btn" title="Eliminar" type="button">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/>
                        </svg>
                    </button>
                </div>
                <div class="category-icon" style="background-color: ${subcat.color};">
                    ${categoryIcon}
                </div>
                <div class="category-parent">${escapeHtml(categoriaNombre)}</div>
                <div class="category-title">${escapeHtml(subcat.nombre)}</div>
                <div class="category-description">${escapeHtml(subcat.descripcion || 'Sin descripción')}</div>
                <div class="category-footer">
                    <span class="product-count">0 productos</span>
                    <span class="status-badge status-${subcat.estado.toLowerCase()}">${subcat.estado}</span>
                </div>
            </div>
        `;
    }).join('');

    // Event listeners para editar y eliminar
    document.querySelectorAll('.category-card').forEach(card => {
        card.querySelector('.edit-btn').addEventListener('click', () => editarSubcategoria(card));
        card.querySelector('.delete-btn').addEventListener('click', () => eliminarSubcategoria(card));
    });
}

// Abrir modal para nueva subcategoría
function abrirModalNuevaSubcategoria() {
    if (allCategories.length === 0) {
        showAlerta('Debe crear al menos una categoría primero', 'error');
        return;
    }
    
    // Crear select de categorías
    let selectCategorias = '<div class="form-group"><label for="selectCategoriaSubcat">Categoría<span class="required">*</span></label><select id="selectCategoriaSubcat" class="form-select"><option value="">-- Seleccionar categoría --</option>';
    allCategories.forEach(cat => {
        selectCategorias += `<option value="${cat.id}" data-color="${cat.color}">${escapeHtml(cat.nombre)}</option>`;
    });
    selectCategorias += '</select></div>';
    
    // Modificar temporalmente el formulario
    const formBody = document.querySelector('.modal-body');
    const originalContent = formBody.innerHTML;
    
    formBody.innerHTML = selectCategorias + originalContent;
    
    document.getElementById('modalTitle').textContent = 'Nueva subcategoría';
    document.getElementById('createCategoryForm').reset();
    selectedColor = '#2e6df6';
    updateColorSwatch();
    document.getElementById('catEstado').value = 'ACTIVO';
    
    // Guardar contenido original para luego restaurarlo
    formBody.dataset.originalContent = originalContent;
    
    editSubcategoryId = null;
    openModal();
    
    // Evento para heredar color al seleccionar categoría
    const selectCategoria = document.getElementById('selectCategoriaSubcat');
    selectCategoria.addEventListener('change', function() {
        if (this.value) {
            const colorSeleccionado = this.options[this.selectedIndex].dataset.color;
            selectedColor = colorSeleccionado;
            updateColorSwatch();
        }
    });
}

// Editar subcategoría
function editarSubcategoria(card) {
    const id = card.dataset.id;
    const subcategoria = allSubcategories.find(s => s.id == id);
    
    if (subcategoria) {
        editSubcategoryId = id;
        selectedCategoryForSubcat = subcategoria.categoria_id;
        
        // Crear select de categorías
        let selectCategorias = '<div class="form-group"><label for="selectCategoriaSubcat">Categoría<span class="required">*</span></label><select id="selectCategoriaSubcat" class="form-select"><option value="">-- Seleccionar categoría --</option>';
        allCategories.forEach(cat => {
            const selected = cat.id == subcategoria.categoria_id ? 'selected' : '';
            selectCategorias += `<option value="${cat.id}" data-color="${cat.color}" ${selected}>${escapeHtml(cat.nombre)}</option>`;
        });
        selectCategorias += '</select></div>';
        
        const formBody = document.querySelector('.modal-body');
        const originalContent = formBody.innerHTML;
        
        formBody.innerHTML = selectCategorias + originalContent;
        formBody.dataset.originalContent = originalContent;
        
        document.getElementById('modalTitle').textContent = 'Editar subcategoría';
        document.getElementById('catName').value = subcategoria.nombre;
        document.getElementById('catDesc').value = subcategoria.descripcion;
        selectedColor = subcategoria.color;
        updateColorSwatch();
        document.getElementById('catEstado').value = subcategoria.estado;
        openModal();
        
        // Evento para heredar color al cambiar categoría
        const selectCategoria = document.getElementById('selectCategoriaSubcat');
        selectCategoria.addEventListener('change', function() {
            if (this.value) {
                const colorSeleccionado = this.options[this.selectedIndex].dataset.color;
                selectedColor = colorSeleccionado;
                updateColorSwatch();
            }
        });
    }
}

// Eliminar subcategoría
async function eliminarSubcategoria(card) {
    if (!confirm('¿Seguro que deseas eliminar esta subcategoría?')) return;
    
    const id = Number(card.dataset.id);
    if (Number.isNaN(id)) { showAlerta('ID inválido para eliminar', 'error'); return; }
    
    try {
        const response = await fetch('../database/subcategorias.php', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        
        const data = await response.json();
        if (data.success) {
            showAlerta('Subcategoría eliminada correctamente', 'success');
            cargarSubcategorias();
        } else {
            showAlerta(data.error || 'Error al eliminar', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showAlerta('Error de conexión', 'error');
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('createCategoryForm');
    const overlay = document.getElementById('modalOverlay');
    const closeBtn = document.getElementById('modalClose');
    const cancelBtn = document.getElementById('cancelBtn');
    const btnNuevaCategoria = document.getElementById('btnNuevaCategoria');
    const buscarInput = document.getElementById('buscarCategoria');
    const btnCategorias = document.getElementById('btnCategorias');
    const btnSubcategorias = document.getElementById('btnSubcategorias');

    // Cargar categorías inicialmente
    cargarCategorias();

    // Abrir modal para crear nueva categoría/subcategoría
    if (btnNuevaCategoria) {
        btnNuevaCategoria.addEventListener('click', () => {
            if (currentMode === 'subcategorias') {
                abrirModalNuevaSubcategoria();
            } else {
                editCategoryId = null;
                document.getElementById('modalTitle').textContent = 'Nueva categoría';
                form.reset();
                selectedColor = '#2e6df6';
                updateColorSwatch();
                document.getElementById('catEstado').value = 'ACTIVO';
                openModal();
            }
        });
    }

    // Cerrar modal
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
    });

    // Seleccionar color
    document.querySelectorAll('.swatch').forEach(swatch => {
        swatch.addEventListener('click', () => {
            selectedColor = swatch.dataset.color;
            updateColorSwatch();
        });
    });

    // Buscar categorías/subcategorías
    if (buscarInput) {
        buscarInput.addEventListener('input', (e) => {
            if (currentMode === 'subcategorias') {
                mostrarSubcategorias(e.target.value);
            } else {
                mostrarCategorias(e.target.value);
            }
        });
    }

    // Botones superior - Categorías/Subcategorías
    if (btnCategorias) {
        btnCategorias.addEventListener('click', function() {
            this.classList.add('activo');
            if (btnSubcategorias) btnSubcategorias.classList.remove('activo');
            currentMode = 'categorias';
            cargarCategorias();
            document.getElementById('btnNuevaCategoria').textContent = '+ Crear Categoría';
            document.getElementById('buscarCategoria').placeholder = 'Buscar Categorías...';
        });
    }

    if (btnSubcategorias) {
        btnSubcategorias.addEventListener('click', function() {
            this.classList.add('activo');
            if (btnCategorias) btnCategorias.classList.remove('activo');
            currentMode = 'subcategorias';
            cargarSubcategorias();
            document.getElementById('btnNuevaCategoria').textContent = '+ Crear Subcategoría';
            document.getElementById('buscarCategoria').placeholder = 'Buscar Subcategorías...';
        });
    }

    // Guardar o editar categoría/subcategoría
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const nombre = document.getElementById('catName').value.trim();
        const descripcion = document.getElementById('catDesc').value.trim();
        const estado = document.getElementById('catEstado').value;
        
        if (!nombre) {
            showAlerta('El nombre es obligatorio', 'error');
            document.getElementById('catName').focus();
            return;
        }

        if (nombre.length > 50) {
            showAlerta('El nombre no puede superar 50 caracteres', 'error');
            return;
        }

        if (descripcion.length > 200) {
            showAlerta('La descripción no puede superar 200 caracteres', 'error');
            return;
        }

        const payload = {
            nombre,
            descripcion,
            color: selectedColor,
            estado
        };

        try {
            let url = '../database/categorias.php';
            let method = 'POST';
            
            if (currentMode === 'subcategorias') {
                url = '../database/subcategorias.php';
                const selectCategoria = document.getElementById('selectCategoriaSubcat');
                selectedCategoryForSubcat = selectCategoria ? selectCategoria.value : selectedCategoryForSubcat;
                
                payload.categoria_id = parseInt(selectedCategoryForSubcat);
                
                if (!selectedCategoryForSubcat) {
                    showAlerta('Debe seleccionar una categoría', 'error');
                    return;
                }
                
                method = editSubcategoryId ? 'PUT' : 'POST';
                if (editSubcategoryId) payload.id = parseInt(editSubcategoryId);
            } else {
                method = editCategoryId ? 'PUT' : 'POST';
                if (editCategoryId) payload.id = parseInt(editCategoryId);
            }

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            if (data.success) {
                if (currentMode === 'subcategorias') {
                    const mensaje = editSubcategoryId ? 'Subcategoría actualizada correctamente' : 'Subcategoría creada correctamente';
                    showAlerta(mensaje, 'success');
                    closeModal();
                    cargarSubcategorias();
                } else {
                    const mensaje = editCategoryId ? 'Categoría actualizada correctamente' : 'Categoría creada correctamente';
                    showAlerta(mensaje, 'success');
                    closeModal();
                    cargarCategorias();
                }
            } else {
                showAlerta(data.error || 'Error en la operación', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showAlerta('Error de conexión', 'error');
        }
    });
});