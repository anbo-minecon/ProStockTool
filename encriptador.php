<?php
$hash = '';
$password = '';
$error = '';
$copied = false;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $password = $_POST['password'] ?? '';

    if (strlen($password) < 1) {
        $error = 'Por favor ingresa una contraseña.';
    } else {
        // Encriptación con BCrypt (PASSWORD_DEFAULT)
        $hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
    }
}
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Encriptador de Contraseñas</title>
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #1a1a2e, #16213e, #0f3460);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }

        .card {
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 20px;
            padding: 40px;
            width: 100%;
            max-width: 520px;
            box-shadow: 0 25px 50px rgba(0, 0, 0, 0.4);
        }

        .icon {
            text-align: center;
            font-size: 48px;
            margin-bottom: 10px;
        }

        h1 {
            text-align: center;
            color: #ffffff;
            font-size: 1.6rem;
            margin-bottom: 6px;
        }

        .subtitle {
            text-align: center;
            color: rgba(255,255,255,0.45);
            font-size: 0.85rem;
            margin-bottom: 30px;
        }

        label {
            display: block;
            color: rgba(255,255,255,0.75);
            font-size: 0.85rem;
            font-weight: 600;
            margin-bottom: 8px;
            letter-spacing: 0.5px;
            text-transform: uppercase;
        }

        .input-wrap {
            position: relative;
            margin-bottom: 20px;
        }

        .input-wrap input {
            width: 100%;
            padding: 14px 48px 14px 16px;
            background: rgba(255,255,255,0.07);
            border: 1px solid rgba(255,255,255,0.15);
            border-radius: 10px;
            color: #fff;
            font-size: 1rem;
            outline: none;
            transition: border-color 0.3s;
        }

        .input-wrap input:focus {
            border-color: #e94560;
        }

        .toggle-btn {
            position: absolute;
            right: 14px;
            top: 50%;
            transform: translateY(-50%);
            background: none;
            border: none;
            cursor: pointer;
            font-size: 1.2rem;
            color: rgba(255,255,255,0.5);
            padding: 0;
            line-height: 1;
        }

        .toggle-btn:hover { color: #fff; }

        .submit-btn {
            width: 100%;
            padding: 14px;
            background: linear-gradient(135deg, #e94560, #c0392b);
            border: none;
            border-radius: 10px;
            color: #fff;
            font-size: 1rem;
            font-weight: 700;
            cursor: pointer;
            letter-spacing: 0.5px;
            transition: opacity 0.2s, transform 0.1s;
        }

        .submit-btn:hover { opacity: 0.9; transform: translateY(-1px); }
        .submit-btn:active { transform: translateY(0); }

        .error {
            background: rgba(233, 69, 96, 0.15);
            border: 1px solid rgba(233, 69, 96, 0.4);
            border-radius: 10px;
            color: #ff8a9a;
            padding: 12px 16px;
            margin-bottom: 20px;
            font-size: 0.9rem;
        }

        .result-box {
            margin-top: 28px;
            background: rgba(0,0,0,0.3);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 12px;
            padding: 20px;
        }

        .result-box h3 {
            color: #4ecca3;
            font-size: 0.85rem;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 12px;
        }

        .hash-text {
            color: #a8ffda;
            font-family: 'Courier New', monospace;
            font-size: 0.78rem;
            word-break: break-all;
            line-height: 1.6;
            background: rgba(78,204,163,0.07);
            padding: 12px;
            border-radius: 8px;
            margin-bottom: 14px;
        }

        .copy-btn {
            width: 100%;
            padding: 10px;
            background: rgba(78, 204, 163, 0.15);
            border: 1px solid rgba(78, 204, 163, 0.4);
            border-radius: 8px;
            color: #4ecca3;
            font-size: 0.9rem;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.2s;
        }

        .copy-btn:hover { background: rgba(78,204,163,0.28); }

        .info-badges {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
            margin-top: 20px;
        }

        .badge {
            background: rgba(255,255,255,0.06);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 20px;
            padding: 4px 12px;
            font-size: 0.75rem;
            color: rgba(255,255,255,0.5);
        }

        .badge span { color: rgba(255,255,255,0.8); font-weight: 600; }
    </style>
</head>
<body>
<div class="card">
    <div class="icon">🔐</div>
    <h1>Encriptador de Contraseñas</h1>
    <p class="subtitle">Genera un hash seguro con BCrypt</p>

    <?php if ($error): ?>
        <div class="error">⚠️ <?= htmlspecialchars($error) ?></div>
    <?php endif; ?>

    <form method="POST">
        <label for="password">Contraseña</label>
        <div class="input-wrap">
            <input type="password" id="password" name="password"
                   placeholder="Escribe tu contraseña aquí..."
                   value="<?= htmlspecialchars($password) ?>" autocomplete="off">
            <button type="button" class="toggle-btn" onclick="togglePass()">👁</button>
        </div>

        <button type="submit" class="submit-btn">🔒 Encriptar Contraseña</button>
    </form>

    <?php if ($hash): ?>
        <div class="result-box">
            <h3>✅ Hash Generado</h3>
            <div class="hash-text" id="hashOutput"><?= htmlspecialchars($hash) ?></div>
            <button class="copy-btn" onclick="copyHash()">📋 Copiar Hash</button>

            <div class="info-badges">
                <div class="badge">Algoritmo: <span>BCrypt</span></div>
                <div class="badge">Cost factor: <span>12</span></div>
                <div class="badge">Longitud: <span><?= strlen($hash) ?> chars</span></div>
            </div>
        </div>
    <?php endif; ?>
</div>

<script>
    function togglePass() {
        const input = document.getElementById('password');
        const btn = document.querySelector('.toggle-btn');
        if (input.type === 'password') {
            input.type = 'text';
            btn.textContent = '🙈';
        } else {
            input.type = 'password';
            btn.textContent = '👁';
        }
    }

    function copyHash() {
        const text = document.getElementById('hashOutput').textContent;
        navigator.clipboard.writeText(text).then(() => {
            const btn = document.querySelector('.copy-btn');
            btn.textContent = '✅ ¡Copiado!';
            setTimeout(() => btn.textContent = '📋 Copiar Hash', 2000);
        });
    }
</script>
</body>
</html>
