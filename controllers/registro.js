// Toggle between login and register
const viewWrapper = document.getElementById('viewWrapper');
const showRegister = document.getElementById('showRegister');
const showLogin = document.getElementById('showLogin');

showRegister.addEventListener('click', (e) => {
    e.preventDefault();
    viewWrapper.classList.add('flipped');
});

showLogin.addEventListener('click', (e) => {
    e.preventDefault();
    viewWrapper.classList.remove('flipped');
});

// Toggle password visibility
document.querySelectorAll('.toggle-password').forEach(button => {
    button.addEventListener('click', () => {
        const targetId = button.getAttribute('data-target');
        const input = document.getElementById(targetId);
        const type = input.getAttribute('type');
        const svg = button.querySelector('svg');
        
        if (type === 'password') {
            input.setAttribute('type', 'text');
            svg.innerHTML = '<path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/>';
        } else {
            input.setAttribute('type', 'password');
            svg.innerHTML = '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>';
        }
    });
});

// Alert system
function showAlert(message, type = 'info') {
    const alert = document.getElementById('alert');
    const alertMessage = document.getElementById('alertMessage');
    
    alert.className = `alert ${type}`;
    alertMessage.textContent = message;
    alert.classList.remove('hidden');
    
    setTimeout(() => {
        alert.classList.add('hidden');
    }, 4000);
}

document.getElementById('alertClose').addEventListener('click', () => {
    document.getElementById('alert').classList.add('hidden');
});

// Validation functions
function validEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validIdentity(identity) {
    return /^[0-9]{6,20}$/.test(identity);
}

// Login form
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!validEmail(email)) {
        showAlert('Email inválido', 'error');
        return;
    }

    if (password.length < 6) {
        showAlert('Contraseña muy corta', 'error');
        return;
    }

    try {
        const response = await fetch('./database/login.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ email, contrasena: password })
        });

        const data = await response.json();

        if (data && data.success) {
            showAlert('Inicio de sesión exitoso', 'success');
            localStorage.setItem('user', JSON.stringify(data.data));
            
            setTimeout(() => {
                window.location.href = './view/index.html';
            }, 1500);
        } else {
            showAlert(data.error || 'Credenciales incorrectas', 'error');
        }
    } catch (err) {
        console.error('Error:', err);
        showAlert('Error de conexión', 'error');
    }
});

// Register form
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('registerEmail').value.trim();
    const nombre = document.getElementById('registerName').value.trim();
    const identidad = document.getElementById('registerIdentity').value.trim();
    const contrasena = document.getElementById('registerPassword').value;

    if (!validEmail(email)) {
        showAlert('Email inválido', 'error');
        return;
    }

    if (nombre.length < 2) {
        showAlert('Nombre demasiado corto', 'error');
        return;
    }

    if (!validIdentity(identidad)) {
        showAlert('N° Identidad inválido (6-20 dígitos)', 'error');
        return;
    }

    if (contrasena.length < 6) {
        showAlert('La contraseña debe tener mínimo 6 caracteres', 'error');
        return;
    }

    try {
        const response = await fetch('./database/registro.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ email, nombre, identidad, contrasena })
        });

        const data = await response.json();

        if (data && data.success) {
            showAlert('Registro exitoso. Redirigiendo...', 'success');
            document.getElementById('registerForm').reset();
            
            setTimeout(() => {
                viewWrapper.classList.remove('flipped');
                showAlert('Ahora puedes iniciar sesión', 'info');
            }, 2000);
        } else {
            showAlert(data.error || 'No se pudo registrar', 'error');
        }
    } catch (err) {
        console.error('Error:', err);
        showAlert('Error de conexión', 'error');
    }
});