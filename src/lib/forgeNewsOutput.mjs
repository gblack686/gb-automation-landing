// Presentation of already integrity-checked News JSON. This grants no execution,
// publication, native-source identity or target acceptance.
export function newsOutputSummary(value) {
 if(value?.schema_version!=='forge-news-card-export.v1')return null;
 const c=value.card,l=value.lineage;
 if(value.expert_id!=='gbautomation/news-agent'||value.running_source_commit!==null
  ||typeof value.export_source_commit!=='string'||!/^[a-f0-9]{40}$/.test(value.export_source_commit)
  ||!c||!l||!Number.isSafeInteger(c.id)||c.id<1||String(c.tool_call_id)!==String(l.tool_task_id)
  ||!Number.isSafeInteger(c.conversation_id)||c.conversation_id<1||!Number.isSafeInteger(c.sweep_id)||c.sweep_id<1
  ||['tool_row_id','tool_task_id','run_entry_id','generation_entry_id','generation_task_id','sweep_task_id'].some(k=>!Number.isSafeInteger(l[k])||l[k]<1)
  ||typeof c.props_json!=='string'||c.props_json.length>262144)throw Error('News output identity unavailable');
 const props=JSON.parse(c.props_json);
 if(!props||typeof props!=='object'||Array.isArray(props))throw Error('News output content unavailable');
 const text=(v,max)=>typeof v==='string'&&v.length<=max?v:null;
 const title=text(props.title,1000),summary=text(props.summary,100000);
 if(!title?.trim()||!summary?.trim())return null; // Other native card types retain the full JSON view.
 return {title,summary,category:text(c.primary_category,200),createdAt:text(c.created_at,100),
  cardId:c.id,conversationId:c.conversation_id,sweepId:c.sweep_id,taskId:l.tool_task_id,
  generationId:l.generation_entry_id,exportSource:value.export_source_commit};
}

export function appendNewsOutput(doc,raw) {
 let parsed;try{parsed=JSON.parse(raw);}catch{return false;}
 const value=newsOutputSummary(parsed);if(!value)return false;
 const style=doc.createElement('style');style.textContent=`
 body{margin:0;background:#f3f1e7;color:#262623;font:15px/1.65 system-ui,sans-serif}
 main{max-width:760px;margin:auto;padding:clamp(18px,5vw,40px);overflow-wrap:anywhere}
 .eyebrow{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#875944}
 h1{font:500 clamp(24px,5vw,36px)/1.2 Georgia,serif;margin:16px 0 22px}
 .summary{white-space:pre-wrap}.context{padding-top:18px;border-top:1px solid #d5d2c7;font-size:12px;color:#626158}
 dl{display:grid;grid-template-columns:1fr 2fr;gap:6px 12px}dt,dd{margin:0}
 details{margin-top:24px}summary{cursor:pointer}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:12px/1.5 monospace}
 @media(max-width:420px){dl{grid-template-columns:1fr}dd{margin-bottom:8px}}
 `;doc.head.append(style);
 const main=doc.createElement('main'),article=doc.createElement('article');main.append(article);doc.body.append(main);
 const add=(tag,text,parent=article,cls='')=>{const el=doc.createElement(tag);el.textContent=text;if(cls)el.className=cls;parent.append(el);return el;};
 add('p','News · Saved result',article,'eyebrow');add('h1',value.title);add('p',value.summary,article,'summary');
 const context=add('section','',article,'context');context.setAttribute('aria-label','Saved result context');
 const dl=add('dl','',context);
 for(const [name,text] of [['Category',value.category||'Not recorded'],['Recorded at',value.createdAt||'Not recorded'],['Card',String(value.cardId)],['Task / generation',value.taskId+' / '+value.generationId]]){add('dt',name,dl);add('dd',text,dl);}
 add('p','Captured output. Delivery and target acceptance remain unproven.',context);
 const details=add('details','');add('summary','Inspect source record',details);
 add('p','Export producer: '+value.exportSource+'. Running News source is not verified.',details);
 add('pre',raw,details);
 return true;
}
