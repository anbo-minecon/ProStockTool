<?php
// ============================================================
//  REPORTE PDF – Pro Stock Tool  (con gráficos)
//  Requiere FPDF en: /vendor/fpdf186/fpdf.php
// ============================================================

require_once __DIR__ . '/../vendor/fpdf186/fpdf.php';
require_once __DIR__ . '/../database/conexion.php';
require_once __DIR__ . '/../config.php';

// Validar que tenemos conexión PDO disponible
if (!$conexion || !($conexion instanceof PDO)) {
    header('Content-Type: application/json; charset=utf-8');
    http_response_code(500);
    echo json_encode(['error' => 'PDO no disponible. Contacta al administrador.']);
    exit;
}

// ── Leer parámetros (JSON via POST) ─────────────────────────
$input      = json_decode(file_get_contents('php://input'), true) ?? [];
$periodo    = $input['periodo']    ?? '30';
$bodega     = isset($input['bodega']) && !empty($input['bodega']) ? intval($input['bodega']) : null;
$categoria  = isset($input['categoria']) && !empty($input['categoria']) ? intval($input['categoria']) : null;
$fechaDesde = $input['fechaDesde'] ?? '';
$fechaHasta = $input['fechaHasta'] ?? '';

// Imágenes base64 de los gráficos Chart.js
$chartMovTipo   = $input['chartMovimientosTipo']     ?? null;
$chartCategoria = $input['chartProductosCategoria']  ?? null;
$chartBodega    = $input['chartStockBodega']         ?? null;
$chartEvolucion = $input['chartEvolucionInventario'] ?? null;
$chartTop       = $input['chartTopProductos']        ?? null;

// ── Rango de fechas ─────────────────────────────────────────
if ($periodo === 'custom' && $fechaDesde && $fechaHasta) {
    $fechaInicio = $fechaDesde;
    $fechaFin    = $fechaHasta;
} else {
    $dias        = max(1, intval($periodo));
    $fechaFin    = date('Y-m-d');
    $fechaInicio = date('Y-m-d', strtotime("-$dias days"));
}

// ── Parámetros de PDO ────────────────────────────────────────
$params = [];
$whereExtra = '';

if ($bodega) {
    $whereExtra .= ' AND p.bodega_id = :bodega_id';
    $params[':bodega_id'] = $bodega;
}
if ($categoria) {
    $whereExtra .= ' AND p.categoria_id = :categoria_id';
    $params[':categoria_id'] = $categoria;
}

// ── Helper: base64 → PNG temporal ───────────────────────────
function base64ToTempPng($b64) {
    if (!$b64) return null;
    $data = base64_decode(preg_replace('/^data:image\/\w+;base64,/', '', $b64));
    if (!$data) return null;
    $f = tempnam(sys_get_temp_dir(), 'pst_') . '.png';
    file_put_contents($f, $data);
    return $f;
}

$tmpMovTipo   = base64ToTempPng($chartMovTipo);
$tmpCategoria = base64ToTempPng($chartCategoria);
$tmpBodega    = base64ToTempPng($chartBodega);
$tmpEvolucion = base64ToTempPng($chartEvolucion);
$tmpTop       = base64ToTempPng($chartTop);


// ─────────────────────────────────────────────────────────────
//  CLASE PDF
// ─────────────────────────────────────────────────────────────
class ReportePDF extends FPDF {

    private $empresa  = 'Pro Stock Tool';
    private $subtitulo;
    private $fechaCorte;
    private $periodoStr;

    public function __construct($subtitulo, $fechaCorte, $periodoStr) {
        parent::__construct('P', 'mm', 'A4');
        $this->subtitulo  = $subtitulo;
        $this->fechaCorte = $fechaCorte;
        $this->periodoStr = $periodoStr;
    }

