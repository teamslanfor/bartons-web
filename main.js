/* Bartons Bake House – shop, basket, delivery rules and checkout (no dependencies).
   Delivery rules mirror the bakery's published policy: £5.95 local delivery, £50 minimum, order before 3pm
   for next-day, Mon–Sat delivery (Bolton Mon/Wed/Fri, Blackburn/Darwen/Clitheroe Tue/Thu), no Sunday, collection from Hutton. */
(function () {
  'use strict';
  document.documentElement.classList.remove('no-js');
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const S = window.SITE || {}, PRODUCTS = window.PRODUCTS || [], ZONES = window.ZONES || [];
  const params = new URLSearchParams(location.search);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (n) => '£' + n.toFixed(2);
  const byId = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]));
  const MIN = S.minOrder || 50, FEE = S.deliveryFee || 5.95, CUTOFF = S.cutoffHour || 15;
  const DAYN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  /* ---------- Header, menu, reveal ---------- */
  const hdr = $('.hdr');
  const onScroll = () => hdr && hdr.classList.toggle('scrolled', window.scrollY > 10);
  onScroll(); addEventListener('scroll', onScroll, { passive: true });
  const burger = $('.burger'), nav = $('.nav');
  if (burger && nav) {
    const close = () => { nav.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); document.body.style.overflow = ''; };
    burger.addEventListener('click', () => { const o = nav.classList.toggle('open'); burger.setAttribute('aria-expanded', String(o)); document.body.style.overflow = o ? 'hidden' : ''; });
    $$('a', nav).forEach((a) => a.addEventListener('click', close));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  }
  const rv = $$('.rv'); const show = (el) => el.classList.add('in');
  const observeRv = (els) => {
    if ('IntersectionObserver' in window && !reduce) {
      const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { show(e.target); io.unobserve(e.target); } }), { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });
      els.forEach((el) => io.observe(el));
    } else els.forEach(show);
  };
  observeRv(rv);
  let tk = false;
  addEventListener('scroll', () => { if (!tk) { tk = true; requestAnimationFrame(() => { tk = false; $$('.rv:not(.in)').forEach((el) => { if (el.getBoundingClientRect().top < innerHeight) show(el); }); }); } }, { passive: true });
  setTimeout(() => $$('.rv').forEach(show), 2500);

  /* ---------- Basket (stored in this browser) ---------- */
  const store = {
    get() { try { return JSON.parse(localStorage.getItem('bb-cart') || '{}'); } catch (e) { return {}; } },
    set(v) { try { localStorage.setItem('bb-cart', JSON.stringify(v)); } catch (e) {} },
  };
  let cart = store.get();
  Object.keys(cart).forEach((id) => { if (!byId[id] || !(cart[id] > 0)) delete cart[id]; });
  const lines = () => Object.entries(cart).map(([id, q]) => ({ p: byId[id], q })).filter((l) => l.p);
  const totals = () => {
    let sub = 0, estimate = false, unpriced = false;
    lines().forEach(({ p, q }) => { if (p.value == null) unpriced = true; else { sub += p.value * q; if (p.from) estimate = true; } });
    return { sub, estimate, unpriced, count: lines().reduce((a, l) => a + l.q, 0) };
  };
  const priceHtml = (p) => p.value == null ? '<small>Price</small>On request' : (p.from ? `<small>From</small>${money(p.value)}` : money(p.value));
  const thumb = (p, cls = '') => p.img ? `<img class="${cls}" src="${p.img}" alt="" loading="lazy">` : `<span class="ni ${cls}"></span>`;
  const setQty = (id, q) => { if (q <= 0) delete cart[id]; else cart[id] = Math.min(99, q); store.set(cart); renderAll(); };
  const toast = $('.toast');
  let tt;
  const add = (id, btn) => {
    setQty(id, (cart[id] || 0) + 1);
    const cb = $('.cart-btn'); if (cb) { cb.classList.remove('bump'); void cb.offsetWidth; cb.classList.add('bump'); }
    if (btn) { btn.classList.add('added'); btn.innerHTML = '✓ Added'; setTimeout(() => { btn.classList.remove('added'); btn.innerHTML = btn.dataset.label; }, 1400); }
    if (toast) { $('span', toast).textContent = `${byId[id].name} added`; toast.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => toast.classList.remove('show'), 2600); }
  };
  document.addEventListener('click', (e) => {
    const b = e.target.closest('.add[data-id]'); if (b) { e.preventDefault(); add(b.dataset.id, b); return; }
    const q = e.target.closest('[data-q]'); if (q) { const id = q.dataset.id; setQty(id, (cart[id] || 0) + (q.dataset.q === '+' ? 1 : -1)); return; }
    const rm = e.target.closest('[data-rm]'); if (rm) setQty(rm.dataset.rm, 0);
  });
  $$('.add[data-id]').forEach((b) => { b.dataset.label = b.innerHTML; });

  /* Drawer */
  const drawer = $('.drawer');
  const openDrawer = (o) => { if (!drawer) return; drawer.classList.toggle('open', o); drawer.setAttribute('aria-hidden', String(!o)); document.body.style.overflow = o ? 'hidden' : ''; if (o) $('.x', drawer).focus(); };
  $$('.cart-btn').forEach((b) => b.addEventListener('click', (e) => { if (location.pathname.endsWith('order.html')) return; e.preventDefault(); openDrawer(true); }));
  if (drawer) { $('.shade', drawer).addEventListener('click', () => openDrawer(false)); $('.x', drawer).addEventListener('click', () => openDrawer(false)); document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && drawer.classList.contains('open')) openDrawer(false); }); }
  if (toast) $('a', toast).addEventListener('click', (e) => { e.preventDefault(); toast.classList.remove('show'); openDrawer(true); });

  const meterHtml = (sub) => {
    const pct = Math.min(100, (sub / MIN) * 100), left = Math.max(0, MIN - sub);
    return `<div class="meter${left === 0 ? ' full' : ''}"><i style="width:${pct}%"></i></div><div class="meter-t">${left === 0 ? '✓ Minimum spend reached for home delivery' : `Add ${money(left)} more for home delivery (min. ${money(MIN)}). Collection has no minimum.`}</div>`;
  };
  const renderDrawer = () => {
    if (!drawer) return;
    const ls = lines(), t = totals();
    $('.items', drawer).innerHTML = ls.length ? ls.map(({ p, q }) => `<div class="line">${thumb(p)}<div><b>${esc(p.name)}</b><small>${p.value == null ? 'Price on request' : (p.from ? 'From ' : '') + money(p.value)}</small><br>
      <span class="qtyc"><button type="button" data-q="-" data-id="${p.id}" aria-label="Fewer ${esc(p.name)}">−</button><span>${q}</span><button type="button" data-q="+" data-id="${p.id}" aria-label="More ${esc(p.name)}">+</button></span> <button type="button" class="rm" data-rm="${p.id}">Remove</button></div>
      <b>${p.value == null ? '—' : money(p.value * q)}</b></div>`).join('') : '<div class="cart-empty"><p>Your basket is empty.</p><a class="btn btn-sm" href="shop.html">Browse the shop</a></div>';
    $('.df', drawer).hidden = !ls.length;
    $('.df .tot b', drawer).textContent = (t.estimate ? 'from ' : '') + money(t.sub);
    $('.df .mt', drawer).innerHTML = meterHtml(t.sub);
  };
  const renderCount = () => { const t = totals(); $$('.cart-btn .count').forEach((c) => { c.textContent = t.count; }); };

  /* ---------- Shop: category tabs, search, sort ---------- */
  const grid = $('#shop-grid');
  if (grid) {
    const cards = $$('.pcard', grid), search = $('#q'), sort = $('#sort'), count = $('#count'), empty = $('.empty');
    const tabs = $$('[role=tab]'), ind = $('.tabs .ind');
    let cat = params.get('cat') || 'all';
    const move = (tb) => { if (ind && tb) { ind.style.width = tb.offsetWidth + 'px'; ind.style.transform = `translateX(${tb.offsetLeft}px)`; } };
    const apply = () => {
      const q = (search.value || '').trim().toLowerCase(); let n = 0;
      cards.forEach((c) => { const ok = (cat === 'all' || c.dataset.cats.split(' ').includes(cat)) && (!q || c.dataset.name.includes(q)); c.classList.toggle('hide', !ok); if (ok) n++; });
      tabs.forEach((t) => { const on = t.dataset.f === cat; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; if (on) move(t); });
      count.textContent = `Showing ${n} product${n === 1 ? '' : 's'}`; empty.style.display = n ? 'none' : 'block';
    };
    const doSort = () => {
      const v = sort.value, val = (c) => (c.dataset.price === '' ? Infinity : +c.dataset.price);
      const sorted = [...cards].sort((a, b) => v === 'low' ? val(a) - val(b) : v === 'high' ? (val(b) === Infinity ? -1 : val(a) === Infinity ? 1 : val(b) - val(a)) : v === 'az' ? a.dataset.name.localeCompare(b.dataset.name) : +a.dataset.i - +b.dataset.i);
      sorted.forEach((c) => grid.appendChild(c));
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => { cat = t.dataset.f; apply(); history.replaceState(null, '', cat === 'all' ? 'shop.html' : `shop.html?cat=${cat}`); });
      t.addEventListener('keydown', (e) => { const k = { ArrowRight: 1, ArrowLeft: -1 }[e.key]; if (k) { e.preventDefault(); const n = tabs[(i + k + tabs.length) % tabs.length]; n.click(); n.focus(); } });
    });
    search.addEventListener('input', apply); sort.addEventListener('change', doSort);
    if (params.get('q')) search.value = params.get('q');
    apply(); addEventListener('resize', () => move(tabs.find((t) => t.dataset.f === cat)));
    if (document.fonts) document.fonts.ready.then(() => move(tabs.find((t) => t.dataset.f === cat)));
  }

  /* ---------- Delivery zones + dates ---------- */
  const outward = (pc) => { const s = pc.toUpperCase().replace(/[^A-Z0-9 ]/g, '').trim(); if (!s) return ''; if (s.includes(' ')) return s.split(' ')[0]; return s.length > 4 ? s.slice(0, -3) : s; };
  const zoneFor = (pc) => { const o = outward(pc); return ZONES.find((z) => z.codes.includes(o)) || null; };
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const nice = (d) => d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const earliest = (days) => { // days: allowed weekday numbers
    const d = new Date(); const add = d.getHours() >= CUTOFF ? 2 : 1; d.setDate(d.getDate() + add); d.setHours(12, 0, 0, 0);
    for (let i = 0; i < 14 && !days.includes(d.getDay()); i++) d.setDate(d.getDate() + 1);
    return d;
  };
  const describe = (z) => z ? `✓ We deliver to <b>${esc(z.name)}</b> (${z.dayText}). Earliest delivery: <b>${nice(earliest(z.days))}</b>. Delivery ${money(FEE)}, minimum order ${money(MIN)}.` : '';

  /* Delivery page checker */
  const chk = $('#pc-check');
  if (chk) {
    const out = $('#pc-out');
    const run = () => {
      const v = $('#pc-in').value.trim(); $$('.pcs span').forEach((s) => s.classList.remove('hit'));
      if (!v) { out.className = 'pc-res'; out.innerHTML = ''; return; }
      const z = zoneFor(v);
      if (z) { out.className = 'pc-res ok'; out.innerHTML = describe(z); const s = $(`.pcs span[data-pc="${outward(v)}"]`); if (s) { s.classList.add('hit'); s.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' }); } }
      else { out.className = 'pc-res no'; out.innerHTML = `Sorry, <b>${esc(outward(v))}</b> isn’t in our delivery area yet. You can still <a href="order.html">order online and collect from Hutton</a>, or call <a href="${S.phoneHref}">${S.phone}</a>.`; }
    };
    chk.addEventListener('submit', (e) => { e.preventDefault(); run(); });
  }

  /* ---------- Checkout ---------- */
  const co = $('#checkout');
  const renderCheckout = () => {
    if (!co) return;
    const ls = lines(), t = totals();
    $('#co-empty').hidden = ls.length > 0; co.hidden = ls.length === 0;
    if (!ls.length) return;
    $('#co-lines').innerHTML = ls.map(({ p, q }) => `<tr><td style="width:70px">${thumb(p)}</td><td><b>${esc(p.name)}</b><br><small style="color:var(--muted)">${p.value == null ? 'Price on request' : (p.from ? 'From ' : '') + money(p.value) + ' each'}</small></td>
      <td><span class="qtyc"><button type="button" data-q="-" data-id="${p.id}" aria-label="Fewer ${esc(p.name)}">−</button><span>${q}</span><button type="button" data-q="+" data-id="${p.id}" aria-label="More ${esc(p.name)}">+</button></span><br><button type="button" class="rm" data-rm="${p.id}" style="border:0;background:none;color:var(--muted);text-decoration:underline;cursor:pointer;padding:0;font-size:.8rem">Remove</button></td>
      <td>${p.value == null ? '—' : money(p.value * q)}</td></tr>`).join('');
    const del = $('input[name=method]:checked').value === 'delivery';
    const fee = del ? FEE : 0;
    $('#sum').innerHTML = ls.map(({ p, q }) => `<div class="sl"><span>${q} × ${esc(p.name)}</span><span>${p.value == null ? 'TBC' : money(p.value * q)}</span></div>`).join('') +
      `<div class="sl"><span>Subtotal</span><span>${t.estimate ? 'from ' : ''}${money(t.sub)}</span></div><div class="sl"><span>${del ? 'Home delivery' : 'Collection from Hutton'}</span><span>${del ? money(fee) : 'Free'}</span></div>`;
    $('#grand').textContent = (t.estimate || t.unpriced ? 'from ' : '') + money(t.sub + fee);
    $('#sum-note').innerHTML = (t.estimate || t.unpriced ? 'Some items have size options or prices to confirm, so we’ll confirm your final total before payment. ' : '') + 'No payment is taken online. We’ll confirm your order and take payment by phone.';
    $('#co-meter').innerHTML = del ? meterHtml(t.sub) : '';
    const under = del && t.sub < MIN;
    $('#co-submit').disabled = under;
    $('#min-msg').hidden = !under;
  };
  if (co) {
    const pc = $('#postcode'), date = $('#date'), slot = $('#slot'), res = $('#pc-res');
    const methodSet = () => {
      const del = $('input[name=method]:checked').value === 'delivery';
      $$('.del-only').forEach((x) => { x.hidden = !del; $$('input,select,textarea', x).forEach((i) => { i.disabled = !del; }); });
      $$('.col-only').forEach((x) => { x.hidden = del; $$('input,select,textarea', x).forEach((i) => { i.disabled = del; }); });
      updateDate(); renderCheckout();
    };
    const allowedDays = () => { const del = $('input[name=method]:checked').value === 'delivery'; if (!del) return [1, 2, 3, 4, 5, 6]; const z = zoneFor(pc.value); return z ? z.days : [1, 2, 3, 4, 5, 6]; };
    const updateDate = () => {
      const e = earliest(allowedDays()); date.min = iso(e);
      $('#date-hint').innerHTML = `Earliest: <b>${nice(e)}</b> · ${$('input[name=method]:checked').value === 'delivery' ? (zoneFor(pc.value) ? esc(zoneFor(pc.value).dayText) : 'Monday to Saturday') : 'Monday to Saturday (no same-day collection)'} · order before 3pm for next day`;
      updateSlots();
    };
    const updateSlots = () => {
      const d = date.value ? new Date(date.value + 'T12:00') : null, end = d && d.getDay() === 6 ? 15.5 : 16.5, keep = slot.value;
      let o = '<option value="">Choose a time…</option>';
      for (let h = 8; h <= end; h += 0.5) { const t = `${String(Math.floor(h)).padStart(2, '0')}:${h % 1 ? '30' : '00'}`; o += `<option${t === keep ? ' selected' : ''}>${t}</option>`; }
      slot.innerHTML = o;
    };
    $$('input[name=method]').forEach((r) => r.addEventListener('change', methodSet));
    const pcRun = () => { const v = pc.value.trim(); if (!v) { res.className = 'pc-res'; res.innerHTML = ''; } else { const z = zoneFor(v); res.className = 'pc-res ' + (z ? 'ok' : 'no'); res.innerHTML = z ? describe(z) : `Sorry, <b>${esc(outward(v))}</b> is outside our delivery area. Please choose <b>Collect from Hutton</b> or call <a href="${S.phoneHref}">${S.phone}</a>.`; } updateDate(); };
    pc.addEventListener('change', pcRun); pc.addEventListener('blur', pcRun);
    date.addEventListener('change', updateSlots);
    if (params.get('method') === 'collect') $('input[name=method][value=collect]').checked = true;
    methodSet();

    const UKPC = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;
    const rules = {
      name: (v) => v.trim().length >= 2 || 'Please enter your name.',
      email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) || 'Please enter a valid email address.',
      phone: (v) => { const d = v.replace(/\D/g, ''); return (d.length >= 10 && d.length <= 13) || 'Please enter a valid phone number, e.g. 07700 900123.'; },
      address: (v) => v.trim().length >= 5 || 'Please enter your delivery address.',
      postcode: (v) => !UKPC.test(v.trim()) ? 'Please enter a full UK postcode, e.g. PR4 5FE.' : (zoneFor(v) ? true : 'Sorry, we don’t deliver to this postcode. Choose collection instead.'),
      date: (v) => { if (!v) return 'Please choose a date.'; const d = new Date(v + 'T12:00'); if (!allowedDays().includes(d.getDay())) return `We can’t ${$('input[name=method]:checked').value === 'delivery' ? 'deliver to your area' : 'do collections'} on a ${DAYN[d.getDay()]}. Please pick another day.`; if (v < date.min) return `The earliest date is ${nice(new Date(date.min + 'T12:00'))}. Orders need to be placed before 3pm for next-day.`; return true; },
      slot: (v) => !!v || 'Please choose a collection time.',
    };
    const fields = () => $$('[data-rule]', co).filter((el) => !el.disabled);
    const check = (el) => { const r = rules[el.dataset.rule](el.value), box = el.closest('.f'), ok = r === true; box.classList.toggle('bad', !ok); $('.err', box).textContent = ok ? '' : r; el.setAttribute('aria-invalid', String(!ok)); return ok; };
    $$('[data-rule]', co).forEach((el) => {
      el.addEventListener('blur', (e) => { if (e.relatedTarget && e.relatedTarget.id === 'co-submit') return; if (!el.value.trim() && !el.closest('.f').classList.contains('bad')) return; check(el); });
      el.addEventListener('change', () => { if (el.closest('.f').classList.contains('bad') || el.tagName === 'SELECT' || el.type === 'date') check(el); });
    });
    const status = $('#co-status'), btn = $('#co-submit');
    co.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (co.elements._honey.value) return;
      renderCheckout();
      if (btn.disabled) return;
      if (fields().map(check).includes(false)) { status.className = 'status bad'; status.textContent = 'Please fix the highlighted fields and try again.'; const f = $('.f.bad input, .f.bad select', co); if (f) f.focus(); return; }
      const ls = lines(), t = totals(), del = $('input[name=method]:checked').value === 'delivery';
      const ref = 'BB-' + Date.now().toString(36).toUpperCase().slice(-6);
      const fd = new FormData(co); fd.delete('_honey');
      const d = new Date(date.value + 'T12:00');
      fd.set('date', nice(d));
      fd.append('reference', ref);
      fd.append('order', ls.map(({ p, q }) => `${q} x ${p.name} @ ${p.value == null ? 'price on request' : (p.from ? 'from ' : '') + money(p.value)}${p.value == null ? '' : ' = ' + money(p.value * q)}`).join('\n'));
      fd.append('subtotal', (t.estimate ? 'from ' : '') + money(t.sub));
      fd.append('delivery_charge', del ? money(FEE) : 'Collection (free)');
      fd.append('total', (t.estimate || t.unpriced ? 'from ' : '') + money(t.sub + (del ? FEE : 0)));
      if (del) fd.append('delivery_zone', zoneFor(pc.value).name);
      fd.append('_subject', `New website order ${ref}: ${del ? 'Delivery' : 'Collection'} ${nice(d)} (${fd.get('name')})`);
      fd.append('_template', 'table'); fd.append('_captcha', 'false');
      btn.disabled = true; co.classList.add('loading');
      try {
        const r = await fetch(`https://formsubmit.co/ajax/${S.email}`, { method: 'POST', headers: { Accept: 'application/json' }, body: fd });
        const j = await r.json().catch(() => ({}));
        if (!r.ok || String(j.success) === 'false') throw new Error('send');
        cart = {}; store.set(cart); renderCount(); renderDrawer();
        $('#co-wrap').innerHTML = `<div class="box done"><div class="tick"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5 10 17l9-10"/></svg></div>
          <h2>Thank you, ${esc(String(fd.get('name')).split(' ')[0])}!</h2><p style="color:var(--muted);max-width:480px;margin:0 auto">We’ve received your order for <b>${del ? 'delivery' : 'collection'} on ${esc(nice(d))}</b>. The team will call you on <b>${esc(fd.get('phone'))}</b> to confirm and take payment.</p>
          <div class="ref">${ref}</div><p style="color:var(--muted);font-size:.9rem">Questions? Call our order hotline <a href="${S.phoneHref}">${S.phone}</a>.</p><div class="btn-row" style="justify-content:center"><a class="btn" href="shop.html">Back to the shop</a></div></div>`;
        $('#co-wrap').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      } catch (err) {
        const body = []; fd.forEach((v, k) => { if (!k.startsWith('_') && typeof v === 'string') body.push(`${k.replace(/_/g, ' ')}: ${v}`); });
        status.className = 'status bad';
        status.innerHTML = `Sorry, we couldn’t send your order automatically. Please <a href="mailto:${S.email}?subject=${encodeURIComponent('Order ' + ref)}&body=${encodeURIComponent(body.join('\n'))}">email it to us</a> (it’s filled in for you) or call <a href="${S.phoneHref}">${S.phone}</a>.`;
        btn.disabled = false;
      } finally { co.classList.remove('loading'); }
    });
  }

  /* ---------- Contact form ---------- */
  $$('form[data-send]').forEach((form) => {
    const rules = { name: (v) => v.trim().length >= 2 || 'Please enter your name.', email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) || 'Please enter a valid email address.', message: (v) => v.trim().length >= 5 || 'Please tell us a little more.' };
    const fields = $$('[required]', form).filter((el) => rules[el.name]);
    const check = (el) => { const r = rules[el.name](el.value), box = el.closest('.f'), ok = r === true; box.classList.toggle('bad', !ok); $('.err', box).textContent = ok ? '' : r; return ok; };
    fields.forEach((el) => el.addEventListener('input', () => { if (el.closest('.f').classList.contains('bad')) check(el); }));
    const status = $('.status', form), b = $('button[type=submit]', form);
    form.addEventListener('submit', async (e) => {
      e.preventDefault(); if (form.elements._honey.value) return;
      if (fields.map(check).includes(false)) { status.className = 'status bad'; status.textContent = 'Please fix the highlighted fields and try again.'; return; }
      const fd = new FormData(form); fd.delete('_honey'); fd.append('_subject', `${form.dataset.send} from ${fd.get('name')} – website`); fd.append('_template', 'table'); fd.append('_captcha', 'false');
      b.disabled = true; form.classList.add('loading');
      try {
        const r = await fetch(`https://formsubmit.co/ajax/${S.email}`, { method: 'POST', headers: { Accept: 'application/json' }, body: fd });
        const j = await r.json().catch(() => ({})); if (!r.ok || String(j.success) === 'false') throw new Error('x');
        form.reset(); status.className = 'status ok'; status.innerHTML = `<strong>Thanks, ${esc(String(fd.get('name')).split(' ')[0])}!</strong> Your message has been sent. We’ll reply soon.`;
      } catch (err) { status.className = 'status bad'; status.innerHTML = `Sorry, that didn’t send. Please email <a href="mailto:${S.email}">${S.email}</a> or call <a href="${S.phoneHref}">${S.phone}</a>.`; }
      finally { b.disabled = false; form.classList.remove('loading'); }
    });
  });

  /* Hours: highlight today */
  const today = new Date().getDay();
  $$('.hours li[data-days]').forEach((li) => { if (li.dataset.days.split(',').map(Number).includes(today)) li.classList.add('today'); });

  function renderAll() { renderCount(); renderDrawer(); renderCheckout(); }
  renderAll();

  /* Cookie notice + year */
  const ck = $('.cookie');
  if (ck) {
    let seen = false; try { seen = localStorage.getItem('bb-cookie-ok') === '1'; } catch (e) {}
    if (!seen) ck.hidden = false;
    $('button', ck).addEventListener('click', () => { ck.hidden = true; try { localStorage.setItem('bb-cookie-ok', '1'); } catch (e) {} });
  }
  $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });
})();
