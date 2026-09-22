'use strict';
(() => {
 const key='gbauto.forge-mode.v1.youtube-intel';
 const toggle=document.getElementById('mode-toggle');
 function apply(mode,save=true){
  mode=mode==='dark'?'dark':'light';
  document.body.dataset.mode=mode;
  document.documentElement.style.colorScheme=mode;
  document.querySelector('meta[name="color-scheme"]').content=mode;
  document.querySelector('meta[name="theme-color"]').content=mode==='dark'?'#030405':'#F3F1E7';
  toggle.setAttribute('aria-pressed',String(mode==='dark'));
  toggle.title=mode==='dark'?'Turn off dark mode':'Turn on dark mode';
  if(save){
   try{localStorage.setItem(key,mode);}catch{}
   try{const url=new URL(location.href);url.searchParams.set('mode',mode);history.replaceState(null,'',url);}catch{}
  }
 }
 let initial=new URLSearchParams(location.search).get('mode');
 if(!initial){try{initial=localStorage.getItem(key);}catch{}}
 apply(initial||'light',false);
 toggle.addEventListener('click',()=>apply(document.body.dataset.mode==='dark'?'light':'dark'));
 window.ForgeMode={current:()=>document.body.dataset.mode,apply};
})();
