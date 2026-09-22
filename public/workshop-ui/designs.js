'use strict';
(() => {
 const designs = [
  {id:'studio',name:'Studio',number:'01',tag:'Selected',description:'Soft cream panels, confident Inter titles, and an even spacing rhythm. The selected design for everyday work.'},
  {id:'editorial',name:'Editorial',number:'02',tag:'Room to read',description:'Large Newsreader window titles, paper-like surfaces, and generous padding. A quieter feel for research and review.'},
  {id:'precision',name:'Precision',number:'03',tag:'Clear structure',description:'Crisp corners, stronger rules, and compact uppercase titles. For scanning commands, settings, and operational work.'},
  {id:'glass',name:'Glass',number:'04',tag:'Closest to the website',description:'Translucent cream panels, soft depth, and rounded icon badges. Uses the landing page’s glass-surface language.'},
  {id:'contrast',name:'Contrast',number:'05',tag:'Nexus evolved',description:'Warm ink tools with bright cream titles and terracotta separators. Keeps the approved Nexus feel around a light reading canvas.'}
 ];
 // Start the approved Studio default without inheriting exploratory v1 choices.
 const key='gbauto.forge-design.v2.youtube-intel';
 const $=id=>document.getElementById(id);
 $('design-cards').innerHTML=designs.map(d=>`<article class="design-card"><img src="assets/design-${d.id}.jpg" alt="${d.name} workshop preview" loading="lazy" width="1280" height="800"><div class="design-card-body"><div class="design-card-title"><h3>${d.number} ${d.name}</h3><span>${d.tag}</span></div><p>${d.description}</p><button data-design-choice="${d.id}" data-close-design aria-pressed="false">Try ${d.name}</button></div></article>`).join('');
 $('aura-recommendations').innerHTML=`<div class="guidance-grid"><div><strong>1. UI Design System</strong><p>Use its 8-point spacing system and shared component tokens. One rhythm for panel padding, controls, and related content.</p><a href="https://www.aura.build/skills/1b637f50-99fb-4516-a0dc-651c74bee09a/ui-design-system" target="_blank" rel="noopener">Read the skill ↗</a></div><div><strong>2. Typography Cleanup Specialist</strong><p>Use a small, fixed type scale for this workbench: 16px body, 18px tool titles, 24px editorial titles, and 1.6 body line spacing. Keep Inter and Newsreader.</p><a href="https://www.aura.build/skills/bfcd1fd4-adc8-4ef2-896c-ed62bbe459bf/typography-cleanup-specialist" target="_blank" rel="noopener">Read the skill ↗</a></div><div><strong>3. Web Interface Guidelines</strong><p>Use as the quality check: keyboard access, visible focus, labeled controls, contrast, long text, responsive layouts, and reduced motion.</p><a href="https://www.aura.build/skills/77b75b55-6806-4750-84b3-1e9c00b391d8/web-interface-guidelines" target="_blank" rel="noopener">Read the skill ↗</a></div></div><div class="applied-rules"><p><strong>Applied here:</strong> a shared type scale, 16/24px panel padding, stronger window titles, quieter surfaces, and the official GB watermark under every layout. <a href="https://www.aura.build/skills/50a1d18a-c40c-47e6-979a-f5ac32148d50/responsive-design" target="_blank" rel="noopener">Responsive Design</a> is the useful companion for windows that can change size. These are scoped design references, not new installed dependencies.</p></div>`;
 function applyDesign(id,save=true){
  if(!designs.some(d=>d.id===id))id='studio';
  document.body.dataset.design=id;
  document.querySelectorAll('[data-design-choice]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.designChoice===id)));
  if(save){try{localStorage.setItem(key,id);}catch{}
   try{const url=new URL(location.href);url.searchParams.set('design',id);history.replaceState(null,'',url);}catch{}}
  document.title='Agent Workshop / '+designs.find(d=>d.id===id).name;
 }
 let initial=new URLSearchParams(location.search).get('design');
 if(!initial){try{initial=localStorage.getItem(key);}catch{}}
 applyDesign(initial||'studio',false);
 document.addEventListener('click',ev=>{
  const button=ev.target.closest('[data-design-choice]');
  if(!button)return;
  applyDesign(button.dataset.designChoice);
  if(button.hasAttribute('data-close-design'))$('design-dialog').close();
 });
 $('compare-designs').addEventListener('click',()=>$('design-dialog').showModal());
 $('close-design-dialog').addEventListener('click',()=>$('design-dialog').close());
 const header=document.querySelector('.app-header');
 new ResizeObserver(()=>document.body.style.setProperty('--app-header-height',header.getBoundingClientRect().height+'px')).observe(header);
 window.ForgeDesigns={designs,current:()=>document.body.dataset.design,apply:applyDesign};
})();
