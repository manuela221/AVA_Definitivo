'use strict';

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initHeroCarousel();
  initScrollReveal();
  initServiceCards();
  initFAQ();
  initComments();
  initParallax();
  initCursorGlow();
  initWhatsAppFloat();
  initReadingProgress();
  initBackToTop();
});


/* ─────────────────────────────────────────────────────────────
   1. NAVBAR — encoge + hamburger
───────────────────────────────────────────────────────────── */
function initNavbar() {
  const headers = document.querySelectorAll('.header-ava, .header, .main-header');

  headers.forEach(header => {
    header.style.position = 'sticky';
    header.style.top = '0';
    header.style.zIndex = '1000';
  });

  document.querySelectorAll('.nav-list, .navbar').forEach(nav => {
    const header = nav.closest('.header-ava, .header, .main-header');
    if (!header || header.querySelector('.hamburger')) return;

    const btn = document.createElement('button');
    btn.className = 'hamburger';
    btn.setAttribute('aria-label', 'Menú');
    btn.innerHTML = '<span></span><span></span><span></span>';
    header.appendChild(btn);

    btn.addEventListener('click', () => {
      btn.classList.toggle('open');
      nav.classList.toggle('nav-open');
    });
  });

  document.querySelectorAll('.nav-list a, .navbar a').forEach(link => {
    link.addEventListener('click', () => {
      document.querySelectorAll('.nav-list, .navbar')
        .forEach(n => n.classList.remove('nav-open'));
      document.querySelectorAll('.hamburger')
        .forEach(b => b.classList.remove('open'));
    });
  });
}


function initHeroCarousel() {
  const carousel = document.querySelector('.hero-carousel');
  if (!carousel) return;

  const slides = [...carousel.querySelectorAll('.carousel-slide')];
  const dots = [...carousel.querySelectorAll('.carousel-indicators button')];
  const prev = carousel.querySelector('.carousel-arrow.prev');
  const next = carousel.querySelector('.carousel-arrow.next');

  if (!slides.length || dots.length !== slides.length || !prev || !next) return;

  let index = Math.max(0, slides.findIndex(slide => slide.classList.contains('active')));
  let timer = null;
  let hasFocus = false;

  function showSlide(newIndex) {
    index = (newIndex + slides.length) % slides.length;

    slides.forEach((slide, slideIndex) => {
      const isActive = slideIndex === index;
      slide.classList.toggle('active', isActive);
      slide.setAttribute('aria-hidden', String(!isActive));
    });

    dots.forEach((dot, dotIndex) => {
      const isActive = dotIndex === index;
      dot.classList.toggle('active', isActive);
      dot.setAttribute('aria-current', String(isActive));
    });
  }

  function stopAutoplay() {
    window.clearInterval(timer);
    timer = null;
  }

  function syncAutoplay() {
    stopAutoplay();
    if (hasFocus || document.hidden) return;
    timer = window.setInterval(() => showSlide(index + 1), 8000);
  }

  prev.addEventListener('click', () => {
    showSlide(index - 1);
    syncAutoplay();
  });

  next.addEventListener('click', () => {
    showSlide(index + 1);
    syncAutoplay();
  });

  dots.forEach((dot, dotIndex) => {
    dot.addEventListener('click', () => {
      showSlide(dotIndex);
      syncAutoplay();
    });
  });

  carousel.addEventListener('focusin', () => {
    hasFocus = true;
    syncAutoplay();
  });

  carousel.addEventListener('focusout', event => {
    hasFocus = carousel.contains(event.relatedTarget);
    syncAutoplay();
  });

  document.addEventListener('visibilitychange', syncAutoplay);
  showSlide(index);
  syncAutoplay();
}


/* ─────────────────────────────────────────────────────────────
   3. SCROLL REVEAL
───────────────────────────────────────────────────────────── */
function initScrollReveal() {
  const selectors = [
    '.persona', '.card', '.service-card', '.benefit-item',
    '.contact-item', '.info-card', '.form-panel',
    '.hero-content', '.contenido', '.contenido-header',
    '.contact-header', '.services-header',
    '.mision-vision .card', '.etiqueta', '.blog-card',
    '.ally-logo'
  ];

  selectors.forEach(sel => {
    document.querySelectorAll(sel).forEach((el, i) => {
      el.classList.add('reveal');
      el.style.setProperty('--reveal-delay', `${Math.min(i * 0.11, 0.55)}s`);
    });
  });

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.10, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}