    function Header() {
        $this->SetFillColor(192, 57, 43);
        $this->Rect(0, 0, 210, 38, 'F');

        $this->SetTextColor(255, 255, 255);
        $this->SetFont('Helvetica', 'B', 22);
        $this->SetXY(14, 8);
        $this->Cell(120, 10, $this->empresa, 0, 1, 'L');

        $this->SetFont('Helvetica', '', 12);
        $this->SetTextColor(255, 205, 210);
        $this->SetXY(14, 20);
        $this->Cell(120, 6, $this->subtitulo, 0, 0, 'L');

        $this->SetFont('Helvetica', '', 8);
        $this->SetXY(140, 10);
        $this->Cell(56, 5, 'Fecha de corte: ' . $this->fechaCorte, 0, 1, 'R');
        $this->SetXY(140, 16);
        $this->Cell(56, 5, 'Periodo: ' . $this->periodoStr, 0, 1, 'R');
        $this->SetXY(140, 28);
        $this->SetTextColor(239, 154, 154);
        $this->SetFont('Helvetica', '', 7);
        $this->Cell(56, 5, 'PRO STOCK TOOL', 0, 1, 'R');

        $this->SetY(44);
    }

    function Footer() {
        $this->SetY(-14);
        $this->SetDrawColor(192, 57, 43);
        $this->SetLineWidth(0.4);
        $this->Line(14, $this->GetY(), 196, $this->GetY());
        $this->SetFont('Helvetica', '', 7);
        $this->SetTextColor(180, 180, 180);
        $this->Cell(0, 8,
            'PRO STOCK TOOL  |  Generado el ' . date('d/m/Y H:i') .
            '  |  Pagina ' . $this->PageNo() . '/{nb}',
            0, 0, 'C');
    }

    function SeccionTitulo($texto) {
        $this->Ln(3);
        $this->SetFont('Helvetica', 'B', 12);
        $this->SetTextColor(146, 43, 33);
        $this->Cell(0, 8, $texto, 0, 1, 'L');
        $this->SetDrawColor(192, 57, 43);
        $this->SetLineWidth(0.5);
        $this->Line(14, $this->GetY(), 196, $this->GetY());
        $this->Ln(3);
    }

    function KpiCard($x, $y, $label, $valor, $nota, $positivo) {
        $w = 43; $h = 26;
        $this->SetDrawColor(220, 220, 220);
        $this->SetLineWidth(0.3);
        $this->SetFillColor(255, 255, 255);
        $this->Rect($x, $y, $w, $h, 'FD');
        // Acento superior
        $this->SetFillColor(192, 57, 43);
        $this->Rect($x, $y, $w, 1.5, 'F');

        $this->SetFont('Helvetica', '', 7);
        $this->SetTextColor(120, 120, 120);
        $this->SetXY($x + 2, $y + 3);
        $this->Cell($w - 4, 4, $label, 0, 1, 'L');

        $this->SetFont('Helvetica', 'B', 14);
        $this->SetTextColor(40, 40, 40);
        $this->SetXY($x + 2, $y + 8);
        $this->Cell($w - 4, 9, $valor, 0, 1, 'L');

        $this->SetFont('Helvetica', '', 6.5);
        if ($positivo) {
            $this->SetTextColor(39, 174, 96);
        } else {
            $this->SetTextColor(192, 57, 43);
        }
        $this->SetXY($x + 2, $y + 19);
        $this->Cell($w - 4, 5, $nota, 0, 1, 'L');
    }

    function TablaConCabecera($headers, $widths, $rows, $aligns = []) {
        $this->SetFillColor(192, 57, 43);
        $this->SetTextColor(255, 255, 255);
        $this->SetFont('Helvetica', 'B', 8);
        $this->SetLineWidth(0.2);
        $this->SetDrawColor(160, 40, 30);
        foreach ($headers as $i => $h) {
            $a = $aligns[$i] ?? 'C';
            $this->Cell($widths[$i], 7, $h, 1, 0, $a, true);
        }
        $this->Ln();

        $this->SetFont('Helvetica', '', 8);
        $fill = false;
        foreach ($rows as $row) {
            $this->SetFillColor($fill ? 248 : 255, $fill ? 248 : 255, $fill ? 248 : 255);
            $this->SetTextColor(60, 60, 60);
            foreach ($row as $i => $cell) {
                $a = $aligns[$i] ?? 'L';
                $this->Cell($widths[$i], 6, $cell, 1, 0, $a, true);
            }
            $this->Ln();
            $fill = !$fill;
        }
    }

