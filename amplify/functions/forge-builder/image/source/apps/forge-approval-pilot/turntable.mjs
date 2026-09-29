import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';

class ForgeTurntable extends HTMLElement {
 connectedCallback(){
  if(this.started)return;this.started=true;this.alive=true;
  const shadow=this.attachShadow({mode:'open'});
  shadow.innerHTML='<style>:host{display:block;min-height:280px;position:relative;border-radius:14px;overflow:hidden;background:radial-gradient(ellipse at 50% 70%,#474039,#191919 75%)}canvas{display:block;width:100%;height:100%}button{position:absolute;bottom:10px;right:10px;border:1px solid #999;background:#191919cc;color:#f3f1e7;padding:6px 10px;border-radius:8px}p{position:absolute;top:10px;left:16px;color:#f3f1e7;font:12px sans-serif}</style><p role="status">Loading character…</p><button type="button">Pause rotation</button>';
  const status=shadow.querySelector('p');
  try{
   const renderer=this.renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));shadow.prepend(renderer.domElement);
   const scene=this.scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(35,1,.01,1000);
   scene.add(new THREE.HemisphereLight(0xffffff,0x555555,2.6));
   const key=new THREE.DirectionalLight(0xffe8d2,3);key.position.set(3,5,4);scene.add(key);
   const fill=new THREE.DirectionalLight(0xffffff,1.8);fill.position.set(-3,3,-3);scene.add(fill);
   const controls=this.controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.enablePan=false;
   controls.autoRotate=!matchMedia('(prefers-reduced-motion: reduce)').matches;controls.autoRotateSpeed=1;
   const button=shadow.querySelector('button');const label=()=>button.textContent=controls.autoRotate?'Pause rotation':'Rotate character';label();button.onclick=()=>{controls.autoRotate=!controls.autoRotate;label();};
   const resize=()=>{const w=this.clientWidth||400,h=this.clientHeight||300;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();};
   this.observer=new ResizeObserver(resize);this.observer.observe(this);resize();
   new GLTFLoader().load(this.getAttribute('src'),gltf=>{
    if(!this.alive){this.disposeModel(gltf.scene);return;}
    scene.add(gltf.scene);const box=new THREE.Box3().setFromObject(gltf.scene),center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());
    gltf.scene.position.sub(center);const radius=Math.max(size.x,size.y,size.z);camera.position.set(radius*.75,radius*.2,radius*2.0);camera.near=radius/100;camera.far=radius*15;camera.updateProjectionMatrix();controls.target.set(0,0,0);controls.update();status.textContent='Drag to rotate · Scroll to zoom';
   },undefined,()=>{status.textContent='3D preview unavailable. The portrait and model download remain available.';});
   renderer.setAnimationLoop(()=>{if(!this.alive)return;controls.update();renderer.render(scene,camera);});
  }catch{status.textContent='3D preview unavailable on this device. The portrait remains available.';}
 }
 disposeModel(scene){scene.traverse(o=>{o.geometry?.dispose();for(const m of Array.isArray(o.material)?o.material:o.material?[o.material]:[]){for(const value of Object.values(m))if(value?.isTexture)value.dispose();m.dispose();}});}
 disconnectedCallback(){this.alive=false;this.observer?.disconnect();this.controls?.dispose();if(this.scene)this.disposeModel(this.scene);this.renderer?.setAnimationLoop(null);this.renderer?.dispose();this.renderer?.forceContextLoss();}
}
if(!customElements.get('forge-turntable'))customElements.define('forge-turntable',ForgeTurntable);
