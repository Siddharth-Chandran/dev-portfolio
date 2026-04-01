import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { inject } from '@vercel/analytics';
import { initCursor, initParallax, initSplitText, initScrollTriggers } from "./animations.js";

// Register ScrollTrigger plugin
gsap.registerPlugin(ScrollTrigger);

// Initialize Vercel Web Analytics
inject();

document.addEventListener("DOMContentLoaded", () => {
  // Initialize Custom Cursor & Parallax 
  initCursor();
  initParallax();

  // Initialize Text Overflows and Trigger reveals
  initSplitText();
  
  // Initialize Section ScrollTriggers
  initScrollTriggers();

  // 1. Initial Load Animations for Hero
  const tl = gsap.timeline();

  // Animate Navbar
  tl.from(".navbar", {
    y: -50,
    opacity: 0,
    duration: 0.8,
    ease: "power3.out"
  });

  // Animate Hero Content
  tl.from(".hero-content", {
    y: 50,
    opacity: 0,
    duration: 0.8,
    ease: "power3.out"
  }, "-=0.4"); 

  // General Fade up for full sections (delay-appear elements)
  gsap.utils.toArray(".delay-appear").forEach((elem) => {
    gsap.from(elem, {
      scrollTrigger: {
        trigger: elem,
        start: "top 85%", // trigger when 85% down the viewport
        toggleActions: "play none none reverse"
      },
      y: 40,
      opacity: 0,
      duration: 0.8,
      ease: "power3.out"
    });
  });

  // Interactive Micro-animations on cards
  const cards = document.querySelectorAll(".skill-card, .project-card, .contact-card");
  
  cards.forEach(card => {
    card.addEventListener("mouseenter", () => {
      gsap.to(card, { 
        scale: 1.02, 
        duration: 0.3, 
        ease: "power2.out" 
      });
    });
    
    card.addEventListener("mouseleave", () => {
      gsap.to(card, { 
        scale: 1, 
        duration: 0.3, 
        ease: "power2.out" 
      });
    });
  });
});
