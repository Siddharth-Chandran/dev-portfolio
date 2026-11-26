import { inject } from '@vercel/analytics';
import {
  initPortfolioMotion,
  animateFilteredGroup,
  refreshScrollTriggers,
} from './animations.js';

// Initialize Vercel Web Analytics
inject();

const THEME_STORAGE_KEY = 'sidchan-theme';

/**
 * Theme Controller
 * Syncs <html data-theme>, <meta name="color-scheme">, <meta name="theme-color">,
 * localStorage persistence, and cross-tab storage events.
 */
function initThemeToggle() {
  const toggleBtn = document.getElementById('theme-toggle');
  const colorSchemeMeta = document.querySelector('meta[name="color-scheme"]');
  const themeColorMeta = document.querySelector('meta[name="theme-color"]');

  const applyTheme = (theme, persist = false) => {
    const resolved = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', resolved);

    if (colorSchemeMeta) {
      colorSchemeMeta.setAttribute('content', resolved);
    }
    if (themeColorMeta) {
      themeColorMeta.setAttribute('content', resolved === 'light' ? '#f6f5f0' : '#0a0d0c');
    }
    if (toggleBtn) {
      const nextLabel =
        resolved === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';
      toggleBtn.setAttribute('aria-label', nextLabel);
    }

    if (persist) {
      try {
        localStorage.setItem(THEME_STORAGE_KEY, resolved);
      } catch {
        /* Ignore storage errors in restricted environments */
      }
    }
  };

  // Sync initial aria-label with the pre-paint theme state
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  applyTheme(current, false);

  toggleBtn?.addEventListener('click', () => {
    const active = document.documentElement.getAttribute('data-theme') || 'light';
    const next = active === 'dark' ? 'light' : 'dark';
    applyTheme(next, true);
  });

  window.addEventListener('storage', (event) => {
    if (event.key === THEME_STORAGE_KEY) {
      const next =
        event.newValue === 'light' || event.newValue === 'dark' ? event.newValue : 'light';
      applyTheme(next, false);
    } else if (event.key === null) {
      applyTheme('light', false);
    }
  });
}

/**
 * Mobile Navigation Drawer (<dialog>)
 * Uses native modal focus-trapping, Escape key dismissal, and backdrop close.
 */
function initMobileDrawer() {
  const drawer = document.getElementById('mobile-drawer');
  const openBtn = document.getElementById('menu-toggle');
  const closeBtn = document.getElementById('menu-close');
  if (!drawer || !openBtn || !closeBtn) return;

  let restoreFocusOnClose = true;

  const openDrawer = () => {
    if (drawer.open) return;
    restoreFocusOnClose = true;
    drawer.showModal();
    openBtn.setAttribute('aria-expanded', 'true');
  };

  const closeDrawer = (restoreFocus = true) => {
    if (!drawer.open) return;
    restoreFocusOnClose = restoreFocus;
    drawer.close();
  };

  openBtn.addEventListener('click', openDrawer);
  closeBtn.addEventListener('click', () => closeDrawer(true));

  drawer.addEventListener('close', () => {
    openBtn.setAttribute('aria-expanded', 'false');
    if (restoreFocusOnClose) {
      openBtn.focus();
    }
    restoreFocusOnClose = true;
  });

  // Close on backdrop click
  drawer.addEventListener('click', (event) => {
    if (event.target === drawer) {
      closeDrawer(true);
    }
  });

  // Close drawer when navigating to an anchor link without pulling focus back to menu-toggle
  drawer.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', () => {
      closeDrawer(false);
    });
  });

  // Close drawer if viewport widens to desktop where menu-toggle is hidden
  const desktopMq = window.matchMedia('(min-width: 768px)');
  desktopMq.addEventListener('change', (event) => {
    if (event.matches && drawer.open) {
      closeDrawer(false);
    }
  });
}

/**
 * Scrollspy Fallback + aria-current Sync
 * Mirrors native scroll-target-group / :target-current for browsers without support
 * and keeps aria-current updated for assistive tech.
 */
