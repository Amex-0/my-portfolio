import { useEffect, useRef } from "react";

import usePrefersReducedMotion from "@/hooks/usePrefersReducedMotion";

/** Navier-Stokes WebGL — gas/smoke (exactable.in-style). */
export const FLUID_CONFIG = {
  SIM_RESOLUTION: 128,
  DYE_RESOLUTION: 1024,
  DISSIPATION: 0.97,
  VELOCITY_DIFFUSION: 0.98,
  PRESSURE: 0.8,
  CURL: 30.0,
  SPLAT_RADIUS: 0.25,
  SPLAT_FORCE: 5500,
  PRESSURE_ITERATIONS: 20,
  SMOKE_COLOR: [0.0627, 0.7255, 0.5059] as [number, number, number],
  SMOKE_HIGHLIGHT: [0.4314, 0.9059, 0.7176] as [number, number, number],
  POINTER_SENSITIVITY: 16,
  MAX_DPR: 1.5,
  /** Ambient corner sweep (lightweight). */
  AUTO_INTERVAL: 1.35,
  AUTO_FORCE: 11000,
  AUTO_RADIUS: 0.28,
  AUTO_STREAK_STEPS: 5,
  AUTO_TRAVEL: 0.42,
  AUTO_PHASE_DURATION: 3.2,
} as const;

export const FLUID_BACKGROUND = {
  base: "#040507",
  vignette: "#07110d",
  emerald: "rgba(16, 185, 129, 0.16)",
  mint: "rgba(110, 231, 183, 0.1)",
  halo: "rgba(6, 78, 59, 0.14)",
} as const;

type Point = { x: number; y: number };

const CORNERS = {
  tl: { x: 0.06, y: 0.94 },
  tr: { x: 0.94, y: 0.94 },
  bl: { x: 0.06, y: 0.06 },
  br: { x: 0.94, y: 0.06 },
} as const;

const CENTER: Point = { x: 0.5, y: 0.5 };
const MID = {
  top: { x: 0.5, y: 0.94 },
  right: { x: 0.94, y: 0.5 },
  bottom: { x: 0.5, y: 0.06 },
  left: { x: 0.06, y: 0.5 },
} as const;

const VERT = `
  attribute vec2 a_pos;
  varying   vec2 v_uv;
  void main(){
    v_uv        = a_pos * 0.5 + 0.5;
    gl_Position = vec4(a_pos, 0.0, 1.0);
  }
`;

const ADVECT_FRAG = `
  precision highp float;
  varying vec2 v_uv;
  uniform sampler2D u_velocity;
  uniform sampler2D u_source;
  uniform vec2  u_texel;
  uniform float u_dt;
  uniform float u_dissipation;
  void main(){
    vec2 pos = v_uv - texture2D(u_velocity, v_uv).xy * u_dt * u_texel;
    gl_FragColor = texture2D(u_source, pos) * u_dissipation;
  }
`;

const DIV_FRAG = `
  precision highp float;
  varying vec2 v_uv;
  uniform sampler2D u_velocity;
  uniform vec2 u_texel;
  void main(){
    float L = texture2D(u_velocity, v_uv - vec2(u_texel.x, 0.)).x;
    float R = texture2D(u_velocity, v_uv + vec2(u_texel.x, 0.)).x;
    float T = texture2D(u_velocity, v_uv + vec2(0., u_texel.y)).y;
    float B = texture2D(u_velocity, v_uv - vec2(0., u_texel.y)).y;
    gl_FragColor = vec4(0.5 * (R - L + T - B), 0., 0., 1.);
  }
`;

const CURL_FRAG = `
  precision highp float;
  varying vec2 v_uv;
  uniform sampler2D u_velocity;
  uniform vec2 u_texel;
  void main(){
    float L = texture2D(u_velocity, v_uv - vec2(u_texel.x, 0.)).y;
    float R = texture2D(u_velocity, v_uv + vec2(u_texel.x, 0.)).y;
    float T = texture2D(u_velocity, v_uv + vec2(0., u_texel.y)).x;
    float B = texture2D(u_velocity, v_uv - vec2(0., u_texel.y)).x;
    gl_FragColor = vec4(0.5 * (R - L - T + B), 0., 0., 1.);
  }
`;

