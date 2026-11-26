# sidchan.dev — Developer Portfolio (Interactive Shader & Studio Contrast)

Personal developer portfolio for **Siddharth Chandran**, built with vanilla HTML, CSS, JavaScript (ES modules), [Vite](https://vitejs.dev/), WebGL2/WebGL1 GLSL shaders, [GSAP](https://gsap.com/), and [Vercel Analytics](https://vercel.com/analytics).

## Highlights

- **Light-First Arctic Porcelain & Full-Bleed Obsidian Showcase**: Defaults to a cool arctic porcelain canvas (`#f3f6fa`) with deep navy-slate typography (`#0b1120`), cyan-teal telemetry (`#0e7490` / `#0891b2`), and a dramatic full-bleed Obsidian AI-Era showcase band (`#070b14` surface, `#22d3ee` cyan accents), plus a persisted high-contrast dark mode (`#060913`) via `localStorage` (`sidchan-theme`).
- **Live WebGL Topographic Contour Shader**: GPU fragment shader in the hero (`shader.js`) supporting WebGL2 and WebGL1 with OKLab perceptual color blending, subtle pointer reactivity, `IntersectionObserver` off-screen pausing, `prefers-reduced-motion` static framing, an accessible **Ambient shader** Pause/Play toggle, and a static SVG contour fallback.
- **Interactive Antigravity Model Usage Sidecar Simulator**: Pure client-side live replica (`simulator.js`) with **Simulate Subagent Burst** and **Full / Minimal** view toggling, updating model quotas, reset countdowns, `5s Poll · ETag 304/200` status, and session + swarm token bars (`tabular-nums`).
- **Filterable Project Showcase & Pulsing System Diagrams**: Era filters (`All 7`, `The AI Era 3`, `Foundations 4`) with polite `aria-live` announcements, plus animated SVG `hub -> parallel lanes` architecture flows across backend and full-stack foundations.

## Tech Stack

- **Build Tool**: Vite 5 (`vite`)
- **Frontend**: Semantic HTML5, CSS Custom Properties (`Outfit`, `IBM Plex Sans`, `JetBrains Mono`), Vanilla JavaScript (ES Modules)
- **Graphics & Motion**: Custom WebGL2/WebGL1 GLSL Fragment Shader (`shader.js`), CSS `animation-timeline: scroll()`, GSAP + ScrollTrigger (`animations.js`)
- **Analytics**: `@vercel/analytics`
- **E2E Verification**: Playwright (`@playwright/test` using local Google Chrome)

## Project Structure

```text
dev-portfolio/
├── index.html           # Semantic markup, pre-paint theme script, and SVG diagrams
├── style.css            # Light-first porcelain, Obsidian showcase, and dark theme tokens
├── main.js              # Theme toggle, shader controls, scrollspy, filters, and copy toast
├── shader.js            # WebGL2/WebGL1 topographic contour shader + OKLab palette + fallback
├── simulator.js         # Interactive Antigravity Model Usage sidecar simulator
├── animations.js        # GSAP hero entrance & ScrollTrigger reveals
├── playwright.config.js # Playwright configuration targeting local Google Chrome
├── tests/               # Playwright E2E and visual regression screenshot suite
└── package.json         # Dependencies and npm scripts
```

## Getting Started

```bash
# Install dependencies
npm install

# Start the local development server
npm run dev

# Build for production (outputs to dist/)
npm run build

# Run end-to-end Playwright suite (builds or previews dist/)
npx playwright test
```

## Connect

- **GitHub**: [Siddharth-Chandran](https://github.com/Siddharth-Chandran)
- **LinkedIn**: [siddharth-chandran-e](https://www.linkedin.com/in/siddharth-chandran-e/)
- **Email**: `sidchan@duck.com`
