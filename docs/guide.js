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

document.querySelectorAll('.code').forEach(el => {
  const btn = document.createElement('button');
  btn.className = 'copy';
  btn.textContent = 'copy';
  btn.addEventListener('click', () => {
    navigator.clipboard.writeText(el.innerText.replace(/^copy\n?/, '').trim()).then(() => {
      btn.textContent = 'copied ✓';
      btn.classList.add('ok');
      setTimeout(() => { btn.textContent = 'copy'; btn.classList.remove('ok'); }, 1600);
    });
  });
  el.prepend(btn);
});