/* ─────────────────────────────────────────────────────────────
   4. TARJETAS — tilt 3D y lift
───────────────────────────────────────────────────────────── */
function initServiceCards() {
  document.querySelectorAll('.service-card').forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width  - 0.5) * 14;
      const y = ((e.clientY - rect.top)  / rect.height - 0.5) * -14;
      card.style.transform =
        `perspective(900px) rotateY(${x}deg) rotateX(${y}deg) scale(1.04)`;
      card.style.boxShadow = '0 20px 40px rgba(0,0,0,0.14)';
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
      card.style.boxShadow = '';
    });
  });

  document.querySelectorAll('.card').forEach(card => {
    card.addEventListener('mouseenter', () => {
      card.style.transform = 'translateY(-10px) scale(1.02)';
      card.style.boxShadow = '0 24px 48px rgba(0,0,0,0.16)';
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
      card.style.boxShadow = '';
    });
  });

  document.querySelectorAll('.persona').forEach(p => {
    p.addEventListener('mouseenter', () => {
      p.style.transform = 'translateY(-6px)';
      p.style.boxShadow = '0 16px 35px rgba(0,0,0,0.12)';
    });
    p.addEventListener('mouseleave', () => {
      p.style.transform = '';
      p.style.boxShadow = '';
    });
  });

  document.querySelectorAll('.blog-card').forEach(card => {
    card.addEventListener('mouseenter', () => {
      card.querySelector('.blog-card-title') &&
        (card.querySelector('.blog-card-title').style.color = '#001d8b');
    });
    card.addEventListener('mouseleave', () => {
      card.querySelector('.blog-card-title') &&
        (card.querySelector('.blog-card-title').style.color = '');
    });
  });
}


/* ─────────────────────────────────────────────────────────────
   5. FAQ — acordeón + solo uno abierto
───────────────────────────────────────────────────────────── */
function initFAQ() {
  const allDetails = document.querySelectorAll('details');
  if (!allDetails.length) return;

  allDetails.forEach(detail => {
    detail.addEventListener('toggle', () => {
      if (detail.open) {
        allDetails.forEach(other => {
          if (other !== detail && other.open) {
            other.removeAttribute('open');
          }
        });
        const p = detail.querySelector('p');
        if (p) p.style.animation = 'fadeInDown 0.3s ease forwards';
      }
    });
  });
}

//comentarios//
function initComments() {
  const form = document.querySelector('.comments-form');
  const status = document.querySelector('.comment-status');
  if (!form || !status) return;

  form.addEventListener('submit', event => {
    event.preventDefault();
    const formData = new FormData(form);
    const submitButton = form.querySelector('button[type="submit"]');
    status.hidden = true;
    status.classList.remove('is-success', 'is-error');
    if (submitButton) submitButton.disabled = true;

    fetch('AVA.php/hola.php', {
      method: 'POST',
      body: formData
    })
    .then(async response => {
      const data = await response.json();
      if (!response.ok || data.status !== 'success') {
        throw new Error(data.message || 'No se pudo enviar el comentario.');
      }
      return data;
    })
    .then(data => {
      status.textContent = data.message;
      status.classList.add('is-success');
      status.hidden = false;
      form.reset();
    })
    .catch(error => {
      status.textContent = error.message || 'Ocurrió un error al enviar el comentario.';
      status.classList.add('is-error');
      status.hidden = false;
    })
    .finally(() => {
      if (submitButton) submitButton.disabled = false;
    });
  });
}
//contactanos//
document.addEventListener("DOMContentLoaded", () => {
  const msgForm = document.querySelector('.message-form');
  
  if (msgForm) {
    msgForm.addEventListener('submit', e => {
      e.preventDefault();

      const formData = new FormData(msgForm);

      fetch('AVA.php/chao.php', {
        method: 'POST',
        body: formData
      })
      .then(response => response.json())
      .then(data => {
        if (data.status === 'success') {
          let existingMsg = msgForm.querySelector('.form-feedback');
          if (existingMsg) existingMsg.remove();

          const feedback = document.createElement('div');
          feedback.className = 'form-feedback';
          feedback.style.cssText = 'background-color: #d4edda; color: #155724; padding: 12px; border-radius: 8px; margin-top: 15px; text-align: center; font-weight: 500; border: 1px solid #c3e6cb;';
          feedback.innerText = data.message;
          
          msgForm.appendChild(feedback);
          msgForm.reset();

          setTimeout(() => {
            feedback.remove();
          }, 5000);

        } else {
          throw new Error(data.message || 'No se pudo enviar el mensaje.');
        }
      })
      .catch(error => {
        let existingMsg = msgForm.querySelector('.form-feedback');
        if (existingMsg) existingMsg.remove();

        const feedback = document.createElement('div');
        feedback.className = 'form-feedback';
        feedback.style.cssText = 'background-color: #f8d7da; color: #721c24; padding: 12px; border-radius: 8px; margin-top: 15px; text-align: center; font-weight: 500; border: 1px solid #f5c6cb;';
        feedback.innerText = '❌ ' + (error.message || 'Ocurrió un error de conexión con el servidor.');
        msgForm.appendChild(feedback);
      });
    });
  }
});
/* ─────────────────────────────────────────────────────────────
   7. PARALLAX
───────────────────────────────────────────────────────────── */
function initParallax() {
  if (window.innerWidth < 768) return;
  const els = document.querySelectorAll(
    '.header-historia, .mision-vision, .services-section, .contact-section'
  );
  window.addEventListener('scroll', () => {
    els.forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;
      const offset = (window.scrollY - el.offsetTop) * 0.1;
      el.style.backgroundPositionY = `calc(center + ${offset}px)`;
    });
  }, { passive: true });
}