const VORT_FRAG = `
  precision highp float;
  varying vec2 v_uv;
  uniform sampler2D u_velocity;
  uniform sampler2D u_curl;
  uniform vec2  u_texel;
  uniform float u_curl_strength;
  uniform float u_dt;
  void main(){
    float L = abs(texture2D(u_curl, v_uv - vec2(u_texel.x, 0.)).r);
    float R = abs(texture2D(u_curl, v_uv + vec2(u_texel.x, 0.)).r);
    float T = abs(texture2D(u_curl, v_uv + vec2(0., u_texel.y)).r);
    float B = abs(texture2D(u_curl, v_uv - vec2(0., u_texel.y)).r);
    float C = texture2D(u_curl, v_uv).r;
    vec2 eta = vec2(R - L, T - B) * 0.5;
    eta /= max(length(eta), 1e-5);
    vec2 force = u_curl_strength * C * vec2(eta.y, -eta.x);
    gl_FragColor = vec4(texture2D(u_velocity, v_uv).xy + force * u_dt, 0., 1.);
  }
`;

const PRESSURE_FRAG = `
  precision highp float;
  varying vec2 v_uv;
  uniform sampler2D u_pressure;
  uniform sampler2D u_divergence;
  uniform vec2 u_texel;
  void main(){
    float L = texture2D(u_pressure, v_uv - vec2(u_texel.x, 0.)).r;
    float R = texture2D(u_pressure, v_uv + vec2(u_texel.x, 0.)).r;
    float T = texture2D(u_pressure, v_uv + vec2(0., u_texel.y)).r;
    float B = texture2D(u_pressure, v_uv - vec2(0., u_texel.y)).r;
    float D = texture2D(u_divergence, v_uv).r;
    gl_FragColor = vec4((L + R + T + B - D) * 0.25, 0., 0., 1.);
  }
`;

const GRAD_FRAG = `
  precision highp float;
  varying vec2 v_uv;
  uniform sampler2D u_velocity;
  uniform sampler2D u_pressure;
  uniform vec2 u_texel;
  void main(){
    float L = texture2D(u_pressure, v_uv - vec2(u_texel.x, 0.)).r;
    float R = texture2D(u_pressure, v_uv + vec2(u_texel.x, 0.)).r;
    float T = texture2D(u_pressure, v_uv + vec2(0., u_texel.y)).r;
    float B = texture2D(u_pressure, v_uv - vec2(0., u_texel.y)).r;
    vec2 vel = texture2D(u_velocity, v_uv).xy;
    gl_FragColor = vec4(vel - vec2(R - L, T - B) * 0.5, 0., 1.);
  }
`;

const SPLAT_FRAG = `
  precision highp float;
  varying vec2 v_uv;
  uniform sampler2D u_target;
  uniform vec2  u_point;
  uniform vec3  u_color;
  uniform float u_radius;
  uniform float u_aspect;
  void main(){
    vec2 d = v_uv - u_point;
    d.x *= u_aspect;
    float splash = exp(-dot(d, d) / u_radius);
    gl_FragColor = vec4(texture2D(u_target, v_uv).xyz + splash * u_color, 1.0);
  }
`;

const DISPLAY_FRAG = `
  precision highp float;
  varying vec2 v_uv;
  uniform sampler2D u_dye;
  void main(){
    vec3 c = texture2D(u_dye, v_uv).rgb;
    float lum = dot(c, vec3(0.299, 0.587, 0.114));
    c = c / (c + vec3(1.0));
    c = pow(max(c, vec3(0.0)), vec3(0.4545));
    float alpha = clamp(lum * 0.9, 0.0, 0.35);
    gl_FragColor = vec4(c, alpha);
  }
`;

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type);
  if (!s) throw new Error("shader");
  gl.shaderSource(s, src);
  gl.compileShader(s);
  return s;
}

