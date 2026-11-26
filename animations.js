import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * Authored GSAP + ScrollTrigger Motion Layer
 * - Content below the fold stays visible (opacity: 1) at rest so fast scrolling,
 *   deep links, and reduced-motion screenshots never encounter hidden sections.
 * - Uses GPU-composited transforms and clears inline properties after settle.
 */
export function initPortfolioMotion() {
  const mm = gsap.matchMedia();

  mm.add('(prefers-reduced-motion: no-preference)', () => {
    const heroLead = document.querySelector('[data-hero-lead]');
    const heroSupport = document.querySelectorAll('[data-hero-support]');
    const heroDossier = document.querySelector('[data-hero-dossier]');

    const heroTl = gsap.timeline({
      defaults: { ease: 'power3.out', clearProps: 'transform,opacity' },
    });

    if (heroLead) {
      heroTl.from(heroLead, {
        y: 18,
        opacity: 0,
        duration: 0.48,
      });
    }

    if (heroSupport.length) {
      heroTl.from(
        heroSupport,
        {
          y: 12,
          opacity: 0,
          duration: 0.42,
          stagger: 0.07,
        },
        0.08
      );
    }

    if (heroDossier) {
      heroTl.from(
        heroDossier,
        {
          y: 16,
          scale: 0.98,
          opacity: 0,
          duration: 0.48,
        },
        0.12
      );
    }

    // Subtle below-fold positional settle without hiding opacity
    const revealTargets = gsap.utils.toArray('[data-reveal]');
    const initialFold = window.innerHeight * 0.92;
    const belowFold = revealTargets.filter(
      (el) => el.getBoundingClientRect().top > initialFold
    );

    if (belowFold.length) {
      ScrollTrigger.batch(belowFold, {
        start: 'top 93%',
        once: true,
        onEnter: (batch) => {
          gsap.fromTo(
            batch,
            { y: 14 },
            {
              y: 0,
              duration: 0.44,
              stagger: { each: 0.055, from: 'start' },
              ease: 'power3.out',
              overwrite: 'auto',
              clearProps: 'transform',
            }
          );
        },
      });
    }
  });

  // Under reduced motion, ensure everything rests immediately visible with zero spatial travel
  mm.add('(prefers-reduced-motion: reduce)', () => {
    const heroItems = document.querySelectorAll(
      '[data-hero-lead], [data-hero-support], [data-hero-dossier]'
    );
    gsap.set(heroItems, { opacity: 1, clearProps: 'transform' });
  });
}

export function animateFilteredGroup(groupEl) {
  if (!groupEl) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  gsap.fromTo(
    groupEl,
    { y: 10, opacity: 0.72 },
    {
      y: 0,
      opacity: 1,
      duration: 0.24,
      ease: 'power2.out',
      overwrite: 'auto',
      clearProps: 'transform,opacity',
    }
  );
}

export function refreshScrollTriggers() {
  ScrollTrigger.refresh();
}