function initScrollspy() {
  const navLinks = Array.from(document.querySelectorAll('.site-nav .nav-link'));
  const sections = Array.from(document.querySelectorAll('main > section[id]'));
  if (!navLinks.length || !sections.length) return;

  const setActiveLink = (activeId) => {
    navLinks.forEach((link) => {
      const isMatch = link.getAttribute('href') === `#${activeId}`;
      link.classList.toggle('is-active', isMatch);
      if (isMatch) {
        link.setAttribute('aria-current', 'location');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  };

  if (
    CSS.supports('scroll-target-group: auto') &&
    CSS.supports('selector(:target-current)')
  ) {
    const syncNativeTarget = () => {
      const currentLink = document.querySelector('.site-nav .nav-link:target-current');
      navLinks.forEach((link) => {
        if (link === currentLink) {
          link.setAttribute('aria-current', 'location');
        } else {
          link.removeAttribute('aria-current');
        }
      });
    };
    syncNativeTarget();
    document.addEventListener('scrollend', syncNativeTarget, { passive: true });
    window.addEventListener('hashchange', syncNativeTarget);
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveLink(entry.target.id);
        }
      });
    },
    {
      rootMargin: '-35% 0px -55% 0px',
      threshold: 0,
    }
  );

  sections.forEach((section) => observer.observe(section));

  // Ensure last section activates when scrolled to the bottom on tall viewports
  const syncScrollEdges = () => {
    const atBottom =
      window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 24;
    if (atBottom) {
      setActiveLink(sections[sections.length - 1].id);
    }
  };
  document.addEventListener('scrollend', syncScrollEdges, { passive: true });
}

/**
 * Project Era Filter
 * Filters between All (7), The AI Era (3), and Foundations (4) while keeping
 * ScrollTrigger heights accurate and announcing updates politely.
 */
function initProjectFilters() {
  const filterBtns = Array.from(document.querySelectorAll('.filter-btn'));
  const groups = Array.from(document.querySelectorAll('.project-group'));
  const liveStatus = document.getElementById('filter-live-status');
  if (!filterBtns.length || !groups.length) return;

  filterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const filter = btn.getAttribute('data-filter') || 'all';

      filterBtns.forEach((item) => {
        const active = item === btn;
        item.classList.toggle('is-active', active);
        item.setAttribute('aria-pressed', String(active));
      });

      let visibleCount = 0;
      groups.forEach((group) => {
        const groupKey = group.getAttribute('data-group');
        const show = filter === 'all' || groupKey === filter;
        group.hidden = !show;
        if (show) {
          visibleCount += group.querySelectorAll('.project-card').length;
          animateFilteredGroup(group);
        }
      });

      if (liveStatus) {
        const label =
          filter === 'all'
            ? `Showing all ${visibleCount} projects`
            : `Showing ${visibleCount} projects in ${btn.textContent.replace(/\d+/g, '').trim()}`;
        liveStatus.textContent = label;
      }

      refreshScrollTriggers();
    });
  });
}

/**
 * Copy Email & Accessible Toast Notifications
 * Supports Invoker Commands (--copy) with click fallback, Async Clipboard API +
 * execCommand fallback, repeated-trigger timer reset, and focus-safe toast dismissal.
 */