function mkProg(gl: WebGLRenderingContext, frag: string) {
  const p = gl.createProgram();
  if (!p) throw new Error("program");
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, VERT));
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, frag));
  gl.linkProgram(p);
  return p;
}

type FBO = { tex: WebGLTexture; fb: WebGLFramebuffer; w: number; h: number };

function mkFBO(
  gl: WebGLRenderingContext,
  w: number,
  h: number,
  fmt: number,
  type: number,
  filter: number,
): FBO {
  const tex = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, fmt, w, h, 0, fmt, type, null);
  const fb = gl.createFramebuffer()!;
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    tex,
    0,
  );
  gl.viewport(0, 0, w, h);
  gl.clear(gl.COLOR_BUFFER_BIT);
  return { tex, fb, w, h };
}

function mkDFBO(
  gl: WebGLRenderingContext,
  w: number,
  h: number,
  fmt: number,
  type: number,
  filter: number,
) {
  let a = mkFBO(gl, w, h, fmt, type, filter);
  let b = mkFBO(gl, w, h, fmt, type, filter);
  return {
    get read() {
      return a;
    },
    get write() {
      return b;
    },
    swap() {
      [a, b] = [b, a];
    },
  };
}

function smokeTint(k: number): [number, number, number] {
  const shimmer = 0.9 + Math.random() * 0.15;
  const mix = Math.min(0.9, 0.25 + Math.random() * 0.5 + k * 0.15);

  return FLUID_CONFIG.SMOKE_COLOR.map((c, index) => {
    const highlight = FLUID_CONFIG.SMOKE_HIGHLIGHT[index];
    return (c * (1 - mix) + highlight * mix) * k * shimmer;
  }) as [number, number, number];
}

/** One directional sweep segment (from → to) at progress 0–1. */
type Sweep = { from: Point; to: Point };

function getPhaseSweeps(phase: number): Sweep[] {
  switch (phase % 5) {
    case 0:
      return [
        { from: CORNERS.tl, to: CENTER },
        { from: CORNERS.br, to: CENTER },
      ];
    case 1:
      return [
        { from: CORNERS.tl, to: CENTER },
        { from: CORNERS.tr, to: CENTER },
        { from: CORNERS.bl, to: CENTER },
        { from: CENTER, to: MID.right },
      ];
    case 2:
      return [
        { from: CORNERS.tl, to: CENTER },
        { from: CORNERS.tr, to: CENTER },
        { from: CORNERS.bl, to: CENTER },
        { from: CORNERS.br, to: CENTER },
      ];
    case 3:
      return [
        { from: MID.top, to: CENTER },
        { from: MID.right, to: CENTER },
        { from: MID.bottom, to: CENTER },
        { from: CENTER, to: MID.left },
      ];
    case 4:
      return [
        { from: CORNERS.tl, to: CORNERS.br },
        { from: CORNERS.tr, to: CORNERS.bl },
      ];
    default:
      return [{ from: MID.left, to: MID.right }];
  }
}

/** Full-width horizontal scroll: left → right. */
function horizontalSweep(): Sweep {
  return { from: { x: 0.05, y: 0.5 }, to: { x: 0.95, y: 0.5 } };
}

/** Full-height vertical scroll: bottom → top. */
function verticalSweep(): Sweep {
  return { from: { x: 0.5, y: 0.06 }, to: { x: 0.5, y: 0.94 } };
}

