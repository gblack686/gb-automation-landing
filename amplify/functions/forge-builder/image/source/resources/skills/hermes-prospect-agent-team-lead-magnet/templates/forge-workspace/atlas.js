'use strict';
// Bokeh scatter, numeric/date axes and area-scaled bubbles follow Atlas PR 1160.
// The shared selection drives both the chart and the accessible HTML table.
(async () => {
 const $ = id => document.getElementById(id);
 const identity = JSON.parse($('forge-data').textContent).agent_id;
 const labels = {observed_at:'Recorded at',tokens:'Tokens',cost:'Cost (USD)',duration:'Duration (seconds)',events:'Tool calls',uniform:'Uniform'};
 const metrics = {traces:['tokens','cost','duration'],runs:['duration'],sessions:['duration','events']};
 let snapshot = JSON.parse($('atlas-snapshot').textContent);
 let transport = 'Saved snapshot', failure = '', source, chart, doc, plotted = [], sample = false;
 const remote = window.ForgeHost || (location.protocol === 'http:' && ['127.0.0.1','localhost'].includes(location.hostname));
 const tableIds = ['atlas','table'];
 function refreshButtons(disabled) { for (const id of tableIds) $(id+'-refresh').disabled = disabled; }
 refreshButtons(!remote);
 if (!remote) for (const id of tableIds) $(id+'-refresh').title = 'Live refresh is available in the local Forge preview.';
 function exampleData() {
  const end = Date.parse(snapshot?.captured_at || new Date().toISOString());
  const datasets = {traces:[],runs:[],sessions:[]};
  const palette = ['#D97757','#5B8DB8','#739B70','#A27BB8','#C59A43','#4C9F9D','#BD708D'];
  // Seeded Box-Muller samples keep the same busy, long-tailed cloud across filter changes.
  let seed = 0x5F3759DF;
  const random = () => ((seed = (Math.imul(1664525,seed) + 1013904223) >>> 0) + .5) / 4294967296;
  const logNormal = (median, sigma) => Math.exp(Math.log(median) + sigma * Math.sqrt(-2*Math.log(random())) * Math.cos(2*Math.PI*random()));
  for (let i = 0; i < 150; i++) {
   const ageDays = Math.min(85,logNormal(12,.8));
   const common = {observed_at:new Date(end-ageDays*86400000).toISOString(),color:palette[i%palette.length],alpha:.25+(i%9)*.08};
   const tokens = Math.max(1,Math.round(logNormal(2500,1.05)));
   datasets.traces.push({...common,row_key:'sample-trace-'+(i+1),tokens,cost:tokens*.000002*logNormal(1,.25),duration:logNormal(12,.75),events:null});
   datasets.runs.push({...common,row_key:'sample-run-'+(i+1),tokens:null,cost:null,duration:logNormal(90,.95),events:null});
   datasets.sessions.push({...common,row_key:'sample-session-'+(i+1),tokens:null,cost:null,duration:logNormal(900,1),events:Math.max(1,Math.round(logNormal(9,.9)))});
  }
  return datasets;
 }
 function safeSnapshot(value) {
  if (value?.schema_version !== 'forge-atlas-snapshot.v1' || value.agent_id !== identity ||
      value.source !== 'supabase' || !Number.isFinite(Date.parse(value.captured_at))) throw Error('Wrong snapshot');
  for (const dataset of Object.keys(metrics)) {
   const rows = value.datasets?.[dataset];
   if (!Array.isArray(rows) || rows.length > 200) throw Error('Invalid rows');
   for (const row of rows) {
    if (!/^(traces|runs|sessions)-[0-9]{1,3}$/.test(row.row_key) || !Number.isFinite(Date.parse(row.observed_at))) throw Error('Invalid record');
    for (const metric of ['tokens','cost','duration','events']) if (row[metric] !== null &&
       (typeof row[metric] !== 'number' || !Number.isFinite(row[metric]) || row[metric] < 0)) throw Error('Invalid metric');
   }
  }
  return value;
 }
 function options() {
  const fields = metrics[$('atlas-dataset').value];
  for (const [id, choices, fallback] of [['atlas-x',['observed_at',...fields],'observed_at'],['atlas-y',fields,fields[0]],['atlas-size',['uniform',...fields],fields[0]]]) {
   const previous = $(id).value;
   $(id).replaceChildren(...choices.map(key => new Option(labels[key], key)));
   $(id).value = choices.includes(previous) ? previous : fallback;
  }
 }
 function value(row, key) { return key === 'observed_at' ? Date.parse(row.observed_at) : row[key]; }
 function format(number, key) {
  if (number === null || !Number.isFinite(number)) return 'Not measured';
  return key === 'observed_at' ? new Date(number).toLocaleString() : number.toLocaleString(undefined,{maximumFractionDigits:key === 'cost'?5:2});
 }
 function selection() {
  const selected = new Set(source.selected.indices);
  for (const id of tableIds) {
   $(id+'-rows').querySelectorAll('tr').forEach((row,index) => {
    row.classList.toggle('is-selected',selected.has(index));
    row.querySelector('button').setAttribute('aria-pressed',String(selected.has(index)));
   });
   $(id+'-summary').textContent = plotted.length+' plotted'+(selected.size?' · '+selected.size+' selected':'');
   $(id+'-clear').hidden = selected.size === 0;
  }
 }
 function drawTable(x, y, size) {
  for (const id of tableIds) {
   $(id+'-rows').replaceChildren();
   $(id+'-x-heading').textContent = labels[x]; $(id+'-y-heading').textContent = labels[y];
   plotted.forEach((row,index) => {
    const tr = document.createElement('tr'), td = document.createElement('td'), button = document.createElement('button');
    button.textContent = row.row_key; button.type = 'button'; button.setAttribute('aria-pressed','false');
    button.addEventListener('click',() => { source.selected.indices = source.selected.indices.includes(index) ? [] : [index]; });
    td.append(button); tr.append(td);
    for (const key of [x,y,size]) { const cell = document.createElement('td'); cell.textContent = key === 'uniform'?'Uniform':format(value(row,key),key); tr.append(cell); }
    $(id+'-rows').append(tr);
   });
  }
 }
 function update() {
  // Any real record switches the entire window to real data, even when another dataset is empty.
  sample = !snapshot || !Object.values(snapshot.datasets).some(rows => rows.length > 0);
  const datasets = sample ? exampleData() : snapshot.datasets;
  const rows = datasets[$('atlas-dataset').value], x = $('atlas-x').value, y = $('atlas-y').value, size = $('atlas-size').value;
  plotted = rows.filter(row => Number.isFinite(value(row,x)) && Number.isFinite(value(row,y)) &&
    (size === 'uniform' || Number.isFinite(value(row,size))));
  const high = Math.max(0,...plotted.map(row => size === 'uniform'?0:row[size]));
  // Same bounded bubble-area encoding as operator_atlas.scatter.marker_sizes.
  source.data = {
   x:plotted.map(row => value(row,x)), y:plotted.map(row => value(row,y)), row_key:plotted.map(row => row.row_key),
   size_value:plotted.map(row => size === 'uniform'?1:row[size]),
   marker_size:plotted.map(row => size === 'uniform'?12:high>0?Math.sqrt(64+(2304-64)*row[size]/high):12),
   color_value:plotted.map(row => sample?row.color:'#D97757'),
   alpha_value:plotted.map(row => sample?row.alpha:.7)
  };
  source.selected.indices = [];
  doc.get_model_by_name('forge-atlas-date-axis').visible = x === 'observed_at';
  const numeric = doc.get_model_by_name('forge-atlas-number-axis');
  numeric.visible = x !== 'observed_at'; numeric.axis_label = labels[x];
  chart.left[0].axis_label = labels[y];
  $('atlas-empty').textContent = rows.length === 0 ? 'No records in this dataset yet.' :
    rows.length !== plotted.length ? (rows.length-plotted.length)+' records lack a selected measurement and are not plotted.' : '';
  $('atlas-source-note').textContent = snapshot ? 'Checked '+new Date(snapshot.captured_at).toLocaleString()+'.' : 'Supabase has not been checked.';
  $('atlas-filter-summary').textContent = $('atlas-dataset').selectedOptions[0].text+' · '+labels[y]+' vs '+labels[x];
  $('atlas-status').textContent = (failure ? failure+' ' : '') +
    (sample ? 'EXAMPLE DATA · Illustrative activity. Real records replace these examples.' :
              transport+' · This agent’s recorded activity.');
  $('window-atlas').dataset.dataMode = sample?'sample':'real';
  $('window-table').dataset.dataMode = sample?'sample':'real';
  for (const part of ['status','empty','filter-summary']) $('table-'+part).textContent = $('atlas-'+part).textContent;
  drawTable(x,y,size); selection();
 }
 function theme() {
  const dark = document.body.dataset.mode === 'dark';
  const bg = dark?'#151719':'#F3F1E7', fg = dark?'#EEEDE7':'#191919', grid = dark?'#373B40':'#D6D4C8';
  chart.background_fill_color = bg; chart.border_fill_color = bg; chart.outline_line_color = grid;
  for (const axis of [...chart.below,...chart.left]) {
   axis.axis_label_text_color = fg; axis.major_label_text_color = fg; axis.axis_line_color = grid;
   axis.major_tick_line_color = grid; axis.minor_tick_line_color = grid;
  }
  for (const line of chart.center.filter(item => item.type === 'Grid')) line.grid_line_color = grid;
 }
 function fitChart() {
  const area = $('atlas-plot').getBoundingClientRect();
  if (!area.width || !area.height) return;
  // Fit the actual space left by the header and disclosures, including window resizing.
  const width = Math.floor(Math.min(area.width, area.height * 1.6));
  const height = Math.floor(width / 1.6);
  if (chart.width !== width || chart.height !== height) chart.setv({width, height});
 }
 async function refresh() {
  refreshButtons(true);
  try {
   let value;
   if(window.ForgeHost) value=await window.ForgeHost.read('atlas');
   else {
    const response = await fetch('/api/forge/atlas',{credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(130000)});
    if (!response.ok) throw Error('Unavailable');
    value=await response.json();
   }
   snapshot = safeSnapshot(value); failure = ''; transport = 'Supabase snapshot';
  } catch { failure = 'Refresh unavailable. Keeping the last displayed data.'; }
  finally { refreshButtons(false); update(); }
 }
 try {
  if (snapshot) safeSnapshot(snapshot);
  await Bokeh.embed.embed_item(JSON.parse($('atlas-chart').textContent));
  doc = Bokeh.documents.find(item => item.get_model_by_name('forge-atlas-source'));
  source = doc.get_model_by_name('forge-atlas-source'); chart = doc.get_model_by_name('forge-atlas-plot');
  source.selected.properties.indices.change.connect(selection);
  options(); update(); theme();
  new ResizeObserver(fitChart).observe($('atlas-plot'));
  fitChart();
  $('atlas-dataset').addEventListener('change',() => { options(); update(); });
  for (const id of ['atlas-x','atlas-y','atlas-size']) $(id).addEventListener('change',update);
  for (const id of tableIds) {
   $(id+'-clear').addEventListener('click',() => { source.selected.indices = []; });
   $(id+'-refresh').addEventListener('click',refresh);
  }
  $('table-filters').addEventListener('click',() => { $('atlas-filters').open = true; });
  new MutationObserver(theme).observe(document.body,{attributes:true,attributeFilter:['data-mode']});
  window.ForgeAtlas = {ready:true,mode:() => sample?'sample':'real',refresh,source:() => source};
  // Local preview checks automatically once on load. No polling or remote requests in offline HTML.
  if (remote) refresh();
  if (remote) setInterval(() => {
   if (!document.hidden && tableIds.some(id => $('window-'+id).getClientRects().length) && !$('atlas-refresh').disabled) refresh();
  }, 60000);
 } catch {
  $('atlas-status').textContent = 'The activity chart could not load. Reopen the validated Forge document.';
  $('table-status').textContent = $('atlas-status').textContent;
  refreshButtons(true);
 }
 // Dismiss the accessible avatar tooltip with Escape while retaining keyboard focus.
 const portrait = document.querySelector('.portrait-credit');
 portrait?.addEventListener('keydown',event => { if(event.key === 'Escape') portrait.classList.add('credit-dismissed'); });
 for(const event of ['pointerleave','blur']) portrait?.addEventListener(event,() => portrait.classList.remove('credit-dismissed'));
})();
