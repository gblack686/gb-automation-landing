import * as THREE from 'three';

// Adapted from the approved GB Particle Dune Signature experiment (July 2026).
// This module is imported only by the homepage, after its content has mounted.
export async function createParticleScene(host, onError) {
  const logoImage = await new THREE.ImageLoader().loadAsync('/gb-signature.png');
  if (!host.isConnected) throw new Error('Homepage unmounted while the logo loaded.');
  const renderer = new THREE.WebGLRenderer({ antialias:true, powerPreference:"high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(host.clientWidth, host.clientHeight);
  renderer.setClearColor(0x000000, 1);
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x000000, 0.055);

  const camera = new THREE.PerspectiveCamera(52, host.clientWidth/host.clientHeight, 0.1, 200);
  camera.position.set(0, 23, 3.2);


  // ---------------------------------------------------------------- logo -> data texture (R = signal)
  // Signal = how "inside a stroke" a texel is (black ink on white bg -> 1).
  const LOGO_TEX = { value: null, aspect: 1 };
  function buildLogoTexture(img){
    const W = 512;
    const aspect = img.width / img.height;
    const H = Math.round(W / aspect);
    const cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    const ctx = cv.getContext("2d", { willReadFrequently:true });
    ctx.drawImage(img, 0, 0, W, H);
    const src = ctx.getImageData(0, 0, W, H).data;
    const data = new Uint8Array(W * H);              // single channel
    for (let i = 0; i < W*H; i++){
      const r = src[i*4], g = src[i*4+1], b = src[i*4+2], a = src[i*4+3];
      const lum = (0.299*r + 0.587*g + 0.114*b) / 255;
      // ink (dark) on cream/white -> signal high; respect transparency
      const signal = (a/255) * (1.0 - lum);
      data[i] = Math.round(THREE.MathUtils.clamp(signal, 0, 1) * 255);
    }
    const tex = new THREE.DataTexture(data, W, H, THREE.RedFormat, THREE.UnsignedByteType);
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
    LOGO_TEX.value = tex;
    LOGO_TEX.aspect = aspect;
    if (mat) { mat.uniforms.uLogo.value = tex; mat.uniforms.uLogoAspect.value = aspect; }
  }

  // ---------------------------------------------------------------- particle grid
  const GRID_X = 460, GRID_Y = 300;         // ~138k points
  const SIZE_X = 34, SIZE_Z = 22;
  const total = GRID_X * GRID_Y;
  const positions = new Float32Array(total * 3);
  const auv = new Float32Array(total * 2);   // 0..1 grid coords
  const arnd = new Float32Array(total);      // per-point jitter seed
  let p = 0, u = 0;
  for (let iy = 0; iy < GRID_Y; iy++){
    for (let ix = 0; ix < GRID_X; ix++){
      const fx = ix / (GRID_X - 1);
      const fz = iy / (GRID_Y - 1);
      positions[p*3+0] = (fx - 0.5) * SIZE_X;
      positions[p*3+1] = 0;
      positions[p*3+2] = (fz - 0.5) * SIZE_Z;
      auv[u*2+0] = fx;
      auv[u*2+1] = fz;
      arnd[p] = Math.sin(ix*12.9898 + iy*78.233) * 43758.5453;
      arnd[p] = arnd[p] - Math.floor(arnd[p]);
      p++; u++;
    }
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geom.setAttribute("auv", new THREE.BufferAttribute(auv, 2));
  geom.setAttribute("arnd", new THREE.BufferAttribute(arnd, 1));

  // ---------------------------------------------------------------- shader
  // GBauto style guide + gbauto-aura-dashboard-overrides.css, excluding terracotta.
  const LOGO_PALETTE = [
    0x77DCEA, // cyan
    0x9A7AD8, // violet
    0xD86CB8, // magenta
    0x6F7B4B, // olive
    0x3E6174, // blueprint
    0x4F9D69, // green
    0xC08A3E, // amber
    0x3D6EA8, // blue
    0xB94A48, // red
  ].map(hex => new THREE.Color(hex));

  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime:       { value: 0 },
      uSpeed:      { value: 0.75 },
      uTerrain:    { value: 1.0 },
      uMotion:     { value: 0.12 },
      uLift:       { value: 0.62 },
      uReveal:     { value: 1.0 },
      uDensity:    { value: 1.0 },
      uTint:       { value: 0.85 },
      uPixelRatio: { value: renderer.getPixelRatio() },
      uLogo:       { value: LOGO_TEX.value },
      uLogoAspect: { value: LOGO_TEX.aspect },
      uLogoPalette: { value: LOGO_PALETTE },
      uPaletteSeed: { value: Math.random() },
    },
    vertexShader: /* glsl */`
      uniform float uTime, uSpeed, uTerrain, uMotion, uLift, uReveal, uDensity, uPixelRatio, uLogoAspect;
      uniform float uPaletteSeed;
      uniform vec3 uLogoPalette[${LOGO_PALETTE.length}];
      uniform sampler2D uLogo;
      attribute vec2 auv;
      attribute float arnd;
      varying float vBright;
      varying float vLogo;
      varying float vFade;
      varying vec3 vLogoColor;

      // cheap value noise
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
      float noise(vec2 p){
        vec2 i = floor(p), f = fract(p);
        float a = hash(i), b = hash(i+vec2(1.,0.)), c = hash(i+vec2(0.,1.)), d = hash(i+vec2(1.,1.));
        vec2 uu = f*f*f*(f*(f*6.0-15.0)+10.0);   // quintic — C2 smooth, kills grid-grain jitter
        return mix(mix(a,b,uu.x), mix(c,d,uu.x), uu.y);
      }
      float fbm(vec2 p){
        float v = 0.0, amp = 0.5;
        for(int i=0;i<3;i++){ v += amp*noise(p); p *= 2.0; amp *= 0.5; }  // fewer octaves = smoother, long-wavelength dunes
        return v;
      }

      void main(){
        float t = uTime * uSpeed;
        vec3 pos = position;
        // Randomize once per load; each droplet keeps its color throughout the loop.
        int palettePick = int(floor(fract(arnd * 17.57 + uPaletteSeed) * float(${LOGO_PALETTE.length})));
        vLogoColor = uLogoPalette[palettePick];

        // ---- drifting dune field (the reference look) ----
        vec2 q = auv * vec2(2.4, 1.7);
        // STATIC dune silhouette — the shape never scrolls, so nothing shakes over time
        float base = fbm(q);
        // gentle, low-frequency, spatially-COHERENT sway: neighbouring droplets share almost
        // the same value, so they rise/fall together instead of jittering against each other
        float sway = (fbm(q*0.5 + vec2(0.0, t*0.05)) - 0.5) * uMotion;
        float ridges = pow(base, 1.25) + sway;
        float terrainH = ridges * 4.2 * uTerrain;

        // ---- sample GB signature, mapped onto the terrain plane ----
        // fit logo aspect into the grid footprint, centered
        vec2 luv = auv;
        float gridAspect = 34.0/22.0;
        vec2 c = luv - 0.5;
        c.x *= gridAspect / uLogoAspect;        // letterbox to keep the mark's proportions
        c *= 1.45;                               // larger factor = smaller mark = margin so the full signature fits the frame
        vec2 sampleUV = c + 0.5;
        // DataTexture (flipY=false) row 0 = image top; grid auv.y=0 is the far edge,
        // so sampleV = auv.y lays the signature flat and upright toward the camera.
        float logo = 0.0;
        if(sampleUV.x > 0.0 && sampleUV.x < 1.0 && sampleUV.y > 0.0 && sampleUV.y < 1.0){
          logo = texture2D(uLogo, sampleUV).r;
        }
        // soften + animate the reveal sweeping across the field
        float sweep = smoothstep(0.0, 1.0, uReveal*1.4 - auv.x*0.4);
        logo *= sweep;
        logo = smoothstep(0.12, 0.55, logo);

        // logo lifts the terrain into a glowing embossed ridge
        float logoH = logo * (2.2 + uMotion*0.5*sin(t*0.35 + (auv.x+auv.y)*3.5)) * uLift * 3.2;

        pos.y = terrainH + logoH;

        // subtle per-point jitter so the grid reads as scattered dust, not a lattice
        pos.x += (arnd - 0.5) * 0.06;
        pos.z += (fract(arnd*7.0) - 0.5) * 0.06;

        vLogo = logo;
        // brightness: crests catch light + logo glows hard
        vBright = smoothstep(0.15, 1.0, ridges) * 0.9 + logo * 1.8;

        vec4 mv = modelViewMatrix * vec4(pos, 1.0);
        float dist = -mv.z;
        vFade = (1.0 - smoothstep(6.0, 42.0, dist));   // far dust fades to black

        // density control drops a fraction of points to thin the field
        float keep = step(1.0 - uDensity*0.65, fract(arnd*3.3 + 0.13));
        float baseSize = (2.2 + logo*3.4) * uPixelRatio;
        gl_PointSize = keep * baseSize * (18.0 / dist);

        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */`
      precision highp float;
      uniform float uTint;
      varying vec3 vLogoColor;
      varying float vBright;
      varying float vLogo;
      varying float vFade;

      void main(){
        // round, soft dot
        vec2 d = gl_PointCoord - 0.5;
        float r = dot(d, d);
        if(r > 0.25) discard;
        float alpha = (1.0 - smoothstep(0.02, 0.25, r));

        vec3 white = vec3(0.92, 0.93, 0.95);
        // Scatter the complementary accents only through the GB signature.
        vec3 col = mix(white, vLogoColor, clamp(vLogo * uTint, 0.0, 1.0));
        col *= (0.35 + vBright);

        float a = alpha * vFade * (0.35 + vBright*0.9);
        if(a < 0.01) discard;
        gl_FragColor = vec4(col, a);
      }
    `,
  });

  const points = new THREE.Points(geom, mat);
  scene.add(points);


  buildLogoTexture(logoImage);
  const hero = { cam:[0,23,3.2], tgt:[0,0.2,-0.4], lift:0.55, reveal:1, terrain:0.14, motion:0.10, speed:0.30, density:1, tint:0.85 };
  const pose = (values) => ({...hero, ...values});
  // The exact 100-second Tight Skim loop selected in the preview.
  const keys = [
    pose({t:0}),
    pose({t:0.34, cam:[-3.2,2.0,2.6], tgt:[0,0.6,0], terrain:1, reveal:0.45, motion:0.09, density:1.10}),
    pose({t:0.66, cam:[3.2,2.0,2.6], tgt:[0,0.6,0], terrain:1, reveal:0.45, motion:0.09, density:1.10}),
    pose({t:1}),
  ];
  const uniformNames = {lift:'uLift', reveal:'uReveal', terrain:'uTerrain', motion:'uMotion', speed:'uSpeed', density:'uDensity', tint:'uTint'};
  const target = new THREE.Vector3();
  function sample(phase) {
    const i = Math.max(0, keys.findIndex((key, index) => index < keys.length-1 && phase <= keys[index+1].t));
    const a = keys[i], b = keys[i+1];
    const x = THREE.MathUtils.clamp((phase-a.t)/(b.t-a.t), 0, 1);
    const e = x*x*x*(x*(x*6-15)+10);
    for(let axis=0;axis<3;axis++) {
      camera.position.setComponent(axis, THREE.MathUtils.lerp(a.cam[axis],b.cam[axis],e));
      target.setComponent(axis, THREE.MathUtils.lerp(a.tgt[axis],b.tgt[axis],e));
    }
    camera.lookAt(target);
    for(const [key, uniform] of Object.entries(uniformNames)) {
      mat.uniforms[uniform].value = THREE.MathUtils.lerp(a[key],b[key],e);
    }
  }
  let disposed = false, playing = false, frame = 0, previous = 0, elapsed = 0;
  function render() { renderer.render(scene, camera); }
  function tick(now) {
    if (disposed || !playing) return;
    frame = requestAnimationFrame(tick);
    // Cap this decorative layer at 30 fps; elapsed time still drives the loop.
    if (now-previous < 1000/30) return;
    const dt = Math.min((now-previous)/1000, 0.1);
    previous = now;
    elapsed += dt;
    mat.uniforms.uTime.value += dt;
    sample((elapsed % 100)/100);
    render();
  }
  function setPlaying(value) {
    if (disposed || playing === value) return;
    playing = value;
    cancelAnimationFrame(frame);
    if (playing) { previous = performance.now(); frame = requestAnimationFrame(tick); }
  }
  function resize() {
    if (disposed) return;
    const width = host.clientWidth, height = host.clientHeight;
    if (!width || !height) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1,1.5));
    renderer.setSize(width,height);
    camera.aspect = width/height;
    camera.updateProjectionMatrix();
    mat.uniforms.uPixelRatio.value = renderer.getPixelRatio();
    render();
  }
  function contextLost(event) {
    event.preventDefault();
    setPlaying(false);
    onError();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  renderer.domElement.addEventListener('webglcontextlost',contextLost);
  sample(0);
  render();
  return {
    setPlaying,
    dispose() {
      if (disposed) return;
      setPlaying(false);
      disposed = true;
      observer.disconnect();
      renderer.domElement.removeEventListener('webglcontextlost',contextLost);
      LOGO_TEX.value?.dispose();
      geom.dispose();
      mat.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
