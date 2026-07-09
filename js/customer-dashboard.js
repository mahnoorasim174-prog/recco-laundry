'use strict';

/* ============================================================================
   RECCO — customer-dashboard.js
   Frontend-only demo. In-memory mock data, no backend, no persistence.
   ========================================================================== */

(() => {

  const qs = (selector, scope = document) => scope.querySelector(selector);
  const qsa = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* --------------------------------------------------------------------
     Toast helper
  -------------------------------------------------------------------- */
  const showToast = (message) => {
    const toast = qs('#toast');
    const toastMsg = qs('#toastMsg');
    if (!toast || !toastMsg) return;

    toastMsg.textContent = message;
    toast.classList.add('is-visible');
    window.setTimeout(() => toast.classList.remove('is-visible'), 3000);
  };

  /* --------------------------------------------------------------------
     Sidebar toggle (mobile) + overlay
  -------------------------------------------------------------------- */
  const initSidebar = () => {
    const sidebar = qs('#dashSidebar');
    const toggle = qs('#dashToggle');
    const overlay = qs('#dashOverlay');
    if (!sidebar || !toggle || !overlay) return;

    const openSidebar = () => {
      sidebar.classList.add('is-open');
      overlay.classList.add('is-visible');
    };

    const closeSidebar = () => {
      sidebar.classList.remove('is-open');
      overlay.classList.remove('is-visible');
    };

    toggle.addEventListener('click', openSidebar);
    overlay.addEventListener('click', closeSidebar);

    qsa('.dash-nav-link', sidebar).forEach((link) => {
      link.addEventListener('click', closeSidebar);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeSidebar();
    });
  };

  /* --------------------------------------------------------------------
     Active menu highlighting (click-based, scoped to sidebar nav links)
  -------------------------------------------------------------------- */
  const initActiveNav = () => {
    const navLinks = qsa('.dash-nav-link[data-panel]');
    if (!navLinks.length) return;

    navLinks.forEach((link) => {
      link.addEventListener('click', () => {
        navLinks.forEach((l) => l.classList.remove('is-active'));
        link.classList.add('is-active');
      });
    });
  };

  /* --------------------------------------------------------------------
     Notification dropdown
  -------------------------------------------------------------------- */
  const initDropdown = ({ toggleId, panelId }) => {
    const toggle = qs(`#${toggleId}`);
    const panel = qs(`#${panelId}`);
    if (!toggle || !panel) return;

    const close = () => {
      panel.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    };

    const open = () => {
      panel.classList.add('is-open');
      toggle.setAttribute('aria-expanded', 'true');
    };

    toggle.addEventListener('click', (event) => {
      event.stopPropagation();
      const isOpen = panel.classList.contains('is-open');
      // Close any sibling dropdowns before opening this one.
      qsa('.dash-notif-panel.is-open, .dash-profile-menu.is-open').forEach((el) => {
        el.classList.remove('is-open');
      });
      isOpen ? close() : open();
    });

    document.addEventListener('click', (event) => {
      if (!panel.contains(event.target) && !toggle.contains(event.target)) close();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') close();
    });
  };

  /* --------------------------------------------------------------------
     Counter animation for stat cards (IntersectionObserver-driven)
  -------------------------------------------------------------------- */
  const animateCounter = (el) => {
    const target = parseInt(el.getAttribute('data-count'), 10);
    if (Number.isNaN(target)) return;

    if (prefersReducedMotion) {
      el.textContent = target;
      return;
    }

    const duration = 1200;
    const startTime = performance.now();

    const step = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(target * eased);

      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        el.textContent = target;
      }
    };

    window.requestAnimationFrame(step);
  };

  const initStatCounters = () => {
    const counters = qsa('.dash-stat-value[data-count]');
    if (!counters.length) return;

    if (!('IntersectionObserver' in window)) {
      counters.forEach(animateCounter);
      return;
    }

    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        animateCounter(entry.target);
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.4 });

    counters.forEach((el) => observer.observe(el));
  };

  /* --------------------------------------------------------------------
     Loyalty progress ring — animates stroke-dashoffset once visible
  -------------------------------------------------------------------- */
  const initLoyaltyRing = () => {
    const ring = qs('#loyaltyRingFill');
    if (!ring) return;

    const circumference = 2 * Math.PI * 52; // r = 52
    const points = 640;
    const target = 1000; // demo total needed for the next tier
    const progress = Math.min(points / target, 1);
    const offset = circumference - progress * circumference;

    const animate = () => {
      ring.style.strokeDashoffset = prefersReducedMotion ? offset : circumference;
      if (!prefersReducedMotion) {
        window.requestAnimationFrame(() => {
          ring.style.strokeDashoffset = offset;
        });
      }
    };

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          animate();
          obs.disconnect();
        });
      }, { threshold: 0.5 });
      observer.observe(ring);
    } else {
      animate();
    }
  };

  /* --------------------------------------------------------------------
     Recent orders — mock data render
  -------------------------------------------------------------------- */
  const orders = [
    { id: 'RC-04521', service: 'Dry Cleaning & Pressing', pickup: '07 Jul 2026', delivery: '09 Jul 2026', status: 'progress', label: 'In Progress' },
    { id: 'RC-04498', service: 'Wash & Fold', pickup: '05 Jul 2026', delivery: '06 Jul 2026', status: 'pending', label: 'Scheduled' },
    { id: 'RC-04460', service: 'Wash & Fold', pickup: '02 Jul 2026', delivery: '03 Jul 2026', status: 'done', label: 'Delivered' },
    { id: 'RC-04432', service: 'Dry Cleaning', pickup: '27 Jun 2026', delivery: '29 Jun 2026', status: 'done', label: 'Delivered' },
    { id: 'RC-04401', service: 'Leather & Suede', pickup: '19 Jun 2026', delivery: '22 Jun 2026', status: 'done', label: 'Delivered' }
  ];

  const renderOrders = () => {
    const tbody = qs('#ordersTableBody');
    if (!tbody) return;

    tbody.innerHTML = orders.map((order) => `
      <tr>
        <td><strong>${order.id}</strong></td>
        <td>${order.service}</td>
        <td>${order.pickup}</td>
        <td>${order.delivery}</td>
        <td><span class="status-pill status-pill--${order.status}">${order.label}</span></td>
        <td>
          <button type="button" class="table-view-btn" data-order="${order.id}" aria-label="View order ${order.id}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
        </td>
      </tr>
    `).join('');

    qsa('.table-view-btn', tbody).forEach((btn) => {
      btn.addEventListener('click', () => {
        showToast(`Opening details for ${btn.getAttribute('data-order')}…`);
      });
    });
  };

  /* --------------------------------------------------------------------
     Quick actions — generic toast trigger + specific invoice actions
  -------------------------------------------------------------------- */
  const initQuickActions = () => {
    qsa('[data-toast]').forEach((btn) => {
      btn.addEventListener('click', () => showToast(btn.getAttribute('data-toast')));
    });

    const runInvoiceDownload = (button) => {
      const originalHTML = button.innerHTML;
      button.disabled = true;
      button.style.opacity = '.7';

      window.setTimeout(() => {
        const csvHeader = 'Ticket,Service,Amount,Status\n';
        const csvRows = [
          'RC-04521,Dry Cleaning & Pressing,Rs 2450,Paid',
          'RC-04498,Wash & Fold,Rs 900,Due on Delivery'
        ].join('\n');

        const blob = new Blob([csvHeader + csvRows], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'recco-invoice.csv';
        link.click();
        URL.revokeObjectURL(url);

        button.disabled = false;
        button.style.opacity = '';
        button.innerHTML = originalHTML;
        showToast('Invoice downloaded.');
      }, 900);
    };

    qs('#downloadInvoiceBtn')?.addEventListener('click', function () { runInvoiceDownload(this); });
    qs('#quickInvoiceBtn')?.addEventListener('click', function () { runInvoiceDownload(this); });

    qs('#newPickupBtn')?.addEventListener('click', () => showToast('Pickup scheduling form would open here.'));
    qs('#editProfileBtn')?.addEventListener('click', () => showToast('Profile editing form would open here.'));
  };

  /* --------------------------------------------------------------------
     Logout — clears the demo session feel and returns to the homepage
  -------------------------------------------------------------------- */
  const initLogout = () => {
    const logoutLinks = [qs('#logoutBtn'), qs('#profileLogout')].filter(Boolean);

    logoutLinks.forEach((link) => {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        showToast('Signing out…');
        window.setTimeout(() => {
          window.location.href = 'index.html';
        }, 600);
      });
    });
  };

  /* --------------------------------------------------------------------
     Scroll reveal (shared pattern with the landing page)
  -------------------------------------------------------------------- */
  const initScrollReveal = () => {
    const revealEls = qsa('[data-reveal]');
    if (!revealEls.length) return;

    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      revealEls.forEach((el) => el.classList.add('in-view'));
      return;
    }

    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in-view');
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.12 });

    revealEls.forEach((el) => observer.observe(el));
  };

  /* --------------------------------------------------------------------
     Init
  -------------------------------------------------------------------- */
  const init = () => {
    initSidebar();
    initActiveNav();
    initDropdown({ toggleId: 'notifToggle', panelId: 'notifPanel' });
    initDropdown({ toggleId: 'profileToggle', panelId: 'profileMenu' });
    renderOrders();
    initStatCounters();
    initLoyaltyRing();
    initQuickActions();
    initLogout();
    initScrollReveal();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();