import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { createAvatar } from 'avatar-model';

const stage = document.querySelector<HTMLElement>('#stage')!;
const status = document.querySelector<HTMLElement>('#viewer-status')!;
async function boot() { try {
  const renderer = new THREE.WebGLRenderer({antialias:true, alpha:true, preserveDrawingBuffer:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  stage.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-label','Rotatable stylized avatar. Use arrow keys to rotate, plus or minus to zoom.');
  renderer.domElement.tabIndex=0;
  const scene=new THREE.Scene(), camera=new THREE.PerspectiveCamera(33,1,.05,80);
  const reference=document.querySelector<HTMLImageElement>('.reference img')!;
  await reference.decode();
  // A CSS-scaled <img> has layout dimensions that differ from its native pixels.
  // Use an unscaled image to prevent WebGL texStorage/texImage size mismatch.
  const textureImage=new Image();textureImage.src=reference.src;await textureImage.decode();
  const referenceTexture=new THREE.Texture(textureImage);referenceTexture.colorSpace=THREE.SRGBColorSpace;referenceTexture.needsUpdate=true;
  const avatar=createAvatar(THREE,{referenceTexture});scene.add(avatar);
  const bounds=new THREE.Box3().setFromObject(avatar), size=bounds.getSize(new THREE.Vector3());
  if([...bounds.min.toArray(),...bounds.max.toArray()].some(x=>!Number.isFinite(x))) throw new Error('Invalid model bounds');
  const center=bounds.getCenter(new THREE.Vector3());
  const radius=Math.max(size.y*1.95,size.x*2.8);
  const controls=new OrbitControls(camera,renderer.domElement);
  controls.target.copy(center);controls.enablePan=false;controls.enableDamping=true;
  controls.minDistance=radius*.52;controls.maxDistance=radius*1.55;
  controls.maxPolarAngle=Math.PI*.72;controls.minPolarAngle=.23;
  controls.autoRotateSpeed=.8;
  scene.add(new THREE.HemisphereLight('#86a5ff','#421829',1.1));
  function light(color,intensity,p) {
    const l=new THREE.DirectionalLight(color,intensity);l.position.set(...p);scene.add(l);return l;
  }
  const key=light('#ffb385',3.0,[-4,5,6]);key.castShadow=true;key.shadow.mapSize.set(2048,2048);
  Object.assign(key.shadow.camera,{left:-4,right:4,top:6,bottom:-2});key.shadow.bias=-.0003;
  key.shadow.normalBias=.025;
  light('#3563ff',4.2,[4,4,-3]);light('#ff6322',2.8,[-4,2,-2]);light('#719bff',2.3,[4,4,6]);
  const floor=new THREE.Mesh(new THREE.CircleGeometry(4,96),new THREE.ShadowMaterial({opacity:.23}));
  floor.rotation.x=-Math.PI/2;floor.position.y=-.01;floor.receiveShadow=true;scene.add(floor);
  let view='three-quarter';
  function setView(name) {
    view=name;controls.autoRotate=false;document.querySelector('#spin')?.setAttribute('aria-pressed','false');
    const angle=({'front':0,'side':Math.PI/2,'back':Math.PI,'three-quarter':.38})[name] ?? .38;
    const portraitDistance=Math.max(1,620/Math.max(stage.clientWidth,1));
    const distance=radius*Math.min(portraitDistance,1.35);
    camera.position.set(center.x+Math.sin(angle)*distance,center.y+distance*.09,center.z+Math.cos(angle)*distance);
    controls.target.copy(center);controls.update();
    document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.getAttribute('data-view')===name)));
  }
  new ResizeObserver(()=>{const w=stage.clientWidth,h=stage.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();renderRequested=true;}).observe(stage);
  document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>setView(b.getAttribute('data-view'))));
  document.querySelector('#reset')!.addEventListener('click',()=>setView('three-quarter'));
  document.querySelector('#spin')!.addEventListener('click',e=>{controls.autoRotate=!controls.autoRotate;(e.currentTarget as HTMLElement).setAttribute('aria-pressed',String(controls.autoRotate));});
  document.querySelector('#wire')!.addEventListener('click',e=>{
    const button=e.currentTarget as HTMLElement, active=button.getAttribute('aria-pressed')!=='true';
    button.setAttribute('aria-pressed',String(active));avatar.traverse(o=>{if(o.isMesh)for(const m of [].concat(o.material))m.wireframe=active;});renderRequested=true;
  });
  document.querySelector('#fullscreen')!.addEventListener('click',async()=>{
    try{if(document.fullscreenElement)await document.exitFullscreen();else await document.querySelector('#workspace')!.requestFullscreen();}
    catch{status.textContent='Open the full viewer link to use a larger canvas.';}
  });
  renderer.domElement.addEventListener('keydown',e=>{
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-','=','Home'].includes(e.key))return;
    e.preventDefault();controls.autoRotate=false;
    if(e.key==='Home'){setView('three-quarter');return;}
    const offset=camera.position.clone().sub(controls.target),s=new THREE.Spherical().setFromVector3(offset);
    if(e.key==='ArrowLeft')s.theta-=.15;if(e.key==='ArrowRight')s.theta+=.15;
    if(e.key==='ArrowUp')s.phi-=.1;if(e.key==='ArrowDown')s.phi+=.1;
    if(e.key==='+'||e.key==='=')s.radius*=.9;if(e.key==='-')s.radius*=1.1;
    s.phi=THREE.MathUtils.clamp(s.phi,.23,Math.PI*.72);s.radius=THREE.MathUtils.clamp(s.radius,controls.minDistance,controls.maxDistance);
    camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(s));controls.update();
  });
  let renderRequested=true;
  controls.addEventListener('change',()=>{renderRequested=true;});
  const renderFrame=()=>{controls.update();if(renderRequested){renderer.render(scene,camera);renderRequested=false;}};
  async function exportModel() {
    const button=document.querySelector('#export') as HTMLButtonElement;
    if(button.disabled)return;
    button.disabled=true;status.textContent='Preparing GLB download…';
    // Software WebGL runners otherwise compete with the exporter on every frame.
    renderer.setAnimationLoop(null);
    // Export shaded geometry even when the inspection wireframe is active.
    const materials=new Map();avatar.traverse(o=>{if(o.isMesh)for(const m of [].concat(o.material)){if(!materials.has(m))materials.set(m,m.wireframe);m.wireframe=false;}});
    try {
      const data=await new GLTFExporter().parseAsync(avatar,{binary:true});
      const blob=new Blob([data as ArrayBuffer],{type:'model/gltf-binary'}),url=URL.createObjectURL(blob),a=document.createElement('a');
      a.href=url;a.download='forge-avatar-draft.glb';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
      status.textContent='GLB downloaded. Drag to rotate · scroll to zoom';
      return (data as ArrayBuffer).byteLength;
    } finally {materials.forEach((value,m)=>m.wireframe=value);button.disabled=false;renderRequested=true;renderer.setAnimationLoop(renderFrame);}
  }
  document.querySelector('#export')!.addEventListener('click',()=>exportModel().catch(()=>{status.textContent='Export failed. Editable model source is still available.';}));
  let meshes=0,triangles=0;
  avatar.traverse(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;}});
  setView('three-quarter');
  status.textContent='Drag to rotate · scroll to zoom';
  const metrics={meshes,triangles,bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},rig:false,threeRevision:THREE.REVISION,
    referencePaint:avatar.userData.referencePaint===true,referenceDimensions:[reference.naturalWidth,reference.naturalHeight]};
  document.querySelector('#metrics')!.textContent=`${Math.round(triangles/1000)}k triangles · editable geometry`;
  (window as any).forgeAvatar={metrics,setView,exportModel,camera:()=>camera.position.toArray(),ready:true};
  renderer.setAnimationLoop(renderFrame);
  renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();status.textContent='3D context lost. Reload to restore; the portrait remains available.';});
} catch (error) {
  status.textContent='3D is unavailable in this browser. The original portrait is shown alongside.';
  (window as any).forgeAvatar={ready:false,error:String(error)};
}}
boot();
