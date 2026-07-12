// Lumshot — interactive behavior
// Mirrors the original site's behavior: nav blur/shadow on scroll, a subtle
// hero parallax, mobile nav toggle, scroll-reveal animations, and an FAQ
// accordion. The waitlist form is a placeholder (no real backend is wired
// up in the original either — see the comment near the form in index.html).

document.addEventListener('DOMContentLoaded', () => {
  // --- nav blur on scroll + hero parallax ---
  const navBox = document.getElementById('lum-navbox');
  const heroShot = document.getElementById('hero-shot');

  const onScroll = () => {
    if (navBox) {
      navBox.classList.toggle('is-scrolled', window.scrollY > 24);
    }
    if (heroShot) {
      heroShot.style.transform = `translateY(${window.scrollY * 0.045}px)`;
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // --- mobile menu ---
  const burger = document.getElementById('lum-burger');
  const mobileMenu = document.getElementById('lum-mobile');
  if (burger && mobileMenu) {
    burger.addEventListener('click', () => {
      const isOpen = mobileMenu.classList.toggle('is-open');
      burger.setAttribute('aria-expanded', String(isOpen));
    });
    mobileMenu.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        mobileMenu.classList.remove('is-open');
        burger.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // --- reveal on scroll ---
  const reveals = document.querySelectorAll('[data-reveal]');
  reveals.forEach((el) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'opacity .8s cubic-bezier(.2,.7,.2,1), transform .8s cubic-bezier(.2,.7,.2,1)';
  });

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'none';
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => {
      el.style.opacity = '1';
      el.style.transform = 'none';
    });
  }

  // --- FAQ accordion ---
  document.querySelectorAll('[data-faq]').forEach((item) => {
    const button = item.querySelector('[data-faq-q]');
    const panel = item.querySelector('[data-faq-a]');
    const icon = item.querySelector('[data-faq-i]');
    if (!button || !panel) return;

    button.addEventListener('click', () => {
      const isOpen = item.classList.contains('is-open');
      if (isOpen) {
        item.classList.remove('is-open');
        panel.style.maxHeight = '0px';
        panel.style.opacity = '0';
        panel.style.marginTop = '0px';
      } else {
        item.classList.add('is-open');
        panel.style.maxHeight = `${panel.scrollHeight + 40}px`;
        panel.style.opacity = '1';
        panel.style.marginTop = '14px';
      }
    });
  });

  // --- waitlist form (Kit/ConvertKit placeholder) ---
  const form = document.getElementById('lum-form');
  if (form) {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const input = form.querySelector('input');
      const note = document.getElementById('lum-form-note');
      if (input && input.value && input.value.indexOf('@') > 0) {
        if (note) {
          note.textContent = 'You are on the list. (Connect your Kit form to go live.)';
          note.style.color = '#5EE0CB';
        }
        input.value = '';
      } else if (note) {
        note.textContent = 'Enter a valid email address.';
        note.style.color = '#ff8a8a';
      }
    });
  }
});
