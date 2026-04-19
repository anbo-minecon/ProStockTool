<?php
// ============================================
// API DE REPORTES - BACKEND
// ============================================

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');

// Incluir conexión a la base de datos
require_once 'conexion.php';

// Obtener parámetros de filtros
$periodo = isset($_GET['periodo']) ? $_GET['periodo'] : '30';
$bodega = isset($_GET['bodega']) ? $_GET['bodega'] : '';
$categoria = isset($_GET['categoria']) ? $_GET['categoria'] : '';
$fechaDesde = isset($_GET['fechaDesde']) ? $_GET['fechaDesde'] : '';
$fechaHasta = isset($_GET['fechaHasta']) ? $_GET['fechaHasta'] : '';

try {
    // Calcular rango de fechas
    if ($periodo === 'custom' && $fechaDesde && $fechaHasta) {
        $fechaInicio = $fechaDesde;
        $fechaFin = $fechaHasta;
    } else {
        $dias = intval($periodo);
        $fechaFin = date('Y-m-d');
        $fechaInicio = date('Y-m-d', strtotime("-$dias days"));
    }
    
    // Construir condiciones según filtros
    $whereConditions = [];
    $params = [];

    if ($bodega) {
        $whereConditions[] = "p.bodega_id = ?";
        $params[] = $bodega;
    }

    if ($categoria) {
        $whereConditions[] = "p.categoria_id = ?";
        $params[] = $categoria;
    }

    // cláusula sin prefijo WHERE, se concatenará apropiadamente más abajo
    $whereClause = '';
    if (!empty($whereConditions)) {
        $whereClause = ' AND ' . implode(' AND ', $whereConditions);
    }
    
    // ========================================
    // KPIs - INDICADORES CLAVE
    // ========================================
    
    // Total de productos
    $sqlTotalProductos = "SELECT COUNT(*) as total FROM productos p WHERE 1=1" . $whereClause;
    $stmtTotal = $conexion->prepare($sqlTotalProductos);
    if (!empty($params)) {
        $stmtTotal->execute($params);
    } else {
        $stmtTotal->execute();
    }
    $totalProductos = $stmtTotal->fetch(PDO::FETCH_ASSOC)['total'];
    
    // Valor del inventario
    $sqlValorInventario = "SELECT SUM(p.stock * p.precio) as valor FROM productos p WHERE 1=1" . $whereClause;
    $stmtValor = $conexion->prepare($sqlValorInventario);
    if (!empty($params)) {
        $stmtValor->execute($params);
    } else {
        $stmtValor->execute();
    }
    $valorInventario = floatval($stmtValor->fetch(PDO::FETCH_ASSOC)['valor']);
    
    // Total de movimientos - Datos reales
    $sqlTotalMovimientos = "SELECT COUNT(*) as total FROM movimientos m 
                            WHERE DATE(m.fecha_creacion) BETWEEN ? AND ? 
                            AND m.estado != 'anulado'";
    $stmtMovimientos = $conexion->prepare($sqlTotalMovimientos);
    $stmtMovimientos->execute([$fechaInicio, $fechaFin]);
    $totalMovimientos = intval($stmtMovimientos->fetch(PDO::FETCH_ASSOC)['total']);
    
    // Productos con stock bajo
    $sqlStockBajo = "SELECT COUNT(*) as total FROM productos p 
                     WHERE p.stock <= p.stock_min" . $whereClause;
    $stmtStockBajo = $conexion->prepare($sqlStockBajo);
    if (!empty($params)) {
        $stmtStockBajo->execute($params);
    } else {
        $stmtStockBajo->execute();
    }
    $productosBajoStock = $stmtStockBajo->fetch(PDO::FETCH_ASSOC)['total'];
    
    // Calcular cambios comparando con período anterior
    $diasPeriodo = intval($periodo);
    $fechaInicioPrevio = date('Y-m-d', strtotime("-" . ($diasPeriodo * 2) . " days"));
    $fechaFinPrevio = date('Y-m-d', strtotime("-$diasPeriodo days"));
    
    // Cambio en productos
    $sqlProductosPrevio = "SELECT COALESCE(COUNT(*), 0) as total FROM productos p 
                           WHERE DATE(p.fecha_creacion) BETWEEN ? AND ?" . $whereClause;
    $stmtProductosPrevio = $conexion->prepare($sqlProductosPrevio);
    $paramsPrevio = array_merge([$fechaInicioPrevio, $fechaFinPrevio], $params);
    $stmtProductosPrevio->execute($paramsPrevio);
    $productosAnterior = intval($stmtProductosPrevio->fetch(PDO::FETCH_ASSOC)['total']);
    $cambioProductos = $productosAnterior > 0 ? (($totalProductos - $productosAnterior) / $productosAnterior) * 100 : 0;
    
    // Cambio en valor del inventario
    $sqlValorPrevio = "SELECT COALESCE(SUM(md.subtotal), 0) as valor FROM movimientos m 
                      JOIN movimientos_detalle md ON m.id = md.movimiento_id
                      WHERE DATE(m.fecha_creacion) BETWEEN ? AND ? 
                      AND m.tipo = 'entrada' AND m.estado != 'anulado'";
    $stmtValorPrevio = $conexion->prepare($sqlValorPrevio);
    $stmtValorPrevio->execute([$fechaInicioPrevio, $fechaFinPrevio]);
    $valorAnterior = floatval($stmtValorPrevio->fetch(PDO::FETCH_ASSOC)['valor']);
    $cambioValor = $valorAnterior > 0 ? (($valorInventario - $valorAnterior) / $valorAnterior) * 100 : 0;
    
    // Cambio en movimientos
    $sqlMovimientosPrevio = "SELECT COUNT(*) as total FROM movimientos m 
                            WHERE DATE(m.fecha_creacion) BETWEEN ? AND ? 
                            AND m.estado != 'anulado'";
    $stmtMovimientosPrevio = $conexion->prepare($sqlMovimientosPrevio);
    $stmtMovimientosPrevio->execute([$fechaInicioPrevio, $fechaFinPrevio]);
    $movimientosAnterior = intval($stmtMovimientosPrevio->fetch(PDO::FETCH_ASSOC)['total']);
    $cambioMovimientos = $movimientosAnterior > 0 ? (($totalMovimientos - $movimientosAnterior) / $movimientosAnterior) * 100 : 0;
    
    $kpis = [
        'totalProductos' => intval($totalProductos),
        'valorInventario' => $valorInventario,
        'totalMovimientos' => $totalMovimientos,
        'productosBajoStock' => intval($productosBajoStock),
        'cambioProductos' => $cambioProductos,
        'cambioValor' => $cambioValor,
        'cambioMovimientos' => $cambioMovimientos
    ];
    
    // ========================================
    // MOVIMIENTOS POR TIPO - Datos Reales
    // ========================================
    $sqlMovimientosTipo = "SELECT 
                            m.tipo,
                            COUNT(*) as cantidad
                            FROM movimientos m
                            WHERE DATE(m.fecha_creacion) BETWEEN ? AND ?
                            AND m.estado != 'anulado'
                            GROUP BY m.tipo
                            ORDER BY cantidad DESC";
    $stmtMovimientosTipo = $conexion->prepare($sqlMovimientosTipo);
    $stmtMovimientosTipo->execute([$fechaInicio, $fechaFin]);
    $movimientosTipo = $stmtMovimientosTipo->fetchAll(PDO::FETCH_ASSOC);
    
    // Si no hay datos, mostrar estructura vacía
    if (empty($movimientosTipo)) {
        $movimientosTipo = [];
    }
    
    // ========================================
    // PRODUCTOS POR CATEGORÍA
    // ========================================
    $sqlProductosCategoria = "
        SELECT 
            COALESCE(c.nombre, 'Sin categoría') as categoria,
            COUNT(p.id) as cantidad
        FROM productos p
        LEFT JOIN categorias c ON p.categoria_id = c.id
        WHERE 1=1" . $whereClause . "
        GROUP BY p.categoria_id, c.nombre
        ORDER BY cantidad DESC
        LIMIT 10
    ";
    $stmtCategoria = $conexion->prepare($sqlProductosCategoria);
    if (!empty($params)) {
        $stmtCategoria->execute($params);
    } else {
        $stmtCategoria->execute();
    }
    $productosCategoria = $stmtCategoria->fetchAll(PDO::FETCH_ASSOC);
    
    // ========================================
    // EVOLUCIÓN DEL INVENTARIO - Datos Reales
    // ========================================
    $evolucionInventario = [];
    $diasEvolucion = min(intval($periodo), 30);
    
    for ($i = $diasEvolucion - 1; $i >= 0; $i--) {
        $fecha = date('Y-m-d', strtotime("-$i days"));
        
        // Contar entradas
        $sqlEntradas = "SELECT COUNT(*) as total FROM movimientos m
                       WHERE DATE(m.fecha_creacion) = ? 
                       AND m.tipo = 'entrada'
                       AND m.estado != 'anulado'";
        $stmtEntradas = $conexion->prepare($sqlEntradas);
        $stmtEntradas->execute([$fecha]);
        $entradas = intval($stmtEntradas->fetch(PDO::FETCH_ASSOC)['total']);
        
        // Contar salidas
        $sqlSalidas = "SELECT COUNT(*) as total FROM movimientos m
                      WHERE DATE(m.fecha_creacion) = ? 
                      AND m.tipo = 'salida'
                      AND m.estado != 'anulado'";
        $stmtSalidas = $conexion->prepare($sqlSalidas);
        $stmtSalidas->execute([$fecha]);
        $salidas = intval($stmtSalidas->fetch(PDO::FETCH_ASSOC)['total']);
        
        $evolucionInventario[] = [
            'fecha' => date('d/m', strtotime($fecha)),
            'entradas' => $entradas,
            'salidas' => $salidas
        ];
    }
    
    // ========================================
    // STOCK POR BODEGA
    // ========================================
    $sqlStockBodega = "
        SELECT 
            COALESCE(b.nombre, 'Sin bodega') as bodega,
            SUM(p.stock) as stock
        FROM productos p
        LEFT JOIN bodegas b ON p.bodega_id = b.id
        WHERE 1=1" . $whereClause . "
        GROUP BY p.bodega_id, b.nombre
        ORDER BY stock DESC
    ";
    $stmtBodega = $conexion->prepare($sqlStockBodega);
    if (!empty($params)) {
        $stmtBodega->execute($params);
    } else {
        $stmtBodega->execute();
    }
    $stockBodega = $stmtBodega->fetchAll(PDO::FETCH_ASSOC);
    
    // ========================================
    // TOP 10 PRODUCTOS POR MOVIMIENTO - Datos Reales
    // ========================================
    $sqlTopProductos = "
        SELECT 
            p.nombre,
            COUNT(md.id) as movimientos
        FROM movimientos m
        JOIN movimientos_detalle md ON m.id = md.movimiento_id
        JOIN productos p ON md.producto_id = p.id
        WHERE DATE(m.fecha_creacion) BETWEEN ? AND ?
        AND m.estado != 'anulado'
        GROUP BY md.producto_id, p.nombre
        ORDER BY movimientos DESC
        LIMIT 10
    ";
    $stmtTop = $conexion->prepare($sqlTopProductos);
    $stmtTop->execute([$fechaInicio, $fechaFin]);
    $topProductos = $stmtTop->fetchAll(PDO::FETCH_ASSOC);
    
    // ========================================
    // LISTADO COMPLETO DE PRODUCTOS
    // ========================================
    $sqlProductos = "
        SELECT 
            p.id,
            p.nombre,
            COALESCE(c.nombre, 'Sin categoría') as categoria,
            COALESCE(b.nombre, 'Sin bodega') as bodega,
            p.stock,
            p.stock_min,
            p.stock_max,
            p.precio,
            COALESCE(pr.nombre, 'Sin proveedor') as proveedor,
            COALESCE(pm.nombre, 'Sin estado') as estado
        FROM productos p
        LEFT JOIN categorias c ON p.categoria_id = c.id
        LEFT JOIN bodegas b ON p.bodega_id = b.id
        LEFT JOIN proveedores pr ON p.proveedor_id = pr.id
        LEFT JOIN parametros pm ON p.estado_id = pm.id
        WHERE 1=1" . $whereClause . "
        ORDER BY p.nombre
    ";
    $stmtProductos = $conexion->prepare($sqlProductos);
    if (!empty($params)) {
        $stmtProductos->execute($params);
    } else {
        $stmtProductos->execute();
    }
    $productos = $stmtProductos->fetchAll(PDO::FETCH_ASSOC);
    
    // ========================================
    // RESPUESTA JSON
    // ========================================
    $response = [
        'success' => true,
        'data' => [
            'kpis' => $kpis,
            'movimientosTipo' => $movimientosTipo,
            'productosCategoria' => $productosCategoria,
            'evolucionInventario' => $evolucionInventario,
            'stockBodega' => $stockBodega,
            'topProductos' => $topProductos,
            'productos' => $productos
        ],
        'filtros' => [
            'periodo' => $periodo,
            'fechaInicio' => $fechaInicio,
            'fechaFin' => $fechaFin,
            'bodega' => $bodega,
            'categoria' => $categoria
        ]
    ];
    
    echo json_encode($response);
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error en la base de datos: ' . $e->getMessage()
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error: ' . $e->getMessage()
    ]);
}
?>