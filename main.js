import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Register ScrollTrigger plugin
gsap.registerPlugin(ScrollTrigger);

document.addEventListener("DOMContentLoaded", () => {
  // 1. Initial Load Animations
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
  }, "-=0.4"); // start slightly before navbar finishes

  // Animate Hero Text Staggered
  tl.from(".hero-title, .hero-subtitle, .hero-actions", {
    y: 20,
    opacity: 0,
    duration: 0.6,
    stagger: 0.15,
    ease: "power3.out"
  }, "-=0.4");

  // 2. Scroll Triggered Animations

  // General Fade up for full sections
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

  // Staggered Skills Cards
  gsap.from(".skill-card", {
    scrollTrigger: {
      trigger: ".skills-grid",
      start: "top 85%",
    },
    y: 50,
    opacity: 0,
    duration: 0.6,
    stagger: 0.1,
    ease: "back.out(1.7)"
  });

  // Interactive Micro-animations on cards
  const cards = document.querySelectorAll(".skill-card");
  
  cards.forEach(card => {
    card.addEventListener("mouseenter", () => {
      gsap.to(card, { 
        scale: 1.05, 
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
