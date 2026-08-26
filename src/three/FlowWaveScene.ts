import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

// ---------------------------------------------------------------------------
// Fixed parameters (baked in, per spec)
// ---------------------------------------------------------------------------
const bgColor = '#02160c';
const flameColor = '#0aff7f';
const flameColor2 = '#aef0c0';
const flameAmt = 0.2;
const atmoColor = '#7affbf';
const atmoCount = 300;
const atmoSize = 24;
const atmoSpeed = 1.0;
const colorLow = '#02160c';
const colorHigh = '#34e89a';
const opacity = 0.26;
const pointSize = 5.5;
const brightness = 0.45;
const waveHeight = 3;
const flow = 1;
const tilt = 0;
const scale = 0.275;
const scrollRise = 1.0;
const camStartY = 7, camStartZ = 16;
const camEndY = 0.8, camEndZ = -2;
const lookStartZ = 2, lookEndZ = -16;
const parallax = 1.2;
const pointerRadius = 7.0;
const pointerStrength = 0.9;

// Perf caps. The look is driven by additive point sprites + the warp
// fragment shader below, not by raw vertex/pixel counts, so these can be
// kept low without changing how the scene reads visually.
const MAX_DPR = 2;
// Sphere used purely as a point cloud. The original (200, 600) segment
// counts produced ~120k vertices for a decorative background layer; the
// same particle-field impression holds at a small fraction of that.
const SPHERE_WIDTH_SEGMENTS = 48;
const SPHERE_HEIGHT_SEGMENTS = 96;

const Lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
function hexToVec3(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return new THREE.Vector3(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

const SNOISE = `
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
float snoise(vec3 v){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0); const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy)); vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz); vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy); vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + 1.0 * C.xxx; vec3 x2 = x0 - i2 + 2.0 * C.xxx; vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;
  i = mod(i, 289.0);
  vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 1.0/7.0; vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z *ns.z);
  vec4 x_ = floor(j * ns.z); vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ *ns.x + ns.yyyy; vec4 y = y_ *ns.x + ns.yyyy; vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy); vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0; vec4 s1 = floor(b1)*2.0 + 1.0; vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy; vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy,h.x); vec3 p1 = vec3(a0.zw,h.y); vec3 p2 = vec3(a1.xy,h.z); vec3 p3 = vec3(a1.zw,h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.5 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0); m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}
`;

const POINTS_VERTEX = `
uniform float uTime; uniform float uStream; uniform float uSize; uniform float uWaveHeight; uniform float uFlow; uniform float uScale;
uniform vec3 uColLow; uniform vec3 uColHigh;
uniform vec3 uCursor; uniform float uRepelRadius; uniform float uRepelStrength; uniform float uActivity;
varying float vFade; varying vec3 vColor;
${SNOISE}
void main() {
  vec3 wp = vec3(position.x * 13.0, 0.0, position.z * 25.0);
  wp.x += position.y * 6.0;
  float zc = wp.z + uStream;
  float wn = snoise(vec3(wp.x * 0.08, zc * 0.08, uTime * 0.15 * uFlow)) * 2.0;
  wn += snoise(vec3(wp.x * 0.16, zc * 0.16, uTime * 0.3 * uFlow)) * 0.8;
  wp.y += wn * uWaveHeight;

  vec3 finalPos = wp * uScale;
  vec4 modelPosition = modelMatrix * vec4(finalPos, 1.0);
  vec3 toP = modelPosition.xyz - uCursor;
  float cd = length(toP);
  float fall = smoothstep(uRepelRadius, 0.0, cd);
  modelPosition.xyz += normalize(toP + vec3(0.0001)) * fall * uRepelStrength * uActivity;
  vec4 mvPosition = viewMatrix * modelPosition;

  float colMix = smoothstep(-3.0, 3.0, position.y + position.x * 0.5);
  vColor = mix(uColLow, uColHigh, clamp(colMix, 0.0, 1.0));
  vFade = 1.0;

  gl_PointSize = uSize * (10.0 / -mvPosition.z);
  gl_PointSize = max(gl_PointSize, 1.5);
  gl_Position = projectionMatrix * mvPosition;
}
`;

const POINTS_FRAGMENT = `
uniform float uOpacity; uniform float uBrightness; uniform float uAppear;
varying float vFade; varying vec3 vColor;
void main() {
  vec2 xy = gl_PointCoord - 0.5;
  float ll = length(xy);
  if (ll > 0.5) discard;
  float a = smoothstep(0.5, 0.1, ll);
  gl_FragColor = vec4(vColor * uBrightness, vFade * a * uOpacity * uAppear);
}
`;

const FINAL_VERTEX = `
varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position, 1.0); }
`;

// Note: the original shader also sampled a "bloomTexture" and "torusTexture"
// produced by two extra EffectComposers. Nothing was ever rendered onto the
// layers those composers read from, so both textures were always fully
// black and contributed nothing to the final image. They're removed here
// (along with the composers that produced them) with no visual change.
const FINAL_FRAGMENT = `
uniform float iTime; uniform sampler2D tDiffuse;
uniform vec3 uBg; uniform vec3 uFlameA; uniform vec3 uFlameB; uniform float uFlameAmt;
varying vec2 vUv;
vec3 warp3d(vec3 pos, float t){ float curv=.8,a=1.9,b=0.7; pos*=2.;
  pos.x+=curv*sin(t+a*pos.y)+t*b; pos.y+=curv*cos(t+a*pos.x);
  pos.y+=curv*sin(t+a*pos.z)+t*b; pos.z+=curv*cos(t+a*pos.y);
  pos.z+=curv*sin(t+a*pos.x)+t*b; pos.x+=curv*cos(t+a*pos.z);
  return 0.5+0.5*cos(pos.xyz+vec3(1,2,4)); }
void main(){
  vec2 uv = 2.*vUv - 1.;
  vec3 w = pow(warp3d(vec3(uv.x, sin(uv.y), uv.y), iTime*1.5), vec3(1.5));
  vec3 flame = 1.5*uFlameA*w.x; flame*=w.y; flame += uFlameB*w.z;
  flame *= smoothstep(0.25, 1., abs(uv.y));
  float md = smoothstep(-0.7, 1., -uv.y*uv.x); flame *= md*md;
  vec3 bg = uBg * (1.0 - 0.4 * length(uv));
  gl_FragColor = vec4(bg + flame*uFlameAmt + texture2D(tDiffuse, vUv).xyz, 1.);
}
`;

const MOTE_VERTEX = `
attribute float size; attribute float seed; uniform float uTime; uniform vec2 uRes;
varying float vA;
vec3 warp(vec3 p, float t){ float c=0.9,a=1.9,b=0.02,s=0.05; p*=2.;
  p.x+=c*sin(s*t+a*p.y)+t*b; p.y+=c*cos(s*t+a*p.x); p.y+=c*sin(s*t+a*p.z)+t*b;
  p.z+=c*cos(s*t+a*p.y); p.z+=c*sin(s*t+a*p.x)+t*b; p.x+=c*cos(s*t+a*p.z);
  return cos(p+vec3(1,2,4)); }
void main(){
  vec3 v = position*4.0 + warp(position, uTime)*1.2;
  vec4 mv = modelViewMatrix * vec4(v, 1.0);
  float r = length(v); float farF = 1.0 - smoothstep(5.0, 6.5, r); float nearF = smoothstep(0.0, 0.5, -mv.z);
  vA = farF * nearF;
  gl_PointSize = size * uRes.y / 900.0 / -mv.z; gl_PointSize = max(gl_PointSize, 1.0);
  gl_Position = projectionMatrix * mv;
}
`;

const MOTE_FRAGMENT = `
uniform vec3 uColor; varying float vA;
void main(){ vec2 p = gl_PointCoord - 0.5; float l = length(p); if (l > 0.5) discard;
  float tex = smoothstep(0.5, 0.0, l); gl_FragColor = vec4(uColor * tex, tex * vA * 0.6); }
`;

export class FlowWaveScene {
  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private group: THREE.Group;
  private uniforms: any;

  private sphereGeo: THREE.SphereGeometry;
  private pointsMat: THREE.ShaderMaterial;
  private moteGeo: THREE.BufferGeometry;
  private moteMat: THREE.ShaderMaterial;
  private motePts: THREE.Points;

  private finalPass: ShaderPass;
  private composer: EffectComposer;

  private scrollTarget = 0;
  private scrollSmooth = 0;
  private scrollCurrent = 0;
  private mouseTarget = { x: 0, y: 0 };
  private mouse = { x: 0, y: 0 };
  private POINTER = { world: new THREE.Vector3(), activity: 0, active: false, lastMove: performance.now() };
  private stream = 0;
  private t0 = performance.now() / 1000;
  private appearStart = performance.now();
  private rafId = 0;
  private disposed = false;

  // When the tab is hidden or the user prefers reduced motion, the render
  // loop stops entirely instead of continuing to burn GPU/CPU in the
  // background.
  private reducedMotion: boolean;
  private mql: MediaQueryList | null = null;

  private _ndc = new THREE.Vector3();
  private _dir = new THREE.Vector3();
  private _tgt = new THREE.Vector3();

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    this.reducedMotion = typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_DPR));
    // Nothing in this scene casts or receives shadows; leaving shadow
    // mapping enabled just adds cost for no visual benefit.
    this.renderer.shadowMap.enabled = false;

    this.scene = new THREE.Scene();
    this.scene.background = null;
    this.scene.fog = new THREE.Fog(0x000000, 0, 15);

    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 400);
    this.camera.position.set(0, camStartY, camStartZ);
    this.scene.add(this.camera);

    // ---- Points sheet -----------------------------------------------------
    this.group = new THREE.Group();
    this.sphereGeo = new THREE.SphereGeometry(4.2, SPHERE_WIDTH_SEGMENTS, SPHERE_HEIGHT_SEGMENTS);
    this.uniforms = {
      uTime: { value: 0 },
      uStream: { value: 0 },
      uAppear: { value: 0 },
      uColLow: { value: hexToVec3(colorLow) },
      uColHigh: { value: hexToVec3(colorHigh) },
      uOpacity: { value: opacity },
      uSize: { value: pointSize },
      uBrightness: { value: brightness },
      uWaveHeight: { value: waveHeight },
      uFlow: { value: flow },
      uScale: { value: scale },
      uCursor: { value: new THREE.Vector3() },
      uRepelRadius: { value: pointerRadius },
      uRepelStrength: { value: pointerStrength },
      uActivity: { value: 0 },
    };
    this.pointsMat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: POINTS_VERTEX,
      fragmentShader: POINTS_FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const pts = new THREE.Points(this.sphereGeo, this.pointsMat);
    pts.frustumCulled = false;
    this.group.add(pts);
    this.scene.add(this.group);

    // ---- Ambient motes ------------------------------------------------------
    const N = Math.round(atmoCount);
    const positions = new Float32Array(N * 3);
    const sizes = new Float32Array(N);
    const seeds = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      positions[i * 3] = 2 * Math.random() - 1;
      positions[i * 3 + 1] = 2 * Math.random() - 1;
      positions[i * 3 + 2] = 2 * Math.random() - 1;
      sizes[i] = atmoSize * (0.4 + Math.random());
      seeds[i] = Math.random();
    }
    this.moteGeo = new THREE.BufferGeometry();
    this.moteGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.moteGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    this.moteGeo.setAttribute('seed', new THREE.BufferAttribute(seeds, 1));
    this.moteMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: hexToVec3(atmoColor) },
        uRes: { value: new THREE.Vector2(window.innerWidth * window.devicePixelRatio, window.innerHeight * window.devicePixelRatio) },
      },
      vertexShader: MOTE_VERTEX,
      fragmentShader: MOTE_FRAGMENT,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    });
    this.motePts = new THREE.Points(this.moteGeo, this.moteMat);
    this.motePts.frustumCulled = false;
    this.scene.add(this.motePts);

    // ---- Postprocessing -----------------------------------------------------
    // A single composer: render the scene, then run it through the flame/warp
    // composite shader. (Two extra bloom composers previously ran here but
    // rendered nothing visible — see FINAL_FRAGMENT comment above.)
    const renderPass = new RenderPass(this.scene, this.camera);

    const finalUniforms = {
      iTime: { value: 0 },
      tDiffuse: { value: null },
      uBg: { value: hexToVec3(bgColor) },
      uFlameA: { value: hexToVec3(flameColor) },
      uFlameB: { value: hexToVec3(flameColor2) },
      uFlameAmt: { value: flameAmt },
    };
    this.finalPass = new ShaderPass({
      uniforms: finalUniforms,
      vertexShader: FINAL_VERTEX,
      fragmentShader: FINAL_FRAGMENT,
    } as any);

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(renderPass);
    this.composer.addPass(this.finalPass);

    this.bindEvents();
    this.resize();

    if (this.reducedMotion) {
      // Render a single static frame and stop; no rAF loop, no listeners
      // driving continuous motion.
      this.renderFrame(0, { x: 0, y: 0 });
      this.composer.render();
    } else {
      this.loop();
    }

    // If the preference changes mid-session, start/stop the loop to match.
    if (typeof window.matchMedia === 'function') {
      this.mql = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.mql.addEventListener?.('change', this.onMotionPrefChange);
    }
  }

  private onMotionPrefChange = (e: MediaQueryListEvent) => {
    this.reducedMotion = e.matches;
    if (this.reducedMotion) {
      cancelAnimationFrame(this.rafId);
    } else if (!this.disposed) {
      this.loop();
    }
  };

  private onVisibilityChange = () => {
    if (document.hidden) {
      cancelAnimationFrame(this.rafId);
    } else if (!this.disposed && !this.reducedMotion) {
      // Resync timers so a long hidden period doesn't produce a big jump.
      this.t0 = performance.now() / 1000;
      this.loop();
    }
  };

  private onScroll = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    this.scrollTarget = max > 0 ? clamp(window.scrollY / max, 0, 1) : 0;
  };

  private onMouseMove = (e: MouseEvent) => {
    this.mouseTarget.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouseTarget.y = -((e.clientY / window.innerHeight) * 2 - 1);
    this.POINTER.active = true;
    this.POINTER.lastMove = performance.now();
  };

  private onMouseOut = () => {
    this.POINTER.active = false;
  };

  private onResize = () => this.resize();

  private bindEvents() {
    window.addEventListener('scroll', this.onScroll, { passive: true });
    window.addEventListener('mousemove', this.onMouseMove, { passive: true });
    window.addEventListener('mouseout', this.onMouseOut);
    window.addEventListener('resize', this.onResize);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  private resize() {
    const w = window.innerWidth, h = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio, MAX_DPR);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.composer.setPixelRatio(dpr);
    this.composer.setSize(w, h);
    this.moteMat.uniforms.uRes.value.set(w * dpr, h * dpr);
    this.onScroll();
  }

  private updatePointerWorld() {
    this._tgt.set(0, 0, 0);
    if (this.POINTER.active) {
      this._ndc.set(this.mouse.x, this.mouse.y, 0.5).unproject(this.camera);
      this._dir.copy(this._ndc).sub(this.camera.position).normalize();
      const dn = this._dir.z;
      if (Math.abs(dn) > 1e-4) {
        const tt = -this.camera.position.z / dn;
        if (tt > 0 && Number.isFinite(tt)) this._tgt.copy(this.camera.position).addScaledVector(this._dir, tt);
      }
    }
    this.POINTER.world.lerp(this._tgt, 0.12);
    const idle = (performance.now() - this.POINTER.lastMove) / 1000;
    this.POINTER.activity += (((this.POINTER.active && idle < 3) ? 1 : 0) - this.POINTER.activity) * 0.06;
  }

  private renderFrame(scroll: number, m: { x: number; y: number }) {
    const t = performance.now() / 1000;
    const dt = Math.min(0.05, t - this.t0);
    this.t0 = t;
    this.uniforms.uTime.value = t;

    this.stream += dt * (flow * 2.0) * 4.0;
    this.uniforms.uStream.value = this.stream;
    this.uniforms.uWaveHeight.value = waveHeight * (1 + scroll * scrollRise);

    const ea = Math.min(scroll / 0.35, 1.0);
    const e = ea * ea * (3 - 2 * ea);
    const camY = Lerp(camStartY, camEndY, e);
    const camZ = Lerp(camStartZ, camEndZ, e);
    this.camera.position.set(m.x * parallax, camY + m.y * parallax * 0.3, camZ);
    this.camera.lookAt(m.x * parallax * 0.5, Lerp(0.0, 0.6, e), Lerp(lookStartZ, lookEndZ, e));
    this.group.rotation.x = -tilt;
    this.group.rotation.y = 0;
    this.updatePointerWorld();

    this.uniforms.uCursor.value.copy(this.POINTER.world);
    this.uniforms.uActivity.value = this.POINTER.activity;
    const elapsed = (performance.now() - this.appearStart) / 1000;
    this.uniforms.uAppear.value = Math.max(0, Math.min(1, (elapsed - 0.2) / 1.4));

    this.moteMat.uniforms.uTime.value = t * atmoSpeed * 8.0;
    this.motePts.position.copy(this.camera.position);
    this.finalPass.uniforms.iTime.value = t;
  }

  private loop = () => {
    if (this.disposed) return;
    this.scrollSmooth = Lerp(this.scrollSmooth, this.scrollTarget, 0.10);
    this.scrollCurrent = Lerp(this.scrollCurrent, this.scrollSmooth, 0.06);
    this.mouse.x = Lerp(this.mouse.x, this.mouseTarget.x, 0.06);
    this.mouse.y = Lerp(this.mouse.y, this.mouseTarget.y, 0.06);
    this.renderFrame(this.scrollCurrent, this.mouse);

    this.composer.render();

    this.rafId = requestAnimationFrame(this.loop);
  };

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.rafId);
    window.removeEventListener('scroll', this.onScroll);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseout', this.onMouseOut);
    window.removeEventListener('resize', this.onResize);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.mql?.removeEventListener?.('change', this.onMotionPrefChange);

    this.sphereGeo.dispose();
    this.pointsMat.dispose();
    this.moteGeo.dispose();
    this.moteMat.dispose();
    this.composer.dispose();
    this.renderer.dispose();
  }
}