function initCopyAndToast() {
  const toast = document.getElementById('copy-toast');
  const toastMsg = document.getElementById('toast-message');
  const toastClose = document.getElementById('toast-close');
  const toastLive = document.getElementById('toast-live');

  const supportsPopover = toast && typeof toast.showPopover === 'function';

  let dismissTimer = null;
  let lastTrigger = null;
  let lastAnnouncement = '';
  const buttonTimers = new WeakMap();

  const isToastOpen = () => {
    if (!toast) return false;
    return supportsPopover
      ? toast.matches(':popover-open')
      : toast.classList.contains('is-open');
  };

  const isToastInteracting = () => {
    if (!toast) return false;
    return toast.matches(':hover') || toast.contains(document.activeElement);
  };

  const hideToast = () => {
    if (!toast) return;
    clearTimeout(dismissTimer);
    const wasFocusedInside = toast.contains(document.activeElement);

    if (supportsPopover) {
      if (toast.matches(':popover-open')) {
        toast.hidePopover();
      }
    } else {
      toast.classList.remove('is-open');
    }

    if (wasFocusedInside && lastTrigger && typeof lastTrigger.focus === 'function') {
      lastTrigger.focus();
    }
  };

  const scheduleHide = () => {
    clearTimeout(dismissTimer);
    dismissTimer = setTimeout(() => {
      if (isToastInteracting()) {
        scheduleHide();
        return;
      }
      hideToast();
    }, 3200);
  };

  const showToast = (message, ok, triggerEl) => {
    if (!toast || !toastMsg) return;
    lastTrigger = triggerEl || null;
    toast.setAttribute('data-variant', ok ? 'success' : 'error');
    toastMsg.textContent = message;

    if (supportsPopover) {
      if (!toast.matches(':popover-open')) {
        toast.showPopover();
      }
    } else {
      toast.classList.add('is-open');
    }

    if (toastLive) {
      let announcement = message;
      if (announcement === lastAnnouncement) {
        announcement += '\u00A0';
      }
      lastAnnouncement = announcement;
      toastLive.textContent = announcement;
    }

    scheduleHide();
  };

  toastClose?.addEventListener('click', hideToast);
  toast?.addEventListener('mouseleave', () => {
    if (isToastOpen()) {
      scheduleHide();
    }
  });
  toast?.addEventListener('focusout', () => {
    if (isToastOpen()) {
      scheduleHide();
    }
  });

  const legacyCopy = (text) => {
    const previousFocus = document.activeElement;
    const field = Object.assign(document.createElement('textarea'), { value: text });
    field.setAttribute('readonly', '');
    field.style.cssText = 'position:fixed;inset-block-start:0;opacity:0';
    document.body.append(field);
    field.select();
    try {
      return document.execCommand('copy');
    } catch {
      return false;
    } finally {
      field.remove();
      previousFocus?.focus?.({ preventScroll: true });
    }
  };

  const markButtonState = (button, ok) => {
    clearTimeout(buttonTimers.get(button));
    button.removeAttribute('data-copied');
    button.removeAttribute('data-failed');

    const labelEl = button.querySelector('.copy-btn-label');
    const originalLabel = labelEl ? labelEl.dataset.originalLabel || labelEl.textContent : '';
    if (labelEl && !labelEl.dataset.originalLabel) {
      labelEl.dataset.originalLabel = originalLabel;
    }

    void button.offsetWidth;
    button.setAttribute(ok ? 'data-copied' : 'data-failed', '');
    if (labelEl) {
      labelEl.textContent = ok ? 'Copied' : 'Copy Failed';
    }

    buttonTimers.set(
      button,
      setTimeout(() => {
        button.removeAttribute('data-copied');
        button.removeAttribute('data-failed');
        if (labelEl && labelEl.dataset.originalLabel) {
          labelEl.textContent = labelEl.dataset.originalLabel;
        }
      }, 2200)
    );
  };

  const handleCopy = async (button, target) => {
    if (!target) return;
    const text = target.matches('input, textarea')
      ? target.value
      : target.textContent.trim();
    if (!text) return;

    let ok = true;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      ok = legacyCopy(text);
    }

    markButtonState(button, ok);
    showToast(
      ok ? `Copied ${text} to clipboard` : 'Unable to copy email automatically',
      ok,
      button
    );
  };

  if ('CommandEvent' in window) {
    document.addEventListener(
      'command',
      (event) => {
        if (event.command === '--copy') {
          handleCopy(event.source, event.target);
        }
      },
      true
    );
  } else {
    document.addEventListener('click', (event) => {
      if (event.defaultPrevented) return;
      const button = event.target.closest('button[command="--copy"]');
      if (!button) return;
      const target = document.getElementById(button.getAttribute('commandfor'));
      if (target) {
        handleCopy(button, target);
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initThemeToggle();
  initMobileDrawer();
  initScrollspy();
  initProjectFilters();
  initCopyAndToast();
  initPortfolioMotion();
});