    // Insertar un gráfico centrado
    function InsertarGrafico($tmpFile, $ancho = 182, $alto = 72) {
        if ($tmpFile && file_exists($tmpFile)) {
            $x = (210 - $ancho) / 2;
            $this->Image($tmpFile, $x, $this->GetY(), $ancho, $alto, 'PNG');
            $this->SetY($this->GetY() + $alto + 3);
        } else {
            $this->SetFillColor(252, 252, 252);
            $this->SetDrawColor(210, 210, 210);
            $this->Rect(14, $this->GetY(), 182, 18, 'FD');
            $this->SetFont('Helvetica', 'I', 8.5);
            $this->SetTextColor(160, 160, 160);
            $this->SetXY(14, $this->GetY() + 5);
            $this->Cell(182, 8, 'Grafico no disponible (usar boton Exportar PDF del dashboard)', 0, 1, 'C');
            $this->Ln(2);
        }
    }

    // Dos gráficos lado a lado
    function InsertarDosGraficos($tmpFile1, $tmpFile2, $alto = 70) {
        $ancho = 88;
        $y = $this->GetY();
        if ($tmpFile1 && file_exists($tmpFile1)) {
            $this->Image($tmpFile1, 14, $y, $ancho, $alto, 'PNG');
        } else {
            $this->SetFillColor(252,252,252); $this->SetDrawColor(210,210,210);
            $this->Rect(14, $y, $ancho, $alto, 'FD');
        }
        if ($tmpFile2 && file_exists($tmpFile2)) {
            $this->Image($tmpFile2, 108, $y, $ancho, $alto, 'PNG');
        } else {
            $this->SetFillColor(252,252,252); $this->SetDrawColor(210,210,210);
            $this->Rect(108, $y, $ancho, $alto, 'FD');
        }
        $this->SetY($y + $alto + 3);
    }
}


