window.ForgeVisualIntake = Object.freeze({mount(root, options) {
  'use strict';
  const $ = id => root.querySelector('#' + id);
  const {catalog, briefTemplate, expert, scopeKey} = options;
  const favorites = catalog.cards;
  const fields = ['expert-name', 'expert-purpose', 'pose', 'finish', 'direction', 'budget'];
  const roleWords = {
    creative: /artist|art\b|design|music|creative|brand|packet|story|writing/i,
    research: /research|knowledge|data|learn|analy|document|evidence|search/i,
    build: /build|code|engineer|develop|tool|architect|software/i,
    lead: /lead|strategy|strateg|plan|orchestrat|manage|director/i,
    protect: /test|quality|secur|protect|review|validat|audit/i,
    automate: /automat|workflow|schedul|operat|task|resource/i,
  };
  let cards = [...favorites], selected = null, selectedAt = null, expanded = false, source = 'favorites', matching = false, pending = null, requestId = 0;

  function safeURL(value, hosts) {
    try { const url = new URL(value); return url.protocol === 'https:' && hosts.includes(url.hostname) ? url.href : ''; } catch { return ''; }
  }
  const imageURL = value => safeURL(value, ['cards.scryfall.io']);
  const cardURL = value => safeURL(value, ['scryfall.com']);
  function picture(card) { return favorites.find(c => c.key === card.key)?.image_data || imageURL(card.preview_url); }
  function node(tag, text, cls) { const element = document.createElement(tag); if (text != null) element.textContent = text; if (cls) element.className = cls; return element; }
  function cleanCard(card) {
    if (!card || !/^[a-f0-9-]{36}$/.test(card.id) || !imageURL(card.preview_url) || !imageURL(card.art_crop_url) || !cardURL(card.scryfall_uri)) return null;
    return {key: String(card.key), id: card.id, name: String(card.name), face_name: card.face_name || null, face_index: Number(card.face_index || 0), artist: String(card.artist || 'Unknown'), set_code: String(card.set_code), set_name: String(card.set_name), collector_number: String(card.collector_number), type_line: String(card.type_line || ''), color_identity: Array.isArray(card.color_identity) ? card.color_identity : [], preview_url: imageURL(card.preview_url), art_crop_url: imageURL(card.art_crop_url), scryfall_uri: cardURL(card.scryfall_uri), roles: Array.isArray(card.roles) ? card.roles : [], why: String(card.why || ''), preview_sha256: card.preview_sha256 || null};
  }
  function save() {
    const values = Object.fromEntries(fields.map(id => [id, $(id).value]));
    try { options.save({version: 1, scopeKey, values, selected: selected && cleanCard(selected), selected_at: selectedAt}); $('save-state').textContent = options.savedLabel; }
    catch { $('save-state').textContent = 'Use Save visual brief to keep a copy'; }
  }
  function restore() {
    try {
      const draft = options.load();
      if (!draft || draft.version !== 1 || draft.scopeKey !== scopeKey) return;
      for (const id of fields) if (typeof draft.values?.[id] === 'string') $(id).value = draft.values[id];
      selected = cleanCard(draft.selected); selectedAt = selected ? draft.selected_at || new Date().toISOString() : null;
      $('save-state').textContent = options.restoredLabel;
    } catch { $('save-state').textContent = 'Download the brief to keep a copy'; }
  }
  function bindExpert() {
    if (!expert) return;
    for (const [id, value] of [['expert-name', expert.display_name], ['expert-purpose', expert.purpose]]) {
      $(id).value = value; $(id).readOnly = true;
    }
  }
  function updateBudget() {
    const cap = Number($('budget').value);
    $('budget-summary').textContent = Number.isFinite(cap) ? String(cap) : '0';
    $('budget-hint').textContent = cap < 35 ? 'Below the 35-credit forecast. The next step will need a smaller scope or revised budget.' : '';
  }
  function showSelection() {
    const slot = $('selection'); slot.replaceChildren(); slot.classList.toggle('chosen', Boolean(selected));
    if (!selected) { const empty = node('div', '◇', 'empty-selection'); empty.append(node('span', 'Choose a card from the gallery')); slot.append(empty); return; }
    const row = node('div', null, 'selected-card'), img = node('img'); img.src = picture(selected); img.alt = selected.face_name || selected.name;
    const copy = node('div'); copy.append(node('strong', selected.face_name || selected.name), node('small', `${selected.set_code.toUpperCase()} #${selected.collector_number} · ${selected.artist}`));
    const change = node('button', 'Change card', 'text-button'); change.type = 'button'; change.addEventListener('click', () => $('gallery-title').scrollIntoView({behavior: 'smooth', block: 'start'})); copy.append(change); row.append(img, copy); slot.append(row);
  }
  function choose(card) {
    selected = cleanCard(card); if (!selected) return;
    selectedAt = new Date().toISOString();
    root.querySelectorAll('.card-option').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.key === selected.key)));
    showSelection(); save(); $('form-status').textContent = `Selected ${selected.face_name || selected.name}.`;
  }
  function inspect(card) {
    $('dialog-image').src = picture(card); $('dialog-image').alt = card.face_name || card.name;
    $('dialog-title').textContent = card.face_name || card.name; $('dialog-set').textContent = `${card.set_name} · ${card.set_code.toUpperCase()} #${card.collector_number}`;
    $('dialog-artist').textContent = `Art by ${card.artist}`; $('dialog-type').textContent = card.type_line;
    $('dialog-source').href = cardURL(card.scryfall_uri);
    $('dialog-select').onclick = () => { choose(card); $('card-dialog').close(); };
    $('card-dialog').showModal();
  }
  function cardTile(card) {
    const tile = node('article', null, 'card-tile'), button = node('button', null, 'card-option'); button.type = 'button'; button.dataset.key = card.key;
    button.setAttribute('aria-pressed', String(selected?.key === card.key)); button.setAttribute('aria-label', `Select ${card.face_name || card.name}, ${card.set_code.toUpperCase()} ${card.collector_number}`);
    const img = node('img', null, 'card-art'); img.src = picture(card); img.alt = `${card.face_name || card.name}, illustrated by ${card.artist}`; img.loading = 'lazy';
    img.addEventListener('error', () => { img.alt = `Preview unavailable: ${card.name}`; });
    const meta = node('div', null, 'card-meta'), mana = node('span', null, 'mana');
    for (const color of card.color_identity.length ? card.color_identity : ['C']) { const dot = node('i', null, color); dot.title = ({W:'White',U:'Blue',B:'Black',R:'Red',G:'Green',C:'Colorless'})[color] || color; mana.append(dot); }
    meta.append(node('span', `▱ ${card.set_code.toUpperCase()} #${card.collector_number}`), mana);
    button.append(img, node('strong', card.face_name || card.name), meta, node('span', `✎ ${card.artist}`, 'card-credit'));
    if (card.why) button.append(node('p', card.why, 'role-reason'));
    button.addEventListener('click', () => choose(card));
    const enlarge = node('button', '⤢', 'enlarge'); enlarge.type = 'button'; enlarge.setAttribute('aria-label', `Enlarge ${card.face_name || card.name}`); enlarge.addEventListener('click', () => inspect(card));
    tile.append(button, enlarge); return tile;
  }
  function render() {
    const query = source === 'favorites' && $('search-scope').value === 'favorites' ? $('search').value.trim().toLowerCase() : '';
    const role = $('role').value, color = $('color').value;
    let result = cards.filter(card => (role === 'all' || card.roles.includes(role)) && (color === 'all' || (color === 'C' ? !card.color_identity.length : card.color_identity.includes(color))) && (!query || `${card.name} ${card.type_line} ${card.artist} ${card.set_name}`.toLowerCase().includes(query)));
    if (matching) { const text = $('expert-name').value + ' ' + $('expert-purpose').value; const score = card => card.roles.reduce((n, r) => n + (roleWords[r]?.test(text) ? 1 : 0), 0); result = [...result].sort((a,b) => score(b)-score(a)); }
    const limited = !expanded && source === 'favorites' && !query && role === 'all' && color === 'all';
    const shown = limited ? result.slice(0,6) : result;
    $('cards').replaceChildren(...shown.map(cardTile));
    if (!shown.length) $('cards').append(node('div', 'No cards match these filters. Try another role, color or search.', 'empty-grid'));
    $('count').textContent = `${shown.length} of ${result.length}`;
    $('show-more').hidden = !limited || result.length <= 6;
    $('gallery-subtitle').textContent = source === 'scryfall' ? 'Scryfall results. Choose the exact artwork and printing.' : matching ? 'Favorites ranked by role keywords in your brief.' : 'A shortlist from your saved MTG favorites.';
  }
  function fromScryfall(raw) {
    const faces = raw.image_uris ? [raw] : (raw.card_faces || []);
    return faces.flatMap((face, index) => {
      const images = face.image_uris || {}, candidate = cleanCard({key: `${raw.id}:${index}`, id: raw.id, name: raw.name, face_name: raw.card_faces ? face.name : null, face_index: index, artist: face.artist || raw.artist, set_code: raw.set, set_name: raw.set_name, collector_number: raw.collector_number, type_line: face.type_line || raw.type_line, color_identity: raw.color_identity || [], preview_url: images.normal || images.large, art_crop_url: images.art_crop, scryfall_uri: raw.scryfall_uri, roles: [], why: ''});
      return candidate ? [candidate] : [];
    });
  }
  function resetGallery() {
    requestId++; pending?.abort(); $('search-button').disabled = false;
    $('search').value = ''; $('search-scope').value = 'favorites'; $('role').value = 'all'; $('color').value = 'all';
    source = 'favorites'; cards = [...favorites]; expanded = false; matching = false; $('search-status').textContent = ''; render();
  }
  async function search(event) {
    event.preventDefault();
    if ($('search-scope').value === 'favorites') { requestId++; pending?.abort(); $('search-button').disabled = false; source = 'favorites'; cards = [...favorites]; $('search-status').textContent = ''; render(); return; }
    if (options.allowSearch === false) return;
    const query = $('search').value.trim(); if (query.length < 2) { $('search-status').textContent = 'Enter at least two characters to search Scryfall.'; return; }
    pending?.abort(); const controller = new AbortController(); pending = controller; const active = ++requestId;
    const timeout = setTimeout(() => controller.abort(), 20000);
    $('search-button').disabled = true; $('search-status').textContent = 'Finding card previews…';
    try {
      const response = await fetch('https://api.scryfall.com/cards/search?' + new URLSearchParams({q:query,unique:'art',order:'name'}), {headers:{Accept:'application/json'},signal:controller.signal});
      if (active !== requestId) return;
      if (response.status === 404) { $('search-status').textContent = 'No Scryfall matches. Try a card name or a query like t:samurai.'; return; }
      if (!response.ok) throw new Error('search_unavailable');
      const data = await response.json(); if (active !== requestId) return;
      const found = (data.data || []).slice(0,12).flatMap(fromScryfall);
      if (!found.length) throw new Error('no_previews');
      cards = found; source = 'scryfall'; matching = false; expanded = true; $('role').value = 'all'; $('color').value = 'all';
      $('search-status').textContent = `Showing up to 12 printings from Scryfall${data.has_more ? '; refine your search for more' : ''}.`; render();
    } catch { if (active === requestId) $('search-status').textContent = 'Scryfall is unavailable right now. Your current cards are preserved; Reset gallery returns to offline favorites.'; }
    finally { clearTimeout(timeout); if (active === requestId) $('search-button').disabled = false; }
  }
  function getBrief() {
    if (!$('expert-form').reportValidity()) return;
    if (!selected) { $('form-status').textContent = 'Choose a card first.'; $('cards').querySelector('button')?.focus(); return; }
    const draft = structuredClone(briefTemplate);
    draft.status = 'ready_for_visual_review';
    draft.expert = expert ? structuredClone(expert) : {tenant_id:null,tree:null,expert_id:null,display_name:$('expert-name').value.trim(),purpose:$('expert-purpose').value.trim(),profile_id:null,artifact_root:null};
    if (!draft.expert.display_name || !draft.expert.purpose) { $('form-status').textContent = 'Add a name and a purpose for this expert.'; return; }
    draft.card = {name:selected.name,scryfall_id:selected.id,scryfall_uri:selected.scryfall_uri,set_code:selected.set_code,collector_number:selected.collector_number,face_name:selected.face_name,face_index:selected.face_index,artist:selected.artist,art_crop_url:selected.art_crop_url,art_crop_path:null,art_crop_sha256:null,preview_image_url:selected.preview_url,preview_sha256:selected.preview_sha256,selection:{status:'selected',selected_by:'local_operator',selected_at:selectedAt,method:'visual_intake_ui'}};
    draft.direction.pose = $('pose').value; draft.direction.finish = $('finish').value; draft.direction.props = []; draft.direction.operator_notes = $('direction').value.trim() || null;
    draft.generation.proposed_credit_cap = Number($('budget').value);
    draft.intake = {source:'agent-card-forge.visual-intake',created_at:new Date().toISOString(),ownership_status:expert?'bound_to_forge_context':'resolve_from_forge_context',config_sha256:options.configSha256 || null,routing_status:'pending_artifact_routing',cost_status:'forecast_only'};
    return draft;
  }
  function exportBrief(event) {
    event.preventDefault(); const draft=getBrief(); if(!draft)return;
    const blob = new Blob([JSON.stringify(draft,null,2)+'\n'],{type:'application/json'}), url = URL.createObjectURL(blob), link = node('a');
    link.href = url; link.download = ($('expert-name').value.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') || 'expert')+'-visual-brief.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url),1000);
    save(); $('form-status').textContent = 'Visual brief downloaded with your selected card. No generation has started.';
  }
  for (const id of fields) $(id).addEventListener('input', () => { updateBudget(); save(); });
  // Opaque Forge frames intentionally omit allow-forms. Handle local actions
  // directly, without native form navigation or weakening the host sandbox.
  $('export').type='button'; $('export').addEventListener('click', exportBrief);
  if(options.onGenerate){
    const generate=node('button','Continue to generation →','primary');generate.type='button';generate.id='generate';
    generate.addEventListener('click',async()=>{const brief=getBrief();if(!brief)return;generate.disabled=true;try{save();await options.onGenerate(brief);$('form-status').textContent='Generation studio opened. Approve each paid stage there.';}catch{$('form-status').textContent='Generation studio unavailable. Your brief is preserved.';}finally{generate.disabled=false;}});
    $('export').before(generate);$('export').className='secondary';$('export').textContent='Download visual brief';
    $('expert-form').querySelector('.submit-note').textContent='Save a job, approve generation charges, and review each result.';
  }
  $('search-button').type='button'; $('search-button').addEventListener('click', search);
  $('expert-form').addEventListener('submit', event => event.preventDefault());
  $('search-form').addEventListener('submit', event => event.preventDefault());
  $('search').addEventListener('keydown', event => { if(event.key==='Enter') search(event); });
  $('search').addEventListener('input', () => { if ($('search-scope').value === 'favorites') { source='favorites'; cards=[...favorites]; render(); } });
  $('search-scope').addEventListener('change', () => { requestId++; pending?.abort(); $('search-button').disabled=false; $('search-status').textContent=''; if ($('search-scope').value==='favorites') { source='favorites'; cards=[...favorites]; } render(); });
  for (const id of ['role','color']) $(id).addEventListener('change',render);
  $('match').addEventListener('click', () => { resetGallery(); matching=true; render(); $('search-status').textContent = $('expert-purpose').value.trim() ? 'Role matching uses your brief locally. Pick the artwork you prefer.' : 'Add the expert’s purpose to rank this shortlist by role.'; });
  $('show-more').addEventListener('click', () => { expanded=true; render(); });
  $('clear-filters').addEventListener('click',resetGallery);
  let resetArmed = false;
  $('reset').addEventListener('click', () => {
    if (!resetArmed) { resetArmed=true; $('reset').textContent='Confirm: clear this draft'; return; }
    resetArmed=false; $('reset').textContent='Start a fresh draft'; HTMLFormElement.prototype.reset.call($('expert-form')); bindExpert(); selected=null; selectedAt=null; resetGallery(); showSelection(); updateBudget(); save(); $('form-status').textContent='Fresh draft ready.';
  });
  $('card-dialog').querySelector('.dialog-close').addEventListener('click', () => $('card-dialog').close());
  root.addEventListener('keydown', event => { if (event.key === 'Escape' && $('card-dialog').open) event.stopPropagation(); });
  if (options.allowSearch === false) {
    $('search-scope').querySelector('[value="scryfall"]').remove();
    $('search-scope').hidden=true;
    $('search-form').style.gridTemplateColumns='minmax(0,1fr) auto';
    $('search').placeholder='Search your 12 saved favorites';
  }
  restore(); bindExpert(); updateBudget(); showSelection(); render();
  return {dispose() { requestId++; pending?.abort(); }};
}});
