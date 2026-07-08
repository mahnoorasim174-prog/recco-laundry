'use strict';

/* ============================================================================
   RECCO — admin-dashboard.js
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

    qsa('.dash-nav-link', sidebar).forEach((link) => link.addEventListener('click', closeSidebar));

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeSidebar();
    });
  };

  /* --------------------------------------------------------------------
     Active menu highlighting
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
     Dropdown (notifications / profile)
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
      qsa('.dash-notif-panel.is-open, .dash-profile-menu.is-open').forEach((el) => el.classList.remove('is-open'));
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
     Counter animation for overview stat cards
     Supports plain integers and a "thousands" formatted mode (with an
     optional prefix such as "Rs ") for the revenue card.
  -------------------------------------------------------------------- */
  const animateCounter = (el) => {
    const target = parseFloat(el.getAttribute('data-count'));
    if (Number.isNaN(target)) return;

    const prefix = el.getAttribute('data-prefix') || '';
    const format = el.getAttribute('data-format');

    const formatValue = (value) => {
      const rounded = Math.round(value);
      const display = format === 'thousands' ? rounded.toLocaleString() : String(rounded);
      return `${prefix}${display}`;
    };

    if (prefersReducedMotion) {
      el.textContent = formatValue(target);
      return;
    }

    const duration = 1300;
    const startTime = performance.now();

    const step = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = formatValue(target * eased);

      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        el.textContent = formatValue(target);
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
     Analytics — CSS bar chart with tab-switchable demo datasets
  -------------------------------------------------------------------- */
  const chartDatasets = {
    weekly: [
      { label: 'Mon', value: 34 }, { label: 'Tue', value: 41 }, { label: 'Wed', value: 38 },
      { label: 'Thu', value: 47 }, { label: 'Fri', value: 52 }, { label: 'Sat', value: 58 }, { label: 'Sun', value: 29 }
    ],
    monthly: [
      { label: 'Feb', value: 118 }, { label: 'Mar', value: 132 }, { label: 'Apr', value: 127 },
      { label: 'May', value: 145 }, { label: 'Jun', value: 158 }, { label: 'Jul', value: 171 }
    ],
    growth: [
      { label: 'Feb', value: 2680 }, { label: 'Mar', value: 2810 }, { label: 'Apr', value: 2940 },
      { label: 'May', value: 3025 }, { label: 'Jun', value: 3120 }, { label: 'Jul', value: 3214 }
    ]
  };

  const renderChart = (key) => {
    const container = qs('#chartBars');
    if (!container) return;

    const dataset = chartDatasets[key] || chartDatasets.weekly;
    const maxValue = Math.max(...dataset.map((point) => point.value));

    container.innerHTML = dataset.map((point) => `
      <div class="chart-bar">
        <div class="bar ${point.value === maxValue ? 'is-peak' : ''}" data-height="${(point.value / maxValue) * 100}" style="height:0%;"></div>
        <span>${point.label}</span>
      </div>
    `).join('');

    requestAnimationFrame(() => {
      window.setTimeout(() => {
        qsa('.bar', container).forEach((bar) => {
          bar.style.height = prefersReducedMotion ? `${bar.getAttribute('data-height')}%` : `${bar.getAttribute('data-height')}%`;
        });
      }, 80);
    });
  };

  const initChartTabs = () => {
    const tabs = qsa('.chart-tab');
    if (!tabs.length) return;

    renderChart('weekly');

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        tabs.forEach((t) => t.classList.remove('is-active'));
        tab.classList.add('is-active');
        renderChart(tab.getAttribute('data-chart'));
      });
    });
  };

  /* --------------------------------------------------------------------
     Orders management — mock data, render, filter
  -------------------------------------------------------------------- */
  const orders = [
    { id: 'RC-04521', customer: 'Bilal Hussain', avatar: 'https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?auto=format&fit=crop&w=100&q=80', address: 'House 12, Model Town', status: 'progress', label: 'Processing', driver: 'Imran S.', payment: 'Paid' },
    { id: 'RC-04522', customer: 'Sara Qureshi', avatar: 'https://images.unsplash.com/photo-1552058544-f2b08422138a?auto=format&fit=crop&w=100&q=80', address: 'Suite 4, Business Bay', status: 'pending', label: 'Pending', driver: 'Unassigned', payment: 'Unpaid' },
    { id: 'RC-04523', customer: 'Amara Noor', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=100&q=80', address: 'Falak Residency, Block C', status: 'ready', label: 'Out for Delivery', driver: 'Zainab A.', payment: 'Paid' },
    { id: 'RC-04524', customer: 'Farhan Khan', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&q=80', address: 'Airport Road, Tower 2', status: 'done', label: 'Delivered', driver: 'Imran S.', payment: 'Paid' },
    { id: 'RC-04525', customer: 'Hina Malik', avatar: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=100&q=80', address: 'Cotton Club Apartments', status: 'pending', label: 'Pending', driver: 'Unassigned', payment: 'Unpaid' },
    { id: 'RC-04526', customer: 'Usman Tariq', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=100&q=80', address: 'Serena Suites, Room 220', status: 'progress', label: 'Processing', driver: 'Zainab A.', payment: 'Paid' },
    { id: 'RC-04527', customer: 'Mehreen Ali', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=100&q=80', address: 'Nishat Textiles HQ', status: 'cancelled', label: 'Cancelled', driver: '—', payment: 'Refunded' },
    { id: 'RC-04528', customer: 'Bilal Hussain', avatar: 'https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?auto=format&fit=crop&w=100&q=80', address: 'House 12, Model Town', status: 'done', label: 'Delivered', driver: 'Imran S.', payment: 'Paid' }
  ];

  let activeOrderFilter = 'all';

  const renderOrders = () => {
    const tbody = qs('#ordersTableBody');
    if (!tbody) return;

    const filtered = activeOrderFilter === 'all'
      ? orders
      : orders.filter((order) => order.status === activeOrderFilter);

    if (!filtered.length) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:24px; color:var(--ash);">No orders match this filter.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map((order) => `
      <tr>
        <td><strong>${order.id}</strong></td>
        <td>
          <div class="customer-cell">
            <img src="${order.avatar}" alt="">
            <strong>${order.customer}</strong>
          </div>
        </td>
        <td>${order.address}</td>
        <td><span class="status-pill status-pill--${order.status}">${order.label}</span></td>
        <td>${order.driver}</td>
        <td>${order.payment}</td>
        <td>
          <div class="row-actions">
            <button type="button" class="row-action" data-view="${order.id}" aria-label="View ${order.id}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
            <button type="button" class="row-action" data-advance="${order.id}" aria-label="Advance ${order.id}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          </div>
        </td>
      </tr>
    `).join('');

    qsa('[data-view]', tbody).forEach((btn) => {
      btn.addEventListener('click', () => showToast(`Opening details for ${btn.getAttribute('data-view')}…`));
    });

    qsa('[data-advance]', tbody).forEach((btn) => {
      btn.addEventListener('click', () => advanceOrderStatus(btn.getAttribute('data-advance')));
    });
  };

  const statusFlow = ['pending', 'progress', 'ready', 'done'];
  const statusLabels = { pending: 'Pending', progress: 'Processing', ready: 'Out for Delivery', done: 'Delivered' };

  const advanceOrderStatus = (id) => {
    const order = orders.find((o) => o.id === id);
    if (!order || order.status === 'cancelled') {
      showToast('This order cannot be advanced.');
      return;
    }

    const currentIndex = statusFlow.indexOf(order.status);
    if (currentIndex < statusFlow.length - 1) {
      order.status = statusFlow[currentIndex + 1];
      order.label = statusLabels[order.status];
      renderOrders();
      showToast(`${id} moved to ${order.label}.`);
    } else {
      showToast(`${id} is already delivered.`);
    }
  };

  const initOrderFilters = () => {
    const tabs = qsa('#orderFilterTabs button');
    if (!tabs.length) return;

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        tabs.forEach((t) => t.classList.remove('is-active'));
        tab.classList.add('is-active');
        activeOrderFilter = tab.getAttribute('data-filter');
        renderOrders();
      });
    });
  };

  /* --------------------------------------------------------------------
     Laundry queue — grouped by stage
  -------------------------------------------------------------------- */
  const queueStages = [
    { key: 'sorting', label: 'Sorting', items: ['RC-04529 · 3 shirts', 'RC-04530 · Bedsheet set'] },
    { key: 'washing', label: 'Washing', items: ['RC-04521 · Suit + shirts', 'RC-04526 · Curtains'] },
    { key: 'pressing', label: 'Pressing', items: ['RC-04520 · 2 blazers'] },
    { key: 'ready', label: 'Ready for Dispatch', items: ['RC-04523 · Bridal gown', 'RC-04524 · Leather jacket'] }
  ];

  const renderQueue = () => {
    const container = qs('#queueGrid');
    if (!container) return;

    container.innerHTML = queueStages.map((stage) => `
      <div class="queue-column">
        <h4>${stage.label}<span>${stage.items.length}</span></h4>
        ${stage.items.map((item) => {
          const [ticket, detail] = item.split(' · ');
          return `<div class="queue-card"><strong>${ticket}</strong><span>${detail}</span></div>`;
        }).join('')}
      </div>
    `).join('');
  };

  /* --------------------------------------------------------------------
     Recent activity timeline
  -------------------------------------------------------------------- */
  const activityEvents = [
    { icon: 'pickup', text: 'Ticket RC-04521 picked up by Imran S.', time: '18 minutes ago' },
    { icon: 'user', text: 'New customer registered — Hina Malik.', time: '52 minutes ago' },
    { icon: 'delivered', text: 'Ticket RC-04498 marked as delivered.', time: '1 hour ago' },
    { icon: 'driver', text: 'Zainab A. assigned to ticket RC-04526.', time: '2 hours ago' }
  ];

  const activityIcons = {
    pickup: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v2M4 8h16M4 8v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/></svg>',
    user: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 0 0-16 0"/></svg>',
    delivered: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 6L9 17l-5-5"/></svg>',
    driver: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 12h13l-3-3m3 3l-3 3"/><path d="M16 6h2a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3h-2"/></svg>'
  };

  const renderActivity = () => {
    const container = qs('#activityTimeline');
    if (!container) return;

    container.innerHTML = activityEvents.map((event) => `
      <li class="activity-item">
        <span class="activity-dot">${activityIcons[event.icon] || ''}</span>
        <div class="activity-body">
          <p>${event.text}</p>
          <span>${event.time}</span>
        </div>
      </li>
    `).join('');
  };

  /* --------------------------------------------------------------------
     Pickup requests
  -------------------------------------------------------------------- */
  const pickupRequests = [
    { day: '09', month: 'Jul', title: 'Wash & Fold — Sara Qureshi', meta: '8 – 10 AM · Business Bay' },
    { day: '09', month: 'Jul', title: 'Dry Cleaning — Hina Malik', meta: '2 – 4 PM · Cotton Club Apartments' },
    { day: '10', month: 'Jul', title: 'Curtains — Nishat Textiles', meta: '10 AM – 12 PM · Textile HQ' }
  ];

  const renderPickups = () => {
    const container = qs('#pickupList');
    if (!container) return;

    container.innerHTML = pickupRequests.map((pickup) => `
      <li class="schedule-item">
        <div class="schedule-date"><strong>${pickup.day}</strong><span>${pickup.month}</span></div>
        <div class="schedule-body">
          <h4>${pickup.title}</h4>
          <p>${pickup.meta}</p>
        </div>
      </li>
    `).join('');
  };

  /* --------------------------------------------------------------------
     Staff overview
  -------------------------------------------------------------------- */
  const staff = [
    { name: 'Imran Siddiqui', role: 'Driver', status: 'on-route', label: 'On Route', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=100&q=80', value: '4', unit: 'stops left' },
    { name: 'Zainab Ahmed', role: 'Driver', status: 'available', label: 'Available', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=100&q=80', value: '0', unit: 'assigned' },
    { name: 'Kashif Raza', role: 'Presser', status: 'off-shift', label: 'Off Shift', avatar: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=100&q=80', value: '—', unit: 'ends 6 PM' }
  ];

  const renderStaff = () => {
    const container = qs('#staffList');
    if (!container) return;

    container.innerHTML = staff.map((member) => `
      <div class="staff-row">
        <img src="${member.avatar}" alt="">
        <div>
          <h4>${member.name}</h4>
          <p><span class="dot-status dot-status--${member.status}"></span>${member.label} · ${member.role}</p>
        </div>
        <div class="row-value">
          <strong>${member.value}</strong>
          <span>${member.unit}</span>
        </div>
      </div>
    `).join('');
  };

  /* --------------------------------------------------------------------
     Top customers
  -------------------------------------------------------------------- */
  const topCustomers = [
    { name: 'Bilal Hussain', plan: 'Household Monthly', avatar: 'https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?auto=format&fit=crop&w=100&q=80', spend: 'Rs 6,500' },
    { name: 'Business Bay Hotel', plan: 'Business Account', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&q=80', spend: 'Rs 42,000' },
    { name: 'Sara Qureshi', plan: 'Pay As You Go', avatar: 'https://images.unsplash.com/photo-1552058544-f2b08422138a?auto=format&fit=crop&w=100&q=80', spend: 'Rs 1,750' }
  ];

  const renderCustomers = () => {
    const container = qs('#customerList');
    if (!container) return;

    container.innerHTML = topCustomers.map((customer) => `
      <div class="customer-row">
        <img src="${customer.avatar}" alt="">
        <div>
          <h4>${customer.name}</h4>
          <p>${customer.plan}</p>
        </div>
        <div class="row-value">
          <strong>${customer.spend}</strong>
          <span>this month</span>
        </div>
      </div>
    `).join('');
  };

  /* --------------------------------------------------------------------
     Quick actions + header add-order button
  -------------------------------------------------------------------- */
  const initQuickActions = () => {
    const runWithLoadingState = (button, message, duration = 900) => {
      const originalHTML = button.innerHTML;
      button.disabled = true;
      button.style.opacity = '.7';

      window.setTimeout(() => {
        button.disabled = false;
        button.style.opacity = '';
        button.innerHTML = originalHTML;
        showToast(message);
      }, duration);
    };

    qs('#addOrderBtn')?.addEventListener('click', function () {
      runWithLoadingState(this, 'New order form would open here.');
    });

    qs('#qaAddOrder')?.addEventListener('click', function () {
      runWithLoadingState(this, 'New order form would open here.');
    });

    qs('#qaAssignDriver')?.addEventListener('click', function () {
      runWithLoadingState(this, 'Driver assignment panel would open here.');
    });

    qs('#assignDriverBtn')?.addEventListener('click', () => {
      showToast('Driver assignment panel would open here.');
    });

    qs('#qaGenerateReport')?.addEventListener('click', function () {
      runWithLoadingState(this, 'Generating report…', 1100);
    });

    qs('#qaPrintInvoice')?.addEventListener('click', function () {
      const button = this;
      runWithLoadingState(button, 'Preparing invoice for print…', 1000);

      window.setTimeout(() => {
        window.setTimeout(() => showToast('Invoice ready.'), 1100);
      }, 0);
    });
  };

  /* --------------------------------------------------------------------
     Logout
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
     Scroll reveal
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
    initStatCounters();
    initChartTabs();
    renderOrders();
    initOrderFilters();
    renderQueue();
    renderActivity();
    renderPickups();
    renderStaff();
    renderCustomers();
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