// ─────────────────────────────────────────────────────────────
//  CONSULTAS
// ─────────────────────────────────────────────────────────────
try {
    // Total de productos
    $q = $conexion->prepare("SELECT COUNT(*) as t FROM productos p WHERE 1=1 $whereExtra");
    $q->execute($params);
    $totalProductos = intval($q->fetch(PDO::FETCH_ASSOC)['t'] ?? 0);

    // Valor del inventario
    $q = $conexion->prepare("SELECT COALESCE(SUM(p.stock * p.precio),0) as v FROM productos p WHERE 1=1 $whereExtra");
    $q->execute($params);
    $valorInventario = floatval($q->fetch(PDO::FETCH_ASSOC)['v'] ?? 0);

    // Total de movimientos
    $paramsMov = array_merge($params, [':fechaInicio' => $fechaInicio, ':fechaFin' => $fechaFin]);
    $q = $conexion->prepare("SELECT COUNT(*) as t FROM movimientos m
                             WHERE DATE(m.fecha_creacion) BETWEEN :fechaInicio AND :fechaFin
                             AND m.estado != 'anulado'");
    $q->execute($paramsMov);
    $totalMovimientos = intval($q->fetch(PDO::FETCH_ASSOC)['t'] ?? 0);

    // Productos bajo stock
    $q = $conexion->prepare("SELECT COUNT(*) as t FROM productos p
                             WHERE p.stock <= p.stock_min $whereExtra");
    $q->execute($params);
    $productosBajoStock = intval($q->fetch(PDO::FETCH_ASSOC)['t'] ?? 0);

    // Movimientos por tipo
    $q = $conexion->prepare("SELECT m.tipo, COUNT(*) as cantidad
                             FROM movimientos m
                             WHERE DATE(m.fecha_creacion) BETWEEN :fechaInicio AND :fechaFin
                             AND m.estado != 'anulado'
                             GROUP BY m.tipo ORDER BY cantidad DESC");
    $q->execute($paramsMov);
    $movimientosTipo = $q->fetchAll(PDO::FETCH_ASSOC) ?: [];

    // Productos por categoría
    $q = $conexion->prepare("SELECT COALESCE(c.nombre,'Sin categoria') as cat,
                                    COUNT(p.id) as cantidad
                             FROM productos p
                             LEFT JOIN categorias c ON p.categoria_id = c.id
                             WHERE 1=1 $whereExtra
                             GROUP BY p.categoria_id, c.nombre
                             ORDER BY cantidad DESC LIMIT 10");
    $q->execute($params);
    $productosCategoria = $q->fetchAll(PDO::FETCH_ASSOC) ?: [];

    // Stock por bodega
    $q = $conexion->prepare("SELECT COALESCE(b.nombre,'Sin bodega') as bodega,
                                    COALESCE(SUM(p.stock),0) as stock
                             FROM productos p
                             LEFT JOIN bodegas b ON p.bodega_id = b.id
                             WHERE 1=1 $whereExtra
                             GROUP BY p.bodega_id, b.nombre ORDER BY stock DESC");
    $q->execute($params);
    $stockBodega = $q->fetchAll(PDO::FETCH_ASSOC) ?: [];

    // Top 10 productos
    $q = $conexion->prepare("SELECT p.nombre, COUNT(md.id) as movimientos
                             FROM movimientos m
                             JOIN movimientos_detalle md ON m.id = md.movimiento_id
                             JOIN productos p ON md.producto_id = p.id
                             WHERE DATE(m.fecha_creacion) BETWEEN :fechaInicio AND :fechaFin
                             AND m.estado != 'anulado'
                             GROUP BY md.producto_id, p.nombre
                             ORDER BY movimientos DESC LIMIT 10");
    $q->execute($paramsMov);
    $topProductos = $q->fetchAll(PDO::FETCH_ASSOC) ?: [];

} catch (PDOException $e) {
    error_log('[ProStockTool] reporte_pdf.php PDO Error: ' . $e->getMessage());
    header('Content-Type: application/json; charset=utf-8');
    http_response_code(500);
    echo json_encode(['error' => 'Error al generar el reporte. Contacta al administrador.']);
    exit;
}


// ─────────────────────────────────────────────────────────────
//  CONSTRUIR PDF
// ─────────────────────────────────────────────────────────────
$periodoLabel = $periodo === 'custom'
    ? "Del $fechaInicio al $fechaFin"
    : "Ultimos $periodo dias";

$pdf = new ReportePDF('Reporte de Inventario', date('d/m/Y'), $periodoLabel);
$pdf->AliasNbPages();
$pdf->AddPage();
$pdf->SetMargins(14, 44, 14);
$pdf->SetAutoPageBreak(true, 20);


// ─── PÁGINA 1 ────────────────────────────────────────────────

// KPIs
$pdf->SeccionTitulo('Indicadores Clave de Rendimiento');
$kpis = [
    ['Total Productos',   number_format($totalProductos),
     'Productos registrados', true],
    ['Valor Inventario',  '$'.number_format($valorInventario,0,',','.'),
     'Valor total en stock', true],
    ['Movimientos',       number_format($totalMovimientos),
     'En el periodo seleccionado', true],
    ['Stock Bajo',        number_format($productosBajoStock),
     'Requieren reposicion', false],
];
$kpiX = 14; $kpiY = $pdf->GetY();
foreach ($kpis as $i => $k) {
    $pdf->KpiCard($kpiX + $i * 45, $kpiY, $k[0], $k[1], $k[2], $k[3]);
}
$pdf->SetY($kpiY + 30);

// Gráficos composición (2 en fila)
$pdf->SeccionTitulo('Composicion del Inventario');
$pdf->InsertarDosGraficos($tmpMovTipo, $tmpCategoria, 72);

// Evolución (ancho completo)
$pdf->SeccionTitulo('Evolucion del Inventario');
$pdf->InsertarGrafico($tmpEvolucion, 182, 70);


// ─── PÁGINA 2 ────────────────────────────────────────────────
$pdf->AddPage();

// Stock por bodega
$pdf->SeccionTitulo('Stock por Bodega');
$pdf->InsertarGrafico($tmpBodega, 182, 70);
if (!empty($stockBodega)) {
    $totalStock = array_sum(array_column($stockBodega, 'stock'));
    $rows = array_map(function($r) use ($totalStock) {
        $pct = $totalStock > 0 ? number_format($r['stock']/$totalStock*100,1).'%' : '0%';
        return [$r['bodega'], number_format($r['stock']), $pct];
    }, $stockBodega);
    $pdf->TablaConCabecera(['Bodega','Stock Total','% del Total'],[80,40,42],$rows,['L','C','C']);
}

$pdf->Ln(4);

// Top 10 productos
$pdf->SeccionTitulo('Top 10 Productos por Movimiento');
$pdf->InsertarGrafico($tmpTop, 182, 78);
if (!empty($topProductos)) {
    $totalTopMovs = array_sum(array_column($topProductos, 'movimientos'));
    $rows = [];
    foreach ($topProductos as $i => $p) {
        $pct = $totalTopMovs > 0 ? number_format($p['movimientos']/$totalTopMovs*100,1).'%' : '0%';
        $rows[] = [$i+1, $p['nombre'], number_format($p['movimientos']), $pct];
    }
    $pdf->TablaConCabecera(['#','Producto','Movimientos','Participacion'],
                           [10,110,30,32],$rows,['C','L','C','C']);
}


// ─── PÁGINA 3: Tablas de detalle ──────────────────────────────
$pdf->AddPage();

if (!empty($movimientosTipo)) {
    $pdf->SeccionTitulo('Movimientos por Tipo');
    $totalMov = array_sum(array_column($movimientosTipo, 'cantidad'));
    $rows = array_map(function($r) use ($totalMov) {
        $pct = $totalMov > 0 ? number_format($r['cantidad']/$totalMov*100,1).'%' : '0%';
        return [ucfirst($r['tipo']), number_format($r['cantidad']), $pct];
    }, $movimientosTipo);
    $pdf->TablaConCabecera(['Tipo de Movimiento','Cantidad','% del Total'],[80,40,42],$rows,['L','C','C']);
}

$pdf->Ln(5);

if (!empty($productosCategoria)) {
    $pdf->SeccionTitulo('Productos por Categoria');
    $totalCat = array_sum(array_column($productosCategoria, 'cantidad'));
    $rows = array_map(function($r) use ($totalCat) {
        $pct = $totalCat > 0 ? number_format($r['cantidad']/$totalCat*100,1).'%' : '0%';
        return [$r['cat'], number_format($r['cantidad']), $pct];
    }, $productosCategoria);
    $pdf->TablaConCabecera(['Categoria','Cantidad','% del Total'],[80,40,42],$rows,['L','C','C']);
}


// ── Limpiar temporales ────────────────────────────────────────
foreach ([$tmpMovTipo,$tmpCategoria,$tmpBodega,$tmpEvolucion,$tmpTop] as $f) {
    if ($f && file_exists($f)) {
        @unlink($f);
    }
}

// ── Enviar PDF ────────────────────────────────────────────────
try {
    $filename = 'Reporte_Inventario_' . date('Ymd_His') . '.pdf';
    $pdf->Output('D', $filename);
} catch (Exception $e) {
    error_log('[ProStockTool] reporte_pdf.php Output Error: ' . $e->getMessage());
    header('Content-Type: application/json; charset=utf-8');
    http_response_code(500);
    echo json_encode(['error' => 'Error al generar el PDF.']);
}
?>