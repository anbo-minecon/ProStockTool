// ============================================
// CONTROLADOR DE REPORTES Y GRÁFICOS
// ============================================

let charts = {}; // Almacena instancias de gráficos
let datosReportes = {}; // Almacena datos para exportación
let paginaActual = 1;
let registrosPorPagina = 20;
let datosTablaCompletos = [];
let datosTablaMostrar = [];

// ============================================
// INICIALIZACIÓN
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('Módulo de Reportes Iniciado');
    
    // Cargar filtros
    cargarFiltros();
    
    // Cargar datos iniciales
    cargarDatosReportes();
    
    // Event Listeners
    document.getElementById('btnActualizar').addEventListener('click', cargarDatosReportes);
    document.getElementById('btnExportarPDF').addEventListener('click', exportarPDF);
    document.getElementById('btnExportarExcel').addEventListener('click', exportarExcel);
    document.getElementById('btnAplicarFiltros').addEventListener('click', cargarDatosReportes);
    document.getElementById('filtroPeriodo').addEventListener('change', toggleCustomDate);
    document.getElementById('buscarTabla').addEventListener('input', filtrarTabla);
    document.getElementById('btnPrevPage').addEventListener('click', () => cambiarPagina(-1));
    document.getElementById('btnNextPage').addEventListener('click', () => cambiarPagina(1));
});

// ============================================
// CARGAR FILTROS
// ============================================
async function cargarFiltros() {
    try {
        // Cargar bodegas
        const resBodegas = await fetch('../database/bodega.php?action=getAll');
        const bodegasResp = await resBodegas.json();
        const bodegas = Array.isArray(bodegasResp.data) ? bodegasResp.data : [];
        const selectBodega = document.getElementById('filtroBodega');
        
        bodegas.forEach(bodega => {
            const option = document.createElement('option');
            option.value = bodega.id;
            option.textContent = bodega.nombre;
            selectBodega.appendChild(option);
        });

        // Cargar categorías
        const resCategorias = await fetch('../database/categorias.php?action=getAll');
        const categoriasResp = await resCategorias.json();
        const categorias = Array.isArray(categoriasResp.data) ? categoriasResp.data : [];
        const selectCategoria = document.getElementById('filtroCategoria');
        
        categorias.forEach(categoria => {
            const option = document.createElement('option');
            option.value = categoria.id;
            option.textContent = categoria.nombre;
            selectCategoria.appendChild(option);
        });
    } catch (error) {
        console.error('Error al cargar filtros:', error);
    }
}

function toggleCustomDate() {
    const periodo = document.getElementById('filtroPeriodo').value;
    const customFrom = document.getElementById('customDateRange');
    const customTo = document.getElementById('customDateRangeTo');
    
    if (periodo === 'custom') {
        customFrom.style.display = 'flex';
        customTo.style.display = 'flex';
    } else {
        customFrom.style.display = 'none';
        customTo.style.display = 'none';
    }
}

