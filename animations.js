import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export function initCursor() {
  const cursor = document.getElementById("cursor");
  const follower = document.getElementById("cursor-follower");
  if (!cursor || !follower) return;

  const isDesktop = window.matchMedia("(min-width: 768px)").matches;
  if (!isDesktop) return;

  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let cursorX = mouseX;
  let cursorY = mouseY;
  let followerX = mouseX;
  let followerY = mouseY;

  const quickSetterCursorX = gsap.quickSetter(cursor, "x", "px");
  const quickSetterCursorY = gsap.quickSetter(cursor, "y", "px");
  const quickSetterFollowerX = gsap.quickSetter(follower, "x", "px");
  const quickSetterFollowerY = gsap.quickSetter(follower, "y", "px");

  gsap.ticker.add(() => {
    followerX += (mouseX - followerX) * 0.15;
    followerY += (mouseY - followerY) * 0.15;
    cursorX += (mouseX - cursorX) * 0.5;
    cursorY += (mouseY - cursorY) * 0.5;

    quickSetterCursorX(cursorX);
    quickSetterCursorY(cursorY);
    quickSetterFollowerX(followerX);
    quickSetterFollowerY(followerY);
  });

  window.addEventListener("mousemove", (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  // Magnetic logic
  const magnetics = document.querySelectorAll(".magnetic, a, button");
  magnetics.forEach(el => {
    el.addEventListener("mouseenter", () => {
      follower.classList.add("active");
    });
    
    el.addEventListener("mouseleave", () => {
      follower.classList.remove("active");
      gsap.to(el, { x: 0, y: 0, duration: 0.5, ease: "power2.out" });
    });

    el.addEventListener("mousemove", (e) => {
      const rect = el.getBoundingClientRect();
      const relX = e.clientX - rect.left - rect.width / 2;
      const relY = e.clientY - rect.top - rect.height / 2;
      
      const strength = el.getAttribute("data-strength") || 20;
      
      gsap.to(el, {
        x: (relX / rect.width) * strength,
        y: (relY / rect.height) * strength,
        ease: "power2.out",
        duration: 0.2
      });
    });
  });
}

export function initParallax() {
  const bgs = document.querySelectorAll(".parallax-bg");
  if (bgs.length === 0) return;

  const isDesktop = window.matchMedia("(min-width: 768px)").matches;
  if (!isDesktop) return;

  let mouseX = 0;
  let mouseY = 0;
  
  window.addEventListener("mousemove", (e) => {
    mouseX = (e.clientX - window.innerWidth / 2);
    mouseY = (e.clientY - window.innerHeight / 2);

    bgs.forEach(bg => {
      const speed = parseFloat(bg.getAttribute("data-speed")) || 0.05;
      gsap.to(bg, {
        x: mouseX * speed,
        y: mouseY * speed,
        ease: "power2.out",
        duration: 1
      });
    });
  });
}

export function initSplitText() {
  const targets = document.querySelectorAll(".split-text");
  
  targets.forEach(target => {
    if (target.querySelector(".split-wrapper")) return;

    const text = target.innerText;
    const splitType = target.getAttribute("data-split") || "word";
    target.innerHTML = ""; 

    if (splitType === "char") {
      text.split("").forEach(char => {
        if (char === " ") {
          target.innerHTML += `<span class="split-space">&nbsp;</span>`;
        } else {
          target.innerHTML += `<div class="split-wrapper"><span class="split-char">${char}</span></div>`;
        }
      });
    } else {
      text.split(" ").forEach(word => {
        target.innerHTML += `<div class="split-wrapper"><span class="split-char">${word}</span></div><span class="split-space">&nbsp;</span>`;
      });
    }
  });

  // Execute scroll trigger reveal on them
  targets.forEach(target => {
    const chars = target.querySelectorAll(".split-char");
    gsap.from(chars, {
      scrollTrigger: {
        trigger: target,
        start: "top 85%",
        toggleActions: "play none none reverse"
      },
      yPercent: 120, // push it completely down below the overflow wrapper
      opacity: 0,
      stagger: 0.03,
      duration: 0.8,
      ease: "power4.out"
    });
  });
}

export function initScrollTriggers() {
  // Pin About Section
  const aboutSection = document.getElementById("about");
  const aboutContainer = aboutSection?.querySelector(".about-container");
  
  if (aboutSection && aboutContainer) {
    const aboutParagraphs = aboutContainer.querySelectorAll("p");
    
    // Set initial state
    gsap.set(aboutParagraphs, { opacity: 0, y: 30 });
    
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: aboutSection,
        start: "top 10%",
        end: "+=150%", 
        pin: true,
        scrub: 1, 
      }
    });

    aboutParagraphs.forEach(p => {
      tl.to(p, { opacity: 1, y: 0, duration: 1 }, "+=0.2");
    });
  }

  // Horizontal Scroll for Projects
  const projectsSection = document.getElementById("projects");
  const projectsWrapper = projectsSection?.querySelector(".projects-horizontal-wrapper");

  if (projectsSection && projectsWrapper) {
    gsap.matchMedia().add("(min-width: 768px)", () => {
      
      const getScrollAmount = () => {
        const wrapperWidth = projectsWrapper.scrollWidth;
        const containerWidth = projectsWrapper.parentElement.offsetWidth;
        return -(wrapperWidth - containerWidth); 
      };

      const tween = gsap.to(projectsWrapper, {
        x: getScrollAmount,
        ease: "none"
      });

      ScrollTrigger.create({
        trigger: projectsSection,
        start: "top top",
        end: () => `+=${projectsWrapper.scrollWidth}`, 
        pin: true,
        animation: tween,
        scrub: 1,
        invalidateOnRefresh: true
      });
    });
  }
}
