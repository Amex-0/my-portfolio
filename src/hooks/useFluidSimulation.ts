import { useEffect, useRef } from "react";

interface FluidConfig {
  SIM_RESOLUTION: number;
  DYE_RESOLUTION: number;
  DENSITY_DISSIPATION: number;
  VELOCITY_DISSIPATION: number;
  PRESSURE_ITERATIONS: number;
  CURL: number;
  SPLAT_RADIUS: number;
  SPLAT_FORCE: number;
}

const DEFAULT_CONFIG: FluidConfig = {
  SIM_RESOLUTION: 128,
  DYE_RESOLUTION: 1024,
  DENSITY_DISSIPATION: 0.97,
  VELOCITY_DISSIPATION: 0.98,
  PRESSURE_ITERATIONS: 20,
  CURL: 30,
  SPLAT_RADIUS: 0.22,
  SPLAT_FORCE: 6000,
};

type GlContextResult = {
  gl: WebGLRenderingContext;
  ext: {
    formatRGBA: { internalFormat: number; format: number } | null;
    formatRG: { internalFormat: number; format: number } | null;
    formatR: { internalFormat: number; format: number } | null;
    halfFloatTexType: number;
    supportLinearFiltering: boolean;
  };
};

type SingleFBO = {
  texture: WebGLTexture;
  fbo: WebGLFramebuffer;
  width: number;
  height: number;
  attach: (id: number) => number;
};

type DoubleFBO = {
  width: number;
  height: number;
  read: SingleFBO;
  write: SingleFBO;
  swap: () => void;
};

type ProgramWithUniforms = {
  program: WebGLProgram;
  uniforms: Record<string, WebGLUniformLocation>;
};

function supportRenderTextureFormat(
  gl: WebGLRenderingContext,
  internalFormat: number,
  format: number,
  type: number,
): boolean {
  const texture = gl.createTexture();
  if (!texture) return false;

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, 4, 4, 0, format, type, null);

  const fbo = gl.createFramebuffer();
  if (!fbo) return false;
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    texture,
    0,
  );

  return gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
}

function getSupportedFormat(
  gl: WebGLRenderingContext,
  internalFormat: number,
  format: number,
  type: number,
) {
  const gl2 = gl as WebGL2RenderingContext;
  if (!supportRenderTextureFormat(gl, internalFormat, format, type)) {
    if (typeof WebGL2RenderingContext !== "undefined") {
      if (internalFormat === gl2.R16F) {
        return getSupportedFormat(gl, gl2.RG16F, gl2.RG, type);
      }
      if (internalFormat === gl2.RG16F) {
        return getSupportedFormat(gl, gl2.RGBA16F, gl.RGBA, type);
      }
    }
    return null;
  }
  return { internalFormat, format };
}

function getWebGLContext(canvas: HTMLCanvasElement): GlContextResult | null {
  const params: WebGLContextAttributes = {
    alpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    preserveDrawingBuffer: false,
  };

  let gl = canvas.getContext("webgl2", params) as WebGL2RenderingContext | null;
  const isWebGL2 = !!gl;

  if (!gl) {
    gl =
      (canvas.getContext("webgl", params) as WebGL2RenderingContext | null) ??
      (canvas.getContext(
        "experimental-webgl",
        params,
      ) as WebGL2RenderingContext | null);
  }
  if (!gl) return null;

  let halfFloat: OES_texture_half_float | null = null;
  let supportLinearFiltering = false;

  if (isWebGL2) {
    gl.getExtension("EXT_color_buffer_float");
    supportLinearFiltering = !!gl.getExtension("OES_texture_float_linear");
  } else {
    halfFloat = gl.getExtension("OES_texture_half_float");
    supportLinearFiltering = !!gl.getExtension("OES_texture_half_float_linear");
  }

  gl.clearColor(0, 0, 0, 1);

  const halfFloatTexType = isWebGL2
    ? (gl as WebGL2RenderingContext).HALF_FLOAT
    : halfFloat
      ? halfFloat.HALF_FLOAT_OES
      : gl.FLOAT;

  let formatRGBA: { internalFormat: number; format: number } | null;
  let formatRG: { internalFormat: number; format: number } | null;
  let formatR: { internalFormat: number; format: number } | null;

  if (isWebGL2) {
    const gl2 = gl as WebGL2RenderingContext;
    formatRGBA = getSupportedFormat(gl, gl2.RGBA16F, gl.RGBA, halfFloatTexType);
    formatRG = getSupportedFormat(gl, gl2.RG16F, gl2.RG, halfFloatTexType);
    formatR = getSupportedFormat(gl, gl2.R16F, gl2.RED, halfFloatTexType);
  } else {
    formatRGBA = getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType);
    formatRG = getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType);
    formatR = getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType);
  }

  return {
    gl,
    ext: {
      formatRGBA,
      formatRG,
      formatR,
      halfFloatTexType,
      supportLinearFiltering,
    },
  };
}

