const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const NS = 'http://www.w3.org/2000/svg';
const nodeById = new Map(DATA.nodes.map(n => [n.id, n]));
const sectionById = new Map(DATA.sections.map(s => [s.id, s]));
const palette = {
  clinical: { ink: '#557a9d', light: '#eaf0f6' },
  etiology: { ink: '#34795b', light: '#e9f2e9' },
  pathology: { ink: '#a08739', light: '#f6f1df' },
  nephrotic_types: { ink: '#aa7161', light: '#f6ece5' },
  nephritic_types: { ink: '#7d6d99', light: '#efebf5' }
};
let selected = nodeById.has(location.hash.slice(1)) ? location.hash.slice(1) : 'gn';
let tab = 'knowledge', mode = 'knowledge', section = 'all', query = '', zoom = 1;
let answersExpanded = true, detailOpen = false;
function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function el(tag, attrs = {}, text) {
  const e = document.createElementNS(NS, tag);
  Object.entries(attrs).forEach(([key, value]) => e.setAttribute(key, value));
  if (text !== undefined) e.textContent = text;
  return e;
}
function chunks(text, length) {
  const lines = [];
  for (let i = 0; i < text.length; i += length) lines.push(text.slice(i, i + length));
  return lines;
}
function matches(n) {
  return (section === 'all' || n.section === section || n.id === 'gn') &&
    (!query || [n.title, n.en, n.summary, ...n.points, ...n.questions.map(q => q.q)].join(' ').toLowerCase().includes(query));
}
function openDetail() {
  detailOpen = true;
  $('#detail').hidden = false;
  $('#workbody').classList.add('detail-open');
}
function select(id, nextTab) {
  if (!nodeById.has(id)) return;
  selected = id;
  const targetSection = nodeById.get(id).section;
  if (section !== 'all' && targetSection !== 'overview' && targetSection !== section) { section = targetSection; updateFilters(); }
  if (nextTab) tab = nextTab;
  history.replaceState(null, '', '#' + id);
  $('#nodePicker').value = id;
  openDetail();
  draw();
  renderDetail();
  if (innerWidth < 760) $('#detail').scrollIntoView({behavior:'smooth', block:'start'});
}
function addNode(svg, n, x, y, width = 238, height = 78, kind = '') {
  const g = el('g', {
    transform: `translate(${x},${y})`,
    class: `node ${kind} ${n.id === selected ? 'selected' : ''} ${matches(n) ? '' : 'dim'}`,
    tabindex: 0, role: 'button',
    'aria-label': `${n.title}，查看知识、三层问题和科研链接`
  });
  const color = palette[n.section] || {ink:'#466d54',light:'#f2f6ed'};
  const rect = el('rect', {width, height});
  if (kind === 'section') {
    rect.setAttribute('style', `fill:${color.light};stroke:${color.ink};stroke-width:1.5`);
  }
  g.append(rect);
  const lines = chunks(n.title, kind === 'section' ? 13 : 14);
  const centered = kind === 'root';
  if (!centered) g.append(el('circle', {cx:15, cy:24, r:3, fill:color.ink}));
  lines.forEach((line, i) => g.append(el('text', {
    x: centered ? width/2 : 26, y: (centered ? 37 : 30) + i*25,
    class: 'title', 'text-anchor': centered ? 'middle' : 'start'
  }, line)));
  const sub = kind === 'section'
    ? `${sectionById.get(n.id).members.length} 个知识点 · 讲义 ${n.page} 页`
    : kind === 'root' ? '五部分展开 · 每个节点均有三层问题' : n.en;
  g.append(el('text', {
    x: centered ? width/2 : 15, y: height - (kind === 'section' || centered ? 17 : 26),
    class:'sub','text-anchor': centered ? 'middle' : 'start'
  }, sub));
  if (!kind) g.append(el('text', {x:15,y:height-10,class:'badge'}, `三层问题 · ${n.refs.length} 篇文献`));
  g.onclick = () => select(n.id);
  g.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(n.id); } };
  svg.append(g);
}
function connect(svg, sx, sy, tx, ty, color = '#b7cbb6', label = '') {
  const d = `M ${sx} ${sy} C ${sx} ${(sy+ty)/2}, ${tx} ${(sy+ty)/2}, ${tx} ${ty}`;
  svg.append(el('path', {d, class:'edge', style:`stroke:${color}`, 'marker-end':'url(#arrow)'}));
  if (label) svg.append(el('text', {x:tx+5, y:ty-10, class:'edge-label'}, label));
}
function initSvg(svg, viewBox) {
  svg.replaceChildren();
  svg.setAttribute('viewBox', viewBox);
  const defs = el('defs');
  defs.innerHTML = '<marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10z" fill="#9bb49d"/></marker>';
  svg.append(defs);
}
function drawOverview(svg) {
  initSvg(svg, '0 0 1480 1340');
  const root = nodeById.get('gn');
  DATA.sections.forEach((s, i) => {
    const x = 24 + i*288, c = palette[s.id], lastY = 390 + (s.members.length-1)*101;
    svg.append(el('rect', {x:x-8,y:216,width:280,height:lastY-216+110,rx:14,fill:c.light,stroke:c.ink,class:'section-bg'}));
    connect(svg, 740, 121, x+124, 238, c.ink);
    s.members.forEach((id, j) => {
      const n = nodeById.get(id), nested = ['crescent','chronic','c3g'].includes(id), ny=390+j*101;
      const label = {crescent:'囊外增生',chronic:'晚期结局',c3g:'补体代表疾病'}[id] || '';
      const trunkX = x+2;
      const parentId = {crescent:'proliferation',chronic:'sclerosis',c3g:'complement'}[id];
      const parentY = parentId ? 390+s.members.indexOf(parentId)*101 : 0;
      const path = nested ? `M ${x+140} ${parentY+78} V ${ny}` : `M ${x+124} 346 V 365 H ${trunkX} V ${ny+39} H ${x+18}`;
      svg.append(el('path', {d:path,class:'edge',style:`stroke:${c.ink};opacity:.5`,'marker-end':'url(#arrow)'}));
      if (nested) svg.append(el('text', {x:x+147,y:ny-8,class:'edge-label'},label));
    });
    addNode(svg, nodeById.get(s.id), x, 238, 258, 108, 'section');
    s.members.forEach((id,j) => {
      const nested = ['crescent','chronic','c3g'].includes(id);
      addNode(svg,nodeById.get(id),x+18+(nested?10:0),390+j*101,nested?228:238,78);
    });
  });
  addNode(svg,root,600,30,280,91,'root');
}
function drawSection(svg) {
  const s = sectionById.get(section), c=palette[section];
  const rows=Math.ceil(s.members.length/2), height=Math.max(700,350+rows*142);
  initSvg(svg,`0 0 1080 ${height}`);
  connect(svg,540,103,540,156,c.ink);
  const rects=s.members.map((id,j)=>({id,x:120+(j%2)*470,y:330+Math.floor(j/2)*142}));
  rects.forEach(p=>{const parentId={crescent:'proliferation',chronic:'sclerosis',c3g:'complement'}[p.id];const parent=parentId?rects.find(r=>r.id===parentId):null;if(parent)connect(svg,parent.x+175,parent.y+86,p.x+175,p.y,c.ink,'进阶');else connect(svg,540,266,p.x+175,p.y,c.ink);});
  addNode(svg,nodeById.get('gn'),400,24,280,79,'root');
  addNode(svg,nodeById.get(s.id),340,156,400,110,'section');
  rects.forEach(p=>addNode(svg,nodeById.get(p.id),p.x,p.y,350,86));
}
function drawQuestions(svg) {
  initSvg(svg,'0 0 1160 1050');
  const n=nodeById.get(selected);
  svg.append(el('text',{x:40,y:48,class:'edge-label'},'知识锚点 → 一级记忆 → 二级分析理解 → 三级应用总结'));
  n.questions.forEach((q,i)=>{
    const y=140+i*278;
    connect(svg,190,515,410,y+78,'#9eb69a');
    const g=el('g',{class:'node qnode',transform:`translate(410,${y})`,tabindex:0,role:'button','aria-label':`第${q.level}级问题：${q.q}`});
    g.append(el('rect',{width:670,height:190}));
    g.append(el('text',{x:22,y:30,class:'sub'},`Q-${n.id.toUpperCase()}-${q.level} · ${['一级 记忆 / 概念','二级 分析 / 理解','三级 应用 / 总结'][i]}`));
    chunks(q.q,34).forEach((line,j)=>g.append(el('text',{x:22,y:70+27*j,class:'title'},line)));
    g.append(el('text',{x:22,y:165,class:'sub'},'点击查看完整参考答案 ↗'));
    g.onclick=()=>{openDetail();tab='questions';renderDetail();const answer=$(`#q${q.level} details`);if(answer)answer.open=true;$(`#q${q.level}`)?.scrollIntoView({behavior:'smooth',block:'nearest'});};
    g.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();g.onclick();}};
    svg.append(g);
    if(i<2)svg.append(el('text',{x:720,y:y+237,class:'edge-label'},'↓ 进阶'));
  });
  addNode(svg,n,40,435,300,100,n.isSection?'section':'');
  svg.append(el('text',{x:410,y:1010,class:'sub'},'用上方“切换节点”选择其他知识点；每一道题均有唯一编号和知识溯源。'));
}
function draw() {
  const svg=$('#graph');
  if(mode==='questions')drawQuestions(svg);
  else if(section==='all')drawOverview(svg);
  else drawSection(svg);
  $('#mapTitle').textContent=mode==='questions'?`${nodeById.get(selected).title} · 三层问题图谱`:section==='all'?'肾小球肾炎 → 五个一级分支':sectionById.get(section).title;
  $('#mapSubtitle').textContent=mode==='questions'?'由记忆到理解，再到病例应用或科研推演；完整答案在节点详情中。':'实线表示章节层级；跨章节机制、病理与临床联系可在节点详情中查看。';
  const count=DATA.nodes.filter(matches).length;
  $('#resultCount').textContent=mode==='questions'?`当前节点 3 题 / 全图 ${DATA.nodes.length*3} 题`:`${query?'匹配':'当前'} ${count} / ${DATA.nodes.length} 节点 · 每节点三层问题`;
}
function reference(key) {
  const r=DATA.refs[key];
  return `<div class="refcard"><small>${esc(r[1])} · ${esc(r[3])}</small><a href="https://pubmed.ncbi.nlm.nih.gov/${r[0]}/" target="_blank" rel="noopener noreferrer">${esc(r[2])} ↗</a><span class="refmeta">PMID ${r[0]}</span><br><span class="paper-tag">${esc(r[4])}</span><p>${esc(r[5])}</p></div>`;
}
function schematic(n){if(!['circulating','insitu','mn','mpgn','c3g','apgn','barrier','anti'].includes(n.id))return '';let position={mn:135,insitu:135,apgn:135,mpgn:75,c3g:105,igan:175,circulating:75}[n.id];let dots=position?[35,65,95,125,155,185,215,245].map(x=>`<circle cx="${x}" cy="${position}" r="4" fill="#b38b50"/>`).join(''):'';return `<svg class="schematic" viewBox="0 0 300 215" role="img" aria-label="沉积位置概念示意，不是病理照片"><text x="16" y="25" font-size="10" fill="#758273">沉积定位 · 概念示意（非病理照片）</text><path d="M18 63 H282" stroke="#8fa8b1" stroke-width="8"/><path d="M18 104 H282" stroke="#b1c8a5" stroke-width="17"/><path d="M18 146 Q35 124 53 146 T88 146 T123 146 T158 146 T193 146 T228 146 T263 146 H282" fill="none" stroke="#71927b" stroke-width="7"/>${dots}${n.id==='anti'?'<path d="M20 100 H280" stroke="#b38b50" stroke-width="3"/>':''}<g font-size="9" fill="#788676"><text x="18" y="49">毛细血管腔 / 内皮</text><text x="18" y="91">内皮下</text><text x="250" y="107">GBM</text><text x="18" y="129">上皮下</text><text x="18" y="168">足细胞 → 尿腔</text><text x="18" y="198">${n.id==='igan'?'系膜位于毛细血管襻之间（此图仅示定位）':'金色：沉积或抗体结合的典型位置'}</text></g></svg>`}
function renderDetail() {
  const n=nodeById.get(selected), s=sectionById.get(n.section);
  let content='';
  if(tab==='knowledge') {
    const children=DATA.hierarchy.filter(e=>e.source===n.id);
    const related=DATA.edges.filter(e=>e.source===n.id||e.target===n.id);
    content=`${schematic(n)}<ul class="points">${n.points.map(p=>`<li>${esc(p)}</li>`).join('')}</ul>${n.pearl?`<p class="pearl">${esc(n.pearl)}</p>`:''}`;
    if(children.length)content+=`<div class="section-label">下级知识节点</div><div class="relations">${children.map(e=>`<button data-related="${e.target}">${esc(e.label)} → ${esc(nodeById.get(e.target).title)}</button>`).join('')}</div>`;
    if(related.length)content+=`<div class="section-label">跨节点知识关联</div><div class="relations">${related.map(e=>{const id=e.source===n.id?e.target:e.source;return `<button data-related="${id}">${e.source===n.id?'→':'←'} ${esc(e.label)} · ${esc(nodeById.get(id).title)}</button>`;}).join('')}</div>`;
    content+=`<div class="section-label">对应 PubMed 文献</div>${n.refs.map(reference).join('')}`;
  }
  if(tab==='questions')content=`<p class="progression">知识溯源：${esc(n.title)}<br>一级：记忆与概念 → 二级：分析与机制 → 三级：应用与综合</p><div class="answer-controls"><button id="expandAnswers">展开全部答案</button><button id="collapseAnswers">收起全部答案</button></div>${n.questions.map(q=>`<div class="question" id="q${q.level}"><div class="qlevel"><span>${['一级 · 记忆','二级 · 分析 / 理解','三级 · 应用 / 总结'][q.level-1]}</span><span>0${q.level}</span></div><h3>${esc(q.q)}</h3><small>Q-${n.id.toUpperCase()}-${q.level} · 溯源：${esc(n.title)}</small><details ${answersExpanded?'open':''}><summary>详细参考答案</summary><div class="answer">${q.a.split('\n\n').map(p=>`<p>${esc(p)}</p>`).join('')}<div class="question-footer">依据：讲义第 ${esc(n.page)} 页；相关研究见本节点“科研链接”。</div></div></details></div>`).join('')}`;
  if(tab==='research')content=`${n.refs.map(reference).join('')}<p class="progression">研究类型和适用边界见各条目。文献支持本节点的相关机制或临床背景；动物实验、人群观察与临床因果结论需分别理解。</p><p><a href="https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent((n.isSection?'glomerular diseases':n.en)+' pathogenesis')}" target="_blank" rel="noopener noreferrer">在 PubMed 继续检索 ↗</a></p>`;
  $('#detail').innerHTML=`<div class="detail-top"><span class="tag">${n.id==='gn'?'知识总览':n.isSection?'一级分支':esc(n.group)}</span><button id="closeDetail" class="detail-close" aria-label="关闭节点详情">×</button></div><div class="breadcrumb">肾小球肾炎${s?' / '+esc(s.title):''}${s&&n.id!==s.id?' / '+esc(n.title):''}</div><h2>${esc(n.title)}</h2><div class="english">${esc(n.en)}</div><div class="source">讲义第 ${esc(n.page)} 页</div><p class="summary">${esc(n.summary)}</p><div class="detailtabs"><button data-tab="knowledge" class="${tab==='knowledge'?'active':''}">核心知识</button><button data-tab="questions" class="${tab==='questions'?'active':''}">三层问题 <small>3</small></button><button data-tab="research" class="${tab==='research'?'active':''}">科研链接 ↗</button></div>${content}`;
  $$('[data-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;renderDetail();});
  $$('[data-related]').forEach(b=>b.onclick=()=>select(b.dataset.related));
  $('#closeDetail').onclick=()=>{detailOpen=false;$('#detail').hidden=true;$('#workbody').classList.remove('detail-open');};
  if(tab==='questions') {
    $('#expandAnswers').onclick=()=>{answersExpanded=true;$$('#detail details').forEach(e=>e.open=true);};
    $('#collapseAnswers').onclick=()=>{answersExpanded=false;$$('#detail details').forEach(e=>e.open=false);};
  }
}
function updateFilters() {
  $('#sectionFilters').innerHTML=`<button data-section="all" class="${section==='all'?'active':''}">五部分全景</button>${DATA.sections.map((s,i)=>`<button data-section="${s.id}" class="${section===s.id?'active':''}" title="${esc(s.title)}"><span>0${i+1}</span>${esc(['临床表现类型','肾小球肾炎病因学','基本病理变化','肾病综合征为主的类型','肾炎综合征为主的类型'][i])}</button>`).join('')}`;
  $$('[data-section]').forEach(b=>b.onclick=()=>{
    section=b.dataset.section; mode='knowledge'; selected=section==='all'?'gn':section; $('#nodePicker').value=selected; history.replaceState(null,'','#'+selected); if(detailOpen)renderDetail(); updateModes();updateFilters();draw();
    $('#graphScroll').scrollTo({left:0,top:0});
  });
}
function updateModes() { $$('[data-mode]').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode)); }
$$('[data-mode]').forEach(b=>b.onclick=()=>{
  mode=b.dataset.mode;
  if(mode==='questions'){tab='questions';openDetail();renderDetail();}
  updateModes();draw();$('#graphScroll').scrollTo({left:0,top:0});
});
$('#nodePicker').innerHTML=`<option value="gn">肾小球肾炎 · 总览</option>${DATA.sections.map(s=>`<optgroup label="${esc(s.title)}">${[s.id,...s.members].map(id=>`<option value="${id}">${esc(nodeById.get(id).title)}</option>`).join('')}</optgroup>`).join('')}`;
$('#nodePicker').value=selected;
$('#nodePicker').onchange=e=>select(e.target.value,mode==='questions'?'questions':undefined);
$('#search').oninput=e=>{query=e.target.value.trim().toLowerCase();if(mode==='questions'){mode='knowledge';updateModes();}draw();};
$('#search').onkeydown=e=>{if(e.key==='Enter'){const candidates=DATA.nodes.filter(matches); const score=n=>n.title.toLowerCase()===query?4:n.en.toLowerCase()===query?3:(!n.isSection&&n.id!=='gn'&&(n.title.toLowerCase().includes(query)||n.en.toLowerCase().includes(query)))?2:1; candidates.sort((a,b)=>score(b)-score(a)); const n=candidates[0];if(n)select(n.id);}};
function setZoom(v) {zoom=Math.max(.7,Math.min(2,v));$('#graph').style.width=zoom*100+'%';$('#zoomValue').textContent=Math.round(zoom*100)+'%';}
$('#zoomIn').onclick=()=>setZoom(zoom+.15);
$('#zoomOut').onclick=()=>setZoom(zoom-.15);
function reset() {
  query='';section='all';mode='knowledge';tab='knowledge';selected='gn';$('#search').value='';$('#nodePicker').value='gn';
  history.replaceState(null,'','#gn');detailOpen=false;$('#detail').hidden=true;$('#workbody').classList.remove('detail-open');
  setZoom(1);updateModes();updateFilters();draw();$('#graphScroll').scrollTo({left:0,top:0});
}
$('#reset').onclick=reset;
$('#home').onclick=e=>{e.preventDefault();reset();};
$$('[data-jump]').forEach(b=>b.onclick=()=>select(b.dataset.jump));
$('#challenge').onclick=()=>{mode='questions';tab='questions';updateModes();select('mn','questions');$('#graphScroll').scrollTo({left:0,top:0});};
$('#sourcesBtn').onclick=()=>$('#sourceDialog').showModal();
$('#closeSources').onclick=()=>$('#sourceDialog').close();
$('#bibliography').innerHTML=Object.keys(DATA.refs).map(reference).join('');
updateFilters();draw();renderDetail();
