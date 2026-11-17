(() => {
  'use strict';
  const USER = 'bacoinz';
  const SELF = (USER + '.github.io').toLowerCase();
  const CACHE_KEY = 'baco-repos-v2';
  const LANG_KEY = 'baco-lang';
  const CACHE_MS = 10 * 60 * 1000;
  const SLIDE_MS = 1200;
  const IMG_RE = /\.(png|jpe?g|webp|gif)$/i;

  /* ---------- i18n ---------- */
  const I18N = {
    en: {
      alt: 'Portrait of Baco',
      tagline: 'A musician who does games and apps with the help of AI, for fun, for free ✌️',
      bio1: "Hi, I'm Rodrigo, better known as Baco on the internet and in the music world.",
      bio2: "I'm a nerdy musician who has always loved technology and turning my passions into random little creations. This AI era came along to fulfil my deepest wish: to create more, faster and better than ever.",
      bio3: 'Everything I make with AI is, and always will be, free (a few projects may have some ads here and there). I make it for people, not for personal gain.',
      bio4: "That said, if you'd like to support me with a small contribution, you can always buy me a coffee on Ko-fi ☕",
      kofi: 'Support me on Ko-fi',
      social: 'Social networks',
      music: 'My music',
      open: 'Open to everyone',
      made: "Things I've <span class=\"hl\">made</span>",
      all: 'All', apps: 'Apps', games: 'Games',
      loading: 'Loading projects…',
      empty: 'Nothing here yet.',
      footer: 'Made with AI, for fun, for free · © Baco',
      app: 'App', game: 'Game',
      goto: 'Go to', website: 'Website', pages: 'GitHub Pages', openapp: 'Open app', repo: 'GitHub repo', source: 'source code',
      close: 'Close', prev: 'Previous screenshot', next: 'Next screenshot', choose: 'choose where to go',
      cover: 'cover', shot: 'screenshot'
    },
    pt: {
      alt: 'Retrato do Baco',
      tagline: 'Um músico que faz jogos e apps com a ajuda da IA, por diversão e de graça ✌️',
      bio1: 'Olá, sou o Rodrigo, mais conhecido como Baco na internet e no mundo da música.',
      bio2: 'Sou um músico nerd que sempre teve paixão por tecnologia e por criar coisas aleatórias a partir das minhas paixões. Esta era da IA veio realizar o meu maior desejo: criar cada vez mais, e com mais eficiência e qualidade.',
      bio3: 'Tudo o que faço com IA é, e será sempre, gratuito (alguns projetos podem ter anúncios aqui e ali). Faço-o para as pessoas, não para ganho pessoal.',
      bio4: 'Ainda assim, se quiseres contribuir com um pequeno apoio, podes sempre oferecer-me um café no Ko-fi ☕',
      kofi: 'Apoia-me no Ko-fi',
      social: 'Redes sociais',
      music: 'A minha música',
      open: 'Aberto a todos',
      made: 'Coisas que <span class="hl">fiz</span>',
      all: 'Todos', apps: 'Apps', games: 'Jogos',
      loading: 'A carregar projetos…',
      empty: 'Ainda não há nada aqui.',
      footer: 'Feito com IA, por diversão e de graça · © Baco',
      app: 'App', game: 'Jogo',
      goto: 'Ir para', website: 'Site', pages: 'GitHub Pages', openapp: 'Abrir app', repo: 'Repositório GitHub', source: 'código-fonte',
      close: 'Fechar', prev: 'Screenshot anterior', next: 'Screenshot seguinte', choose: 'escolhe para onde ir',
      cover: 'capa', shot: 'screenshot'
    }
  };
  const PT_TZ = /^(Europe\/Lisbon|Atlantic\/(Azores|Madeira)|America\/(Sao_Paulo|Bahia|Belem|Fortaleza|Recife|Maceio|Araguaina|Santarem|Manaus|Boa_Vista|Porto_Velho|Cuiaba|Campo_Grande|Rio_Branco|Eirunepe|Noronha))$/;
  function detectLang() {
    try {
      const saved = localStorage.getItem(LANG_KEY);
      if (saved === 'en' || saved === 'pt') return saved;
    } catch { /* ignore */ }
    let tz = '';
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch { /* ignore */ }
    return PT_TZ.test(tz) ? 'pt' : 'en';
  }
  let lang = detectLang();
  const t = (k) => I18N[lang][k];

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

  /* ---------- static text ---------- */
  const tagline = document.getElementById('tagline');
  const bio = document.getElementById('bio');
  const langBtns = [...document.querySelectorAll('.lang button')];

  function applyStatic() {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach((n) => { n.textContent = t(n.dataset.i18n); });
    document.querySelectorAll('[data-i18n-html]').forEach((n) => { n.innerHTML = t(n.dataset.i18nHtml); });
    document.querySelectorAll('[data-i18n-alt]').forEach((n) => { n.alt = t(n.dataset.i18nAlt); });
    langBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
  }

  tagline.addEventListener('click', () => {
    const open = bio.classList.toggle('open');
    tagline.setAttribute('aria-expanded', String(open));
  });

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
  const grid = document.getElementById('grid');
  const tabs = [...document.querySelectorAll('.tabs button')];
  let projects = [];
  let cards = [];
  let filter = 'all';
  let openCard = null;

  function closeMenu() {
    if (openCard) { openCard.classList.remove('menu-open'); openCard = null; }
  }

  function destinations(p) {
    const pages = p.has_pages ? `https://${SELF}/${p.name}/` : '';
    const out = [];
    if (pages) out.push({ label: t('website'), hint: t('pages'), href: pages });
    const hp = p.homepage && p.homepage.replace(/\/?$/, '/') !== pages ? p.homepage : '';
    if (hp) out.push({ label: t('openapp'), hint: new URL(hp).hostname, href: hp });
    out.push({ label: t('repo'), hint: t('source'), href: `https://github.com/${USER}/${p.name}` });
    return out;
  }

  function avatar(name) {
    return el('span', 'ic av', esc(name.trim().charAt(0).toUpperCase()));
  }

  function buildCard(p) {
    const card = el('article', 'card');
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `${p.title}: ${t('choose')}`);
    card.dataset.cat = p.category;

    const media = el('div', 'media');
    const imgs = p.shots.map((n, i) => {
      const im = el('img', 's' + (i === 0 ? ' on' : ''));
      im.alt = i === 0 ? `${p.title} ${t('cover')}` : `${p.title} ${t('shot')} ${i + 1}`;
      im.decoding = 'async';
      const src = raw(p.name, p.branch, n);
      if (i === 0) {
        im.loading = 'lazy';
        // covers that are not 16:9 are shown whole instead of cropped
        const fit = () => { if (im.naturalWidth && Math.abs(im.naturalWidth / im.naturalHeight - 16 / 9) > 0.03) im.classList.add('fit'); };
        im.addEventListener('load', fit);
        im.src = src;
        if (im.complete) fit();
      } else { im.dataset.src = src; }
      media.appendChild(im);
      return im;
    });
    media.appendChild(el('span', 'badge', esc(p.category === 'game' ? t('game') : t('app'))));
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
        b.setAttribute('aria-label', d === 'l' ? t('prev') : t('next'));
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
    info.appendChild(el('p', 'desc', esc(lang === 'pt' && p.description_pt ? p.description_pt : p.description)));

    const menu = el('div', 'menu');
    menu.appendChild(el('div', 'mt', esc(t('goto'))));
    destinations(p).forEach((d) => {
      const a = el('a', '', `<span>${esc(d.label)}</span><small>${esc(d.hint)}</small>`);
      a.href = d.href; a.target = '_blank'; a.rel = 'noopener';
      a.addEventListener('click', (e) => e.stopPropagation());
      menu.appendChild(a);
    });
    const x = el('button', 'x', '×');
    x.type = 'button'; x.setAttribute('aria-label', t('close'));
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

  document.addEventListener('click', (e) => { if (openCard && !openCard.contains(e.target)) closeMenu(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && openCard) { const c = openCard; closeMenu(); c.focus(); } });

  function applyFilter(f) {
    filter = f;
    closeMenu();
    tabs.forEach((b) => b.setAttribute('aria-selected', String(b.dataset.f === f)));
    cards.forEach((c) => { c.hidden = !(f === 'all' || c.dataset.cat === f); });
  }
  tabs.forEach((b) => b.addEventListener('click', () => applyFilter(b.dataset.f)));

  function render() {
    closeMenu();
    grid.innerHTML = '';
    cards = [];
    if (!projects.length) { grid.appendChild(el('p', 'state', esc(t('empty')))); return; }
    projects.forEach((p) => { const c = buildCard(p); cards.push(c); grid.appendChild(c); });
    applyFilter(filter);
  }

  /* ---------- language switch ---------- */
  langBtns.forEach((b) => b.addEventListener('click', () => {
    if (b.dataset.lang === lang) return;
    lang = b.dataset.lang;
    try { localStorage.setItem(LANG_KEY, lang); } catch { /* ignore */ }
    applyStatic();
    if (projects.length) render();
  }));

  function buildPaths(names, cover) {
    const paths = names.map((n) => 'docs/screenshots/' + n);
    if (!cover) return paths;
    return [cover].concat(paths.filter((x) => x !== cover && !x.includes('/capa-')));
  }

  /* ---------- init ---------- */
  applyStatic();
  (async () => {
    let cfg = { overrides: {}, fallback: [] };
    try { cfg = await (await fetch('projects.json?v=' + Date.now(), { cache: 'no-store' })).json(); } catch { /* use empty */ }
    const data = await load(cfg);
    projects = data.map((r) => {
      const o = cfg.overrides[r.name] || {};
      if (o.hide) return null;
      return {
        ...r,
        title: o.title || r.name.replace(/[-_]/g, ' '),
        category: o.category || 'app',
        description: o.description || r.description || '',
        description_pt: o.description_pt || '',
        iconUrl: o.icon ? raw(r.name, r.branch || 'main', o.icon) : '',
        shots: buildPaths(r.shots || [], o.cover)
      };
    }).filter(Boolean);
    render();
  })();
})();
