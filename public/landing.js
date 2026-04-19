/* ================================================================
   PROSTOCKTOOL — LANDING PAGE JS
   Responsabilidades:
   1. Nav sticky con clase 'scrolled'
   2. Menú hamburguesa
   3. Scroll reveal con IntersectionObserver
   4. Smooth scroll en anchors
================================================================ */

(function () {
  'use strict';

  /* ── 1. Header scroll state ─────────────────────────────────── */
  const header = document.getElementById('siteHeader');

  function onScroll() {
    if (window.scrollY > 20) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll(); // init

  /* ── 2. Mobile nav burger ───────────────────────────────────── */
  const burger   = document.getElementById('navBurger');
  const navLinks = document.getElementById('navLinks');

  burger.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('open');
    burger.setAttribute('aria-expanded', isOpen);

    // Animate burger spans
    const spans = burger.querySelectorAll('span');
    if (isOpen) {
      spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
      spans[1].style.opacity   = '0';
      spans[2].style.transform = 'rotate(-45deg) translate(5px, -5px)';
    } else {
      spans[0].style.transform = '';
      spans[1].style.opacity   = '';
      spans[2].style.transform = '';
    }
  });

  // Close nav on link click
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('open');
      const spans = burger.querySelectorAll('span');
      spans[0].style.transform = '';
      spans[1].style.opacity   = '';
      spans[2].style.transform = '';
    });
  });

  // Close nav on outside click
  document.addEventListener('click', (e) => {
    if (!header.contains(e.target)) {
      navLinks.classList.remove('open');
    }
  });

  /* ── 3. Scroll reveal (IntersectionObserver) ────────────────── */
  const revealEls = document.querySelectorAll('.reveal-up, .reveal-right');

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            // Respect custom delay via CSS variable --d
            const delay = getComputedStyle(entry.target).getPropertyValue('--d').trim() || '0ms';
            entry.target.style.transitionDelay = delay;
            entry.target.classList.add('revealed');
            observer.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: '0px 0px -60px 0px',
        threshold: 0.12,
      }
    );

    revealEls.forEach(el => observer.observe(el));
  } else {
    // Fallback: show everything immediately for older browsers
    revealEls.forEach(el => el.classList.add('revealed'));
  }

  /* Hero elements: always reveal on load with stagger */
  document.querySelectorAll('.hero .reveal-up').forEach(el => {
    const d = getComputedStyle(el).getPropertyValue('--d').trim() || '0ms';
    el.style.transitionDelay = d;
    el.classList.add('revealed');
  });

  /* ── 4. Smooth scroll for anchor links ─────────────────────── */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const href = anchor.getAttribute('href');
      if (href === '#') return;

      const target = document.querySelector(href);
      if (!target) return;

      e.preventDefault();

      const headerH = header.getBoundingClientRect().height;
      const top = target.getBoundingClientRect().top + window.scrollY - headerH;

      window.scrollTo({ top, behavior: 'smooth' });
    });
  });

  /* ── 5. Active nav link highlight on scroll ─────────────────── */
  const sections  = document.querySelectorAll('section[id], footer[id]');
  const navAnchors = document.querySelectorAll('.nav-links a[href^="#"]');

  function updateActiveNav() {
    const scrollY    = window.scrollY;
    const headerH    = header.getBoundingClientRect().height;
    let   current    = '';

    sections.forEach(section => {
      const top = section.offsetTop - headerH - 80;
      if (scrollY >= top) {
        current = '#' + section.id;
      }
    });

    navAnchors.forEach(a => {
      a.classList.toggle('nav-active', a.getAttribute('href') === current);
    });
  }

  window.addEventListener('scroll', updateActiveNav, { passive: true });
  updateActiveNav();

})();