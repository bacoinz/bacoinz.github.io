(() => {
  'use strict';
  const USER = 'bacoinz';
  const SELF = (USER + '.github.io').toLowerCase();
  const CACHE_KEY = 'baco-repos-v1';
  const CACHE_MS = 6 * 3600 * 1000;
  const SLIDE_MS = 1200;
  const IMG_RE = /\.(png|jpe?g|webp|gif)$/i;

  /* ---------- bio toggle ---------- */
  const tagline = document.getElementById('tagline');
  const bio = document.getElementById('bio');
  tagline.addEventListener('click', () => {
    const open = bio.classList.toggle('open');
    tagline.setAttribute('aria-expanded', String(open));
  });

  /* ---------- helpers ---------- */
  const el = (tag, cls, html) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const raw = (repo, branch, path) => `https://raw.githubusercontent.com/${USER}/${repo}/${branch}/${path}`;
  const store = {
    get() { try { return JSON.parse(localStorage.getItem(CACHE_KEY)); } catch { return null; } },
    set(v) { try { localStorage.setItem(CACHE_KEY, JSON.stringify(v)); } catch { /* ignore */ } }
  };

  /* ---------- data ---------- */
  function pickShots(files) {
    const names = files.filter((n) => IMG_RE.test(n)).sort();
    const cover = names.find((n) => /^cover\./i.test(n)) || names.find((n) => /^capa-.*-en\./i.test(n)) || names[0];
    const rest = names.filter((n) => n !== cover && !/^capa-/i.test(n) && !/-pt\./i.test(n));
    return (cover ? [cover] : []).concat(rest).slice(0, 7);
  }

  async function gh(url) {
    const r = await fetch(url, { headers: { Accept: 'application/vnd.github+json' } });
    if (!r.ok) throw new Error(r.status);
    return r.json();
  }

  async function fetchLive() {
    const repos = await gh(`https://api.github.com/users/${USER}/repos?per_page=100&sort=pushed`);
    const list = repos.filter((r) => !r.fork && !r.archived && !r.private && r.name.toLowerCase() !== SELF);
    return Promise.all(list.map(async (r) => {
      let shots = [];
      try {
        const files = await gh(`https://api.github.com/repos/${USER}/${r.name}/contents/docs/screenshots`);
        shots = pickShots(files.map((f) => f.name));
      } catch { /* no screenshots */ }
      return { name: r.name, branch: r.default_branch, has_pages: !!r.has_pages, homepage: r.homepage || '', description: r.description || '', shots };
    }));
  }

  async function load(cfg) {
    const cached = store.get();
    if (cached && Date.now() - cached.t < CACHE_MS && cached.data.length) return cached.data;
    try {
      const data = await fetchLive();
      if (data.length) { store.set({ t: Date.now(), data }); return data; }
    } catch { /* fall through */ }
    if (cached && cached.data.length) return cached.data;
    return cfg.fallback;
  }

  /* ---------- cards ---------- */
  const cards = [];
  let openCard = null;

  function closeMenu() {
    if (openCard) { openCard.classList.remove('menu-open'); openCard = null; }
  }

  function destinations(p) {
    const pages = p.has_pages ? `https://${SELF}/${p.name}/` : '';
    const out = [];
    if (pages) out.push({ label: 'Website', hint: 'GitHub Pages', href: pages });
    const hp = p.homepage && p.homepage.replace(/\/?$/, '/') !== pages ? p.homepage : '';
    if (hp) out.push({ label: 'Open app', hint: new URL(hp).hostname, href: hp });
    out.push({ label: 'GitHub repo', hint: 'source code', href: `https://github.com/${USER}/${p.name}` });
    return out;
  }

  function buildCard(p) {
    const card = el('article', 'card');
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `${p.title}: choose where to go`);
    card.dataset.cat = p.category;

    const media = el('div', 'media');
    const imgs = p.shots.map((n, i) => {
      const im = el('img', 's' + (i === 0 ? ' on' : ''));
      im.alt = i === 0 ? `${p.title} cover` : `${p.title} screenshot ${i + 1}`;
      im.decoding = 'async';
      const src = raw(p.name, p.branch, 'docs/screenshots/' + n);
      if (i === 0) { im.loading = 'lazy'; im.src = src; } else { im.dataset.src = src; }
      media.appendChild(im);
      return im;
    });
    media.appendChild(el('span', 'badge', p.category === 'game' ? 'Game' : 'App'));
    const dots = el('div', 'dots');
    p.shots.forEach((_, i) => dots.appendChild(el('i', i === 0 ? 'on' : '')));
    media.appendChild(dots);

    let idx = 0, timer = null;
    const show = (i) => {
      if (!imgs.length) return;
      idx = (i + imgs.length) % imgs.length;
      const im = imgs[idx];
      if (!im.src && im.dataset.src) im.src = im.dataset.src;
      imgs.forEach((x, k) => x.classList.toggle('on', k === idx));
      [...dots.children].forEach((d, k) => d.classList.toggle('on', k === idx));
    };
    const preload = () => imgs.forEach((im) => { if (!im.src && im.dataset.src) im.src = im.dataset.src; });
    const start = () => {
      if (timer || imgs.length < 2) return;
      preload();
      timer = setInterval(() => show(idx + 1), SLIDE_MS);
    };
    const stop = () => { clearInterval(timer); timer = null; show(0); };
    if (matchMedia('(hover:hover)').matches) {
      card.addEventListener('mouseenter', () => { card.classList.add('hover'); setTimeout(() => card.classList.contains('hover') && show(1), 250); start(); });
      card.addEventListener('mouseleave', () => { card.classList.remove('hover'); stop(); });
    }
    if (imgs.length > 1) {
      ['l', 'r'].forEach((d) => {
        const b = el('button', 'nav ' + d, d === 'l' ? '‹' : '›');
        b.type = 'button';
        b.setAttribute('aria-label', d === 'l' ? 'Previous screenshot' : 'Next screenshot');
        b.addEventListener('click', (e) => { e.stopPropagation(); preload(); show(idx + (d === 'l' ? -1 : 1)); });
        media.appendChild(b);
      });
    }

    const info = el('div', 'info');
    const title = el('div', 'title');
    if (p.iconUrl) {
      const ic = el('img', 'ic'); ic.alt = ''; ic.loading = 'lazy'; ic.src = p.iconUrl;
      ic.addEventListener('error', () => { ic.replaceWith(avatar(p.title)); });
      title.appendChild(ic);
    } else title.appendChild(avatar(p.title));
    title.appendChild(el('h3', '', esc(p.title)));
    info.appendChild(title);
    info.appendChild(el('p', 'desc', esc(p.description)));

    const menu = el('div', 'menu');
    menu.appendChild(el('div', 'mt', 'Go to'));
    destinations(p).forEach((d) => {
      const a = el('a', '', `<span>${esc(d.label)}</span><small>${esc(d.hint)}</small>`);
      a.href = d.href; a.target = '_blank'; a.rel = 'noopener';
      a.addEventListener('click', (e) => e.stopPropagation());
      menu.appendChild(a);
    });
    const x = el('button', 'x', '×');
    x.type = 'button'; x.setAttribute('aria-label', 'Close');
    x.addEventListener('click', (e) => { e.stopPropagation(); closeMenu(); card.focus(); });
    menu.appendChild(x);

    card.append(media, info, menu);
    const toggle = () => {
      const wasOpen = card.classList.contains('menu-open');
      closeMenu();
      if (!wasOpen) { card.classList.add('menu-open'); openCard = card; const a = menu.querySelector('a'); a && a.focus({ preventScroll: true }); }
    };
    card.addEventListener('click', toggle);
    card.addEventListener('keydown', (e) => {
      if (e.target === card && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); toggle(); }
    });
    return card;
  }

  function avatar(name) {
    return el('span', 'ic av', esc(name.trim().charAt(0).toUpperCase()));
  }

  document.addEventListener('click', (e) => { if (openCard && !openCard.contains(e.target)) closeMenu(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && openCard) { const c = openCard; closeMenu(); c.focus(); } });

  /* ---------- filters ---------- */
  const grid = document.getElementById('grid');
  const tabs = [...document.querySelectorAll('.tabs button')];
  function applyFilter(f) {
    closeMenu();
    tabs.forEach((t) => t.setAttribute('aria-selected', String(t.dataset.f === f)));
    cards.forEach((c) => { c.hidden = !(f === 'all' || c.dataset.cat === f); });
  }
  tabs.forEach((t) => t.addEventListener('click', () => applyFilter(t.dataset.f)));

  /* ---------- init ---------- */
  (async () => {
    let cfg = { overrides: {}, fallback: [] };
    try { cfg = await (await fetch('projects.json')).json(); } catch { /* use empty */ }
    const data = await load(cfg);
    const projects = data.map((r) => {
      const o = cfg.overrides[r.name] || {};
      if (o.hide) return null;
      return {
        ...r,
        title: o.title || r.name.replace(/[-_]/g, ' '),
        category: o.category || 'app',
        description: o.description || r.description || '',
        iconUrl: o.icon ? raw(r.name, r.branch || 'main', o.icon) : '',
        shots: r.shots && r.shots.length ? r.shots : []
      };
    }).filter(Boolean);

    grid.innerHTML = '';
    if (!projects.length) { grid.appendChild(el('p', 'state', 'Nothing here yet.')); return; }
    projects.forEach((p) => { const c = buildCard(p); cards.push(c); grid.appendChild(c); });
  })();
})();
