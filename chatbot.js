/* Bartons Bake House – scripted help assistant (no AI service, no dependencies). */
(function () {
  'use strict';
  const S = window.SITE || {}, PRODUCTS = window.PRODUCTS || [], ZONES = window.ZONES || [];
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const css = `
  .bb-btn{position:fixed;right:18px;bottom:18px;z-index:70;display:flex;align-items:center;gap:10px;padding:8px 20px 8px 8px;border:0;border-radius:999px;background:#141414;color:#fff;font:600 .92rem 'Outfit',system-ui,sans-serif;letter-spacing:.04em;cursor:pointer;box-shadow:0 18px 40px -16px rgba(0,0,0,.7);transition:transform .35s cubic-bezier(.22,.7,.2,1)}
  .bb-btn:hover{transform:translateY(-3px)}
  .bb-btn i{width:40px;height:40px;border-radius:50%;background:#b8336a;display:grid;place-items:center;font-style:normal;font-size:1.2rem}
  .bb-panel{position:fixed;right:18px;bottom:86px;z-index:71;width:min(370px,calc(100vw - 36px));height:min(540px,calc(100vh - 120px));background:#faf6f0;border-radius:10px;border:1px solid #e7ddd0;box-shadow:0 30px 70px -24px rgba(0,0,0,.55);display:flex;flex-direction:column;overflow:hidden;transform:translateY(16px) scale(.97);opacity:0;pointer-events:none;transition:all .35s cubic-bezier(.22,.7,.2,1)}
  .bb-panel.open{transform:none;opacity:1;pointer-events:auto}
  .bb-head{background:#141414;color:#fff;padding:15px 18px;display:flex;align-items:center;gap:12px}
  .bb-head b{display:block;font:400 1.25rem 'Gloock',Georgia,serif}
  .bb-head small{color:#b8b0a7;font-size:.78rem}
  .bb-head .x{margin-left:auto;background:rgba(255,255,255,.12);border:0;color:#fff;width:34px;height:34px;border-radius:50%;cursor:pointer}
  .bb-body{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px}
  .bb-m{max-width:86%;padding:10px 14px;border-radius:12px;font-size:.93rem;line-height:1.5;white-space:pre-line;animation:bbIn .35s ease both}
  .bb-m a{color:#8f2552;font-weight:700}
  .bb-bot{background:#fff;border:1px solid #e7ddd0;border-bottom-left-radius:3px;color:#2f2b28}
  .bb-me{align-self:flex-end;background:#b8336a;color:#fff;border-bottom-right-radius:3px}
  .bb-chips{display:flex;flex-wrap:wrap;gap:6px;padding:0 16px 10px}
  .bb-chips button{border:1.5px solid #141414;background:#fff;color:#141414;border-radius:999px;padding:5px 12px;font:600 .8rem 'Outfit',system-ui,sans-serif;cursor:pointer;transition:all .25s}
  .bb-chips button:hover{background:#141414;color:#fff}
  .bb-form{display:flex;gap:8px;padding:12px;border-top:1px solid #e7ddd0;background:#fff}
  .bb-form input{flex:1;min-width:0;border:1.5px solid #e7ddd0;border-radius:6px;padding:10px 14px;font:inherit;font-size:.94rem}
  .bb-form input:focus{outline:none;border-color:#141414}
  .bb-form button{width:44px;height:44px;border-radius:6px;border:0;background:#141414;color:#fff;cursor:pointer;display:grid;place-items:center}
  .bb-form svg{width:18px;height:18px}
  .bb-typing{display:inline-flex;gap:4px}.bb-typing span{width:6px;height:6px;border-radius:50%;background:#c9bfb3;animation:bbDot 1s infinite}.bb-typing span:nth-child(2){animation-delay:.15s}.bb-typing span:nth-child(3){animation-delay:.3s}
  @keyframes bbIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
  @keyframes bbDot{0%,80%,100%{opacity:.3}40%{opacity:1}}
  @media (max-width:640px){.bb-btn span{display:none}.bb-btn{padding:6px;bottom:86px;right:14px}.bb-panel{bottom:146px;right:14px;height:min(500px,calc(100vh - 180px))}}
  @media (prefers-reduced-motion:reduce){.bb-m,.bb-panel{animation:none;transition:none}}`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  const sendI = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4z"/></svg>';
  const root = document.createElement('div');
  root.innerHTML = `
  <button class="bb-btn" aria-expanded="false" aria-controls="bb-panel"><i aria-hidden="true">🍰</i><span>Ask us</span></button>
  <section class="bb-panel" id="bb-panel" role="dialog" aria-label="Bartons Bake House help">
    <div class="bb-head"><div><b>Bartons Bake House</b><small>Automated assistant · set answers</small></div><button class="x" aria-label="Close chat">✕</button></div>
    <div class="bb-body" aria-live="polite"></div><div class="bb-chips"></div>
    <form class="bb-form"><label class="sr-only" for="bb-in">Type your message</label><input id="bb-in" autocomplete="off" placeholder="Try “do you deliver to FY5?”" maxlength="200"><button aria-label="Send">${sendI}</button></form>
  </section>`;
  document.body.appendChild(root);
  const btn = root.querySelector('.bb-btn'), panel = root.querySelector('.bb-panel'), body = root.querySelector('.bb-body'), chipBox = root.querySelector('.bb-chips'), form = root.querySelector('.bb-form'), input = root.querySelector('#bb-in');
  let started = false, busy = false;
  const add = (h, who = 'bot') => { const m = document.createElement('div'); m.className = 'bb-m bb-' + who; m.innerHTML = h; body.appendChild(m); body.scrollTop = body.scrollHeight; return m; };
  const say = (h, w = 420) => new Promise((r) => { const tp = add('<span class="bb-typing"><span></span><span></span><span></span></span>'); setTimeout(() => { tp.innerHTML = h; body.scrollTop = body.scrollHeight; r(); }, w); });
  const chips = (l) => { chipBox.innerHTML = ''; l.forEach((c) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = c; b.onclick = () => handle(c); chipBox.appendChild(b); }); };
  const MAIN = ['Delivery areas', 'Celebration cakes', 'Opening hours', 'Contact'];
  const pcRe = /\b([A-Z]{1,2}\d{1,2}[A-Z]?)(?:\s*\d[A-Z]{2})?\b/i;
  const intents = [
    { re: /\b(PR|LA|FY|WN|BL|BB)\d{1,2}\b/i, run: (q) => { const o = q.match(pcRe)[1].toUpperCase(); const z = ZONES.find((x) => x.codes.includes(o)); return say(z ? `Yes! We deliver to <strong>${o}</strong> (${esc(z.name)}): ${esc(z.dayText)}. Delivery is £${S.deliveryFee.toFixed(2)} with a £${S.minOrder} minimum order. <a href="shop.html">Start shopping →</a>` : `Sorry, <strong>${o}</strong> isn’t in our delivery area, but you can order online and <strong>collect from Hutton</strong>. <a href="delivery.html">See all areas</a>`).then(() => chips(MAIN)); } },
    { re: /deliver|postcode|area|where do you|minimum|fee|charge|cost of delivery/i, run: () => say(`We deliver Monday to Saturday across Preston, Lancaster, Blackpool &amp; the Fylde and Wigan, Mon/Wed/Fri to Bolton and Tue/Thu to Blackburn, Darwen &amp; Clitheroe. Delivery is £${S.deliveryFee.toFixed(2)} with a £${S.minOrder} minimum. Type your postcode (e.g. “PR2”) and I’ll check it. <a href="delivery.html">Full list</a>`).then(() => chips(['Cut-off time', 'Collection'])) },
    { re: /cut ?off|next day|tomorrow|how soon|when.*arrive|time.*order|3 ?pm/i, run: () => say(`Order before <strong>3pm</strong> for next-day delivery or collection. Deliveries arrive between 9am and 5pm, and we can’t guarantee a time slot.`).then(() => chips(MAIN)) },
    { re: /collect|pick ?up|click/i, run: () => say(`Collect from our shop at <strong>${esc(S.address)}</strong> for orders of any value. Choose a half-hour slot at checkout (no same-day collections). <a href="order.html?method=collect">Order for collection</a>`).then(() => chips(MAIN)) },
    { re: /hour|open|close|saturday|sunday|shop times/i, run: () => say(`Our Hutton shop is open:\nMonday to Friday <strong>8am to 5pm</strong>\nSaturday <strong>8am to 4pm</strong>\nSunday <strong>closed</strong>`).then(() => chips(MAIN)) },
    { re: /pay|payment|card|paypal/i, run: () => say(`Place your order on the website and we’ll call you to confirm it and take payment by card. Or call the order hotline on <a href="${S.phoneHref}">${S.phone}</a>.`).then(() => chips(MAIN)) },
    { re: /vegan|gluten|allerg|nut|dairy/i, run: () => say(`We have vegan cheesecakes (Biscoff, Limoncello and Vanilla). For allergen information on any product, please call <a href="${S.phoneHref}">${S.phone}</a> before ordering.`).then(() => chips(MAIN)) },
    { re: /celebration|birthday|party|pinata|rainbow|drip/i, run: () => say(`Our celebration cakes include the Piñata, Rainbow, Chocolate Dream, Millionaire, Pick ’n’ Mix and Luxury Drip cakes, plus Happy Birthday plaques and toppers. <a href="shop.html?cat=celebration-cakes">See celebration cakes</a>`).then(() => chips(MAIN)) },
    { re: /afternoon tea|cupcake|scone/i, run: () => say(`Our afternoon teas for two or four (standard or deluxe) and cupcake boxes are perfect for treating someone. <a href="shop.html?cat=afternoon-tea">See afternoon tea</a>`).then(() => chips(MAIN)) },
    { re: /cheesecake|dessert|gateau|roulade|meringue/i, run: () => say(`We have ${PRODUCTS.filter((p) => p.cats.includes('cheesecakes')).length} cheesecakes and desserts, from twin packs to 9" sharing cheesecakes, plus gateaux, roulades and meringues. <a href="shop.html?cat=cheesecakes">Browse cheesecakes</a>`).then(() => chips(MAIN)) },
    { re: /contact|phone|call|email|talk|hotline/i, run: () => say(`Order hotline: <a href="${S.phoneHref}">${S.phone}</a>\nEmail: <a href="mailto:${S.email}">${esc(S.email)}</a>\nShop: ${esc(S.address)}`).then(() => chips(MAIN)) },
    { re: /^(hi|hello|hey|hiya|good (morning|afternoon|evening))\b/i, run: () => say('Hello! 👋 How can we help today?').then(() => chips(MAIN)) },
    { re: /thank|cheers/i, run: () => say('You’re welcome! 🍰').then(() => chips(MAIN)) },
  ];
  const findProduct = (q) => { const w = q.toLowerCase().split(/\W+/).filter((x) => x.length > 3); return PRODUCTS.filter((p) => w.some((x) => p.name.toLowerCase().includes(x))).slice(0, 4); };
  async function handle(text) {
    if (busy || !text.trim()) return;
    busy = true; add(esc(text), 'me');
    try {
      const map = { 'Delivery areas': 'delivery', 'Celebration cakes': 'celebration', 'Opening hours': 'hours', 'Contact': 'contact', 'Cut-off time': 'cut off', 'Collection': 'collect' };
      const q = map[text] || text, hit = intents.find((i) => i.re.test(q));
      if (hit) { await hit.run(q); return; }
      const ps = findProduct(q);
      if (ps.length) { await say(`Here’s what I found:\n${ps.map((p) => `• ${esc(p.name)}: ${p.value == null ? 'price on request' : (p.from ? 'from ' : '') + '£' + p.value.toFixed(2)}`).join('\n')}\n<a href="shop.html?q=${encodeURIComponent(q)}">See them in the shop →</a>`); chips(MAIN); return; }
      await say(`I don’t have a set answer for that one, but our team can help: call <a href="${S.phoneHref}">${S.phone}</a> or email <a href="mailto:${S.email}">${esc(S.email)}</a>.`); chips(MAIN);
    } finally { busy = false; }
  }
  const open = async (s) => { panel.classList.toggle('open', s); btn.setAttribute('aria-expanded', String(s)); if (s) { input.focus(); if (!started) { started = true; await say('Welcome to <strong>Bartons Bake House</strong>! 🍰 Ask me about delivery to your postcode, our cakes or opening hours.', 300); chips(MAIN); } } };
  btn.addEventListener('click', () => open(!panel.classList.contains('open')));
  root.querySelector('.x').addEventListener('click', () => open(false));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && panel.classList.contains('open')) open(false); });
  form.addEventListener('submit', (e) => { e.preventDefault(); const v = input.value; input.value = ''; handle(v); });
})();