/* ─────────────────────────────────────────────────────────────
   8. CURSOR GLOW
───────────────────────────────────────────────────────────── */
function initCursorGlow() {
  if (window.innerWidth < 768) return;
  const glow = document.createElement('div');
  glow.className = 'cursor-glow';
  document.body.appendChild(glow);
  let rafId;
  document.addEventListener('mousemove', e => {
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
      glow.style.left = e.clientX + 'px';
      glow.style.top  = e.clientY + 'px';
    });
  }, { passive: true });
}


/* ─────────────────────────────────────────────────────────────
   9. BOTÓN WHATSAPP FLOTANTE
───────────────────────────────────────────────────────────── */
function initWhatsAppFloat() {
  const phone   = '573000019478';
  const message = encodeURIComponent('¡Hola! Me interesa conocer más sobre sus servicios de cuidado.');
  const url     = `https://wa.me/${phone}?text=${message}`;

  const btn = document.createElement('a');
  btn.href      = url;
  btn.target    = '_blank';
  btn.rel       = 'noopener noreferrer';
  btn.className = 'whatsapp-float';
  btn.setAttribute('aria-label', 'Contactar por WhatsApp');
  btn.innerHTML = `
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15
               -.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463
               -2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606
               .134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025
               -.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008
               -.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479
               0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306
               1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719
               2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.553 4.116 1.522 5.849L.057 23.547
               a.75.75 0 00.906.99l5.876-1.54A11.95 11.95 0 0012 24c6.627 0 12-5.373
               12-12S18.627 0 12 0zm0 22a9.95 9.95 0 01-5.07-1.382l-.36-.214-3.742.981
               .999-3.648-.235-.374A9.96 9.96 0 012 12C2 6.477 6.477 2 12 2s10 4.477
               10 10-4.477 10-10 10z"/>
    </svg>`;
  document.body.appendChild(btn);
}


/* ─────────────────────────────────────────────────────────────
   10. BARRA DE LECTURA (progreso al hacer scroll)
───────────────────────────────────────────────────────────── */
function initReadingProgress() {
  const bar = document.createElement('div');
  bar.className = 'reading-progress';
  document.body.prepend(bar);

  window.addEventListener('scroll', () => {
    const scrollTop  = window.scrollY;
    const docHeight  = document.documentElement.scrollHeight - window.innerHeight;
    const progress   = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    bar.style.width  = progress + '%';
  }, { passive: true });
}


/* ─────────────────────────────────────────────────────────────
   12. BACK TO TOP
───────────────────────────────────────────────────────────── */
function initBackToTop() {
  const btn = document.createElement('a');
  btn.href      = '#';
  btn.className = 'back-to-top';
  btn.setAttribute('aria-label', 'Volver arriba');
  btn.innerHTML = '&#8679;';
  document.body.appendChild(btn);

  window.addEventListener('scroll', () => {
    btn.classList.toggle('visible', window.scrollY > 400);
  }, { passive: true });

  btn.addEventListener('click', e => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}


/* ─────────────────────────────────────────────────────────────
   14. TOAST (notificación flotante)
───────────────────────────────────────────────────────────── */
function showToast(message, duration = 3500) {
  document.querySelector('.toast-notify')?.remove();
  const toast = document.createElement('div');
  toast.className = 'toast-notify';
  toast.textContent = message;
  document.body.appendChild(toast);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => toast.classList.add('show'));
  });
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, duration);
}