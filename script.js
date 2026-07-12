// Lumshot — interactive behavior
// Mirrors the original site's behavior: nav blur/shadow on scroll, a subtle
// hero parallax, mobile nav toggle, scroll-reveal animations, and an FAQ
// accordion. The waitlist form is a placeholder (no real backend is wired
// up in the original either — see the comment near the form in index.html).

document.addEventListener('DOMContentLoaded', () => {
  // --- nav blur on scroll + hero parallax ---
  const navBox = document.getElementById('lum-navbox');
  const heroShot = document.getElementById('hero-shot');

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const onScroll = () => {
    if (navBox) {
      navBox.classList.toggle('is-scrolled', window.scrollY > 24);
    }
    if (heroShot && !reduceMotion) {
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

  // --- reveal on scroll (skipped entirely when reduced motion is requested) ---
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const reveals = document.querySelectorAll('[data-reveal]');

  if (prefersReducedMotion) {
    reveals.forEach((el) => {
      el.style.opacity = '1';
      el.style.transform = 'none';
    });
  } else {
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
  }

  // --- FAQ accordion (with aria wiring for screen readers) ---
  document.querySelectorAll('[data-faq]').forEach((item, i) => {
    const button = item.querySelector('[data-faq-q]');
    const panel = item.querySelector('[data-faq-a]');
    if (!button || !panel) return;

    // Wire aria relationships so collapsed answers aren't announced as content
    const panelId = panel.id || `lum-faq-panel-${i}`;
    panel.id = panelId;
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-controls', panelId);
    panel.setAttribute('role', 'region');
    panel.setAttribute('hidden', '');

    button.addEventListener('click', () => {
      const isOpen = item.classList.contains('is-open');
      if (isOpen) {
        item.classList.remove('is-open');
        panel.style.maxHeight = '0px';
        panel.style.opacity = '0';
        panel.style.marginTop = '0px';
        button.setAttribute('aria-expanded', 'false');
        panel.setAttribute('hidden', '');
      } else {
        item.classList.add('is-open');
        panel.removeAttribute('hidden');
        panel.style.maxHeight = `${panel.scrollHeight + 40}px`;
        panel.style.opacity = '1';
        panel.style.marginTop = '14px';
        button.setAttribute('aria-expanded', 'true');
      }
    });
  });

  // --- before/after redact slider ---
  document.querySelectorAll('[data-baf]').forEach((container) => {
    const before = container.querySelector('[data-baf-before]');
    const handle = container.querySelector('[data-baf-handle]');
    if (!before || !handle) return;

    let dragging = false;

    const setPos = (clientX) => {
      const rect = container.getBoundingClientRect();
      let pct = ((clientX - rect.left) / rect.width) * 100;
      pct = Math.max(4, Math.min(96, pct));
      before.style.clipPath = `inset(0 ${100 - pct}% 0 0)`;
      handle.style.left = `${pct}%`;
    };

    const onDown = (e) => {
      dragging = true;
      container.classList.add('is-dragging');
      setPos(e.touches ? e.touches[0].clientX : e.clientX);
    };
    const onMove = (e) => {
      if (!dragging) return;
      setPos(e.touches ? e.touches[0].clientX : e.clientX);
    };
    const onUp = () => {
      dragging = false;
      container.classList.remove('is-dragging');
    };

    handle.addEventListener('mousedown', onDown);
    handle.addEventListener('touchstart', onDown, { passive: true });
    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchend', onUp);

    // Keyboard support on the handle
    handle.addEventListener('keydown', (e) => {
      const rect = container.getBoundingClientRect();
      const current = parseFloat(handle.style.left) || 50;
      if (e.key === 'ArrowLeft') {
        setPos(rect.left + (rect.width * (current - 4)) / 100);
        e.preventDefault();
      } else if (e.key === 'ArrowRight') {
        setPos(rect.left + (rect.width * (current + 4)) / 100);
        e.preventDefault();
      }
    });
  });

  // --- waitlist / early-bird forms (email capture -> Worker) ---
  const WAITLIST_ENDPOINT = 'https://lumshotemailsubscription.bowndulee.workers.dev';

  const wireWaitlist = (formId, noteId) => {
    const form = document.getElementById(formId);
    const note = document.getElementById(noteId);
    if (!form) return;

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const input = form.querySelector('input');
      const button = form.querySelector('button[type="submit"]');
      const email = input ? input.value.trim() : '';

      const setNote = (msg, color) => {
        if (!note) return;
        note.textContent = msg;
        note.style.color = color;
      };

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setNote('Enter a valid email address.', '#ff8a8a');
        return;
      }

      if (button) button.disabled = true;
      if (input) input.disabled = true;
      setNote('Joining...', '');

      try {
        const res = await fetch(WAITLIST_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, source: 'waitlist' }),
        });
        if (!res.ok) throw new Error('Request failed');
        if (input) input.value = '';
        setNote("You're on the list. We'll email you at launch.", '#5EE0CB');
      } catch (err) {
        setNote('Something went wrong. Please try again.', '#ff8a8a');
      } finally {
        if (button) button.disabled = false;
        if (input) input.disabled = false;
      }
    });
  };

  wireWaitlist('lum-form', 'lum-form-note');          // pricing card early-bird
  wireWaitlist('lum-waitlist', 'lum-waitlist-note');  // standalone waitlist section

  // --- download modal (email capture -> Worker -> ConvertKit -> redirect) ---
  const EMAIL_CAPTURE_ENDPOINT = 'https://lumshotemailsubscription.bowndulee.workers.dev';

  const modal = document.getElementById('lum-download-modal');
  const downloadForm = document.getElementById('lum-download-form');
  const downloadEmail = document.getElementById('lum-download-email');
  const downloadNote = document.getElementById('lum-download-note');
  const downloadTriggers = document.querySelectorAll('[data-download-trigger]');

  if (modal && downloadForm && downloadEmail && downloadNote && downloadTriggers.length) {
    let fallbackHref = downloadTriggers[0].getAttribute('data-download-href') || '';
    let lastFocused = null;

    const setNote = (message, tone) => {
      downloadNote.textContent = message;
      downloadNote.classList.remove('is-error', 'is-success');
      if (tone) downloadNote.classList.add(tone);
    };

    const openModal = (href) => {
      fallbackHref = href || fallbackHref;
      lastFocused = document.activeElement;
      modal.hidden = false;
      document.body.style.overflow = 'hidden';
      setNote('', null);
      downloadEmail.value = '';
      downloadEmail.disabled = false;
      downloadForm.querySelector('button[type="submit"]').disabled = false;
      downloadEmail.focus();
    };

    const closeModal = () => {
      modal.hidden = true;
      document.body.style.overflow = '';
      if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
    };

    downloadTriggers.forEach((trigger) => {
      trigger.addEventListener('click', (event) => {
        event.preventDefault();
        openModal(trigger.getAttribute('data-download-href'));
      });
    });

    modal.querySelectorAll('[data-download-close]').forEach((el) => {
      el.addEventListener('click', closeModal);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !modal.hidden) closeModal();
    });

    downloadForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const email = downloadEmail.value.trim();
      if (!email || email.indexOf('@') < 1) {
        setNote('Enter a valid email address.', 'is-error');
        return;
      }

      const submitBtn = downloadForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      downloadEmail.disabled = true;
      setNote('Sending...', null);

      try {
        const response = await fetch(EMAIL_CAPTURE_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });

        if (!response.ok) throw new Error('Request failed');

        const data = await response.json();
        const downloadUrl = data && data.downloadUrl ? data.downloadUrl : fallbackHref;

        setNote('You are all set. Starting your download...', 'is-success');
        window.location.href = downloadUrl;
        setTimeout(closeModal, 800);
      } catch (err) {
        setNote('Something went wrong. Starting your download anyway.', 'is-error');
        submitBtn.disabled = false;
        downloadEmail.disabled = false;
        if (fallbackHref) {
          window.location.href = fallbackHref;
          setTimeout(closeModal, 800);
        }
      }
    });
  }

  // --- contact form (contact.html -> Worker -> Resend) ---
  // Point this at your deployed contact Worker. See worker/README.md.
  const CONTACT_ENDPOINT = 'https://lumshotemail.bowndulee.workers.dev';

  const contactForm = document.getElementById('lum-contact-form');
  if (contactForm) {
    const nameEl = document.getElementById('cf-name');
    const emailEl = document.getElementById('cf-email');
    const subjectEl = document.getElementById('cf-subject'); // optional field
    const messageEl = document.getElementById('cf-message');
    const companyEl = document.getElementById('cf-company'); // honeypot
    const submitBtn = document.getElementById('cf-submit');
    const submitLabel = submitBtn.querySelector('.cf-submit-label');
    const note = document.getElementById('cf-note');

    const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

    const setNote = (message, tone) => {
      note.textContent = message;
      note.classList.remove('is-error', 'is-success');
      if (tone) note.classList.add(tone);
    };

    const clearInvalid = (el) => el.classList.remove('is-invalid');
    [nameEl, emailEl, messageEl].forEach((el) => {
      el.addEventListener('input', () => clearInvalid(el));
    });

    contactForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      const name = nameEl.value.trim();
      const email = emailEl.value.trim();
      const subject = subjectEl ? subjectEl.value.trim() : '';
      const message = messageEl.value.trim();

      // client-side validation
      let firstInvalid = null;
      [nameEl, emailEl, messageEl].forEach((el) => clearInvalid(el));
      if (!name) { nameEl.classList.add('is-invalid'); firstInvalid = firstInvalid || nameEl; }
      if (!isEmail(email)) { emailEl.classList.add('is-invalid'); firstInvalid = firstInvalid || emailEl; }
      if (!message) { messageEl.classList.add('is-invalid'); firstInvalid = firstInvalid || messageEl; }

      if (firstInvalid) {
        setNote('Please fill in your name, a valid email, and a message.', 'is-error');
        firstInvalid.focus();
        return;
      }

      submitBtn.disabled = true;
      submitLabel.textContent = 'Sending…';
      setNote('', null);

      try {
        const response = await fetch(CONTACT_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            email,
            subject,
            message,
            company: companyEl ? companyEl.value : '',
          }),
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data && data.error ? data.error : 'Request failed');
        }

        contactForm.reset();
        setNote("Thanks! We'll get back to you soon.", 'is-success');
        submitLabel.textContent = 'Message sent';
        // let them send another after a moment
        setTimeout(() => {
          submitBtn.disabled = false;
          submitLabel.textContent = 'Send message';
        }, 4000);
      } catch (err) {
        setNote(
          (err && err.message) ? err.message : 'Something went wrong. Please try again, or email us directly.',
          'is-error'
        );
        submitBtn.disabled = false;
        submitLabel.textContent = 'Send message';
      }
    });
  }
});
