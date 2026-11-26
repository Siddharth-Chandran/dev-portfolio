import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * Authored Motion Layer
 * - Content always remains visible (opacity: 1) below the fold so screenshots,
 *   anchor jumps, and fast scrolling never encounter invisible regions.
 * - Uses compositor-only properties (transform, opacity) and clears inline styles.
 */
export function initPortfolioMotion() {
  const mm = gsap.matchMedia();

  mm.add('(prefers-reduced-motion: no-preference)', () => {
    // 1. Focal Hero Entrance (single rehearsed sequence on load)
    const heroLead = document.querySelector('[data-hero-lead]');
    const heroSupport = document.querySelectorAll('[data-hero-support]');
    const heroDecoration = document.querySelector('[data-hero-decoration]');
    const heroPanel = document.querySelector('[data-hero-panel]');

    const heroTl = gsap.timeline({
      defaults: { ease: 'power3.out', clearProps: 'transform,opacity' },
    });

    if (heroLead) {
      heroTl.from(heroLead, {
        y: 16,
        opacity: 0,
        duration: 0.5,
      });
    }

    if (heroDecoration) {
      heroTl.from(
        heroDecoration,
        {
          opacity: 0,
          duration: 0.35,
        },
        0.04
      );
    }

    if (heroSupport.length) {
      heroTl.from(
        heroSupport,
        {
          y: 12,
          opacity: 0,
          duration: 0.45,
          stagger: 0.08,
        },
        0.08
      );
    }

    if (heroPanel) {
      heroTl.from(
        heroPanel,
        {
          y: 14,
          scale: 0.98,
          opacity: 0,
          duration: 0.5,
        },
        0.14
      );
    }

    // 2. Subtle spatial settle on scroll without ever hiding content (opacity stays 1)
    const revealTargets = gsap.utils.toArray('[data-reveal]');
    const initialFold = window.innerHeight * 0.95;

    const belowFold = revealTargets.filter((el) => {
      const rect = el.getBoundingClientRect();
      return rect.top > initialFold;
    });

    if (belowFold.length) {
      ScrollTrigger.batch(belowFold, {
        start: 'top 94%',
        once: true,
        onEnter: (batch) => {
          gsap.fromTo(
            batch,
            { y: 12 },
            {
              y: 0,
              duration: 0.42,
              stagger: { each: 0.05, from: 'start' },
              ease: 'power3.out',
              overwrite: 'auto',
              clearProps: 'transform',
            }
          );
        },
      });
    }

    // 3. Subtle authored highlight on the Save the Date motion curve (remains visible at rest)
    const motionPath = document.querySelector('.schematic-motion-curve');
    if (motionPath) {
      gsap.fromTo(
        motionPath,
        { opacity: 0.45 },
        {
          opacity: 1,
          duration: 0.6,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: motionPath,
            start: 'top 92%',
            once: true,
          },
          clearProps: 'opacity',
        }
      );
    }
  });

  // Reduced motion: gentle opacity fade for hero only, zero spatial movement
  mm.add('(prefers-reduced-motion: reduce)', () => {
    const heroItems = document.querySelectorAll(
      '[data-hero-lead], [data-hero-support], [data-hero-decoration], [data-hero-panel]'
    );
    gsap.from(heroItems, {
      opacity: 0,
      duration: 0.2,
      ease: 'power1.out',
      clearProps: 'opacity',
    });
  });
}

export function animateFilteredGroup(groupEl) {
  if (!groupEl) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  gsap.fromTo(
    groupEl,
    { y: 8, opacity: 0.65 },
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
