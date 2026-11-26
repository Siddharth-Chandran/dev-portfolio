/**
 * Live WebGL Topographic Contour Shader
 * Adapted from taste-skill's OKLab perceptual color pipeline and contour-lines field.
 * Features:
 * - WebGL2 (dFdx/dFdy) with seamless WebGL1 finite-difference fallback
 * - Crisp static SVG contour fallback when WebGL context is unavailable
 * - Subtly pointer-reactive domain deflection with exponential damping
 * - Auto-pauses off-screen via IntersectionObserver, on hidden tabs, and under prefers-reduced-motion
 * - User Pause/Play toggle control
 */

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const toLin = (v) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
const toGam = (v) => (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055);

function hexToRgb(hex) {
  let clean = String(hex).trim().replace(/^#/, '');
  if (clean.length === 3) {
    clean = clean
      .split('')
      .map((c) => c + c)
      .join('');
  }
  const num = parseInt(clean.slice(0, 6), 16);
  return [((num >> 16) & 255) / 255, ((num >> 8) & 255) / 255, (num & 255) / 255];
}

function rgbToHex(rgb) {
  return (
    '#' +
    rgb
      .slice(0, 3)
      .map((v) => Math.round(clamp(v, 0, 1) * 255).toString(16).padStart(2, '0'))
      .join('')
  );
}

function rgbToLab(rgb) {
  const [r, g, b] = rgb.map(toLin);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function labToLinear([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

const inGamut = (lin) => lin.every((v) => v >= -1e-4 && v <= 1 + 1e-4);

function labToRgb(lab) {
  let lin = labToLinear(lab);
  if (!inGamut(lin)) {
    const [L, a, b] = [clamp(lab[0], 0, 1), lab[1], lab[2]];
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 16; i++) {
      const mid = (lo + hi) / 2;
      if (inGamut(labToLinear([L, a * mid, b * mid]))) lo = mid;
      else hi = mid;
    }
    lin = labToLinear([L, a * lo, b * lo]);
  }
  return lin.map((v) => toGam(clamp(v, 0, 1)));
}

function mixLabHex(hexA, hexB, t) {
  const A = rgbToLab(hexToRgb(hexA));
  const B = rgbToLab(hexToRgb(hexB));
  const mixed = A.map((val, idx) => val + (B[idx] - val) * t);
  return rgbToHex(labToRgb(mixed));
}

const PALETTES = {
  light: {
    bg: '#f3f6fa',
    ink: '#0b1120',
    accent: '#0891b2',
    dark: false,
  },
  dark: {
    bg: '#060913',
    ink: '#e2e8f0',
    accent: '#22d3ee',
    dark: true,
  },
};

function computeToneUniforms(themeKey) {
  const p = PALETTES[themeKey === 'dark' ? 'dark' : 'light'];
  const idx = mixLabHex(p.ink, p.accent, p.dark ? 0.72 : 0.68);
  const high = mixLabHex(p.bg, p.accent, p.dark ? 0.16 : 0.12);
  const low = mixLabHex(p.bg, p.ink, p.dark ? 0.06 : 0.038);
  return {
    u_kGround: rgbToLab(hexToRgb(p.bg)),
    u_kInk: rgbToLab(hexToRgb(p.ink)),
    u_kIdx: rgbToLab(hexToRgb(idx)),
    u_kHigh: rgbToLab(hexToRgb(high)),
    u_kLow: rgbToLab(hexToRgb(low)),
    u_shadeDir: p.dark ? 0.8 : 1.0,
    u_opacity: p.dark ? 0.34 : 0.26,
    palette: p,
    idxHex: idx,
    highHex: high,
  };
}

function buildCssFallback(themeKey) {
  const tones = computeToneUniforms(themeKey);
  const { bg, ink } = tones.palette;
  const line = mixLabHex(bg, ink, tones.palette.dark ? 0.22 : 0.14);
  const indexLine = mixLabHex(bg, tones.idxHex, tones.palette.dark ? 0.42 : 0.3);
  const W = 1200;
  const H = 720;
  const cx = W * 0.76;
  const cy = H * 0.34;
  const paths = [];
  for (let n = 0; n < 14; n++) {
    const r = 38 + n * 48 + n * n * 1.4;
    const pts = [];
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      const q =
        1 +
        0.18 * Math.sin(2 * a + n * 0.12 + 0.9) +
        0.08 * Math.sin(3 * a - n * 0.17 + 2.1);
      pts.push([cx + Math.cos(a) * r * q * 1.25, cy + Math.sin(a) * r * q]);
    }
    let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
    for (let i = 0; i < pts.length; i++) {
      const p0 = pts[(i - 1 + pts.length) % pts.length];
      const p1 = pts[i];
      const p2 = pts[(i + 1) % pts.length];
      const p3 = pts[(i + 2) % pts.length];
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += `C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
    }
    const heavy = (n + 1) % 4 === 0;
    paths.push(
      `<path d='${d}' stroke='${heavy ? indexLine : line}' stroke-width='${heavy ? 1.5 : 1}' vector-effect='non-scaling-stroke'/>`
    );
  }
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${W} ${H}' preserveAspectRatio='xMidYMid slice'><g fill='none'>${paths.join('')}</g></svg>`;
  const url = `url("data:image/svg+xml,${encodeURIComponent(svg).replace(/'/g, '%27')}")`;
  return `${url} center / cover no-repeat, linear-gradient(135deg, ${bg} 35%, ${tones.highHex} 100%)`;
}

const VERT_2 = '#version 300 es\nin vec2 a_pos;\nvoid main() { gl_Position = vec4(a_pos, 0.0, 1.0); }';
const VERT_1 = 'attribute vec2 a_pos;\nvoid main() { gl_Position = vec4(a_pos, 0.0, 1.0); }';

const FRAG_BODY = /* glsl */ `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform float u_time;
uniform vec2 u_res;
uniform float u_dpr;
uniform vec3 u_mouse;
uniform vec3 u_kGround;
uniform vec3 u_kInk;
uniform vec3 u_kIdx;
uniform vec3 u_kHigh;
uniform vec3 u_kLow;
uniform float u_shadeDir;
uniform float u_opacity;

#if __VERSION__ >= 300
out vec4 fxColor;
uint fx_u32(uint x) {
  x ^= x >> 16;
  x *= 0x7feb352du;
  x ^= x >> 15;
  x *= 0x846ca68bu;
  x ^= x >> 16;
  return x;
}
float fx_hash(vec2 p) {
  uvec2 q = uvec2(ivec2(floor(p)) + ivec2(8192));
  return float(fx_u32(q.x + fx_u32(q.y + 73u))) * (1.0 / 4294967295.0);
}
#else
#define fxColor gl_FragColor
float fx_hash(vec2 p) {
  p = mod(floor(p), 1024.0);
  vec3 q = fract(vec3(p.x, p.y, p.x + p.y) * vec3(0.1031, 0.11369, 0.13787) + 0.173);
  q += dot(q, q.yzx + 31.32);
  return fract((q.x + q.y) * q.z);
}
#endif

const float FX_TAU = 6.28318530718;

vec2 fx_grad(vec2 i) {
  float a = fx_hash(i) * FX_TAU;
  return vec2(cos(a), sin(a));
}

float fx_noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = dot(fx_grad(i), f);
  float b = dot(fx_grad(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0));
  float c = dot(fx_grad(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0));
  float d = dot(fx_grad(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fx_ign(vec2 px) {
  return fract(52.9829189 * fract(dot(px, vec2(0.06711056, 0.00583715))));
}

vec3 fx_srgb(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}

vec3 fx_rgb(vec3 lab) {
  vec3 lms = vec3(
    lab.x + 0.3963377774 * lab.y + 0.2158037573 * lab.z,
    lab.x - 0.1055613458 * lab.y - 0.0638541728 * lab.z,
    lab.x - 0.0894841775 * lab.y - 1.2914855480 * lab.z
  );
  lms = lms * lms * lms;
  vec3 c = vec3(
    dot(lms, vec3(4.0767416621, -3.3077115913, 0.2309699292)),
    dot(lms, vec3(-1.2684380046, 2.6097574011, -0.3413193965)),
    dot(lms, vec3(-0.0041960863, -0.7034186147, 1.7076147010))
  );
  return fx_srgb(c);
}

vec3 fx_dither(vec3 c) {
  float n = fx_hash(gl_FragCoord.xy + vec2(3.0, 7.0)) + fx_ign(gl_FragCoord.xy) - 1.0;
  return c + n / 255.0;
}

vec2 fx_uv() {
  return vec2(gl_FragCoord.x / u_res.x, 1.0 - gl_FragCoord.y / u_res.y);
}

float fx_calm(vec2 uv, vec2 at, float r) {
  vec2 d = (uv - at) * vec2(u_res.x / max(1.0, u_res.y), 1.0);
  return 1.0 - smoothstep(r * 0.35, r, length(d));
}

float ct_height(vec2 p, float t, vec2 fc) {
  vec2 w = vec2(
    fx_noise(p * 0.42 + vec2(t, 3.7)),
    fx_noise(p * 0.42 + vec2(-2.9, 1.3 - t * 0.83))
  );
  p += w * 0.38;

  // Subtle pointer gravitational lift
  vec2 mDelta = (fc - u_mouse.xy) / max(1.0, u_res.y);
  float mDist = length(mDelta);
  float mLift = exp(-mDist * mDist * 8.5) * u_mouse.z * 0.28;

  float s = 0.0;
  float a = 1.0;
  float nrm = 0.0;
  for (int i = 0; i < 3; i++) {
    s += a * fx_noise(p);
    nrm += a;
    p = mat2(1.6, 1.2, -1.2, 1.6) * p + vec2(5.3, 1.9);
    a *= 0.42;
  }
  return s / sqrt(nrm) + mLift;
}

float ct_field(vec2 fc, float t) {
  vec2 p = (fc - 0.5 * u_res) / max(1.0, u_res.y) * 0.96 + vec2(4.2, -2.4);
  return ct_height(p, t, fc) * 22.0;
}

void main() {
  vec2 uv = fx_uv();
  float t = u_time * 0.042;
  float f = ct_field(gl_FragCoord.xy, t);
#if __VERSION__ >= 300
  vec2 g = vec2(dFdx(f), dFdy(f));
#else
  vec2 g = vec2(
    ct_field(gl_FragCoord.xy + vec2(1.0, 0.0), t) - f,
    ct_field(gl_FragCoord.xy + vec2(0.0, 1.0), t) - f
  );
#endif
  float glLen = max(length(g), 1e-5);
  float idx = floor(f + 0.5);
  float dpx = abs(f - idx) / glLen;
  float every = 5.0;
  float isIdx = 1.0 - step(0.5, mod(idx, every));

  float lineW = u_dpr * mix(1.0, 1.85, isIdx);
  float cov = clamp(max(lineW, 1.0) * 0.5 + 0.5 - dpx, 0.0, 1.0) * min(lineW, 1.0);
  float gap = mix(1.0, every, isIdx) / glLen;
  cov *= smoothstep(1.5 * u_dpr, 4.0 * u_dpr, gap);

  float a = cov * u_opacity * mix(1.0, 1.5, isIdx);

  // Fade gently near edges and soften behind left-column display copy
  float asp = u_res.x / max(1.0, u_res.y);
  float e = min(min(uv.x, 1.0 - uv.x) * asp, min(uv.y, 1.0 - uv.y));
  a *= mix(1.0, smoothstep(0.0, 0.28, e), 0.55);
  a *= 1.0 - 0.62 * fx_calm(uv, vec2(0.24, 0.48), 0.55);

  float band = floor(f / every + 0.5);
  float el = clamp(band / 3.0, -1.0, 1.0);
  vec3 gnd = el > 0.0
    ? mix(u_kGround, u_kHigh, el * 0.62)
    : mix(u_kGround, u_kLow, -el * 0.55);
  vec2 gn = g / max(0.5, u_dpr);
  float lit = clamp(dot(gn, vec2(0.7, -0.7)) * 8.5, -1.0, 1.0);
  gnd.x += 0.042 * lit * u_shadeDir;

  vec3 ink = mix(u_kInk, u_kIdx, isIdx * 0.72);
  vec3 lab = mix(gnd, ink, a);
  fxColor = vec4(fx_dither(fx_rgb(lab)), 1.0);
}
`;

function compileShader(gl, type, source) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, source);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS) && !gl.isContextLost()) {
    const info = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error(info || 'Shader compilation failed');
  }
  return sh;
}

