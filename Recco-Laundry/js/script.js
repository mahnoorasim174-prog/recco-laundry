'use strict';

/* ============================================================================
   RECCO — script.js
   Production-ready vanilla JavaScript for the landing page.
   Modular, defensive (guards against missing elements), and respects
   prefers-reduced-motion throughout.
   ========================================================================== */

(() => {

  /* ==========================================================================
     0. Utilities
     ========================================================================== */

  const qs = (selector, scope = document) => scope.querySelector(selector);
  const qsa = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /**
   * Runs a callback at most once per animation frame, regardless of how many
   * times the event fires. Used to throttle high-frequency scroll/resize events.
   */
  const rafThrottle = (callback) => {
    let ticking = false;
    return (...args) => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        callback(...args);
        ticking = false;
      });
    };
  };

  /**
   * Delays invoking a callback until after `wait` ms have elapsed since the
   * last time it was invoked. Used for low-frequency, expensive operations.
   */
  const debounce = (callback, wait = 150) => {
    let timeoutId;
    return (...args) => {
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => callback(...args), wait);
    };
  };

  /**
   * Defers non-critical setup work until the browser is idle, falling back
   * to a short timeout on browsers without requestIdleCallback support.
   */
  const onIdle = (callback) => {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(callback, { timeout: 1500 });
    } else {
      window.setTimeout(callback, 200);
    }
  };

  /* ==========================================================================
     1. Sticky header + scroll progress + active nav + back-to-top visibility
     Combined into a single rAF-throttled scroll handler to avoid redundant
     layout work from multiple independent listeners.
     ========================================================================== */

  const initScrollController = () => {
    const header = qs('#siteHeader');
    const scrollProgress = qs('#scrollProgress');
    const navLinks = qsa('.main-nav a[href^="#"]');
    const drawerLinks = qsa('.mobile-drawer a[href^="#"]');
    const backToTop = qs('#backToTop');

    // Sections referenced by the primary navigation, used for scroll-spy.
    const navTargets = navLinks
      .map((link) => {
        const id = link.getAttribute('href').slice(1);
        const target = document.getElementById(id);
        return target ? { id, link, target } : null;
      })
      .filter(Boolean);

    const setActiveLink = (activeId) => {
      navLinks.forEach((link) => {
        link.classList.toggle('is-active', link.getAttribute('href') === `#${activeId}`);
      });
      drawerLinks.forEach((link) => {
        link.classList.toggle('is-active', link.getAttribute('href') === `#${activeId}`);
      });
    };

    const handleScroll = () => {
      const scrollTop = window.scrollY;

      // Sticky / glass header state.
      if (header) header.classList.toggle('is-solid', scrollTop > 60);

      // Scroll progress bar + hero scroll cue custom property.
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progressPct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      if (scrollProgress) scrollProgress.style.width = `${progressPct}%`;
      document.documentElement.style.setProperty('--scroll', `${progressPct}%`);

      // Back-to-top visibility.
      if (backToTop) backToTop.classList.toggle('is-visible', scrollTop > 640);

      // Scroll-spy: find the section currently nearest the top of the viewport.
      if (navTargets.length) {
        const offset = (header ? header.offsetHeight : 0) + 40;
        let current = navTargets[0].id;

        for (const { id, target } of navTargets) {
          if (target.getBoundingClientRect().top - offset <= 0) {
            current = id;
          }
        }
        setActiveLink(current);
      }
    };

    handleScroll();
    window.addEventListener('scroll', rafThrottle(handleScroll), { passive: true });
    window.addEventListener('resize', debounce(handleScroll, 200), { passive: true });
  };

  /* ==========================================================================
     2. Mobile navigation drawer
     ========================================================================== */

  const initMobileDrawer = () => {
    const navToggle = qs('#navToggle');
    const drawer = qs('#mobileDrawer');
    if (!navToggle || !drawer) return;

    const closeDrawer = () => {
  drawer.classList.remove('is-open');
  navToggle.classList.remove('is-active');
  navToggle.setAttribute('aria-expanded', 'false');
  navToggle.setAttribute('aria-label', 'Open menu');
  document.body.style.overflow = '';
};

const openDrawer = () => {
  drawer.classList.add('is-open');
  navToggle.classList.add('is-active');
  navToggle.setAttribute('aria-expanded', 'true');
  navToggle.setAttribute('aria-label', 'Close menu');
  document.body.style.overflow = 'hidden';
};

    navToggle.setAttribute('aria-expanded', 'false');
    navToggle.addEventListener('click', () => {
      const isOpen = drawer.classList.contains('is-open');
      isOpen ? closeDrawer() : openDrawer();
    });

    qsa('a', drawer).forEach((link) => link.addEventListener('click', closeDrawer));

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && drawer.classList.contains('is-open')) closeDrawer();
    });
  };

  /* ==========================================================================
     3. Smooth scrolling for in-page anchors (nav links + CTA buttons)
     ========================================================================== */

  const initSmoothScroll = () => {
    const header = qs('#siteHeader');

    document.addEventListener('click', (event) => {
      const anchor = event.target.closest('a[href^="#"]');
      if (!anchor) return;

      const hash = anchor.getAttribute('href');
      if (!hash || hash.length < 2) return;

      const target = document.querySelector(hash);
      if (!target) return;

      event.preventDefault();

      const headerHeight = header ? header.offsetHeight : 0;
      const top = target.getBoundingClientRect().top + window.scrollY - headerHeight - 12;

      window.scrollTo({
        top,
        behavior: prefersReducedMotion ? 'auto' : 'smooth'
      });

      // Keep the URL shareable without triggering an extra native jump.
      if (history.pushState) history.pushState(null, '', hash);
    });
  };

  /* ==========================================================================
     4. Scroll reveal animations (IntersectionObserver)
     ========================================================================== */

  const initScrollReveal = () => {
    const revealEls = qsa('[data-reveal]');
    if (!revealEls.length) return;

    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      revealEls.forEach((el) => el.classList.add('in-view'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('in-view');
          obs.unobserve(entry.target);
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -60px 0px' }
    );

    revealEls.forEach((el) => observer.observe(el));
  };

  /* ==========================================================================
     5. Counter animation for the statistics section
     Parses the leading numeric portion of each stat (supporting decimals
     and thousands markers like "40k") and animates it up from zero,
     preserving any trailing unit text (%, +, yrs, ★, k).
     ========================================================================== */

  const animateCounter = (el) => {
    const raw = el.textContent.trim();
    const match = raw.match(/^([\d.,]+)(.*)$/);
    if (!match) return;

    const numericPart = match[1];
    const suffix = match[2] || '';
    const hasDecimal = numericPart.includes('.');
    const target = parseFloat(numericPart.replace(/,/g, ''));

    if (Number.isNaN(target)) return;

    if (prefersReducedMotion) {
      el.textContent = raw;
      return;
    }

    const duration = 1400;
    const startTime = performance.now();

    const formatValue = (value) => {
      const rounded = hasDecimal ? value.toFixed(1) : Math.round(value).toLocaleString();
      return `${rounded}${suffix}`;
    };

    const step = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      el.textContent = formatValue(target * eased);

      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        el.textContent = raw;
      }
    };

    window.requestAnimationFrame(step);
  };

  const initStatCounters = () => {
    const counters = qsa('.stat-card strong, .why-choose-stat strong');
    if (!counters.length) return;

    if (!('IntersectionObserver' in window)) {
      counters.forEach(animateCounter);
      return;
    }

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          animateCounter(entry.target);
          obs.unobserve(entry.target);
        });
      },
      { threshold: 0.5 }
    );

    counters.forEach((el) => observer.observe(el));
  };

  /* ==========================================================================
     6. FAQ accordion (only one item open at a time)
     Defensive: does nothing if no .faq-item elements are present in the DOM.
     ========================================================================== */

  const initFaqAccordion = () => {
    const faqItems = qsa('.faq-item');
    if (!faqItems.length) return;

    faqItems.forEach((item) => {
      const question = qs('.faq-question', item);
      const answer = qs('.faq-answer', item);
      if (!question || !answer) return;

      // Ensure closed items start with a measurable collapsed state.
      if (!item.classList.contains('is-open')) {
        answer.style.maxHeight = '0px';
      } else {
        answer.style.maxHeight = `${answer.scrollHeight}px`;
        question.setAttribute('aria-expanded', 'true');
      }

      question.addEventListener('click', () => {
        const isOpen = item.classList.contains('is-open');

        faqItems.forEach((otherItem) => {
          if (otherItem === item) return;
          const otherAnswer = qs('.faq-answer', otherItem);
          const otherQuestion = qs('.faq-question', otherItem);
          otherItem.classList.remove('is-open');
          if (otherAnswer) otherAnswer.style.maxHeight = '0px';
          if (otherQuestion) otherQuestion.setAttribute('aria-expanded', 'false');
        });

        item.classList.toggle('is-open', !isOpen);
        question.setAttribute('aria-expanded', String(!isOpen));
        answer.style.maxHeight = !isOpen ? `${answer.scrollHeight}px` : '0px';
      });
    });
  };

  /* ==========================================================================
     7. Testimonial carousel — autoplay, manual controls, swipe, pause on hover
     ========================================================================== */

  const initTestimonialCarousel = () => {
    const track = qs('#quoteTrack');
    if (!track) return;

    const prevBtn = qs('#quotePrev');
    const nextBtn = qs('#quoteNext');
    const cards = qsa('.quote-card', track);
    if (!cards.length) return;

    const getStep = () => (cards[0].offsetWidth || 320) + 24; // card width + gap

    const scrollByStep = (direction) => {
      track.scrollBy({ left: direction * getStep(), behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    };

    nextBtn?.addEventListener('click', () => scrollByStep(1));
    prevBtn?.addEventListener('click', () => scrollByStep(-1));

    // Autoplay — loops back to the start once the end is reached.
    const AUTOPLAY_INTERVAL = 5000;
    let autoplayId = null;
    let isPaused = false;

    const tick = () => {
      if (isPaused || prefersReducedMotion) return;

      const maxScroll = track.scrollWidth - track.clientWidth;
      if (track.scrollLeft >= maxScroll - 4) {
        track.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        scrollByStep(1);
      }
    };

    const startAutoplay = () => {
      if (prefersReducedMotion || autoplayId) return;
      autoplayId = window.setInterval(tick, AUTOPLAY_INTERVAL);
    };

    const stopAutoplay = () => {
      window.clearInterval(autoplayId);
      autoplayId = null;
    };

    // Pause on hover and keyboard focus for accessibility and control.
    track.addEventListener('mouseenter', () => { isPaused = true; });
    track.addEventListener('mouseleave', () => { isPaused = false; });
    track.addEventListener('focusin', () => { isPaused = true; });
    track.addEventListener('focusout', () => { isPaused = false; });

    // Pause permanently once the user manually interacts with the controls.
    [prevBtn, nextBtn].forEach((btn) => {
      btn?.addEventListener('click', stopAutoplay);
    });

    // Swipe support (touch devices). The track already scrolls natively via
    // overflow-x, so this only needs to pause autoplay during a drag.
    let touchStartX = 0;

    track.addEventListener('touchstart', (event) => {
      touchStartX = event.touches[0].clientX;
      isPaused = true;
    }, { passive: true });

    track.addEventListener('touchend', () => {
      window.setTimeout(() => { isPaused = false; }, 400);
    }, { passive: true });

    track.addEventListener('touchmove', () => {
      // Native scrolling handles the swipe; this listener exists only to
      // keep the interaction responsive to passive-mode browsers.
    }, { passive: true });

    startAutoplay();

    // Stop autoplay entirely if the tab is hidden, resume when visible again.
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        stopAutoplay();
      } else if (!prefersReducedMotion) {
        startAutoplay();
      }
    });
  };

  /* ==========================================================================
     8. Magnetic button effect
     ========================================================================== */

  const initMagneticButtons = () => {
    if (prefersReducedMotion) return;

    const isFinePointer = window.matchMedia('(pointer: fine)').matches;
    if (!isFinePointer) return;

    const magneticEls = qsa('.magnetic');
    if (!magneticEls.length) return;

    const MAX_PULL = 14;

    magneticEls.forEach((el) => {
      el.addEventListener('mousemove', (event) => {
        const rect = el.getBoundingClientRect();
        const relX = event.clientX - rect.left - rect.width / 2;
        const relY = event.clientY - rect.top - rect.height / 2;
        const pullX = Math.max(-MAX_PULL, Math.min(MAX_PULL, relX * 0.3));
        const pullY = Math.max(-MAX_PULL, Math.min(MAX_PULL, relY * 0.4));
        el.style.transform = `translate(${pullX}px, ${pullY}px)`;
      });

      el.addEventListener('mouseleave', () => {
        el.style.transform = 'translate(0, 0)';
      });
    });
  };

  /* ==========================================================================
     9. Marquee — duplicate content once for a seamless infinite loop
     ========================================================================== */

  const initMarquee = () => {
    const track = qs('#marqueeTrack');
    if (!track || track.dataset.duplicated) return;

    track.insertAdjacentHTML('beforeend', track.innerHTML);
    track.dataset.duplicated = 'true';

    if (prefersReducedMotion) {
      track.style.animationPlayState = 'paused';
    }
  };

  /* ==========================================================================
     10. Back-to-top button
     Created dynamically and reuses existing button styling so no CSS
     changes are required.
     ========================================================================== */

  const initBackToTop = () => {
    if (qs('#backToTop')) return;

    const button = document.createElement('button');
    button.id = 'backToTop';
    button.type = 'button';
    button.className = 'btn btn-primary';
    button.setAttribute('aria-label', 'Back to top');
    button.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 19V5M5 12l7-7 7 7"/>
      </svg>
    `;

    Object.assign(button.style, {
      position: 'fixed',
      right: '28px',
      bottom: '28px',
      width: '52px',
      height: '52px',
      padding: '0',
      borderRadius: '50%',
      zIndex: '150',
      opacity: '0',
      visibility: 'hidden',
      transform: 'translateY(12px)',
      transition: 'opacity .35s ease, transform .35s ease, visibility .35s ease'
    });

    document.body.appendChild(button);

    button.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    });

    // Visibility toggling is driven by the shared scroll controller via the
    // `.is-visible` class; wire up the class-to-style bridge here since this
    // element has no matching rule in the stylesheet.
    const applyVisibility = () => {
      const isVisible = button.classList.contains('is-visible');
      button.style.opacity = isVisible ? '1' : '0';
      button.style.visibility = isVisible ? 'visible' : 'hidden';
      button.style.transform = isVisible ? 'translateY(0)' : 'translateY(12px)';
    };

    const observer = new MutationObserver(applyVisibility);
    observer.observe(button, { attributes: true, attributeFilter: ['class'] });
  };

  /* ==========================================================================
     11. Newsletter form — lightweight client-side confirmation
     ========================================================================== */

  const initNewsletterForm = () => {
    const form = qs('#newsletterForm');
    if (!form) return;

    form.addEventListener('submit', (event) => {
      event.preventDefault();

      const input = qs('input[type="email"]', form);
      const button = qs('button', form);
      if (!input || !button || !input.checkValidity()) return;

      const originalLabel = button.textContent;
      button.textContent = 'Subscribed';
      input.value = '';

      window.setTimeout(() => {
        button.textContent = originalLabel;
      }, 2400);
    });
  };

  /* ==========================================================================
     Init
     Critical, above-the-fold interactions run immediately on DOMContentLoaded.
     Lower-priority, non-critical enhancements are deferred to idle time.
     ========================================================================== */

  const init = () => {
    // Critical interactions — needed immediately for correct first paint / UX.
    initScrollController();
    initMobileDrawer();
    initSmoothScroll();
    initScrollReveal();
    initFaqAccordion();

    // Deferred, non-critical enhancements.
    onIdle(() => {
      initStatCounters();
      initTestimonialCarousel();
      initMagneticButtons();
      initMarquee();
      initBackToTop();
      initNewsletterForm();
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();