# ProStockTool — Guía de Despliegue

## Estructura de archivos a colocar

```
Pro-Stock-Tool/           ← Raíz del proyecto
├── .env                  ← Variables de entorno (PRIVADO)
├── .htaccess             ← Configuración Apache raíz
├── .gitignore
├── config.php            ← Cargador de configuración central
├── database/
│   ├── .htaccess         ← Protección del directorio API
│   ├── conexion.php      ← Conexión BD actualizada
│   └── ...resto de PHPs
├── uploads/
│   ├── .htaccess         ← Protección de uploads
│   └── perfil/           ← Imágenes de perfil (crear vacío)
├── vendor/
│   └── fpdf186/
│       └── fpdf.php
├── views/                ← HTMLs del sistema
├── styles/               ← CSS
├── controllers/          ← JS
├── index.html            ← Landing page pública
└── login.html
```

---

## Pasos de despliegue

### 1. Configurar el `.env`

```bash
cp .env.example .env   # o copiar manualmente
nano .env              # editar con los valores reales
```

Valores que DEBES cambiar obligatoriamente:

| Variable       | Qué poner                                        |
|----------------|--------------------------------------------------|
| `APP_URL`      | URL completa del sitio (sin barra final)         |
| `APP_ENV`      | `production` (nunca `development` en producción) |
| `APP_SECRET`   | Cadena aleatoria de 64 caracteres                |
| `DB_HOST`      | Host de tu BD (ej: `localhost` o IP del servidor)|
| `DB_NAME`      | Nombre de la base de datos                       |
| `DB_USER`      | Usuario de MySQL                                 |
| `DB_PASS`      | Contraseña de MySQL                              |
| `SESSION_SECURE`| `true` si el sitio tiene HTTPS                  |
| `APP_DEBUG`    | `false` siempre en producción                    |

Generar una `APP_SECRET` segura:
```bash
php -r "echo bin2hex(random_bytes(32)) . PHP_EOL;"
```

---

### 2. Crear carpeta de uploads

```bash
mkdir -p uploads/perfil
chmod 755 uploads/
chmod 755 uploads/perfil/
```

---

### 3. Colocar los `.htaccess` en su lugar

| Archivo generado         | Destino final                   |
|--------------------------|---------------------------------|
| `.htaccess`              | `Pro-Stock-Tool/.htaccess`      |
| `database_.htaccess`     | `Pro-Stock-Tool/database/.htaccess` |
| `uploads_.htaccess`      | `Pro-Stock-Tool/uploads/.htaccess`  |

---

### 4. Importar la base de datos

```bash
mysql -u USUARIO -p NOMBRE_BD < base.sql
```

O desde phpMyAdmin: Importar → seleccionar `base.sql`.

---

### 5. Verificar permisos de archivos (Linux/cPanel)

```bash
# Archivos PHP: lectura (no ejecución directa de shell)
find . -name "*.php" -exec chmod 644 {} \;

# Directorios: lectura + ejecución de directorio
find . -type d -exec chmod 755 {} \;

# Carpeta uploads: escritura para el servidor web
chmod 755 uploads/perfil/

# .env: solo el propietario puede leerlo
chmod 600 .env
```

---

### 6. Configuración de PHP requerida

Verificar en `php.ini` o `phpMyAdmin > Variables`:

```ini
upload_max_filesize = 2M
post_max_size       = 8M
max_execution_time  = 60
memory_limit        = 128M
session.gc_maxlifetime = 86400
```

---

### 7. Habilitar módulos Apache necesarios

```bash
sudo a2enmod rewrite headers expires deflate
sudo systemctl restart apache2
```

---

### 8. Verificar AllowOverride en Apache

En `/etc/apache2/apache2.conf` o en el VirtualHost:

```apache
<Directory /var/www/html/Pro-Stock-Tool>
    AllowOverride All
    Require all granted
</Directory>
```

---

### 9. Activar HTTPS (producción)

Con Let's Encrypt + Certbot:
```bash
sudo certbot --apache -d tudominio.com
```

Luego en `.env`:
```
SESSION_SECURE=true
APP_URL=https://tudominio.com
```

Y descomentar en `.htaccess`:
```apache
RewriteCond %{HTTPS} off
RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
```

---

### 10. Eliminar archivos de desarrollo antes de subir

```bash
rm -f test-conexion.php
rm -f base.sql             # Mover a lugar seguro fuera del webroot
rm -f *.md                 # Documentación no debe ser pública
```

---

## Checklist de seguridad final

- [ ] `.env` no es accesible desde el navegador (prueba: `tudominio.com/.env` debe dar 403)
- [ ] `config.php` no es accesible desde el navegador (prueba: `tudominio.com/config.php` debe dar 403)
- [ ] `base.sql` no está en el webroot o está bloqueado
- [ ] `test-conexion.php` eliminado
- [ ] `APP_DEBUG=false` en `.env`
- [ ] `APP_ENV=production` en `.env`
- [ ] `SESSION_SECURE=true` si hay HTTPS
- [ ] Contraseña de BD no es vacía en producción
- [ ] Carpeta `uploads/` no ejecuta PHP
- [ ] Directorio listing deshabilitado (`Options -Indexes`)
