'use strict';
// Hosted documents run in an opaque sandbox. Authentication stays in the React host.
(() => {
 if (window.parent === window) return;
 const channel = document.querySelector('meta[name="forge-host-channel"]')?.content || '';
 if (!/^[a-f0-9-]{36}$/.test(channel)) return;
 const pending = new Map();
 let sequence = 0;
 window.addEventListener('message', event => {
  const message = event.data;
  if(event.source===window.parent&&message?.type==='forge-visual.updated.v1'&&message.channel===channel){window.dispatchEvent(new Event('forge-visual-updated'));return;}
  if (event.source !== window.parent || message?.type !== 'forge-atlas.response.v1'
      || message.channel !== channel || !pending.has(message.id)) return;
  const request = pending.get(message.id);
  pending.delete(message.id); clearTimeout(request.timer);
  if (message.ok) request.resolve(message.payload);
  else request.reject(new Error('Private data unavailable'));
 });
 window.ForgeHost = Object.freeze({
  read(view, input = {}) {
   if (!['atlas','planning','history','approvalSnapshot','proposals','proposal','visualOpen','visualActive','builderOpen'].includes(view)) return Promise.reject(new Error('Unknown view'));
   return new Promise((resolve, reject) => {
    const id = String(++sequence);
    const timer = setTimeout(() => { pending.delete(id); reject(new Error('Read timed out')); }, 30000);
    pending.set(id, {resolve, reject, timer});
    // Opaque sandbox has no same-origin authority; source-window and random channel bind the host.
    window.parent.postMessage({type:'forge-atlas.request.v1',channel,id,view,input}, '*');
   });
  }
 });
 window.addEventListener('DOMContentLoaded',() => {
  const start=document.querySelector('meta[name="forge-start-window"]')?.content;
  if(['proposals','presence'].includes(start)) {
   document.querySelector('.dock-button[data-open="'+start+'"]')?.click();
   document.querySelector('#window-'+start+' [data-window-action="maximize"]')?.click();
  }
 });
})();