export function initHeroShader(hostEl, options = {}) {
  if (!hostEl) return null;

  let theme = options.theme === 'dark' ? 'dark' : 'light';
  let userPaused = false;
  let inView = true;
  let rafId = 0;
  let lastTs = 0;
  let elapsed = 2.4;
  let destroyed = false;
  let fallbackMode = false;

  let canvas = null;
  let gl = null;
  let isWebGL2 = false;
  let prog = null;
  let buf = null;
  let locs = {};

  const mouse = [0.68, 0.42, 0];
  const mouseTarget = [0.68, 0.42, 0];

  const reducedMq = window.matchMedia('(prefers-reduced-motion: reduce)');
  const isReducedMotion = () => reducedMq.matches;

  const updateHostAttrs = (mode) => {
    hostEl.setAttribute('data-shader-mode', mode);
    const state = userPaused ? 'paused' : isReducedMotion() ? 'reduced-motion' : 'playing';
    hostEl.setAttribute('data-shader-state', state);
  };

  const applyCssFallback = () => {
    fallbackMode = true;
    if (canvas) {
      canvas.remove();
      canvas = null;
    }
    hostEl.style.background = buildCssFallback(theme);
    updateHostAttrs('fallback');
  };

  const initGl = () => {
    canvas = document.createElement('canvas');
    canvas.className = 'hero-shader-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    hostEl.appendChild(canvas);

    const attrs = {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      preserveDrawingBuffer: false,
      powerPreference: 'default',
    };

    try {
      gl = canvas.getContext('webgl2', attrs);
      isWebGL2 = Boolean(gl);
      if (!gl) {
        gl = canvas.getContext('webgl', attrs) || canvas.getContext('experimental-webgl', attrs);
      }
    } catch {
      gl = null;
    }

    if (!gl) {
      applyCssFallback();
      return false;
    }

    try {
      const fragPrefix = isWebGL2 ? '#version 300 es\n' : '';
      const vs = compileShader(gl, gl.VERTEX_SHADER, isWebGL2 ? VERT_2 : VERT_1);
      const fs = compileShader(gl, gl.FRAGMENT_SHADER, fragPrefix + FRAG_BODY);
      prog = gl.createProgram();
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.bindAttribLocation(prog, 0, 'a_pos');
      gl.linkProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS) && !gl.isContextLost()) {
        throw new Error(gl.getProgramInfoLog(prog) || 'Program link failed');
      }
    } catch {
      gl = null;
      prog = null;
      applyCssFallback();
      return false;
    }

    buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    const uniformNames = [
      'u_time',
      'u_res',
      'u_dpr',
      'u_mouse',
      'u_kGround',
      'u_kInk',
      'u_kIdx',
      'u_kHigh',
      'u_kLow',
      'u_shadeDir',
      'u_opacity',
    ];
    uniformNames.forEach((name) => {
      locs[name] = gl.getUniformLocation(prog, name);
    });

    canvas.addEventListener('webglcontextlost', (event) => {
      event.preventDefault();
      applyCssFallback();
    });

    updateHostAttrs(isWebGL2 ? 'webgl2' : 'webgl1');
    return true;
  };

  const resize = () => {
    if (fallbackMode || !canvas || !gl) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    const w = Math.max(1, hostEl.clientWidth);
    const h = Math.max(1, hostEl.clientHeight);
    const W = Math.max(1, Math.round(w * dpr * 0.85));
    const H = Math.max(1, Math.round(h * dpr * 0.85));
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width = W;
      canvas.height = H;
    }
  };

  const drawFrame = (dt) => {
    if (fallbackMode || !gl || !prog || gl.isContextLost()) return;
    if (dt > 0) {
      const k = 1 - Math.exp(-dt * 6);
      for (let i = 0; i < 3; i++) {
        mouse[i] += (mouseTarget[i] - mouse[i]) * k;
      }
    }

    const tones = computeToneUniforms(theme);
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75) * 0.85;

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(prog);
    gl.uniform1f(locs.u_time, elapsed);
    gl.uniform2f(locs.u_res, canvas.width, canvas.height);
    gl.uniform1f(locs.u_dpr, dpr);
    gl.uniform3f(locs.u_mouse, mouse[0] * canvas.width, (1 - mouse[1]) * canvas.height, mouse[2]);
    gl.uniform3fv(locs.u_kGround, tones.u_kGround);
    gl.uniform3fv(locs.u_kInk, tones.u_kInk);
    gl.uniform3fv(locs.u_kIdx, tones.u_kIdx);
    gl.uniform3fv(locs.u_kHigh, tones.u_kHigh);
    gl.uniform3fv(locs.u_kLow, tones.u_kLow);
    gl.uniform1f(locs.u_shadeDir, tones.u_shadeDir);
    gl.uniform1f(locs.u_opacity, tones.u_opacity);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  const shouldAnimate = () =>
    !destroyed && !fallbackMode && !userPaused && inView && !document.hidden && !isReducedMotion();

  const tick = (ts) => {
    rafId = 0;
    if (!shouldAnimate()) return;
    const dt = lastTs ? Math.min((ts - lastTs) / 1000, 0.1) : 0;
    lastTs = ts;
    elapsed += dt;
    drawFrame(dt);
    rafId = requestAnimationFrame(tick);
  };

  const syncPlayback = () => {
    if (destroyed) return;
    updateHostAttrs(fallbackMode ? 'fallback' : isWebGL2 ? 'webgl2' : 'webgl1');
    if (shouldAnimate()) {
      if (!rafId) {
        lastTs = 0;
        rafId = requestAnimationFrame(tick);
      }
    } else {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
      if (!fallbackMode && inView) {
        drawFrame(0);
      }
    }
  };

  const parentSection = hostEl.closest('section') || hostEl;

  const onPointerMove = (event) => {
    const rect = parentSection.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    mouseTarget[0] = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    mouseTarget[1] = clamp((event.clientY - rect.top) / rect.height, 0, 1);
    mouseTarget[2] = 1;
  };

  const onPointerLeave = () => {
    mouseTarget[2] = 0;
  };

  const io = new IntersectionObserver(
    (entries) => {
      const latest = entries[entries.length - 1];
      inView = latest.isIntersecting;
      syncPlayback();
    },
    { rootMargin: '8% 0px' }
  );
  io.observe(parentSection);

  const ro = new ResizeObserver(() => {
    resize();
    if (!shouldAnimate() && !fallbackMode) {
      drawFrame(0);
    }
  });
  ro.observe(hostEl);

  parentSection.addEventListener('pointermove', onPointerMove, { passive: true });
  parentSection.addEventListener('pointerleave', onPointerLeave, { passive: true });
  document.addEventListener('visibilitychange', syncPlayback);
  reducedMq.addEventListener?.('change', syncPlayback);

  if (initGl()) {
    resize();
    drawFrame(0);
  }
  syncPlayback();

  return {
    setTheme(nextTheme) {
      theme = nextTheme === 'dark' ? 'dark' : 'light';
      if (fallbackMode) {
        hostEl.style.background = buildCssFallback(theme);
      } else {
        drawFrame(0);
      }
    },
    pause() {
      userPaused = true;
      syncPlayback();
    },
    resume() {
      userPaused = false;
      syncPlayback();
    },
    isPaused() {
      return userPaused;
    },
    destroy() {
      destroyed = true;
      if (rafId) cancelAnimationFrame(rafId);
      io.disconnect();
      ro.disconnect();
      parentSection.removeEventListener('pointermove', onPointerMove);
      parentSection.removeEventListener('pointerleave', onPointerLeave);
      document.removeEventListener('visibilitychange', syncPlayback);
      reducedMq.removeEventListener?.('change', syncPlayback);
      if (gl && !gl.isContextLost()) {
        try {
          if (prog) gl.deleteProgram(prog);
          if (buf) gl.deleteBuffer(buf);
          gl.getExtension('WEBGL_lose_context')?.loseContext();
        } catch {
          /* ignore */
        }
      }
      if (canvas) canvas.remove();
    },
  };
}
