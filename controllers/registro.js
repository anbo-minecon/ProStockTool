(function(){
  const form = document.getElementById('form-registro');
  const email = document.getElementById('email-Registro');
  const nombre = document.getElementById('Nombre-Registro');
  const identidad = document.getElementById('N-identidad-Registro');
  const password = document.getElementById('Contraseña-Registro');
  const alerta = document.getElementById('alerta');
  const alertaMsg = document.getElementById('alerta-mensaje');
  const cerrarAlertaBtn = document.querySelector('.cerrar-alerta-registro');
  const togglePwd = document.querySelector('.toggle-password');

  function showAlert(msg, type='info'){
    alertaMsg.textContent = msg;
    alerta.removeAttribute('hidden');
    setTimeout(() => { alerta.setAttribute('hidden',''); }, 4000);
  }

  if (cerrarAlertaBtn){
    cerrarAlertaBtn.addEventListener('click', () => alerta.setAttribute('hidden',''));
  }

  if (togglePwd && password){
    togglePwd.addEventListener('click', () => {
      const isText = password.getAttribute('type') === 'text';
      password.setAttribute('type', isText ? 'password' : 'text');
      togglePwd.classList.toggle('active', !isText);
    });
  }

  function validEmail(v){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
  function validIdentidad(v){ return /^[0-9]{6,20}$/.test(v); }

  if (form){
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        email: email.value.trim(),
        nombre: nombre.value.trim(),
        identidad: identidad.value.trim(),
        contrasena: password.value
      };
      if (!validEmail(payload.email)) { showAlert('Email inválido','error'); email.focus(); return; }
      if (payload.nombre.length < 2) { showAlert('Nombre demasiado corto','error'); nombre.focus(); return; }
      if (!validIdentidad(payload.identidad)) { showAlert('N° Identidad inválido','error'); identidad.focus(); return; }
      if ((payload.contrasena||'').length < 6) { showAlert('La contraseña debe tener mínimo 6 caracteres','error'); password.focus(); return; }

      try{
        const resp = await fetch('/database/registro.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await resp.json();
        if (data && data.success){
          showAlert(data.message || 'Registro exitoso','success');
          form.reset();
        } else {
          showAlert((data && data.error) || 'No se pudo registrar','error');
        }
      }catch(err){
        showAlert('Error de conexión','error');
      }
    });
  }
})();