function getSmokeColor(): [number, number, number] {
  const palette: [number, number, number][] = [
    [0.18, 0.78, 0.62],
    [0.09, 0.60, 0.45],
    [0.25, 0.88, 0.72],
    [0.10, 0.48, 0.32],
    [0.14, 0.70, 0.55],
  ];
  return palette[Math.floor(Math.random() * palette.length)]!;
}

export function useFluidSimulation(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  config: Partial<FluidConfig> = {},
) {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const rafRef = useRef(0);
  const mouseRef = useRef({ x: 0.5, y: 0.5, dx: 0, dy: 0, moved: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const result = getWebGLContext(canvas);
    if (!result) return;
    const { gl, ext } = result;
    if (!ext.formatRGBA || !ext.formatRG || !ext.formatR) return;

    const compileShader = (type: number, source: string): WebGLShader => {
      const shader = gl.createShader(type);
      if (!shader) throw new Error("failed to create shader");
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      return shader;
    };

    const createProgram = (vertSrc: string, fragSrc: string): ProgramWithUniforms => {
      const vert = compileShader(gl.VERTEX_SHADER, vertSrc);
      const frag = compileShader(gl.FRAGMENT_SHADER, fragSrc);
      const program = gl.createProgram();
      if (!program) throw new Error("failed to create program");
      gl.attachShader(program, vert);
      gl.attachShader(program, frag);
      gl.bindAttribLocation(program, 0, "aPosition");
      gl.linkProgram(program);

      return {
        program,
        uniforms: new Proxy({} as Record<string, WebGLUniformLocation>, {
          get(target, name: string) {
            if (!target[name]) {
              const loc = gl.getUniformLocation(program, name);
              if (!loc) throw new Error(`missing uniform ${name}`);
              target[name] = loc;
            }
            return target[name];
          },
        }),
      };
    };

    const baseVertexShader = `
      precision highp float;
      attribute vec2 aPosition;
      varying vec2 vUv;
      varying vec2 vL;
      varying vec2 vR;
      varying vec2 vT;
      varying vec2 vB;
      uniform vec2 texelSize;
      void main() {
        vUv = aPosition * 0.5 + 0.5;
        vL = vUv - vec2(texelSize.x, 0.0);
        vR = vUv + vec2(texelSize.x, 0.0);
        vT = vUv + vec2(0.0, texelSize.y);
        vB = vUv - vec2(0.0, texelSize.y);
        gl_Position = vec4(aPosition, 0.0, 1.0);
      }
    `;

    const clearShader = `
      precision mediump float;
      varying highp vec2 vUv;
      uniform sampler2D uTexture;
      uniform float value;
      void main() {
        gl_FragColor = value * texture2D(uTexture, vUv);
      }
    `;

    const displayShader = `
      precision highp float;
      varying vec2 vUv;
      uniform sampler2D uTexture;
      void main() {
        vec3 col = texture2D(uTexture, vUv).rgb;
        float alpha = length(col) * 1.5;
        gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
      }
    `;

    const splatShader = `
      precision highp float;
      varying vec2 vUv;
      uniform sampler2D uTarget;
      uniform float aspectRatio;
      uniform vec3 color;
      uniform vec2 point;
      uniform float radius;
      void main() {
        vec2 p = vUv - point.xy;
        p.x *= aspectRatio;
        vec3 splat = exp(-dot(p, p) / radius) * color;
        vec3 base = texture2D(uTarget, vUv).xyz;
        gl_FragColor = vec4(base + splat, 1.0);
      }
    `;

    const advectionShader = `
      precision highp float;
      varying vec2 vUv;
      uniform sampler2D uVelocity;
      uniform sampler2D uSource;
      uniform vec2 texelSize;
      uniform float dt;
      uniform float dissipation;
      void main() {
        vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
        gl_FragColor = dissipation * texture2D(uSource, coord);
        gl_FragColor.a = 1.0;
      }
    `;

    const divergenceShader = `
      precision mediump float;
      varying highp vec2 vUv;
      varying highp vec2 vL;
      varying highp vec2 vR;
      varying highp vec2 vT;
      varying highp vec2 vB;
      uniform sampler2D uVelocity;
      void main() {
        float L = texture2D(uVelocity, vL).x;
        float R = texture2D(uVelocity, vR).x;
        float T = texture2D(uVelocity, vT).y;
        float B = texture2D(uVelocity, vB).y;
        vec2 C = texture2D(uVelocity, vUv).xy;
        if (vL.x < 0.0) L = -C.x;
        if (vR.x > 1.0) R = -C.x;
        if (vT.y > 1.0) T = -C.y;
        if (vB.y < 0.0) B = -C.y;
        float div = 0.5 * (R - L + T - B);
        gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
      }
    `;

    const curlShader = `
      precision mediump float;
      varying highp vec2 vUv;
      varying highp vec2 vL;
      varying highp vec2 vR;
      varying highp vec2 vT;
      varying highp vec2 vB;
      uniform sampler2D uVelocity;
      void main() {
        float L = texture2D(uVelocity, vL).y;
        float R = texture2D(uVelocity, vR).y;
        float T = texture2D(uVelocity, vT).x;
        float B = texture2D(uVelocity, vB).x;
        float vorticity = R - L - T + B;
        gl_FragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
      }
    `;

    const vorticityShader = `
      precision highp float;
      varying vec2 vUv;
      varying vec2 vB;
      varying vec2 vL;
      varying vec2 vR;
      varying vec2 vT;
      uniform sampler2D uVelocity;
      uniform sampler2D uCurl;
      uniform float curl;
      uniform float dt;
      void main() {
        float L = texture2D(uCurl, vL).x;
        float R = texture2D(uCurl, vR).x;
        float T = texture2D(uCurl, vT).x;
        float B = texture2D(uCurl, vB).x;
        float C = texture2D(uCurl, vUv).x;
        vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
        force /= length(force) + 0.0001;
        force *= curl * C;
        force.y *= -1.0;
        vec2 vel = texture2D(uVelocity, vUv).xy;
        gl_FragColor = vec4(vel + force * dt, 0.0, 1.0);
      }
    `;

    const pressureShader = `
      precision mediump float;
      varying highp vec2 vUv;
      varying highp vec2 vL;
      varying highp vec2 vR;
      varying highp vec2 vT;
      varying highp vec2 vB;
      uniform sampler2D uPressure;
      uniform sampler2D uDivergence;
      void main() {
        float L = texture2D(uPressure, vL).x;
        float R = texture2D(uPressure, vR).x;
        float T = texture2D(uPressure, vT).x;
        float B = texture2D(uPressure, vB).x;
        float divergence = texture2D(uDivergence, vUv).x;
        float pressure = (L + R + B + T - divergence) * 0.25;
        gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
      }
    `;

    const gradientSubtractShader = `
      precision mediump float;
      varying highp vec2 vUv;
      varying highp vec2 vL;
      varying highp vec2 vR;
      varying highp vec2 vT;
      varying highp vec2 vB;
      uniform sampler2D uPressure;
      uniform sampler2D uVelocity;
      void main() {
        float L = texture2D(uPressure, vL).x;
        float R = texture2D(uPressure, vR).x;
        float T = texture2D(uPressure, vT).x;
        float B = texture2D(uPressure, vB).x;
        vec2 velocity = texture2D(uVelocity, vUv).xy;
        velocity -= vec2(R - L, T - B);
        gl_FragColor = vec4(velocity, 0.0, 1.0);
      }
    `;

    const clearProgram = createProgram(baseVertexShader, clearShader);
    const displayProgram = createProgram(baseVertexShader, displayShader);
    const splatProgram = createProgram(baseVertexShader, splatShader);
    const advectionProgram = createProgram(baseVertexShader, advectionShader);
    const divergenceProgram = createProgram(baseVertexShader, divergenceShader);
    const curlProgram = createProgram(baseVertexShader, curlShader);
    const vorticityProgram = createProgram(baseVertexShader, vorticityShader);
    const pressureProgram = createProgram(baseVertexShader, pressureShader);
    const gradientSubtractProgram = createProgram(
      baseVertexShader,
      gradientSubtractShader,
    );

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]),
      gl.STATIC_DRAW,
    );

    const indexBuf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuf);
    gl.bufferData(
      gl.ELEMENT_ARRAY_BUFFER,
      new Uint16Array([0, 1, 2, 0, 2, 3]),
      gl.STATIC_DRAW,
    );

    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);

    const createFBO = (
      w: number,
      h: number,
      internalFormat: number,
      format: number,
      type: number,
      filter: number,
    ): SingleFBO => {
      const texture = gl.createTexture();
      if (!texture) throw new Error("failed to create texture");
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null);

      const fbo = gl.createFramebuffer();
      if (!fbo) throw new Error("failed to create framebuffer");
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D,
        texture,
        0,
      );
      gl.viewport(0, 0, w, h);
      gl.clear(gl.COLOR_BUFFER_BIT);

      return {
        texture,
        fbo,
        width: w,
        height: h,
        attach(id: number) {
          gl.activeTexture(gl.TEXTURE0 + id);
          gl.bindTexture(gl.TEXTURE_2D, texture);
          return id;
        },
      };
    };

    const createDoubleFBO = (
      w: number,
      h: number,
      internalFormat: number,
      format: number,
      type: number,
      filter: number,
    ): DoubleFBO => {
      let fbo1 = createFBO(w, h, internalFormat, format, type, filter);
      let fbo2 = createFBO(w, h, internalFormat, format, type, filter);
      return {
        width: w,
        height: h,
        get read() {
          return fbo1;
        },
        get write() {
          return fbo2;
        },
        swap() {
          [fbo1, fbo2] = [fbo2, fbo1];
        },
      };
    };

    const getResolution = (res: number) => {
      let aspectRatio = gl.drawingBufferWidth / gl.drawingBufferHeight;
      if (aspectRatio < 1) aspectRatio = 1 / aspectRatio;
      const min = Math.round(res);
      const max = Math.round(res * aspectRatio);
      if (gl.drawingBufferWidth > gl.drawingBufferHeight) {
        return { width: max, height: min };
      }
      return { width: min, height: max };
    };

    const simRes = getResolution(cfg.SIM_RESOLUTION);
    const dyeRes = getResolution(cfg.DYE_RESOLUTION);
    const filter = ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST;

    const density = createDoubleFBO(
      dyeRes.width,
      dyeRes.height,
      ext.formatRGBA.internalFormat,
      ext.formatRGBA.format,
      ext.halfFloatTexType,
      filter,
    );
    const velocity = createDoubleFBO(
      simRes.width,
      simRes.height,
      ext.formatRG.internalFormat,
      ext.formatRG.format,
      ext.halfFloatTexType,
      filter,
    );
    const divergence = createFBO(
      simRes.width,
      simRes.height,
      ext.formatR.internalFormat,
      ext.formatR.format,
      ext.halfFloatTexType,
      gl.NEAREST,
    );
    const curl = createFBO(
      simRes.width,
      simRes.height,
      ext.formatR.internalFormat,
      ext.formatR.format,
      ext.halfFloatTexType,
      gl.NEAREST,
    );
    const pressure = createDoubleFBO(
      simRes.width,
      simRes.height,
      ext.formatR.internalFormat,
      ext.formatR.format,
      ext.halfFloatTexType,
      gl.NEAREST,
    );

    const blit = (
      target: { fbo: WebGLFramebuffer; width: number; height: number } | null,
    ) => {
      if (target) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
        gl.viewport(0, 0, target.width, target.height);
      } else {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      }
      gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    };

    const correctRadius = (r: number) => {
      const aspect = canvas.width / canvas.height;
      return aspect > 1 ? r * aspect : r;
    };

    const splat = (
      x: number,
      y: number,
      dx: number,
      dy: number,
      color: [number, number, number],
    ) => {
      gl.useProgram(splatProgram.program);
      gl.uniform1i(splatProgram.uniforms.uTarget, velocity.read.attach(0));
      gl.uniform1f(splatProgram.uniforms.aspectRatio, canvas.width / canvas.height);
      gl.uniform2f(splatProgram.uniforms.point, x, y);
      gl.uniform3f(splatProgram.uniforms.color, dx, dy, 0);
      gl.uniform1f(
        splatProgram.uniforms.radius,
        correctRadius(cfg.SPLAT_RADIUS / 100),
      );
      blit(velocity.write);
      velocity.swap();

      gl.uniform1i(splatProgram.uniforms.uTarget, density.read.attach(0));
      gl.uniform3f(splatProgram.uniforms.color, color[0], color[1], color[2]);
      blit(density.write);
      density.swap();
    };

    const STAGES: ReadonlyArray<ReadonlyArray<readonly [number, number, number, number]>> = [
      // 1. 2 corners
      [
        [0.08, 0.92, 800, -800],
        [0.92, 0.08, -800, 800],
      ],
      // 2. 3( corners + centre)
      [
        [0.92, 0.92, -800, -800],
        [0.08, 0.08, 800, 800],
        [0.5, 0.5, 0, 1000],
      ],
      // 3. 4 corners
      [
        [0.08, 0.92, 800, -800],
        [0.92, 0.92, -800, -800],
        [0.08, 0.08, 800, 800],
        [0.92, 0.08, -800, 800],
      ],
      // 4. 3(mid sides + centre)
      [
        [0.08, 0.5, 1000, 0],
        [0.92, 0.5, -1000, 0],
        [0.5, 0.5, 0, -1000],
      ],
      // 5. 2 opposite corners
      [
        [0.92, 0.92, -800, -800],
        [0.08, 0.08, 800, 800],
      ],
    ];
    let stageIndex = 0;
    let lastStageTime = 0;
    const STAGE_INTERVAL = 2600;

    const fireStage = (time: number) => {
      if (time - lastStageTime < STAGE_INTERVAL) return;
      lastStageTime = time;
      const stage = STAGES[stageIndex % STAGES.length]!;
      stageIndex += 1;
      stage.forEach(([x, y, dx, dy]) => {
        const jitter = 0.8 + Math.random() * 0.4;
        splat(x, y, dx * jitter, dy * jitter, getSmokeColor());
      });
    };

    // Initial burst.
    STAGES[0]!.forEach(([x, y, dx, dy]) => {
      splat(x, y, dx, dy, getSmokeColor());
    });
    stageIndex = 1;
    lastStageTime = performance.now();

    let lastTime = performance.now();

    const step = (dt: number) => {
      gl.disable(gl.BLEND);

      gl.useProgram(curlProgram.program);
      gl.uniform2f(
        curlProgram.uniforms.texelSize,
        1 / velocity.read.width,
        1 / velocity.read.height,
      );
      gl.uniform1i(curlProgram.uniforms.uVelocity, velocity.read.attach(0));
      blit(curl);

      gl.useProgram(vorticityProgram.program);
      gl.uniform2f(
        vorticityProgram.uniforms.texelSize,
        1 / velocity.read.width,
        1 / velocity.read.height,
      );
      gl.uniform1i(vorticityProgram.uniforms.uVelocity, velocity.read.attach(0));
      gl.uniform1i(vorticityProgram.uniforms.uCurl, curl.attach(1));
      gl.uniform1f(vorticityProgram.uniforms.curl, cfg.CURL);
      gl.uniform1f(vorticityProgram.uniforms.dt, dt);
      blit(velocity.write);
      velocity.swap();

      gl.useProgram(divergenceProgram.program);
      gl.uniform2f(
        divergenceProgram.uniforms.texelSize,
        1 / velocity.read.width,
        1 / velocity.read.height,
      );
      gl.uniform1i(divergenceProgram.uniforms.uVelocity, velocity.read.attach(0));
      blit(divergence);

      gl.useProgram(clearProgram.program);
      gl.uniform1i(clearProgram.uniforms.uTexture, pressure.read.attach(0));
      gl.uniform1f(clearProgram.uniforms.value, 0.8);
      blit(pressure.write);
      pressure.swap();

      gl.useProgram(pressureProgram.program);
      gl.uniform2f(
        pressureProgram.uniforms.texelSize,
        1 / velocity.read.width,
        1 / velocity.read.height,
      );
      gl.uniform1i(pressureProgram.uniforms.uDivergence, divergence.attach(0));

      for (let i = 0; i < cfg.PRESSURE_ITERATIONS; i += 1) {
        gl.uniform1i(pressureProgram.uniforms.uPressure, pressure.read.attach(1));
        blit(pressure.write);
        pressure.swap();
      }

      gl.useProgram(gradientSubtractProgram.program);
      gl.uniform2f(
        gradientSubtractProgram.uniforms.texelSize,
        1 / velocity.read.width,
        1 / velocity.read.height,
      );
      gl.uniform1i(
        gradientSubtractProgram.uniforms.uPressure,
        pressure.read.attach(0),
      );
      gl.uniform1i(
        gradientSubtractProgram.uniforms.uVelocity,
        velocity.read.attach(1),
      );
      blit(velocity.write);
      velocity.swap();

      gl.useProgram(advectionProgram.program);
      gl.uniform2f(
        advectionProgram.uniforms.texelSize,
        1 / velocity.read.width,
        1 / velocity.read.height,
      );
      gl.uniform1i(advectionProgram.uniforms.uVelocity, velocity.read.attach(0));
      gl.uniform1i(advectionProgram.uniforms.uSource, velocity.read.attach(0));
      gl.uniform1f(advectionProgram.uniforms.dt, dt);
      gl.uniform1f(
        advectionProgram.uniforms.dissipation,
        cfg.VELOCITY_DISSIPATION,
      );
      blit(velocity.write);
      velocity.swap();

      gl.uniform2f(
        advectionProgram.uniforms.texelSize,
        1 / density.read.width,
        1 / density.read.height,
      );
      gl.uniform1i(advectionProgram.uniforms.uVelocity, velocity.read.attach(0));
      gl.uniform1i(advectionProgram.uniforms.uSource, density.read.attach(1));
      gl.uniform1f(advectionProgram.uniforms.dissipation, cfg.DENSITY_DISSIPATION);
      blit(density.write);
      density.swap();
    };

    const render = () => {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.useProgram(displayProgram.program);
      gl.uniform1i(displayProgram.uniforms.uTexture, density.read.attach(0));
      blit(null);
    };

    const update = () => {
      if (
        canvas.width !== canvas.offsetWidth ||
        canvas.height !== canvas.offsetHeight
      ) {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
      }

      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.016);
      lastTime = now;

      const m = mouseRef.current;
      if (m.moved) {
        const normDx = m.dx * cfg.SPLAT_FORCE;
        const normDy = -m.dy * cfg.SPLAT_FORCE;
        splat(m.x, m.y, normDx, normDy, getSmokeColor());
        m.moved = false;
      }

      fireStage(now);
      step(dt);
      render();
      rafRef.current = requestAnimationFrame(update);
    };

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width;
      const py = 1 - (e.clientY - rect.top) / rect.height;
      const m = mouseRef.current;
      m.dx = px - m.x;
      m.dy = py - m.y;
      m.x = px;
      m.y = py;
      m.moved = true;
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const t = e.touches[0];
      if (!t) return;
      const rect = canvas.getBoundingClientRect();
      const px = (t.clientX - rect.left) / rect.width;
      const py = 1 - (t.clientY - rect.top) / rect.height;
      const m = mouseRef.current;
      m.dx = px - m.x;
      m.dy = py - m.y;
      m.x = px;
      m.y = py;
      m.moved = true;
    };

    rafRef.current = requestAnimationFrame(update);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("touchmove", onTouchMove, { passive: false });

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchmove", onTouchMove);
    };
  }, [canvasRef, cfg.CURL, cfg.DENSITY_DISSIPATION, cfg.DYE_RESOLUTION, cfg.PRESSURE_ITERATIONS, cfg.SIM_RESOLUTION, cfg.SPLAT_FORCE, cfg.SPLAT_RADIUS, cfg.VELOCITY_DISSIPATION]);
}
