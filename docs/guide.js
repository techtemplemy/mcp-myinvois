// shared: step checkboxes (localStorage) + copy buttons on every code block
const boxes = [...document.querySelectorAll('.stat input')];
const count = document.getElementById('progress-count');

function refresh() {
  let n = 0;
  boxes.forEach(b => {
    const s = b.closest('.step');
    s.classList.toggle('done', b.checked);
    if (b.checked) n++;
  });
  if (count) count.textContent = n + ' / ' + boxes.length;
}
boxes.forEach(b => {
  const key = 'mi-step-' + b.closest('.step').dataset.step;
  b.checked = localStorage.getItem(key) === '1';
  b.addEventListener('change', () => { localStorage.setItem(key, b.checked ? '1' : '0'); refresh(); });
});
refresh();

// journey map  the README flowchart as a clickable inline SVG.
// Renders into <div id="journey-flow">; the current page's node
// (from <body data-flow="...">) gets the yellow "you are here" outline.
(function journeyFlow() {
  const holder = document.getElementById('journey-flow');
  if (!holder) return;
  const cur = document.body.dataset.flow || '';
  const NAVY = '#1B2A4A', CREAM = '#FAF9F5', YEL = '#F6C915', SOFT = '#9FB0D4';
  const hl = k => cur === k
    ? `stroke="${YEL}" stroke-width="4"`
    : `stroke="${NAVY}" stroke-width="1.5"`;
  const box = (k, x, y, w, h, href, l1, l2) => `
    <a href="${href}"><g cursor="pointer">
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${NAVY}" ${hl(k)}/>
      <text x="${x + w / 2}" y="${y + (l2 ? h / 2 - 3 : h / 2 + 4)}" text-anchor="middle" fill="${CREAM}" font-size="13" font-weight="600">${l1}</text>
      ${l2 ? `<text x="${x + w / 2}" y="${y + h / 2 + 13}" text-anchor="middle" fill="${SOFT}" font-size="10.5">${l2}</text>` : ''}
    </g></a>`;
  const diamond = (pts, cx, cy, l1, l2) => `
    <g>
      <polygon points="${pts}" fill="${YEL}" stroke="${NAVY}" stroke-width="1.5"/>
      <text x="${cx}" y="${cy - 2}" text-anchor="middle" fill="${NAVY}" font-size="12" font-weight="600">${l1}</text>
      <text x="${cx}" y="${cy + 12}" text-anchor="middle" fill="${NAVY}" font-size="12" font-weight="600">${l2}</text>
    </g>`;
  const arrow = (d) => `<path d="${d}" fill="none" stroke="${NAVY}" stroke-width="1.5" marker-end="url(#jf-arr)"/>`;

  holder.innerHTML = `
  <svg viewBox="0 0 900 282" role="img" aria-label="Journey map: get access, configure, then submit, check, cancel, or self-bill" style="width:100%;height:auto;display:block;font-family:'IBM Plex Sans',system-ui,sans-serif">
    <defs><marker id="jf-arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M2 1L8 5L2 9" fill="none" stroke="${NAVY}" stroke-width="1.5" stroke-linecap="round"/></marker></defs>
    ${arrow('M126,106 L164,106')}
    <text x="145" y="98" text-anchor="middle" fill="${NAVY}" font-size="10.5">no</text>
    ${arrow('M295,106 L324,106')}
    ${arrow('M68,150 L68,190 L397,190 L397,138')}
    <text x="120" y="184" text-anchor="middle" fill="${NAVY}" font-size="10.5">yes</text>
    ${arrow('M465,106 L481,106')}
    ${arrow('M603,106 L624,40')}
    ${arrow('M603,106 L624,106')}
    ${arrow('M603,106 L624,176')}
    ${arrow('M603,106 L624,246')}
    ${arrow('M770,36 L784,36')}
    ${diamond('68,62 126,106 68,150 10,106', 68, 106, 'got API', 'keys?')}
    ${diamond('545,62 603,106 545,150 487,106', 545, 106, 'day-to-', 'day')}
    ${box('access', 170, 80, 125, 52, 'guide-access.html', '① Get access', 'one-time only')}
    ${box('configure', 330, 80, 135, 52, 'guide-configure.html', '② Configure local', 'optional')}
    ${box('submit', 630, 16, 140, 40, 'guide-submit.html', '③ Submit', 'e-invoice')}
    ${box('check', 630, 86, 140, 40, 'guide-check.html', '④ Check', 'status')}
    ${box('cancel', 630, 156, 140, 40, 'guide-cancel.html', '⑤ Cancel', 'within 72 hours')}
    ${box('selfbill', 630, 226, 140, 40, 'guide-selfbill.html', '⑥ Self-billed', 'foreign vendors')}
    ${box('maker', 790, 16, 100, 40, 'invoice-maker.html', '📧 send', 'PDF + QR')}
  </svg>`;
})();

// clipboard with fallback: navigator.clipboard needs a secure, focused
// context  the textarea/execCommand path covers file:// and older browsers
function copyText(text) {
  if (navigator.clipboard) {
    return navigator.clipboard.writeText(text).catch(() => copyTextFallback(text));
  }
  return copyTextFallback(text);
}
function copyTextFallback(text) {
  return new Promise((resolve, reject) => {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy') ? resolve() : reject(new Error('copy failed')); }
    catch (e) { reject(e); }
    finally { ta.remove(); }
  });
}

// "copy skill.md" buttons  copy the journey's granular skill instructions
// (from skill-snippets.js) for pasting into any AI assistant
document.querySelectorAll('[data-skill]').forEach(btn => {
  btn.addEventListener('click', () => {
    const md = (window.SKILL_SNIPPETS || {})[btn.dataset.skill];
    if (!md) return;
    copyText(md).then(() => {
      const t = btn.textContent;
      btn.textContent = 'copied skill.md ✓';
      setTimeout(() => { btn.textContent = t; }, 1600);
    });
  });
});

document.querySelectorAll('.code').forEach(el => {
  const btn = document.createElement('button');
  btn.className = 'copy';
  btn.textContent = 'copy';
  btn.addEventListener('click', () => {
    copyText(el.innerText.replace(/^copy\n?/, '').trim()).then(() => {
      btn.textContent = 'copied ✓';
      btn.classList.add('ok');
      setTimeout(() => { btn.textContent = 'copy'; btn.classList.remove('ok'); }, 1600);
    });
  });
  el.prepend(btn);
});
