// shared: step checkboxes (localStorage) + copy buttons on every code block
const boxes = [...document.querySelectorAll('.stat input')];
const count = document.getElementById('progress-count');

function refresh(){
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

// clipboard with fallback: navigator.clipboard needs a secure, focused
// context — the textarea/execCommand path covers file:// and older browsers
function copyText(text){
  if (navigator.clipboard) {
    return navigator.clipboard.writeText(text).catch(() => copyTextFallback(text));
  }
  return copyTextFallback(text);
}
function copyTextFallback(text){
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

// "copy skill.md" buttons — copy the journey's granular skill instructions
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
