// Inject shared chrome (frame, corners, topbar, botbar) on any campaign page.
// Looks for these data attributes on <body>:
//   data-campaign       — campaign code, e.g. "OREO"
//   data-campaign-tag   — small label, e.g. "ACTIVATION"
(function () {
  const body = document.body;
  if (!body) return;

  const campaign = body.getAttribute('data-campaign') || '';
  const tag      = body.getAttribute('data-campaign-tag') || 'CAMPAIGN';

  function el(tag, cls, html) {
    const n = document.createElement(tag);
    if (cls)  n.className = cls;
    if (html) n.innerHTML = html;
    return n;
  }

  body.prepend(el('div', 'frame'));
  ['tl','tr','bl','br'].forEach(p => body.prepend(el('div', 'corner ' + p)));

  const top = el('header', 'topbar');
  top.innerHTML = `
    <a class="brand" href="/">
      <span class="brand-mark"></span>
      <strong>Interactive Media</strong>
    </a>
    <div class="meta">
      ${campaign ? `<span>${tag} · ${campaign}</span>` : ''}
      <span id="__im_clock">00:00:00 UTC</span>
    </div>
  `;
  body.append(top);

  const bot = el('footer', 'botbar');
  bot.innerHTML = `
    <div class="meta"><span>© Interactive Media</span></div>
    <div class="meta"><span>EN</span></div>
  `;
  body.append(bot);

  const clock = top.querySelector('#__im_clock');
  function tick() {
    const d = new Date();
    const hh = String(d.getUTCHours()).padStart(2, '0');
    const mm = String(d.getUTCMinutes()).padStart(2, '0');
    const ss = String(d.getUTCSeconds()).padStart(2, '0');
    clock.textContent = `${hh}:${mm}:${ss} UTC`;
  }
  tick(); setInterval(tick, 1000);
})();
