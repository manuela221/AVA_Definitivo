'use strict';

(() => {
  const root = document.getElementById('ava-app');
  const apiUrl = 'AVA.php/api.php';
  const currentPage = location.pathname.split('/').pop().toLowerCase();
  const isDedicatedPage = currentPage === 'comunidad.html' || currentPage === 'companero.html';
  const roleNames = {
    volunteer: 'Persona voluntaria',
    senior: 'Persona mayor',
    disability: 'Persona con discapacidad',
    admin: 'Administrador'
  };
  const educationNames = {
    bachiller: 'Bachiller',
    universitario_tecnico: 'Estudiante universitario o técnico',
    profesional: 'Profesional graduado',
    otro: 'Otro'
  };
  const assignmentStateNames = {
    pending: 'Pendiente de respuesta',
    accepted_one: 'Aceptado por una persona',
    accepted_both: 'Aceptado por ambas personas'
  };
  let csrf = '';
  let accountData = null;
  let communityRole = 'volunteer';
  let adminSection = 'volunteer';
  let communityUsers = [];
  let assignmentTarget = null;
  let eligibleVolunteers = [];
  let inboxData = null;
  let inboxLoading = false;
  let notice = '';
  let refreshTimer = null;

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character]);
  }

  async function request(action, options = {}) {
    const method = options.method || 'GET';
    const headers = { 'Accept': 'application/json' };
    if (method !== 'GET') {
      headers['Content-Type'] = 'application/json';
      headers['X-CSRF-Token'] = csrf;
    }
    const response = await fetch(`${apiUrl}?action=${encodeURIComponent(action)}${options.query || ''}`, {
      method,
      credentials: 'same-origin',
      headers,
      body: method === 'GET' ? undefined : JSON.stringify(options.body || {})
    });
    const data = await response.json();
    if (!response.ok) {
      if (response.status === 401 && !['login', 'admin-login'].includes(action)) {
        accountData = null;
        stopRefresh();
        if (isDedicatedPage) {
          window.location.replace('Inscripciones.html');
        } else {
          renderHome();
        }
      }
      throw new Error(data.message || 'No se pudo completar la solicitud.');
    }
    if (data.csrf) csrf = data.csrf;
    return data;
  }

  function setNotice(message, isError = false) {
    notice = message;
    const element = root.querySelector('.ava-notice');
    if (element) {
      element.textContent = message;
      element.classList.toggle('is-error', isError);
      element.hidden = !message;
    }
  }

  function noticeMarkup() {
    return `<p class="ava-notice" role="status" aria-live="polite"${notice ? '' : ' hidden'}>${escapeHtml(notice)}</p>`;
  }

  function stopRefresh() {
    window.clearInterval(refreshTimer);
    refreshTimer = null;
  }

  function startRefresh() {
    stopRefresh();
    refreshTimer = window.setInterval(async () => {
      if (!accountData || accountData.account.role === 'admin' || document.hidden) return;
      try {
        accountData = await request('me');
        renderUserHome();
      } catch (error) {
        setNotice(error.message, true);
      }
    }, 15000);
  }

  function renderHome() {
    stopRefresh();
    accountData = null;
    notice = '';
    root.innerHTML = `
      <section class="ava-shell">
        <div class="ava-intro">
          <p class="ava-eyebrow">Compañía que crea comunidad</p>
          <h1>¿Cómo formarás parte de AVA?</h1>
          <p>Un espacio para compartir tiempo, apoyo y momentos especiales.</p>
        </div>
        <div class="ava-choice-grid" aria-label="Elige cómo unirte a AVA">
          <button class="ava-choice" type="button" data-view="register" data-role="volunteer">
            <span class="ava-choice-icon" aria-hidden="true">🙋‍♀️</span>
            <span><strong>Crear cuenta para personas voluntarias</strong><small>Comparte tu tiempo y compañía.</small></span>
            <span class="ava-arrow" aria-hidden="true">›</span>
          </button>
          <button class="ava-choice" type="button" data-view="register" data-role="senior">
            <span class="ava-choice-icon" aria-hidden="true">👵</span>
            <span><strong>Crear cuenta para una persona mayor</strong><small>Encuentra compañía y apoyo.</small></span>
            <span class="ava-arrow" aria-hidden="true">›</span>
          </button>
          <button class="ava-choice" type="button" data-view="register" data-role="disability">
            <span class="ava-choice-icon" aria-hidden="true">🫶</span>
            <span><strong>Crear cuenta para una persona con discapacidad</strong><small>Conecta con nuevas personas.</small></span>
            <span class="ava-arrow" aria-hidden="true">›</span>
          </button>
          <button class="ava-choice ava-choice-admin" type="button" data-view="admin-login">
            <span class="ava-choice-icon" aria-hidden="true">🔐</span>
            <span><strong>Entrar como administrador</strong><small>Acceso exclusivo de gestión.</small></span>
            <span class="ava-arrow" aria-hidden="true">›</span>
          </button>
        </div>
        <div class="ava-login-link">
          <span>¿Ya tienes una cuenta?</span>
          <button class="ava-text-button" type="button" data-view="login">Inicia sesión aquí</button>
        </div>
      </section>`;
  }

  function field(label, name, type = 'text', options = {}) {
    const id = `ava-${name}`;
    if (options.choices) {
      return `<div class="ava-field"><label for="${id}">${label}</label><select id="${id}" name="${name}" ${options.required === false ? '' : 'required'}>${options.choices.map(([value, text]) => `<option value="${escapeHtml(value)}">${escapeHtml(text)}</option>`).join('')}</select></div>`;
    }
    if (type === 'textarea') {
      return `<div class="ava-field"><label for="${id}">${label}</label><textarea id="${id}" name="${name}" rows="${options.rows || 3}" maxlength="${options.maxlength || 1000}" placeholder="${escapeHtml(options.placeholder || '')}" ${options.required === false ? '' : 'required'}></textarea></div>`;
    }
    if (type === 'password') {
      return `<div class="ava-field"><label for="${id}">${label}</label><div class="ava-password-control"><input id="${id}" name="${name}" type="password" maxlength="${options.maxlength || 72}" autocomplete="${options.autocomplete || 'new-password'}" ${options.minlength ? `minlength="${options.minlength}"` : ''} ${options.required === false ? '' : 'required'}><button class="ava-password-toggle" type="button" data-toggle-password="${id}" aria-label="Mostrar contraseña" aria-pressed="false">Mostrar</button></div>${options.hint ? `<small class="ava-field-hint">${escapeHtml(options.hint)}</small>` : ''}</div>`;
    }
    return `<div class="ava-field"><label for="${id}">${label}</label><input id="${id}" name="${name}" type="${type}" ${options.min !== undefined ? `min="${options.min}"` : ''} ${options.max !== undefined ? `max="${options.max}"` : ''} ${options.pattern ? `pattern="${options.pattern}"` : ''} ${options.inputmode ? `inputmode="${options.inputmode}"` : ''} maxlength="${options.maxlength || 255}" autocomplete="${options.autocomplete || 'on'}" ${options.required === false ? '' : 'required'}></div>`;
  }

  function reasonChoices(role) {
    return role === 'senior'
      ? [['', 'Selecciona una opción'], ['Deseo tener compañía', 'Deseo tener compañía'], ['Necesito compañía para asistir a citas médicas', 'Necesito compañía para asistir a citas médicas'], ['Quiero compartir tiempo con otras personas', 'Quiero compartir tiempo con otras personas'], ['Necesito acompañamiento en algunas actividades', 'Necesito acompañamiento en algunas actividades'], ['otro', 'Otro']]
      : [['', 'Selecciona una opción'], ['Deseo tener compañía', 'Deseo tener compañía'], ['Necesito acompañamiento en algunas actividades', 'Necesito acompañamiento en algunas actividades'], ['Quiero conocer a otras personas', 'Quiero conocer a otras personas'], ['Necesito apoyo para asistir a citas o realizar actividades', 'Necesito apoyo para asistir a citas o realizar actividades'], ['otro', 'Otro']];
  }

  function renderRegister(role) {
    if (!['volunteer', 'senior', 'disability'].includes(role)) {
      renderHome();
      return;
    }
    const title = role === 'volunteer'
      ? 'Registro de voluntariado'
      : `Registro de ${role === 'senior' ? 'una persona mayor' : 'una persona con discapacidad'}`;
    const roleFields = role === 'volunteer'
      ? `${field('Nivel educativo', 'education', 'select', { choices: [['', 'Selecciona una opción'], ['bachiller', 'Bachiller'], ['universitario_tecnico', 'Estudiante universitario o técnico'], ['profesional', 'Profesional graduado'], ['otro', 'Otro']] })}
         <div class="ava-field ava-career-field" hidden>${field('¿Qué carrera cursas o cursaste?', 'career', 'text', { maxlength: 120, required: false, placeholder: 'Escribe el nombre de la carrera.' })}</div>
         ${field('¿Con qué grupo te gustaría colaborar?', 'volunteer_interest', 'select', { choices: [['', 'Selecciona una opción'], ['senior', 'Personas mayores'], ['disability', 'Personas con discapacidad'], ['any', 'Cualquiera de los dos grupos']] })}`
      : `${field(role === 'senior' ? '¿Tienes alguna enfermedad o condición médica?' : '¿Qué condición o discapacidad tienes?', 'medical_conditions', 'textarea', { placeholder: role === 'senior' ? 'Escribe las condiciones que deseas compartir o indica que no tienes ninguna.' : 'Escribe la condición que deseas compartir.' })}
         ${field('¿Por qué decidiste unirte a AVA?', 'reason', 'select', { choices: reasonChoices(role) })}
         <div class="ava-field ava-other-reason" hidden>${field('Cuéntanos el motivo', 'reason_detail', 'textarea', { required: false, placeholder: 'Escribe tu respuesta.', maxlength: 1000 })}</div>`;
    root.innerHTML = `
      <section class="ava-shell ava-form-shell">
        <button class="ava-back" type="button" data-view="home">← Volver a opciones</button>
        <div class="ava-intro ava-intro-compact">
          <p class="ava-eyebrow">Te damos la bienvenida a AVA</p>
          <h1>${escapeHtml(title)}</h1>
          <p>Completa tus datos para que podamos conocerte y encontrar una persona compatible contigo.</p>
        </div>
        ${noticeMarkup()}
        <form class="ava-form" data-form="register" data-role="${role}">
          <div class="ava-form-grid">
            ${field('Nombre completo', 'full_name', 'text', { maxlength: 180, autocomplete: 'name' })}
            ${field('Número de cédula', 'cedula', 'text', { maxlength: 20, pattern: '[0-9]{5,20}', inputmode: 'numeric', autocomplete: 'off' })}
            ${field('Correo electrónico', 'email', 'email', { maxlength: 254, autocomplete: 'email' })}
            ${field('Número de teléfono', 'phone', 'tel', { maxlength: 40, autocomplete: 'tel' })}
            ${field('Edad', 'age', 'number', { min: 18, max: 120, autocomplete: 'off' })}
            ${roleFields}
            ${field('Crear contraseña', 'password', 'password', { minlength: 12, hint: 'Mínimo 12 caracteres. No la compartas con nadie.' })}
            ${field('Confirmar contraseña', 'password_confirmation', 'password', { minlength: 12 })}
          </div>
          <button class="ava-primary-button" type="submit">Crear mi cuenta</button>
        </form>
        <p class="ava-form-footnote">¿Ya tienes una cuenta? <button class="ava-text-button" type="button" data-view="login">Inicia sesión</button></p>
      </section>`;
  }

  function renderLogin() {
    root.innerHTML = `
      <section class="ava-shell ava-auth-shell">
        <button class="ava-back" type="button" data-view="home">← Volver a opciones</button>
        <div class="ava-intro ava-intro-compact">
          <p class="ava-eyebrow">Qué bueno tenerte de vuelta</p>
          <h1>Inicia sesión en AVA</h1>
          <p>Ingresa la cédula y la contraseña de tu cuenta.</p>
        </div>
        ${noticeMarkup()}
        <form class="ava-form ava-form-single" data-form="login">
          ${field('Número de cédula', 'cedula', 'text', { maxlength: 20, pattern: '[0-9]{5,20}', inputmode: 'numeric', autocomplete: 'off' })}
          ${field('Contraseña', 'password', 'password', { autocomplete: 'current-password' })}
          <button class="ava-primary-button" type="submit">Entrar a mi cuenta</button>
        </form>
      </section>`;
  }

  function renderAdminLogin() {
    root.innerHTML = `
      <section class="ava-shell ava-auth-shell">
        <button class="ava-back" type="button" data-view="home">← Volver a opciones</button>
        <div class="ava-intro ava-intro-compact">
          <p class="ava-eyebrow">Acceso privado</p>
          <h1>Administración de AVA</h1>
          <p>Esta cuenta es creada y administrada de forma privada por el equipo de AVA.</p>
        </div>
        ${noticeMarkup()}
        <form class="ava-form ava-form-single" data-form="admin-login">
          ${field('Usuario administrador', 'username', 'text', { maxlength: 100, autocomplete: 'username' })}
          ${field('Contraseña', 'password', 'password', { maxlength: 1024, autocomplete: 'current-password' })}
          <button class="ava-primary-button" type="submit">Iniciar sesión en COMUNIDAD</button>
        </form>
      </section>`;
  }

  function roleLabel(role) {
    return roleNames[role] || 'Usuario AVA';
  }

  function profileDetails(user) {
    const details = [
      ['Nombre', user.full_name],
      ['Tipo de usuario', roleLabel(user.role)],
      ['Edad', `${user.age} años`],
      ['Cédula', user.cedula],
      ['Correo electrónico', user.email],
      ['Teléfono', user.phone]
    ];
    if (user.role === 'volunteer') {
      details.push(['Nivel educativo', educationNames[user.education] || user.education]);
    if (user.career) details.push(['Carrera', user.career]);
    details.push(['Población de interés', user.volunteer_interest === 'any' ? 'Cualquiera de los dos grupos' : roleLabel(user.volunteer_interest)]);
    } else {
      details.push([user.role === 'senior' ? 'Condición médica' : 'Condición o discapacidad', user.medical_conditions]);
      details.push(['Motivo para unirse', user.reason]);
    }
    return `<dl class="ava-details">${details.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value || '—')}</dd></div>`).join('')}</dl>`;
  }

  function renderUserHome() {
    if (!accountData || !accountData.account) return renderHome();
    const user = accountData.account;
    const assignment = accountData.assignment;
    let companionContent = `<div class="ava-searching"><span class="ava-search-icon" aria-hidden="true">♡</span><h2>¡Estamos buscando una conexión para ti!</h2><p>El equipo de AVA pronto encontrará a una persona con quien puedas compartir momentos especiales. Gracias por ser parte de AVA.</p></div>`;
    if (assignment) {
      const partner = assignment.partner || {};
      if (assignment.state === 'accepted_both') {
        companionContent = `<div class="ava-match-card ava-match-success"><p class="ava-eyebrow">¡Conexión AVA!</p><h2>¡Ya tienes una conexión en AVA!</h2><p>Ambas personas aceptaron la propuesta. Ahora pueden comunicarse y organizar un encuentro.</p><div class="ava-partner-summary"><strong>${escapeHtml(partner.name)}</strong><span>${escapeHtml(roleLabel(partner.role))} · ${escapeHtml(partner.age)} años</span><a class="ava-contact-link" href="tel:${escapeHtml(partner.phone)}">Llamar: ${escapeHtml(partner.phone)}</a></div></div>`;
      } else {
        const isVolunteer = user.role === 'volunteer';
        const acceptedByMe = isVolunteer ? Number(assignment.volunteer_accepted) === 1 : Number(assignment.participant_accepted) === 1;
        const actions = acceptedByMe
          ? `<p class="ava-waiting">Ya aceptaste la propuesta. Estamos esperando la respuesta de la otra persona.</p>`
          : `<div class="ava-match-actions"><button class="ava-primary-button" type="button" data-response="accept" data-assignment="${escapeHtml(assignment.id)}">Aceptar propuesta</button><button class="ava-secondary-button" type="button" data-response="reject" data-assignment="${escapeHtml(assignment.id)}">Rechazar propuesta</button></div>`;
        companionContent = `<article class="ava-match-card"><p class="ava-eyebrow">Nueva propuesta de acompañamiento</p><h2>Tienes una nueva propuesta</h2><div class="ava-partner-summary"><strong>${escapeHtml(partner.name)}</strong><span>${escapeHtml(roleLabel(partner.role))} · ${escapeHtml(partner.age)} años</span><p>Una persona de la comunidad AVA que desea compartir tiempo y crear una conexión positiva.</p></div>${actions}<p class="ava-privacy-note">Los datos de contacto solo se comparten cuando ambas personas aceptan.</p></article>`;
      }
    }
    const notifications = (accountData.notifications || []).map(item => `<li><span>${escapeHtml(item.message)}</span><time>${escapeHtml(item.created_at)}</time></li>`).join('');
    root.innerHTML = `
      <section class="ava-shell ava-account-shell">
        <div class="ava-account-header"><div><p class="ava-eyebrow">Tu espacio en AVA</p><h1>MI ESPACIO</h1><p>Hola, ${escapeHtml(user.full_name)}. Aquí puedes consultar tu proceso y tu perfil.</p></div><button class="ava-secondary-button" type="button" data-action="logout">Cerrar sesión</button></div>
        ${noticeMarkup()}
        <div class="ava-user-grid">
          <section class="ava-panel ava-companion-panel"><h2>Tu proceso de acompañamiento</h2>${companionContent}</section>
          <section class="ava-panel"><h2>Mi perfil</h2>${profileDetails(user)}</section>
        </div>
        ${notifications ? `<section class="ava-panel ava-notifications"><h2>Notificaciones</h2><ul>${notifications}</ul></section>` : ''}
      </section>`;
  }

  function userCard(user) {
    const assigned = Boolean(user.active_assignment_id);
    const rows = [
      ['Correo electrónico', user.email],
      ['Edad', `${user.age} años`],
      ['Cédula', user.cedula],
      ['Teléfono', user.phone]
    ];
    if (user.role === 'volunteer') {
      rows.push(['Nivel educativo', educationNames[user.education] || user.education]);
      if (user.career) rows.push(['Carrera', user.career]);
      rows.push(['Población de interés', user.volunteer_interest === 'any' ? 'Cualquiera de los dos grupos' : roleLabel(user.volunteer_interest)]);
    } else {
      rows.push([user.role === 'senior' ? 'Condición médica' : 'Condición o discapacidad', user.medical_conditions]);
      rows.push(['Motivo para unirse', user.reason]);
    }
    return `<article class="ava-community-card">
      <div class="ava-community-card-heading"><div><span class="ava-role-pill">${escapeHtml(roleLabel(user.role))}</span><h3>${escapeHtml(user.full_name)}</h3></div>${assigned ? `<span class="ava-assigned-pill">${escapeHtml(assignmentStateNames[user.active_assignment_state] || 'Asignación activa')}</span>` : ''}</div>
      <dl class="ava-details ava-admin-details">${rows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value || '—')}</dd></div>`).join('')}</dl>
      ${user.role !== 'volunteer' ? `<button class="ava-primary-button ava-small-button" type="button" data-find-volunteers="${escapeHtml(user.id)}" ${assigned ? 'disabled' : ''}>${assigned ? 'Ya tiene una asignación' : 'Buscar personas voluntarias compatibles'}</button>` : ''}
      ${assignmentTarget === Number(user.id) ? eligibleMarkup() : ''}
    </article>`;
  }

  function eligibleMarkup() {
    if (!eligibleVolunteers.length) return '<p class="ava-empty-state">No hay personas voluntarias compatibles disponibles por ahora.</p>';
    return `<div class="ava-eligible-list"><h4>Personas voluntarias disponibles</h4>${eligibleVolunteers.map(volunteer => `<div class="ava-eligible-person"><div><strong>${escapeHtml(volunteer.full_name)}</strong><span>${escapeHtml(volunteer.age)} años · ${escapeHtml(educationNames[volunteer.education] || volunteer.education)}${volunteer.career ? ` · ${escapeHtml(volunteer.career)}` : ''}</span></div><button class="ava-secondary-button ava-small-button" type="button" data-assign-volunteer="${escapeHtml(volunteer.id)}">Proponer acompañamiento</button></div>`).join('')}</div>`;
  }

  function gmailReplyUrl(email) {
    return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}`;
  }

  function inboxCard(type, entry) {
    const isContact = type === 'contact';
    const email = String(entry.correo || '').trim();
    const name = isContact ? `${entry.nombre || ''} ${entry.apellido || ''}`.trim() : '';
    return `<article class="ava-inbox-card">
      <div class="ava-inbox-card-heading">
        <div><span class="ava-role-pill">${isContact ? 'Contáctanos' : 'Comentario'}</span><h3>${escapeHtml(name || email || 'Mensaje sin correo')}</h3></div>
      </div>
      <p class="ava-inbox-email">${escapeHtml(email || 'Sin correo válido para responder')}</p>
      ${isContact && entry.telefono ? `<p class="ava-inbox-email">Teléfono: ${escapeHtml(entry.telefono)}</p>` : ''}
      <p class="ava-inbox-message">${escapeHtml(entry.mensaje || '')}</p>
      ${/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? `
        <a class="ava-primary-button ava-small-button" href="${escapeHtml(gmailReplyUrl(email))}" target="_blank" rel="noopener noreferrer">Responder por correo</a>
      ` : ''}
    </article>`;
  }

  function inboxMarkup(type) {
    if (inboxLoading) return '<p class="ava-empty-state">Cargando mensajes…</p>';
    if (!inboxData) return '<p class="ava-empty-state">No se pudo cargar la bandeja. Intenta actualizarla.</p>';
    const entries = Array.isArray(inboxData[type]) ? inboxData[type] : [];
    const kind = type === 'contacts' ? 'contact' : 'comment';
    const emptyMessage = type === 'contacts' ? 'No hay mensajes de contacto.' : 'No hay comentarios recibidos.';
    const messages = entries.map(entry => inboxCard(kind, entry)).join('');
    return messages ? `<div class="ava-inbox-list">${messages}</div>` : `<p class="ava-empty-state">${emptyMessage}</p>`;
  }

  function renderAdminHome() {
    const role = communityRole;
    const users = communityUsers.map(userCard).join('');
    const isMessagesSection = adminSection === 'contacts' || adminSection === 'comments';
    const sectionTitle = adminSection === 'contacts' ? 'Mensajes de contacto' : 'Comentarios';
    const sectionContent = isMessagesSection
      ? `<section class="ava-panel ava-inbox-panel">
          <div class="ava-list-heading">
            <div><h2>${sectionTitle}</h2><p>Escribe tu respuesta y envíala directamente desde AVA.</p></div>
            <button class="ava-secondary-button ava-small-button" type="button" data-action="refresh-inbox" ${inboxLoading ? 'disabled' : ''}>Actualizar</button>
          </div>
          ${inboxMarkup(adminSection)}
        </section>`
      : `<section class="ava-panel">
          <div class="ava-list-heading"><div><h2>${escapeHtml(role === 'volunteer' ? 'Personas voluntarias' : role === 'senior' ? 'Personas mayores' : 'Personas con discapacidad')}</h2><p>${communityUsers.length} registro${communityUsers.length === 1 ? '' : 's'}</p></div></div>
          ${users ? `<div class="ava-community-list">${users}</div>` : '<p class="ava-empty-state">Todavía no hay registros en este apartado.</p>'}
        </section>`;
    root.innerHTML = `
      <section class="ava-shell ava-admin-shell">
        <div class="ava-account-header"><div><p class="ava-eyebrow">Gestión de la comunidad AVA</p><h1>COMUNIDAD</h1><p>Consulta los perfiles y crea asignaciones compatibles.</p></div><button class="ava-secondary-button" type="button" data-action="logout">Cerrar sesión</button></div>
        ${noticeMarkup()}
        <nav class="ava-community-tabs" aria-label="Apartados de administración">
          <button type="button" data-admin-section="volunteer" class="${adminSection === 'volunteer' ? 'is-selected' : ''}">Personas voluntarias</button>
          <button type="button" data-admin-section="senior" class="${adminSection === 'senior' ? 'is-selected' : ''}">Personas mayores</button>
          <button type="button" data-admin-section="disability" class="${adminSection === 'disability' ? 'is-selected' : ''}">Personas con discapacidad</button>
          <button type="button" data-admin-section="contacts" class="${adminSection === 'contacts' ? 'is-selected' : ''}">Contáctanos</button>
          <button type="button" data-admin-section="comments" class="${adminSection === 'comments' ? 'is-selected' : ''}">Comentarios</button>
        </nav>
        ${sectionContent}
      </section>`;
  }

  async function loadInbox() {
    inboxLoading = true;
    renderAdminHome();
    try {
      inboxData = await request('inbox');
    } finally {
      inboxLoading = false;
      if (accountData && accountData.account && accountData.account.role === 'admin') renderAdminHome();
    }
  }

  async function loadCommunity(role = communityRole) {
    communityRole = role;
    adminSection = role;
    assignmentTarget = null;
    eligibleVolunteers = [];
    const data = await request('community', { query: `&role=${encodeURIComponent(role)}` });
    communityUsers = data.users || [];
    renderAdminHome();
  }

  async function loadCurrentAccount() {
    accountData = await request('me');
    if (accountData.account.role === 'admin') {
      if (currentPage !== 'comunidad.html') {
        window.location.assign('Comunidad.html');
        return;
      }
      await loadCommunity('volunteer');
      await loadInbox();
    } else {
      if (currentPage !== 'companero.html') {
        window.location.assign('Companero.html');
        return;
      }
      renderUserHome();
      startRefresh();
    }
  }

  function switchView(view, role) {
    notice = '';
    if (view === 'home') renderHome();
    else if (view === 'register') renderRegister(role);
    else if (view === 'login') renderLogin();
    else if (view === 'admin-login') renderAdminLogin();
  }

  root.addEventListener('change', event => {
    if (event.target.name === 'education') {
      const container = root.querySelector('.ava-career-field');
      const input = container && container.querySelector('[name="career"]');
      if (container && input) {
        const showCareer = ['universitario_tecnico', 'profesional'].includes(event.target.value);
        container.hidden = !showCareer;
        input.required = showCareer;
      }
    }
    if (event.target.name === 'reason') {
      const container = root.querySelector('.ava-other-reason');
      const input = container && container.querySelector('[name="reason_detail"]');
      if (container && input) {
        const showOther = event.target.value === 'otro';
        container.hidden = !showOther;
        input.required = showOther;
      }
    }
  });

  root.addEventListener('submit', async event => {
    const form = event.target.closest('form[data-form]');
    if (!form) return;
    event.preventDefault();
    const formData = new FormData(form);
    const values = Object.fromEntries(formData.entries());
    const kind = form.dataset.form;
    try {
      if (kind === 'register') {
        if (values.password !== values.password_confirmation) {
          setNotice('Las contraseñas no coinciden.', true);
          return;
        }
        values.role = form.dataset.role;
        if (values.reason !== undefined) values.reason_choice = values.reason;
        const result = await request('register', { method: 'POST', body: values });
        switchView('login');
        setNotice(result.message);
      } else if (kind === 'login') {
        await request('login', { method: 'POST', body: values });
        await loadCurrentAccount();
      } else if (kind === 'admin-login') {
        await request('admin-login', { method: 'POST', body: values });
        await loadCurrentAccount();
      }
    } catch (error) {
      setNotice(error.message, true);
    }
  });

  root.addEventListener('click', async event => {
    const toggleButton = event.target.closest('[data-toggle-password]');
    if (toggleButton) {
      const input = document.getElementById(toggleButton.dataset.togglePassword);
      if (input) {
        const showPassword = input.type === 'password';
        input.type = showPassword ? 'text' : 'password';
        toggleButton.textContent = showPassword ? 'Ocultar' : 'Mostrar';
        toggleButton.setAttribute('aria-label', showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña');
        toggleButton.setAttribute('aria-pressed', String(showPassword));
      }
      return;
    }
    const viewButton = event.target.closest('[data-view]');
    if (viewButton) {
      switchView(viewButton.dataset.view, viewButton.dataset.role);
      return;
    }
    const adminSectionButton = event.target.closest('[data-admin-section]');
    if (adminSectionButton) {
      const section = adminSectionButton.dataset.adminSection;
      if (['contacts', 'comments'].includes(section)) {
        adminSection = section;
        renderAdminHome();
      } else if (['volunteer', 'senior', 'disability'].includes(section)) {
        try {
          notice = '';
          await loadCommunity(section);
        } catch (error) {
          setNotice(error.message, true);
        }
      }
      return;
    }
    const findButton = event.target.closest('[data-find-volunteers]');
    if (findButton) {
      try {
        assignmentTarget = Number(findButton.dataset.findVolunteers);
        const data = await request('eligible-volunteers', { query: `&participant_id=${encodeURIComponent(assignmentTarget)}` });
        eligibleVolunteers = data.volunteers || [];
        renderAdminHome();
      } catch (error) {
        assignmentTarget = null;
        setNotice(error.message, true);
      }
      return;
    }
    const assignButton = event.target.closest('[data-assign-volunteer]');
    if (assignButton) {
      try {
        const result = await request('assign', {
          method: 'POST',
          body: { participant_id: assignmentTarget, volunteer_id: Number(assignButton.dataset.assignVolunteer) }
        });
        assignmentTarget = null;
        eligibleVolunteers = [];
        await loadCommunity(communityRole);
        setNotice(result.message);
      } catch (error) {
        setNotice(error.message, true);
      }
      return;
    }
    const responseButton = event.target.closest('[data-response]');
    if (responseButton) {
      responseButton.disabled = true;
      try {
        const result = await request('respond', {
          method: 'POST',
          body: { assignment_id: Number(responseButton.dataset.assignment), response: responseButton.dataset.response }
        });
        accountData = await request('me');
        renderUserHome();
        setNotice(result.message);
      } catch (error) {
        responseButton.disabled = false;
        setNotice(error.message, true);
      }
      return;
    }
    const logoutButton = event.target.closest('[data-action="logout"]');
    if (logoutButton) {
      try {
        await request('logout', { method: 'POST' });
        accountData = null;
        assignmentTarget = null;
        window.location.assign('Inscripciones.html');
      } catch (error) {
        setNotice(error.message, true);
      }
      return;
    }
    const refreshInboxButton = event.target.closest('[data-action="refresh-inbox"]');
    if (refreshInboxButton) {
      try {
        notice = '';
        await loadInbox();
      } catch (error) {
        setNotice(error.message, true);
      }
      return;
    }
  });

  async function initialize() {
    renderHome();
    try {
      const csrfResponse = await fetch(`${apiUrl}?action=csrf`, { credentials: 'same-origin', headers: { 'Accept': 'application/json' } });
      if (!csrfResponse.ok) throw new Error('El servidor no pudo iniciar una sesión segura.');
      const csrfData = await csrfResponse.json();
      if (!csrfData || typeof csrfData.csrf !== 'string' || csrfData.csrf === '') {
        throw new Error('El servidor no devolvió un token de sesión válido.');
      }
      csrf = csrfData.csrf;
      try {
        await loadCurrentAccount();
      } catch (error) {
        if (!error.message.includes('Inicia sesión')) setNotice(error.message, true);
      }
    } catch (error) {
      setNotice('Puedes ver las opciones de inscripción, pero para crear cuentas e iniciar sesión necesitas abrir el sitio desde un servidor con PHP y configurar la base de datos de AVA.', true);
    }
  }

  initialize();
})();