// ============================================
// CARGAR DATOS DE REPORTES
// ============================================
async function cargarDatosReportes() {
    mostrarLoading();
    
    try {
        const filtros = obtenerFiltros();
        const url = `../database/reportes.php?${new URLSearchParams(filtros)}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success) {
            datosReportes = data.data;
            
            // Actualizar KPIs
            actualizarKPIs(data.data.kpis);
            
            // Crear gráficos
            crearGraficos(data.data);
            
            // Cargar tabla
            datosTablaCompletos = data.data.productos || [];
            datosTablaMostrar = [...datosTablaCompletos];
            paginaActual = 1;
            renderizarTabla();
        } else {
            console.error('Error en los datos:', data.message);
            alert('Error al cargar los reportes: ' + data.message);
        }
    } catch (error) {
        console.error('Error al cargar datos:', error);
        alert('Error de conexión al cargar reportes');
    } finally {
        ocultarLoading();
    }
}

function obtenerFiltros() {
    const periodo = document.getElementById('filtroPeriodo').value;
    const bodega = document.getElementById('filtroBodega').value;
    const categoria = document.getElementById('filtroCategoria').value;
    
    const filtros = {
        periodo: periodo
    };
    
    if (periodo === 'custom') {
        filtros.fechaDesde = document.getElementById('fechaDesde').value;
        filtros.fechaHasta = document.getElementById('fechaHasta').value;
    }
    
    if (bodega) filtros.bodega = bodega;
    if (categoria) filtros.categoria = categoria;
    
    return filtros;
}

// ============================================
// ACTUALIZAR KPIs
// ============================================
function actualizarKPIs(kpis) {
    document.getElementById('kpiTotalProductos').textContent = kpis.totalProductos.toLocaleString();
    document.getElementById('kpiValorInventario').textContent = formatearMoneda(kpis.valorInventario);
    document.getElementById('kpiMovimientos').textContent = kpis.totalMovimientos.toLocaleString();
    document.getElementById('kpiStockBajo').textContent = kpis.productosBajoStock.toLocaleString();
    
    // Cambios porcentuales
    actualizarCambio('kpiTotalProductosChange', kpis.cambioProductos);
    actualizarCambio('kpiValorInventarioChange', kpis.cambioValor);
    actualizarCambio('kpiMovimientosChange', kpis.cambioMovimientos);
    document.getElementById('kpiStockBajoChange').textContent = 
        kpis.productosBajoStock > 0 ? `${kpis.productosBajoStock} productos` : 'Ninguno';
}

function actualizarCambio(elementId, valor) {
    const elemento = document.getElementById(elementId);
    const signo = valor >= 0 ? '+' : '';
    elemento.textContent = `${signo}${valor.toFixed(1)}%`;
    elemento.className = valor >= 0 ? 'kpi-change positive' : 'kpi-change negative';
}

// ============================================
// CREAR GRÁFICOS
// ============================================
function crearGraficos(data) {
    // Destruir gráficos anteriores
    Object.values(charts).forEach(chart => chart.destroy());
    charts = {};
    
    // Gráfico 1: Movimientos por Tipo (Pie)
    const ctxMovimientos = document.getElementById('chartMovimientosTipo').getContext('2d');
    charts.movimientosTipo = new Chart(ctxMovimientos, {
        type: 'doughnut',
        data: {
            labels: data.movimientosTipo.map(m => m.tipo),
            datasets: [{
                data: data.movimientosTipo.map(m => m.cantidad),
                backgroundColor: [
                    '#3B82F6',
                    '#10B981',
                    '#F59E0B',
                    '#EF4444',
                    '#8B5CF6'
                ],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        font: {
                            size: 12,
                            family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto'
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.label + ': ' + context.parsed.toLocaleString();
                        }
                    }
                }
            }
        }
    });

    // Gráfico 2: Productos por Categoría (Bar)
    const ctxCategoria = document.getElementById('chartProductosCategoria').getContext('2d');
    charts.productosCategoria = new Chart(ctxCategoria, {
        type: 'bar',
        data: {
            labels: data.productosCategoria.map(c => c.categoria),
            datasets: [{
                label: 'Productos',
                data: data.productosCategoria.map(c => c.cantidad),
                backgroundColor: '#3B82F6',
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            }
        }
    });

    // Gráfico 3: Evolución del Inventario (Line)
    const ctxEvolucion = document.getElementById('chartEvolucionInventario').getContext('2d');
    charts.evolucionInventario = new Chart(ctxEvolucion, {
        type: 'line',
        data: {
            labels: data.evolucionInventario.map(e => e.fecha),
            datasets: [
                {
                    label: 'Entradas',
                    data: data.evolucionInventario.map(e => e.entradas),
                    borderColor: '#10B981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Salidas',
                    data: data.evolucionInventario.map(e => e.salidas),
                    borderColor: '#EF4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    tension: 0.4,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        padding: 15,
                        usePointStyle: true
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });

    // Gráfico 4: Stock por Bodega (Polar Area)
    const ctxBodega = document.getElementById('chartStockBodega').getContext('2d');
    charts.stockBodega = new Chart(ctxBodega, {
        type: 'polarArea',
        data: {
            labels: data.stockBodega.map(b => b.bodega),
            datasets: [{
                data: data.stockBodega.map(b => b.stock),
                backgroundColor: [
                    'rgba(59, 130, 246, 0.7)',
                    'rgba(16, 185, 129, 0.7)',
                    'rgba(245, 158, 11, 0.7)',
                    'rgba(239, 68, 68, 0.7)',
                    'rgba(139, 92, 246, 0.7)'
                ],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15
                    }
                }
            }
        }
    });

    // Gráfico 5: Top Productos (Horizontal Bar)
    const ctxTop = document.getElementById('chartTopProductos').getContext('2d');
    charts.topProductos = new Chart(ctxTop, {
        type: 'bar',
        data: {
            labels: data.topProductos.map(p => p.nombre.substring(0, 20) + '...'),
            datasets: [{
                label: 'Movimientos',
                data: data.topProductos.map(p => p.movimientos),
                backgroundColor: [
                    '#3B82F6',
                    '#10B981',
                    '#F59E0B',
                    '#EF4444',
                    '#8B5CF6',
                    '#EC4899',
                    '#14B8A6',
                    '#F97316',
                    '#6366F1',
                    '#84CC16'
                ],
                borderRadius: 6
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    beginAtZero: true
                }
            }
        }
    });
}

// ============================================
// TABLA DE REPORTES
// ============================================
function renderizarTabla() {
    const tbody = document.getElementById('tablaReportesBody');
    const inicio = (paginaActual - 1) * registrosPorPagina;
    const fin = inicio + registrosPorPagina;
    const datosPagina = datosTablaMostrar.slice(inicio, fin);
    
    if (datosPagina.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="text-center">No hay datos para mostrar</td></tr>';
        return;
    }
    
    tbody.innerHTML = datosPagina.map(producto => `
        <tr>
            <td>${producto.id}</td>
            <td>${producto.nombre}</td>
            <td>${producto.categoria || 'Sin categoría'}</td>
            <td>${producto.bodega || 'Sin bodega'}</td>
            <td>${parseFloat(producto.stock).toFixed(2)}</td>
            <td>${parseFloat(producto.stock_min).toFixed(2)}</td>
            <td>${parseFloat(producto.stock_max).toFixed(2)}</td>
            <td>${formatearMoneda(producto.precio)}</td>
            <td>${formatearMoneda(producto.stock * producto.precio)}</td>
            <td>${obtenerBadgeEstado(producto)}</td>
        </tr>
    `).join('');
    
    actualizarPaginacion();
}

function obtenerBadgeEstado(producto) {
    const stock = parseFloat(producto.stock);
    const stockMin = parseFloat(producto.stock_min);
    const stockMax = parseFloat(producto.stock_max);
    
    if (stock <= stockMin) {
        return '<span class="badge badge-danger">Bajo</span>';
    } else if (stock >= stockMax) {
        return '<span class="badge badge-warning">Alto</span>';
    } else {
        return '<span class="badge badge-success">Normal</span>';
    }
}

function actualizarPaginacion() {
    const totalPaginas = Math.ceil(datosTablaMostrar.length / registrosPorPagina);
    const inicio = (paginaActual - 1) * registrosPorPagina + 1;
    const fin = Math.min(inicio + registrosPorPagina - 1, datosTablaMostrar.length);
    
    document.getElementById('paginacionInfo').textContent = 
        `Mostrando ${inicio} a ${fin} de ${datosTablaMostrar.length} registros`;
    document.getElementById('currentPage').textContent = paginaActual;
    
    document.getElementById('btnPrevPage').disabled = paginaActual === 1;
    document.getElementById('btnNextPage').disabled = paginaActual >= totalPaginas;
}

function cambiarPagina(direccion) {
    paginaActual += direccion;
    renderizarTabla();
}

function filtrarTabla() {
    const busqueda = document.getElementById('buscarTabla').value.toLowerCase();
    
    if (!busqueda) {
        datosTablaMostrar = [...datosTablaCompletos];
    } else {
        datosTablaMostrar = datosTablaCompletos.filter(producto => 
            producto.nombre.toLowerCase().includes(busqueda) ||
            (producto.categoria && producto.categoria.toLowerCase().includes(busqueda)) ||
            (producto.bodega && producto.bodega.toLowerCase().includes(busqueda))
        );
    }
    
    paginaActual = 1;
    renderizarTabla();
}

// ============================================
// EXPORTAR PDF
// ============================================
// ============================================================
//  EXPORTAR PDF CON GRÁFICOS
//  Reemplaza el listener de btnExportarPDF en reportes.js
//  (pega esto al final del archivo, o reemplaza el listener existente)
// ============================================================

document.getElementById('btnExportarPDF').addEventListener('click', async () => {
    // 1. Cambiar botón a estado de carga
    const btn = document.getElementById('btnExportarPDF');
    const textoOriginal = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
             style="animation: spin 1s linear infinite">
            <polyline points="23 4 23 10 17 10"/>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
        </svg>
        Generando PDF...
    `;

    try {
        // 2. Capturar todos los gráficos como imágenes PNG (base64)
        const getChart = (id) => {
            const canvas = document.getElementById(id);
            return canvas ? canvas.toDataURL('image/png') : null;
        };

        // 3. Armar payload con filtros + imágenes
        const payload = {
            // Filtros actuales
            periodo:    document.getElementById('filtroPeriodo').value,
            bodega:     document.getElementById('filtroBodega').value,
            categoria:  document.getElementById('filtroCategoria').value,
            fechaDesde: document.getElementById('fechaDesde').value,
            fechaHasta: document.getElementById('fechaHasta').value,

            // Gráficos capturados del canvas
            chartMovimientosTipo:     getChart('chartMovimientosTipo'),
            chartProductosCategoria:  getChart('chartProductosCategoria'),
            chartStockBodega:         getChart('chartStockBodega'),
            chartEvolucionInventario: getChart('chartEvolucionInventario'),
            chartTopProductos:        getChart('chartTopProductos'),
        };

        // 4. Enviar al PHP y recibir el PDF como Blob
        const response = await fetch('../database/reporte_pdf.php', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || 'Error al generar el PDF');
        }

        // 5. Descargar el PDF automáticamente
        const blob = await response.blob();
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `Reporte_Inventario_${new Date().toISOString().slice(0,10)}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

    } catch (err) {
        console.error('Error exportando PDF:', err);
        alert('Error al generar el PDF: ' + err.message);
    } finally {
        // 6. Restaurar botón
        btn.disabled = false;
        btn.innerHTML = textoOriginal;
    }
});

// ============================================
// EXPORTAR EXCEL
// ============================================
function exportarExcel() {
    try {
        const wb = XLSX.utils.book_new();
        
        // Hoja 1: Resumen
        const resumenData = [
            ['REPORTE DE INVENTARIO'],
            ['Fecha:', new Date().toLocaleDateString('es-ES')],
            [],
            ['INDICADORES CLAVE'],
            ['Total de Productos:', datosReportes.kpis.totalProductos],
            ['Valor del Inventario:', datosReportes.kpis.valorInventario],
            ['Total de Movimientos:', datosReportes.kpis.totalMovimientos],
            ['Productos con Stock Bajo:', datosReportes.kpis.productosBajoStock]
        ];
        const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);
        XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');
        
        // Hoja 2: Productos
        const productosData = datosTablaCompletos.map(p => ({
            'ID': p.id,
            'Producto': p.nombre,
            'Categoría': p.categoria || 'Sin categoría',
            'Bodega': p.bodega || 'Sin bodega',
            'Stock Actual': parseFloat(p.stock),
            'Stock Mínimo': parseFloat(p.stock_min),
            'Stock Máximo': parseFloat(p.stock_max),
            'Precio': parseFloat(p.precio),
            'Valor Total': parseFloat(p.stock) * parseFloat(p.precio),
            'Estado': obtenerEstadoTexto(p)
        }));
        const wsProductos = XLSX.utils.json_to_sheet(productosData);
        XLSX.utils.book_append_sheet(wb, wsProductos, 'Productos');
        
        // Hoja 3: Movimientos por Tipo
        const movimientosData = datosReportes.movimientosTipo.map(m => ({
            'Tipo': m.tipo,
            'Cantidad': m.cantidad
        }));
        const wsMovimientos = XLSX.utils.json_to_sheet(movimientosData);
        XLSX.utils.book_append_sheet(wb, wsMovimientos, 'Movimientos');
        
        // Hoja 4: Productos por Categoría
        const categoriasData = datosReportes.productosCategoria.map(c => ({
            'Categoría': c.categoria,
            'Cantidad': c.cantidad
        }));
        const wsCategorias = XLSX.utils.json_to_sheet(categoriasData);
        XLSX.utils.book_append_sheet(wb, wsCategorias, 'Por Categoría');
        
        // Hoja 5: Stock por Bodega
        const bodegasData = datosReportes.stockBodega.map(b => ({
            'Bodega': b.bodega,
            'Stock Total': b.stock
        }));
        const wsBodegas = XLSX.utils.json_to_sheet(bodegasData);
        XLSX.utils.book_append_sheet(wb, wsBodegas, 'Por Bodega');
        
        // Guardar archivo
        XLSX.writeFile(wb, `reporte_inventario_${Date.now()}.xlsx`);
        
        alert('Excel generado correctamente');
    } catch (error) {
        console.error('Error al generar Excel:', error);
        alert('Error al generar el archivo Excel');
    }
}

function obtenerEstadoTexto(producto) {
    const stock = parseFloat(producto.stock);
    const stockMin = parseFloat(producto.stock_min);
    const stockMax = parseFloat(producto.stock_max);
    
    if (stock <= stockMin) return 'Bajo';
    if (stock >= stockMax) return 'Alto';
    return 'Normal';
}

// ============================================
// DESCARGAR GRÁFICO INDIVIDUAL
// ============================================
window.descargarGraficoIndividual = function(chartId) {
    const canvas = document.getElementById(chartId);
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `grafico_${chartId}_${Date.now()}.png`;
    link.href = url;
    link.click();
};

// ============================================
// UTILIDADES
// ============================================
function formatearMoneda(valor) {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0
    }).format(valor);
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