export function useFluidSimulation() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion) return;

    const canvasEl = canvasRef.current;
    if (!canvasEl) return;
    const canvas: HTMLCanvasElement = canvasEl;

    const ctx =
      canvas.getContext("webgl", {
        alpha: true,
        antialias: false,
        premultipliedAlpha: false,
      }) ??
      (canvas.getContext("experimental-webgl") as WebGLRenderingContext | null);
    if (!ctx) return;
    const gl: WebGLRenderingContext = ctx;

    const extHalf = gl.getExtension("OES_texture_half_float");
    const extFloat = gl.getExtension("OES_texture_float");
    gl.getExtension("OES_texture_half_float_linear");

    const TYPE = extHalf
      ? extHalf.HALF_FLOAT_OES
      : extFloat
        ? gl.FLOAT
        : gl.UNSIGNED_BYTE;
    const FILTER = extHalf || extFloat ? gl.LINEAR : gl.NEAREST;
    const defaultRadius = FLUID_CONFIG.SPLAT_RADIUS;

    const quadBuf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW,
    );

    const progAdvect = mkProg(gl, ADVECT_FRAG);
    const progDiv = mkProg(gl, DIV_FRAG);
    const progCurl = mkProg(gl, CURL_FRAG);
    const progVort = mkProg(gl, VORT_FRAG);
    const progPressure = mkProg(gl, PRESSURE_FRAG);
    const progGrad = mkProg(gl, GRAD_FRAG);
    const progSplat = mkProg(gl, SPLAT_FRAG);
    const progDisplay = mkProg(gl, DISPLAY_FRAG);

    const vel = mkDFBO(gl, FLUID_CONFIG.SIM_RESOLUTION, FLUID_CONFIG.SIM_RESOLUTION, gl.RGBA, TYPE, FILTER);
    const dye = mkDFBO(gl, FLUID_CONFIG.DYE_RESOLUTION, FLUID_CONFIG.DYE_RESOLUTION, gl.RGBA, TYPE, FILTER);
    const div = mkFBO(gl, FLUID_CONFIG.SIM_RESOLUTION, FLUID_CONFIG.SIM_RESOLUTION, gl.RGBA, TYPE, gl.NEAREST);
    const curl = mkFBO(gl, FLUID_CONFIG.SIM_RESOLUTION, FLUID_CONFIG.SIM_RESOLUTION, gl.RGBA, TYPE, gl.NEAREST);
    const pres = mkDFBO(gl, FLUID_CONFIG.SIM_RESOLUTION, FLUID_CONFIG.SIM_RESOLUTION, gl.RGBA, TYPE, gl.NEAREST);

    function blit(prog: WebGLProgram, target: FBO | null) {
      gl.useProgram(prog);
      const loc = gl.getAttribLocation(prog, "a_pos");
      gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      if (target) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, target.fb);
        gl.viewport(0, 0, target.w, target.h);
      } else {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, canvas.width, canvas.height);
      }
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    function texU(prog: WebGLProgram, name: string, unit: number, t: WebGLTexture) {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.uniform1i(gl.getUniformLocation(prog, name), unit);
    }

    function resize() {
      const dpr = Math.min(window.devicePixelRatio, FLUID_CONFIG.MAX_DPR);
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
    }
    resize();

    const ptr = { x: 0.5, y: 0.5, dx: 0, dy: 0, moved: false, lx: 0.5, ly: 0.5 };

    function onMove(cx: number, cy: number) {
      const nx = cx / window.innerWidth;
      const ny = 1 - cy / window.innerHeight;
      ptr.dx = (nx - ptr.lx) * FLUID_CONFIG.POINTER_SENSITIVITY;
      ptr.dy = (ny - ptr.ly) * FLUID_CONFIG.POINTER_SENSITIVITY;
      ptr.lx = nx;
      ptr.ly = ny;
      ptr.x = nx;
      ptr.y = ny;
      ptr.moved = Math.hypot(ptr.dx, ptr.dy) > 0.0008;
    }

    const onMouseMove = (e: MouseEvent) => onMove(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) onMove(e.touches[0].clientX, e.touches[0].clientY);
    };

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("resize", resize);

    function splat(
      x: number,
      y: number,
      vx: number,
      vy: number,
      r: number,
      g: number,
      b: number,
      radius: number = defaultRadius,
    ) {
      const aspect = canvas.width / canvas.height;
      const rN = radius / 100;

      gl.useProgram(progSplat);
      texU(progSplat, "u_target", 0, vel.read.tex);
      gl.uniform2f(gl.getUniformLocation(progSplat, "u_point"), x, y);
      gl.uniform3f(gl.getUniformLocation(progSplat, "u_color"), vx, vy, 0);
      gl.uniform1f(gl.getUniformLocation(progSplat, "u_radius"), rN);
      gl.uniform1f(gl.getUniformLocation(progSplat, "u_aspect"), aspect);
      blit(progSplat, vel.write);
      vel.swap();

      gl.useProgram(progSplat);
      texU(progSplat, "u_target", 0, dye.read.tex);
      gl.uniform2f(gl.getUniformLocation(progSplat, "u_point"), x, y);
      gl.uniform3f(gl.getUniformLocation(progSplat, "u_color"), r, g, b);
      gl.uniform1f(gl.getUniformLocation(progSplat, "u_radius"), rN);
      gl.uniform1f(gl.getUniformLocation(progSplat, "u_aspect"), aspect);
      blit(progSplat, dye.write);
      dye.swap();
    }

    /** Place streak along full from→to path at `progress` (0 = start, 1 = end). */
    function emitSweep(
      sweep: Sweep,
      progress: number,
      intensity: number,
      radius: number,
    ) {
      const [r, g, b] = smokeTint(intensity);
      const force = FLUID_CONFIG.AUTO_FORCE;
      const dx = sweep.to.x - sweep.from.x;
      const dy = sweep.to.y - sweep.from.y;
      const steps = FLUID_CONFIG.AUTO_STREAK_STEPS;

      for (let i = 0; i < steps; i++) {
        const trail = Math.max(0, progress - i * 0.05);
        const px = sweep.from.x + dx * trail;
        const py = sweep.from.y + dy * trail;
        const f = 1 - i * 0.12;
        splat(px, py, dx * force * f, dy * force * f, r * f, g * f, b * f, radius);
      }
    }

    let autoPhase = 0;
    let autoPhaseT = 0;
    let autoCooldown = 0;
    let sweepIdx = 0;
    let paused = false;

    const onVis = () => {
      paused = document.hidden;
    };
    document.addEventListener("visibilitychange", onVis);

    function updateAuto(dt: number) {
      if (paused) return;

      autoPhaseT += dt;
      autoCooldown += dt;
      if (autoCooldown < FLUID_CONFIG.AUTO_INTERVAL) return;
      autoCooldown = 0;

      const progress = Math.min(
        autoPhaseT / FLUID_CONFIG.AUTO_PHASE_DURATION,
        1,
      );
      const sweeps = getPhaseSweeps(autoPhase);

      // Phase corner/side sweeps — rotate one per tick, all share same progress
      if (sweeps.length > 0) {
        emitSweep(
          sweeps[sweepIdx % sweeps.length]!,
          progress,
          0.36,
          FLUID_CONFIG.AUTO_RADIUS,
        );
        sweepIdx++;
      }

      // Horizontal + vertical scroll (alternate each tick)
      if (sweepIdx % 2 === 0) {
        emitSweep(horizontalSweep(), progress, 0.3, FLUID_CONFIG.AUTO_RADIUS);
      } else {
        emitSweep(verticalSweep(), progress, 0.3, FLUID_CONFIG.AUTO_RADIUS);
      }

      if (autoPhaseT >= FLUID_CONFIG.AUTO_PHASE_DURATION) {
        autoPhaseT = 0;
        autoPhase = (autoPhase + 1) % 5;
        sweepIdx = 0;
      }
    }

    // Soft intro burst on load
    emitSweep({ from: MID.left, to: MID.right }, 0.15, 0.25, FLUID_CONFIG.AUTO_RADIUS);

    let lastT = performance.now();

    function step(dt: number) {
      const vT: [number, number] = [1 / FLUID_CONFIG.SIM_RESOLUTION, 1 / FLUID_CONFIG.SIM_RESOLUTION];
      const dT: [number, number] = [1 / FLUID_CONFIG.DYE_RESOLUTION, 1 / FLUID_CONFIG.DYE_RESOLUTION];

      gl.useProgram(progAdvect);
      texU(progAdvect, "u_velocity", 0, vel.read.tex);
      texU(progAdvect, "u_source", 1, vel.read.tex);
      gl.uniform2f(gl.getUniformLocation(progAdvect, "u_texel"), ...vT);
      gl.uniform1f(gl.getUniformLocation(progAdvect, "u_dt"), dt);
      gl.uniform1f(gl.getUniformLocation(progAdvect, "u_dissipation"), FLUID_CONFIG.VELOCITY_DIFFUSION);
      blit(progAdvect, vel.write);
      vel.swap();

      if (ptr.moved) {
        const [r, g, b] = smokeTint(0.52);
        const spd = Math.min(Math.hypot(ptr.dx, ptr.dy) * 1.8, 2.5);
        const fx = ptr.dx * FLUID_CONFIG.SPLAT_FORCE * spd;
        const fy = ptr.dy * FLUID_CONFIG.SPLAT_FORCE * spd;
        splat(ptr.x, ptr.y, fx, fy, r, g, b);
        splat(ptr.x - ptr.dx * 0.02, ptr.y - ptr.dy * 0.02, fx, fy, r * 0.7, g * 0.7, b * 0.7);
        ptr.moved = false;
      }

      gl.useProgram(progCurl);
      texU(progCurl, "u_velocity", 0, vel.read.tex);
      gl.uniform2f(gl.getUniformLocation(progCurl, "u_texel"), ...vT);
      blit(progCurl, curl);

      gl.useProgram(progVort);
      texU(progVort, "u_velocity", 0, vel.read.tex);
      texU(progVort, "u_curl", 1, curl.tex);
      gl.uniform2f(gl.getUniformLocation(progVort, "u_texel"), ...vT);
      gl.uniform1f(gl.getUniformLocation(progVort, "u_curl_strength"), FLUID_CONFIG.CURL);
      gl.uniform1f(gl.getUniformLocation(progVort, "u_dt"), dt);
      blit(progVort, vel.write);
      vel.swap();

      gl.useProgram(progDiv);
      texU(progDiv, "u_velocity", 0, vel.read.tex);
      gl.uniform2f(gl.getUniformLocation(progDiv, "u_texel"), ...vT);
      blit(progDiv, div);

      for (let i = 0; i < FLUID_CONFIG.PRESSURE_ITERATIONS; i++) {
        gl.useProgram(progPressure);
        texU(progPressure, "u_pressure", 0, pres.read.tex);
        texU(progPressure, "u_divergence", 1, div.tex);
        gl.uniform2f(gl.getUniformLocation(progPressure, "u_texel"), ...vT);
        blit(progPressure, pres.write);
        pres.swap();
      }

      gl.useProgram(progGrad);
      texU(progGrad, "u_velocity", 0, vel.read.tex);
      texU(progGrad, "u_pressure", 1, pres.read.tex);
      gl.uniform2f(gl.getUniformLocation(progGrad, "u_texel"), ...vT);
      blit(progGrad, vel.write);
      vel.swap();

      gl.useProgram(progAdvect);
      texU(progAdvect, "u_velocity", 0, vel.read.tex);
      texU(progAdvect, "u_source", 1, dye.read.tex);
      gl.uniform2f(gl.getUniformLocation(progAdvect, "u_texel"), ...dT);
      gl.uniform1f(gl.getUniformLocation(progAdvect, "u_dt"), dt);
      gl.uniform1f(gl.getUniformLocation(progAdvect, "u_dissipation"), FLUID_CONFIG.DISSIPATION);
      blit(progAdvect, dye.write);
      dye.swap();
    }

    let raf = 0;
    function loop(now: number) {
      if (!paused) {
        const dt = Math.min((now - lastT) / 1000, 0.016667);
        lastT = now;
        updateAuto(dt);
        step(dt);

        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.useProgram(progDisplay);
        texU(progDisplay, "u_dye", 0, dye.read.tex);
        blit(progDisplay, null);
        gl.disable(gl.BLEND);
      }
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchmove", onTouchMove);
    };
  }, [prefersReducedMotion]);

  return canvasRef;
}
