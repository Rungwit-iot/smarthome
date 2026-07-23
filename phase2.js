(() => {
  const $ = id => document.getElementById(id);
  let plants = [];
  let latestRows = [];

  const style = document.createElement('style');
  style.textContent = `
    .phase2-tools{display:flex;gap:10px;flex-wrap:wrap;margin:12px 0}.phase2-tools>*{flex:1 1 180px}
    .phase2-dashboard{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:12px 0}
    .phase2-stat{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:16px;padding:12px;text-align:center}
    .phase2-stat b{display:block;font-size:1.35rem;color:#166534}
    .plant-reveal{display:flex;gap:14px;align-items:center;margin-top:10px;text-align:left}
    .plant-reveal img{width:92px;height:92px;object-fit:cover;border-radius:16px;border:2px solid #86efac}
    .plant-placeholder{width:92px;height:92px;flex:0 0 92px;border-radius:16px;background:#dcfce7;display:grid;place-items:center;font-size:2.7rem}
    .phase2-medal{font-size:1.35rem}.phase2-confetti{position:fixed;top:-20px;width:10px;height:16px;z-index:1000;pointer-events:none;animation:phase2fall 2.5s linear forwards}
    @keyframes phase2fall{to{transform:translateY(110vh) rotate(720deg);opacity:.15}}
    @media(max-width:620px){.phase2-dashboard{grid-template-columns:repeat(2,1fr)}.plant-reveal{align-items:flex-start}}
  `;
  document.head.appendChild(style);

  fetch('./plants.json', {cache:'no-store'}).then(r => r.json()).then(v => { plants = Array.isArray(v) ? v : []; }).catch(() => {});

  function beep(ok) {
    try {
      const C = window.AudioContext || window.webkitAudioContext;
      const ctx = new C();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = ok ? 760 : 180;
      osc.type = ok ? 'sine' : 'sawtooth';
      gain.gain.setValueAtTime(.14, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + .22);
      osc.start(); osc.stop(ctx.currentTime + .22);
    } catch {}
  }

  function celebrate() {
    for (let i = 0; i < 60; i++) {
      const e = document.createElement('i');
      e.className = 'phase2-confetti';
      e.style.left = Math.random() * 100 + 'vw';
      e.style.background = `hsl(${Math.random()*360} 85% 55%)`;
      e.style.animationDelay = Math.random() * .45 + 's';
      document.body.appendChild(e);
      setTimeout(() => e.remove(), 3200);
    }
  }

  function plantUse(p) { return p?.use || p?.benefit || p?.benefits || p?.utility || p?.feature || ''; }
  function plantImage(p) { return p?.image || p?.img || p?.photo || ''; }
  function esc(t) { return String(t ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  function enhanceFeedback() {
    const box = $('feedback');
    if (!box || box.dataset.phase2Observed) return;
    box.dataset.phase2Observed = '1';
    let last = box.textContent;
    new MutationObserver(() => {
      const text = box.textContent.trim();
      if (!text || text === last) return;
      last = text;
      if (text.includes('ถูกต้อง')) {
        beep(true);
        const name = [...box.querySelectorAll('b')].map(x => x.textContent.trim()).find(Boolean) || text.replace(/^.*ถูกต้อง[:：]?\s*/, '').split('\n')[0].trim();
        const p = plants.find(x => x.thai === name);
        if (p && !box.querySelector('.plant-reveal')) {
          const img = plantImage(p);
          const wrap = document.createElement('div');
          wrap.className = 'plant-reveal';
          wrap.innerHTML = `${img ? `<img src="${esc(img)}" alt="${esc(p.thai)}">` : '<div class="plant-placeholder">🌿</div>'}<div><b>${esc(p.thai)}</b><div class="small"><i>${esc(p.scientific || '')}</i></div><div>${esc(plantUse(p))}</div></div>`;
          const im = wrap.querySelector('img');
          if (im) im.onerror = () => im.outerHTML = '<div class="plant-placeholder">🌿</div>';
          box.appendChild(wrap);
        }
      } else if (text.includes('ยังไม่ตรงกัน') || text.includes('❌')) beep(false);
    }).observe(box, {childList:true, subtree:true, characterData:true});
  }

  function parseBoard() {
    const board = $('hostBoard');
    if (!board) return [];
    return [...board.querySelectorAll('.rank')].map((row, i) => {
      const texts = [...row.children].map(x => x.textContent.trim());
      const score = Number(texts.at(-1).replace(/[^0-9.-]/g,'')) || 0;
      const name = row.querySelector('b')?.textContent.trim() || texts[1] || `ผู้เล่น ${i+1}`;
      return {rank:i+1,name,score,status:row.querySelector('.small')?.textContent.trim() || ''};
    });
  }

  function addMedals(root) {
    if (!root) return;
    [...root.querySelectorAll('.rankno')].forEach((el, i) => {
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : String(i+1);
      if (el.textContent !== medal) el.textContent = medal;
      el.classList.add('phase2-medal');
    });
  }

  function updateDashboard() {
    latestRows = parseBoard();
    const count = latestRows.length;
    const top = count ? Math.max(...latestRows.map(x => x.score)) : 0;
    const avg = count ? Math.round(latestRows.reduce((s,x) => s+x.score,0)/count) : 0;
    const done = latestRows.filter(x => /finished|จบ/i.test(x.status)).length;
    const values = {phase2Players:count,phase2Top:top,phase2Avg:avg,phase2Done:done};
    Object.entries(values).forEach(([id,v]) => { const el=$(id); if(el) el.textContent=v; });
    addMedals($('hostBoard')); addMedals($('resultBoard'));
  }

  function exportCsv() {
    updateDashboard();
    if (!latestRows.length) return alert('ยังไม่มีข้อมูลคะแนน');
    const csv = '\ufeffอันดับ,ชื่อผู้เล่น,คะแนน,สถานะ\n' + latestRows.map(x => `${x.rank},"${x.name.replaceAll('"','""')}",${x.score},"${x.status.replaceAll('"','""')}"`).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], {type:'text/csv;charset=utf-8'}));
    a.download = `คะแนนการแข่งขัน-${$('roomCode')?.textContent.trim() || 'plant-guardian'}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  function installHostTools() {
    const lobby = $('hostLobby');
    if (!lobby || $('phase2Dashboard')) return;
    const dash = document.createElement('div');
    dash.id = 'phase2Dashboard';
    dash.innerHTML = `<h3>📊 Dashboard ครู</h3><div class="phase2-dashboard"><div class="phase2-stat">ผู้เล่นทั้งหมด<b id="phase2Players">0</b></div><div class="phase2-stat">คะแนนสูงสุด<b id="phase2Top">0</b></div><div class="phase2-stat">คะแนนเฉลี่ย<b id="phase2Avg">0</b></div><div class="phase2-stat">เล่นจบแล้ว<b id="phase2Done">0</b></div></div><div class="phase2-tools"><button id="phase2Export" class="btn secondary">📥 ดาวน์โหลดคะแนน Excel/CSV</button></div>`;
    const boardTitle = [...lobby.querySelectorAll('h3')].find(x => x.textContent.includes('กระดานคะแนน'));
    lobby.insertBefore(dash, boardTitle || null);
    $('phase2Export').onclick = exportCsv;
    const board = $('hostBoard');
    if (board) new MutationObserver(updateDashboard).observe(board,{childList:true,subtree:true,characterData:true});
    updateDashboard();
  }

  function watchResult() {
    const result = $('result');
    if (!result || result.dataset.phase2Observed) return;
    result.dataset.phase2Observed='1';
    new MutationObserver(() => {
      if (!result.classList.contains('hidden')) { celebrate(); addMedals($('resultBoard')); }
    }).observe(result,{attributes:true,attributeFilter:['class']});
  }

  function boot() {
    enhanceFeedback(); installHostTools(); watchResult(); addMedals($('hostBoard')); addMedals($('resultBoard'));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  setInterval(boot, 1200);
})();