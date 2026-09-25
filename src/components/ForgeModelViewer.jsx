import {useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';

export default function ForgeModelViewer({bytes,onReady}){
 const host=useRef(null),cameraControl=useRef(null),[error,setError]=useState('');
 useEffect(()=>{
  const container=host.current;let renderer,controls,model,disposed=false,observer;
  const disposeModel=object=>object?.traverse(n=>{n.geometry?.dispose();for(const m of [n.material].flat().filter(Boolean)){for(const t of Object.values(m))if(t?.isTexture){t.source?.data?.close?.();t.dispose();}m.dispose();}});
  try{
   renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;
   const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(35,1,.01,1000);scene.background=new THREE.Color('#e8e5dc');
   scene.add(new THREE.HemisphereLight(0xffffff,0x66564a,2.5));const key=new THREE.DirectionalLight(0xffffff,3);key.position.set(4,8,5);scene.add(key);
   const fill=new THREE.DirectionalLight(0xb5c9ef,1.4);fill.position.set(-4,4,-5);scene.add(fill);
   controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=false;
   const render=()=>{if(!disposed)renderer.render(scene,camera);};controls.addEventListener('change',render);container.append(renderer.domElement);
   const resize=()=>{const {width,height}=container.getBoundingClientRect();renderer.setSize(width,height);camera.aspect=width/Math.max(1,height);camera.updateProjectionMatrix();render();};
   observer=new ResizeObserver(resize);observer.observe(container);resize();
   new GLTFLoader().parse(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'',gltf=>{
    if(disposed){disposeModel(gltf.scene);return;}model=gltf.scene;scene.add(model);
    const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
    const radius=Math.max(size.x,size.y,size.z)*1.8;if(!Number.isFinite(radius)||radius<=0){setError('Model has no visible geometry.');return;}
    controls.target.copy(center);camera.near=radius/100;camera.far=radius*30;camera.updateProjectionMatrix();controls.minDistance=radius*.35;controls.maxDistance=radius*4;
    cameraControl.current=angle=>{camera.position.set(center.x+Math.sin(angle)*radius,center.y+radius*.14,center.z+Math.cos(angle)*radius);controls.update();render();};cameraControl.current(0);onReady();
   },()=>setError('The model could not render. Keep the portrait fallback and inspect the downloaded GLB.'));
  }catch{setError('3D rendering is unavailable on this device.');}
  return()=>{disposed=true;observer?.disconnect();controls?.dispose();disposeModel(model);renderer?.dispose();renderer?.forceContextLoss();renderer?.domElement.remove();cameraControl.current=null;};
 },[bytes,onReady]);
 return <div><div ref={host} className="visual-model" aria-label="Rotatable character model"/>{error&&<p role="alert">{error}</p>}<div className="visual-actions">{[['Front',0],['Side',Math.PI/2],['Back',Math.PI]].map(([label,angle])=><button key={label} onClick={()=>cameraControl.current?.(angle)}>{label}</button>)}<small>Drag to rotate · scroll to zoom</small></div></div>;
}
