'use strict';

/* ============================================================================
   RECCO — login.js
   Handles both customer-login.html and admin-login.html.
   Frontend-only demo authentication — no backend, no database.

   Customer demo credentials  : recco123 / recco123 -> customer-dashboard.html
   Admin demo credentials     : admin123 / recco123 -> admin-dashboard.html
   ========================================================================== */

(() => {

  const qs = (selector, scope = document) => scope.querySelector(selector);

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* --------------------------------------------------------------------
     Demo credential store
     Keyed by login mode so the same script can serve both pages.
  -------------------------------------------------------------------- */
  const DEMO_CREDENTIALS = {
    customer: {
      username: 'recco123',
      password: 'recco123',
      redirect: 'customer-dashboard.html'
    },
    admin: {
      username: 'admin123',
      password: 'recco123',
      redirect: 'admin-dashboard.html'
    }
  };

  /* --------------------------------------------------------------------
     Toast helper (shared markup: #toast / #toastMsg)
  -------------------------------------------------------------------- */
  const showToast = (message) => {
    const toast = qs('#toast');
    const toastMsg = qs('#toastMsg');
    if (!toast || !toastMsg) return;

    toastMsg.textContent = message;
    toast.classList.add('is-visible');
    window.setTimeout(() => toast.classList.remove('is-visible'), 3200);
  };

  /* --------------------------------------------------------------------
     Password visibility toggle
     Works for any [data-toggle-target] button present on the page.
  -------------------------------------------------------------------- */
  const initPasswordToggles = () => {
    document.querySelectorAll('.field-toggle').forEach((toggle) => {
      toggle.addEventListener('click', () => {
        const targetId = toggle.getAttribute('data-toggle-target');
        const input = document.getElementById(targetId);
        if (!input) return;

        const willShow = input.type === 'password';
        input.type = willShow ? 'text' : 'password';
        toggle.classList.toggle('is-active', willShow);
        toggle.setAttribute('aria-label', willShow ? 'Hide password' : 'Show password');
      });
    });
  };

  /* --------------------------------------------------------------------
     Field-level validation helpers
  -------------------------------------------------------------------- */
  const setFieldError = (fieldEl, hasError) => {
    if (!fieldEl) return;
    fieldEl.classList.toggle('has-error', hasError);
  };

  const clearAllFieldErrors = (form) => {
    form.querySelectorAll('.field').forEach((field) => field.classList.remove('has-error'));
  };

  const validateRequired = (input, fieldEl) => {
    const isValid = input.value.trim() !== '';
    setFieldError(fieldEl, !isValid);
    return isValid;
  };

  /* --------------------------------------------------------------------
     Inline alert banner (#authAlert / #authAlertMsg)
  -------------------------------------------------------------------- */
  const showAuthAlert = (message) => {
    const alertEl = qs('#authAlert');
    const alertMsg = qs('#authAlertMsg');
    if (!alertEl) return;

    if (alertMsg && message) alertMsg.textContent = message;
    alertEl.classList.add('is-visible');
  };

  const hideAuthAlert = () => {
    const alertEl = qs('#authAlert');
    alertEl?.classList.remove('is-visible');
  };

  /* --------------------------------------------------------------------
     Shake animation on the auth card for failed submissions
  -------------------------------------------------------------------- */
  const triggerShake = () => {
    const card = qs('#authCard');
    if (!card || prefersReducedMotion) return;

    card.classList.remove('is-shaking');
    // Force reflow so the animation can be re-triggered on repeated failures.
    void card.offsetWidth;
    card.classList.add('is-shaking');
  };

  /* --------------------------------------------------------------------
     Submit button loading state
  -------------------------------------------------------------------- */
  const setButtonLoading = (button, isLoading) => {
    if (!button) return;
    button.classList.toggle('is-loading', isLoading);
    button.disabled = isLoading;
  };

  /* --------------------------------------------------------------------
     Core login handler
     Shared logic for both customer and admin forms — validates required
     fields, simulates a network delay with a loading spinner, checks the
     demo credentials, then either redirects or shows an inline error with
     a shake animation.
  -------------------------------------------------------------------- */
  const handleLoginSubmit = ({
    form,
    identifierInput,
    identifierField,
    passwordInput,
    passwordField,
    submitButton,
    mode
  }) => (event) => {
    event.preventDefault();
    hideAuthAlert();

    const isIdentifierValid = validateRequired(identifierInput, identifierField);
    const isPasswordValid = validateRequired(passwordInput, passwordField);

    if (!isIdentifierValid || !isPasswordValid) {
      triggerShake();
      return;
    }

    const credentials = DEMO_CREDENTIALS[mode];
    setButtonLoading(submitButton, true);

    // Simulate a realistic network round-trip (1–2 seconds) before
    // resolving the login attempt, as required for the demo experience.
    const delay = 1200 + Math.random() * 600;

    window.setTimeout(() => {
      const enteredUser = identifierInput.value.trim();
      const enteredPass = passwordInput.value;

      const isMatch = enteredUser === credentials.username && enteredPass === credentials.password;

      if (isMatch) {
        showToast('Signed in successfully. Redirecting…');
        window.location.href = credentials.redirect;
        return;
      }

      // Invalid credentials — keep the user on the page.
      setButtonLoading(submitButton, false);
      setFieldError(identifierField, true);
      setFieldError(passwordField, true);
      showAuthAlert(
        mode === 'admin'
          ? 'Invalid admin email or password. Please try again.'
          : 'Invalid email or password. Please try again.'
      );
      triggerShake();
      passwordInput.value = '';
      passwordInput.focus();
    }, delay);
  };

  /* --------------------------------------------------------------------
     Live-clear field errors as the user corrects their input
  -------------------------------------------------------------------- */
  const initLiveClearing = (form) => {
    form.querySelectorAll('input').forEach((input) => {
      input.addEventListener('input', () => {
        const field = input.closest('.field');
        if (field && input.value.trim() !== '') {
          field.classList.remove('has-error');
        }
        hideAuthAlert();
      });
    });
  };

  /* --------------------------------------------------------------------
     Customer login wiring
  -------------------------------------------------------------------- */
  const initCustomerLogin = () => {
    const form = qs('#customerLoginForm');
    if (!form) return;

    const identifierInput = qs('#customerEmail');
    const identifierField = qs('#emailField');
    const passwordInput = qs('#customerPassword');
    const passwordField = qs('#passwordField');
    const submitButton = qs('#customerSubmitBtn');

    form.addEventListener('submit', handleLoginSubmit({
      form,
      identifierInput,
      identifierField,
      passwordInput,
      passwordField,
      submitButton,
      mode: 'customer'
    }));

    initLiveClearing(form);

    qs('#customerForgotLink')?.addEventListener('click', (event) => {
      event.preventDefault();
      showToast('Password reset link sent to your email.');
    });
  };

  /* --------------------------------------------------------------------
     Admin login wiring
  -------------------------------------------------------------------- */
  const initAdminLogin = () => {
    const form = qs('#adminLoginForm');
    if (!form) return;

    const identifierInput = qs('#adminEmail');
    const identifierField = qs('#emailField');
    const passwordInput = qs('#adminPassword');
    const passwordField = qs('#passwordField');
    const submitButton = qs('#adminSubmitBtn');

    form.addEventListener('submit', handleLoginSubmit({
      form,
      identifierInput,
      identifierField,
      passwordInput,
      passwordField,
      submitButton,
      mode: 'admin'
    }));

    initLiveClearing(form);

    qs('#adminForgotLink')?.addEventListener('click', (event) => {
      event.preventDefault();
      showToast('Ask your depot manager to reset your password.');
    });
  };

  /* --------------------------------------------------------------------
     Init — determined by the data-mode attribute on the script tag
  -------------------------------------------------------------------- */
  const init = () => {
    const scriptTag = document.currentScript || qs('script[data-mode]');
    const mode = scriptTag ? scriptTag.getAttribute('data-mode') : 'customer';

    initPasswordToggles();

    if (mode === 'customer') initCustomerLogin();
    if (mode === 'admin') initAdminLogin();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();