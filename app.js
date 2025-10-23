(function(){
  const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
  const tabs=$$('.tab');
  const eds={ html:$('#htmlEd'), css:$('#cssEd'), js:$('#jsEd') };
  const iframe=$('#preview'), status=$('#status');
  const errPanel=$('#errorPanel'), errText=$('#errorText');
  const uploadBtn=$('#uploadBtn'), uploader=$('#uploader'), filesWrap=$('#files');
  const autoRun=$('#autoRun'), blockNet=$('#blockNet'), liveEdit=$('#liveEdit');
  const runBtn=$('#runBtn'), refreshBtn=$('#refreshBtn'), resetBtn=$('#resetBtn'), clearBtn=$('#clearBtn');
  const downloadBtn=$('#downloadBtn'), shareBtn=$('#shareBtn'), copyFull=$('#copyFull'), beautifyBtn=$('#beautifyBtn');
  const micBtn=$('#micBtn');
  const STORAGE_KEY='tkx-arena-v1', STORAGE_AT='tkx-arena-v1-at';

  function esc(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
  function highlight(code, lang){
    let c=esc(code);
    if(lang==='html'){
      c=c.replace(/(&lt;!--[\s\S]*?--&gt;)/g,'<span class="token comment">$1</span>')
         .replace(/(&lt;\/?)([\w-:]+)/g,'$1<span class="token tag">$2</span>')
         .replace(/([\w-:]+)=(\".*?\"|\'.*?\')/g,'<span class="token attr">$1</span>=<span class="token string">$2</span>');
    } else if(lang==='css'){
      c=c.replace(/\/\*[\s\S]*?\*\//g,'<span class="token comment">$&</span>')
         .replace(/([#.a-zA-Z0-9_-]+)\s*(?=\{)/g,'<span class="token tag">$1</span>')
         .replace(/(:)\s*([^;}{]+)/g,'$1 <span class="token string">$2</span>');
    } else if(lang==='js'){
      c=c.replace(/\/\/.*$/gm,'<span class="token comment">$&</span>')
         .replace(/\/\*[\s\S]*?\*\//g,'<span class="token comment">$&</span>')
         .replace(/\b(const|let|var|if|else|for|while|return|function|class|new|try|catch|throw|await|async)\b/g,'<span class="token keyword">$1</span>')
         .replace(/(\"(?:[^\"\\]|\\.)*\"|\'(?:[^\'\\]|\\.)*\'|`(?:[^`\\]|\\.)*`)/g,'<span class="token string">$1</span>')
         .replace(/\b(\d+(?:\.\d+)?)\b/g,'<span class="token number">$1</span>');
    }
    return c;
  }
  function setEditorText(el, txt, lang){ el.dataset.raw=txt; el.innerHTML=highlight(txt,lang); }
  function getEditorText(el){ return el.dataset.raw||''; }
  function bindEditor(el, lang){
    el.addEventListener('input', ()=>{
      const txt=el.textContent;
      setEditorText(el, txt, lang);
      if(autoRun.checked) render();
      persist();
    });
  }
  bindEditor(eds.html,'html'); bindEditor(eds.css,'css'); bindEditor(eds.js,'js');

  tabs.forEach(t=>t.addEventListener('click',()=>{
    tabs.forEach(x=>x.classList.remove('active')); t.classList.add('active');
    ['htmlEd','cssEd','jsEd'].forEach(id=>document.getElementById(id).hidden=true);
    document.getElementById(t.dataset.target).hidden=false;
  }));

  const starter={
    html:`<section class="hero">
  <h1>Welcome to <span class="gold">TikkoX Code Arena</span> 👋</h1>
  <p>Edit this text live (enable “Live Edit”), or change HTML/CSS/JS and see instant preview.</p>
  <button class="gold">Golden Button</button>
</section>
<section class="cards">
  <article><h3>Fast</h3><p>Instant preview, no reloads.</p></article>
  <article><h3>Safe</h3><p>Sandbox + optional network blocking.</p></article>
  <article><h3>Ready</h3><p>Copy or download a deploy-ready file.</p></article>
</section>`,
    css:`:root{--bg:#000;--fg:#d4af37;--fg2:#b9992a}
body{font-family:system-ui,Segoe UI,Arial;background:#000;color:#eee;margin:0}
.hero{min-height:52vh;display:grid;place-items:center;text-align:center;padding:48px;background:radial-gradient(ellipse,#111 0%,#000 60%)}
.gold{background:linear-gradient(135deg,#d4af37,#b28a29);-webkit-background-clip:text;background-clip:text;color:transparent}
.hero button.gold{border:1px solid #d4af37;color:#000;background:linear-gradient(135deg,#d4af37,#b28a29);padding:10px 14px;border-radius:12px}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;padding:20px}
.cards article{background:#0b0b0b;border:1px solid #151515;border-radius:14px;padding:14px}
a{color:#d4af37}`,
    js:`console.log("TikkoX Code Arena ready!")`
  };
  function persist(){
    const obj={h:getEditorText(eds.html), c:getEditorText(eds.css), j:getEditorText(eds.js)};
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
    localStorage.setItem(STORAGE_AT, String(Date.now()));
  }
  function restore(){
    try{
      const at=Number(localStorage.getItem(STORAGE_AT)||0);
      if(!at || (Date.now()-at) > 24*60*60*1000) throw 0;
      const obj=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');
      if(!obj) throw 0;
      setEditorText(eds.html, obj.h||starter.html,'html');
      setEditorText(eds.css,  obj.c||starter.css,'css');
      setEditorText(eds.js,   obj.j||starter.js,'js');
      return;
    }catch(_){}
    setEditorText(eds.html, starter.html,'html');
    setEditorText(eds.css,  starter.css,'css');
    setEditorText(eds.js,   starter.js,'js');
    persist();
  }
  restore();

  function makeDoc(html, css, js, blockNetwork, live){
    const csp = blockNetwork ?
      `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: blob:; media-src data: blob:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'none'">` : '';
    const netBlocker = blockNetwork ? `<script>(function(){const deny=()=>{throw new Error('Network blocked in preview')};const nop=()=>{};
      window.fetch=deny; window.XMLHttpRequest=function(){deny()}; window.open=nop; if('navigator' in window){try{navigator.sendBeacon=nop}catch(e){}}})();
      </`+'script'>` : '';
    const errorHooks = `<script>(function(){
      window.addEventListener('error',e=>{try{parent.postMessage({type:'tkx-error',msg:String(e.message||'Error'),
      stack:String((e.error&&e.error.stack)||e.filename+':'+e.lineno+':'+e.colno)},'*')}catch(_){}});
      window.addEventListener('unhandledrejection',e=>{try{parent.postMessage({type:'tkx-error',
      msg:String(e.reason&&(e.reason.message||e.reason)||'Promise rejection'),stack:String(e.reason&&e.reason.stack||'')},'*')}catch(_){}});
    })();</`+'script'>`;
    const liveHook = live ? `<script>(function(){
        document.body.setAttribute('contenteditable','true');
        Array.from(document.querySelectorAll('script,style')).forEach(n=>n.setAttribute('contenteditable','false'));
        const app=document.getElementById('app'); if(app) app.setAttribute('contenteditable','true');
        let t=null; document.addEventListener('input',()=>{clearTimeout(t); t=setTimeout(()=>{
          const root=document.getElementById('app')||document.body;
          parent.postMessage({type:'tkx-html-changed',html:root.innerHTML},'*');
        },250)});
      })();</`+'script'>` : '';
    return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
${csp}<title>TikkoX Preview</title><style id="user-style">${css}</style><div id="app">${html}</div>
${netBlocker}${errorHooks}<script>try{${js}
//# sourceURL=user.js}catch(err){try{parent.postMessage({type:'tkx-error',msg:String(err.message||err),stack:String(err.stack||'')},'*')}catch(_){}}</`+'script'>${liveHook}`;
  }

  function clearError(){ errPanel.style.display='none'; errText.textContent=''; }
  function showErrorList(list){
    if(!list.length){ clearError(); return; }
    errPanel.style.display='block';
    const lines=list.map((e,i)=>`${i+1}. ${e.msg}${e.line?` (line ${e.line})`:''}${e.suggest?` — suggestion: ${e.suggest}`:''}`);
    errText.textContent = `${list.length} issue(s):\n`+lines.join('\n');
    status.className='status err'; status.textContent=`${list.length} issue(s)`;
  }

  function lint(){
    const issues=[];
    const js=getEditorText(eds.js);
    try{ new Function(js); }catch(e){
      const m=/:([0-9]+):([0-9]+)/.exec(String(e.stack||''));
      issues.push({msg:String(e.message||'JS error'), line=m?Number(m[1]):undefined, suggest:'Check missing brackets or quotes'});
    }
    const html=getEditorText(eds.html);
    if((html.match(/<html/gi)||[]).length>1) issues.push({msg:'Multiple <html> tags detected', suggest:'Use a single root html'});
    (html.match(/<([a-zA-Z]+)(?![^>]*\/>)[^>]*>/g)||[]).forEach(t=>{
      const name=t.replace(/<|>|\/.*/g,'').toLowerCase();
      if(!/^(br|hr|img|meta|link|input)$/.test(name)){
        if(!new RegExp(`</${name}>`,'i').test(html)) issues.push({msg:`Unclosed <${name}> tag`, suggest:`Add </${name}>`});
      }
    });
    return issues;
  }

  function render(){
    try{
      const doc = makeDoc(getEditorText(eds.html), getEditorText(eds.css), getEditorText(eds.js), blockNet.checked, liveEdit.checked);
      iframe.srcdoc=doc;
      const issues = lint(); showErrorList(issues);
      if(!issues.length){ status.className='status ok'; status.textContent='Live'; }
    }catch(e){
      showErrorList([{msg:'Build error: '+(e.message||e)}]);
      console.error(e);
    }
  }

  runBtn.addEventListener('click', render);
  [eds.html, eds.css, eds.js].forEach(el=> el.addEventListener('input', ()=>{ if(autoRun.checked) render(); }));
  [blockNet, liveEdit].forEach(el=> el.addEventListener('change', render));
  refreshBtn.addEventListener('click', ()=>{ const old=iframe.srcdoc; iframe.srcdoc=' '; setTimeout(()=>iframe.srcdoc=old,0); status.textContent='Refreshed'; });
  resetBtn.addEventListener('click', ()=>{ setEditorText(eds.html, starter.html,'html'); setEditorText(eds.css, starter.css,'css'); setEditorText(eds.js, starter.js,'js'); persist(); render(); });
  clearBtn.addEventListener('click', ()=>{ setEditorText(eds.html,'','html'); setEditorText(eds.css,'','css'); setEditorText(eds.js,'','js'); persist(); render(); });

  document.querySelectorAll('[data-copy]').forEach(btn=>btn.addEventListener('click', async ()=>{
    const id=btn.getAttribute('data-copy'); const el=document.getElementById(id);
    await navigator.clipboard.writeText(getEditorText(el)); status.className='status ok'; status.textContent='Copied';
  }));
  function buildFull(){ return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>My TikkoX Build</title><style>${getEditorText(eds.css)}</style>${getEditorText(eds.html)}<script>${getEditorText(eds.js)}</`+'script>'; }
  copyFull.addEventListener('click', async ()=>{ await navigator.clipboard.writeText(buildFull()); status.className='status ok'; status.textContent='Full page copied'; });
  downloadBtn.addEventListener('click', ()=>{ const blob=new Blob([buildFull()],{type:'text/html'}); const url=URL.createObjectURL(blob); const a=Object.assign(document.createElement('a'),{href:url,download:'tikkox-build.html'}); document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); });

  function encodeState(){ try{ const obj={h:getEditorText(eds.html),c:getEditorText(eds.css),j:getEditorText(eds.js)}; const str=encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(obj))))); return '#tkx='+str }catch(e){return ''} }
  function decodeState(hash){ try{ if(!hash.startsWith('#tkx=')) return null; const b64=decodeURIComponent(hash.slice(5)); const json=decodeURIComponent(escape(atob(b64))); return JSON.parse(json); }catch(e){ return null } }
  (function loadFromHash(){ const st=decodeState(location.hash); if(!st) return; setEditorText(eds.html, st.h||starter.html,'html'); setEditorText(eds.css, st.c||starter.css,'css'); setEditorText(eds.js, st.j||starter.js,'js'); persist(); })();
  shareBtn.addEventListener('click', async ()=>{ const link = location.origin + location.pathname + encodeState(); try{ if(navigator.share){ await navigator.share({title:'TikkoX Code Arena',text:'Check this code',url:link}); } else { await navigator.clipboard.writeText(link); alert('Share link copied!'); } }catch(e){ await navigator.clipboard.writeText(link); alert('Share link copied!'); } });

  uploadBtn.addEventListener('click', ()=>uploader.click());
  uploader.addEventListener('change', ()=>{
    filesWrap.innerHTML='';
    Array.from(uploader.files).forEach(file=>{
      const reader=new FileReader();
      reader.onload=()=>{
        const url=reader.result;
        const pill=document.createElement('button');
        pill.className='file-pill'; pill.title='Click to copy Data-URL'; pill.textContent=file.name;
        pill.addEventListener('click', async ()=>{ await navigator.clipboard.writeText(url); alert('Copied Data-URL for '+file.name); });
        filesWrap.appendChild(pill);
      };
      reader.readAsDataURL(file);
    });
  });

  micBtn.addEventListener('click',()=>{
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){ alert('Speech recognition not supported'); return; }
    const recog=new SR(); recog.lang='en-US'; recog.interimResults=false; recog.maxAlternatives=1;
    recog.onresult=(e)=>{
      const txt=e.results[0][0].transcript;
      const active = !eds.html.hidden?eds.html:(!eds.css.hidden?eds.css:eds.js);
      setEditorText(active, (getEditorText(active)+'\n'+txt), active===eds.html?'html':active===eds.css?'css':'js');
      persist(); if(autoRun.checked) render();
    };
    recog.start();
  });

  function beautify(txt){ try{ return txt.replace(/></g,'>\n<'); }catch(_){ return txt } }
  beautifyBtn.addEventListener('click',()=>{
    setEditorText(eds.html, beautify(getEditorText(eds.html)), 'html');
    setEditorText(eds.css,  getEditorText(eds.css).replace(/;\s*/g,';\n').replace(/\{\s*/g,'{\n').replace(/\}\s*/g,'}\n'), 'css');
    setEditorText(eds.js,   getEditorText(eds.js).replace(/;\s*/g,';\n'), 'js');
    persist();
  });

  window.addEventListener('message', ev=>{
    if(!ev.data) return;
    if(ev.data.type==='tkx-html-changed'){ setEditorText(eds.html, ev.data.html, 'html'); persist(); if(autoRun.checked) render(); }
    if(ev.data.type==='tkx-error'){ showErrorList([{msg:ev.data.msg, line: (/:([0-9]+):/).test(ev.data.stack)?Number(RegExp.$1):undefined}]); }
  });

  render();
})();