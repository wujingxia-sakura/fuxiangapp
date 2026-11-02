/* 浮想 · 应用
 * 本地优先：数据存在浏览器 localStorage 里。
 * 没有后端、没有账号、没有第三方请求。
 */
(function () {
  'use strict';

  const DATA = window.FUXIANG_DATA;
  const PARAMS = new URLSearchParams(location.search);
  const IS_DEMO = PARAMS.get('demo') === '1';
  const STORAGE_KEY = IS_DEMO ? 'fuxiang.demo.v1' : 'fuxiang.v1';
  const $ = function (sel, root) { return (root || document).querySelector(sel); };
  const $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  // ---------- 小工具 ----------

  function pad(n) { return String(n).padStart(2, '0'); }

  function dateKey(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function parseDateKey(key) {
    const p = key.split('-').map(Number);
    return new Date(p[0], p[1] - 1, p[2]);
  }

  function todayKey() { return dateKey(new Date()); }

  function formatDateLong(d) {
    const week = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
    return d.getFullYear() + ' 年 ' + (d.getMonth() + 1) + ' 月 ' + d.getDate() + ' 日 · 星期' + week;
  }

  function formatDateShort(key) {
    const d = parseDateKey(key);
    const week = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
    return (d.getMonth() + 1) + ' 月 ' + d.getDate() + ' 日 · 星期' + week;
  }

  function formatMonthTitle(y, m) { return y + ' 年 ' + (m + 1) + ' 月'; }

  function timeLabel(ts) {
    const d = new Date(ts);
    return pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  function dayStartTs(key) {
    const d = parseDateKey(key);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  }

  function dayEndTs(key) {
    const d = parseDateKey(key);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime();
  }

  function uid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'b-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  }

  function rand(min, max) { return min + Math.random() * (max - min); }
  function randInt(min, max) { return Math.floor(rand(min, max + 1)); }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function escapeAttr(str) { return escapeHtml(str); }

  function extractTags(text) {
    const tags = [];
    const re = /#([^\s#，。！？、,.!?;；:：]+)/g;
    let m;
    while ((m = re.exec(text))) {
      if (tags.indexOf(m[1]) === -1) tags.push(m[1]);
    }
    return tags.slice(0, 8);
  }

  function greetingForHour(h) {
    if (h < 5) return '夜还很深。';
    if (h < 8) return '天刚亮。';
    if (h < 12) return '上午好。';
    if (h < 14) return '午后。';
    if (h < 18) return '下午好。';
    if (h < 22) return '天暗下来了。';
    return '夜深了。';
  }

  function weatherColor(name) {
    const w = DATA.weatherMap[name];
    return w ? w.color : '#b0a89a';
  }

  function dominantWeather(day) {
    const segs = (day && day.segments) || [];
    if (!segs.length) return null;
    const totals = Object.create(null);
    segs.forEach(function (seg) {
      const end = seg.end || Math.min(dayEndTs(day.date), Math.max(seg.start, Date.now()));
      const dur = Math.max(1, end - seg.start);
      totals[seg.weather] = (totals[seg.weather] || 0) + dur;
    });
    let best = null;
    let bestDur = -1;
    Object.keys(totals).forEach(function (w) {
      if (totals[w] > bestDur) { best = w; bestDur = totals[w]; }
    });
    return best;
  }

  function weatherTrail(day) {
    const segs = (day && day.segments) || [];
    const seen = [];
    segs.forEach(function (s) { if (seen.indexOf(s.weather) === -1) seen.push(s.weather); });
    return seen.join(' → ');
  }

  function topFamilies(keys) {
    const counts = Object.create(null);
    keys.forEach(function (key) {
      const day = state.days[key];
      if (!day) return;
      const w = dominantWeather(day);
      if (!w) return;
      const info = DATA.weatherMap[w];
      if (!info) return;
      counts[info.family] = (counts[info.family] || 0) + 1;
    });
    return Object.keys(counts).map(function (f) { return [f, counts[f]]; })
      .sort(function (a, b) { return b[1] - a[1]; });
  }

  function summaryLine(keys) {
    const top = topFamilies(keys).slice(0, 4);
    if (!top.length) return '还没有天气记录。';
    return top.map(function (pair) {
      const fam = DATA.familyMap[pair[0]];
      return (fam ? fam.name : pair[0]) + ' ' + pair[1] + ' 天';
    }).join(' · ');
  }

  // ---------- 状态 ----------

  function defaultState() {
    return {
      version: 1,
      createdAt: Date.now(),
      days: {},
      bubbles: [],
      settings: { reducedMotion: false }
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.version !== 1 || !parsed.days || !Array.isArray(parsed.bubbles)) return defaultState();
      if (!parsed.settings) parsed.settings = { reducedMotion: false };
      return parsed;
    } catch (e) {
      return defaultState();
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      toast('保存失败：浏览器存储空间不足');
    }
  }

  let state = loadState();
  let currentView = 'today';
  let reviewMode = 'month';
  let reviewYear = new Date().getFullYear();
  let reviewMonth = new Date().getMonth();
  let activeSegmentId = null;
  let pickerTab = 'weather';
  let pickerFamily = 'clear';
  let pickerGroup = '全部';
  let deferredPrompt = null;
  let lastDeleted = null;
  let openDayKey = null;
  let lastDateKey = todayKey();
  let currentBubbleId = null;

  // ---------- 日期与段落 ----------

  function ensureDay(key) {
    key = key || todayKey();
    if (!state.days[key]) state.days[key] = { date: key, epigraph: '', segments: [] };
    if (!Array.isArray(state.days[key].segments)) state.days[key].segments = [];
    return state.days[key];
  }

  function defaultWeatherForHour(h) {
    if (h < 5) return '晴';
    if (h < 9) return '雾';
    if (h < 12) return '晴';
    if (h < 17) return '多云';
    if (h < 20) return '晴';
    return '晴';
  }

  function defaultSceneForHour(h) {
    if (h < 5) return '深夜便利店暖光';
    if (h < 9) return '晨雾森林';
    if (h < 17) return '花园';
    if (h < 20) return '海边灯塔黄昏';
    return '夏夜屋顶星空';
  }

  function ensureTodaySegment() {
    const key = todayKey();
    const day = ensureDay(key);
    if (!day.segments.length) {
      const now = Date.now();
      const h = new Date().getHours();
      const seg = {
        id: uid(),
        start: now,
        end: null,
        weather: defaultWeatherForHour(h),
        scene: defaultSceneForHour(h)
      };
      day.segments.push(seg);
      activeSegmentId = seg.id;
      saveState();
    }
    if (!activeSegmentId || !day.segments.some(function (s) { return s.id === activeSegmentId; })) {
      activeSegmentId = day.segments[day.segments.length - 1].id;
    }
    return day;
  }

  function currentSegment(day) {
    if (!day || !day.segments.length) return null;
    return day.segments.find(function (s) { return s.id === activeSegmentId; }) || day.segments[day.segments.length - 1];
  }

  function segmentEnd(seg, key) {
    if (seg.end) return seg.end;
    return Math.min(dayEndTs(key), Math.max(seg.start, Date.now()));
  }

  function updateSegment(patch) {
    const day = ensureTodaySegment();
    const seg = currentSegment(day);
    if (!seg) return null;
    const now = Date.now();
    const hasBubbles = state.bubbles.some(function (b) { return b.segmentId === seg.id; });
    const recent = now - seg.start < 10 * 60 * 1000;
    if (!hasBubbles && recent) {
      Object.assign(seg, patch);
      saveState();
      renderToday();
      return seg;
    }
    seg.end = now;
    const next = {
      id: uid(),
      start: now,
      end: null,
      weather: patch.weather || seg.weather,
      scene: patch.scene || seg.scene
    };
    day.segments.push(next);
    activeSegmentId = next.id;
    saveState();
    renderToday();
    return next;
  }

  // ---------- 场景渲染 ----------

  const RECIPE_PARTICLES = {
    petals: { type: 'petal', count: 24, size: [7, 14], dur: [9, 16] },
    fireflies: { type: 'firefly', count: 18, size: [3, 6], dur: [5, 10] },
    window: { type: 'raindrop', count: 55, size: [12, 26], dur: [0.7, 1.4] },
    rain: { type: 'raindrop', count: 80, size: [14, 30], dur: [0.5, 1.1] },
    fog: { type: 'mist', count: 8, size: [220, 420], dur: [14, 26] },
    stars: { type: 'star', count: 70, size: [1, 2.4], dur: [2, 5] },
    snow: { type: 'snowflake', count: 55, size: [2.5, 5], dur: [7, 14] },
    leaves: { type: 'leaf', count: 22, size: [8, 15], dur: [8, 15] },
    sea: { type: 'mist', count: 3, size: [300, 500], dur: [16, 26] },
    bridge: { type: 'raindrop', count: 50, size: [12, 26], dur: [0.6, 1.2] },
    steam: { type: 'mist', count: 8, size: [180, 320], dur: [10, 18] },
    reeds: { type: 'none', count: 0 },
    dust: { type: 'dust', count: 42, size: [2, 4], dur: [8, 18] },
    shop: { type: 'none', count: 0 },
    train: { type: 'streak', count: 20, size: [60, 150], dur: [1.5, 4] },
    rainbow: { type: 'none', count: 0 },
    fireworks: { type: 'firework', count: 10, size: [3, 4], dur: [3, 6] },
    rays: { type: 'ray', count: 6, size: [1, 3], dur: [6, 12] },
    roof: { type: 'star', count: 45, size: [1, 2.4], dur: [2, 5] },
    wheat: { type: 'none', count: 0 },
    station: { type: 'none', count: 0 },
    moonflowers: { type: 'firefly', count: 10, size: [3, 5], dur: [6, 12] }
  };

  function reducedMotion() {
    return !!(state.settings && state.settings.reducedMotion) ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function makeParticle(cfg) {
    const el = document.createElement('span');
    el.className = 'particle ' + cfg.type;
    const size = rand(cfg.size[0], cfg.size[1]);
    el.style.setProperty('--size', size.toFixed(1) + 'px');
    el.style.setProperty('--d', rand(cfg.dur[0], cfg.dur[1]).toFixed(2) + 's');
    el.style.setProperty('--delay', (-rand(0, 8)).toFixed(2) + 's');

    if (cfg.type === 'petal' || cfg.type === 'leaf') {
      el.style.setProperty('--x', rand(0, 100).toFixed(1) + '%');
      el.style.setProperty('--r', rand(-30, 30).toFixed(0) + 'deg');
    } else if (cfg.type === 'raindrop') {
      el.style.setProperty('--x', rand(0, 100).toFixed(1) + '%');
    } else if (cfg.type === 'snowflake') {
      el.style.setProperty('--x', rand(0, 100).toFixed(1) + '%');
    } else if (cfg.type === 'firefly') {
      el.style.setProperty('--x', rand(4, 96).toFixed(1) + '%');
      el.style.setProperty('--y', rand(18, 88).toFixed(1) + '%');
      el.style.setProperty('--dx', rand(-46, 46).toFixed(0) + 'px');
      el.style.setProperty('--dy', rand(-34, 34).toFixed(0) + 'px');
    } else if (cfg.type === 'star') {
      el.style.setProperty('--x', rand(0, 100).toFixed(1) + '%');
      el.style.setProperty('--y', rand(0, 72).toFixed(1) + '%');
    } else if (cfg.type === 'dust') {
      el.style.setProperty('--x', rand(0, 100).toFixed(1) + '%');
      el.style.setProperty('--y', rand(0, 100).toFixed(1) + '%');
      el.style.setProperty('--dx', rand(-24, 24).toFixed(0) + 'px');
      el.style.setProperty('--dy', rand(-24, 24).toFixed(0) + 'px');
    } else if (cfg.type === 'streak') {
      el.style.setProperty('--y', rand(8, 92).toFixed(1) + '%');
    } else if (cfg.type === 'mist') {
      el.style.setProperty('--x', rand(-12, 92).toFixed(1) + '%');
      el.style.setProperty('--y', rand(18, 82).toFixed(1) + '%');
    } else if (cfg.type === 'ray') {
      el.style.setProperty('--x', rand(0, 100).toFixed(1) + '%');
      el.style.setProperty('--r', rand(12, 26).toFixed(0) + 'deg');
    } else if (cfg.type === 'firework') {
      el.style.setProperty('--x', rand(8, 92).toFixed(1) + '%');
      el.style.setProperty('--y', rand(8, 58).toFixed(1) + '%');
    }
    return el;
  }

  const PROP_SVG = {
    pines: '<svg viewBox="0 0 1000 360" preserveAspectRatio="xMidYMax slice" aria-hidden="true"><g fill="currentColor"><path d="M40 360 L90 120 L140 360 Z"/><path d="M130 360 L190 70 L250 360 Z"/><path d="M230 360 L280 150 L330 360 Z"/><path d="M320 360 L380 90 L440 360 Z"/><path d="M420 360 L470 160 L520 360 Z"/><path d="M510 360 L570 60 L630 360 Z"/><path d="M610 360 L660 140 L710 360 Z"/><path d="M700 360 L760 80 L820 360 Z"/><path d="M800 360 L850 150 L900 360 Z"/><path d="M880 360 L940 100 L1000 360 Z"/></g></svg>',
    forest: '<svg viewBox="0 0 1000 420" preserveAspectRatio="xMidYMax slice" aria-hidden="true"><g fill="currentColor"><rect x="80" y="60" width="16" height="360"/><ellipse cx="88" cy="70" rx="70" ry="80"/><rect x="250" y="100" width="12" height="320"/><ellipse cx="256" cy="100" rx="60" ry="70"/><rect x="420" y="40" width="18" height="380"/><ellipse cx="429" cy="50" rx="80" ry="90"/><rect x="600" y="90" width="14" height="330"/><ellipse cx="607" cy="90" rx="65" ry="75"/><rect x="780" y="60" width="16" height="360"/><ellipse cx="788" cy="60" rx="72" ry="85"/><rect x="930" y="110" width="12" height="310"/><ellipse cx="936" cy="110" rx="55" ry="65"/></g></svg>',
    cherry: '<svg viewBox="0 0 1000 420" preserveAspectRatio="xMidYMax slice" aria-hidden="true"><g fill="currentColor"><path d="M120 420 L150 160 L180 420 Z"/><path d="M150 260 Q260 180 360 210" stroke="currentColor" stroke-width="10" fill="none"/><path d="M160 200 Q280 120 420 150" stroke="currentColor" stroke-width="8" fill="none"/><path d="M140 300 Q300 260 460 290" stroke="currentColor" stroke-width="7" fill="none"/></g><g fill="var(--accent)" opacity=".55"><circle cx="360" cy="190" r="26"/><circle cx="410" cy="140" r="20"/><circle cx="450" cy="220" r="24"/><circle cx="300" cy="150" r="18"/><circle cx="250" cy="230" r="22"/><circle cx="500" cy="180" r="18"/><circle cx="520" cy="280" r="16"/><circle cx="380" cy="290" r="20"/></g></svg>',
    ginkgo: '<svg viewBox="0 0 1000 420" preserveAspectRatio="xMidYMax slice" aria-hidden="true"><g fill="currentColor"><path d="M160 420 L190 120 L220 420 Z"/><path d="M190 220 Q320 160 470 180" stroke="currentColor" stroke-width="9" fill="none"/><path d="M190 280 Q340 240 520 260" stroke="currentColor" stroke-width="7" fill="none"/></g><g fill="var(--accent)" opacity=".6"><ellipse cx="470" cy="170" rx="90" ry="60"/><ellipse cx="360" cy="140" rx="70" ry="50"/><ellipse cx="560" cy="220" rx="80" ry="55"/><ellipse cx="300" cy="210" rx="60" ry="45"/><ellipse cx="640" cy="160" rx="55" ry="40"/></g></svg>',
    willow: '<svg viewBox="0 0 1000 420" preserveAspectRatio="xMinYMax slice" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"><path d="M120 420 L150 120"/><path d="M150 120 Q260 90 380 120"/><path d="M150 120 Q240 160 330 170"/><path d="M150 130 Q200 220 180 320"/><path d="M160 140 Q260 240 280 360"/><path d="M170 150 Q320 230 360 340"/><path d="M180 160 Q380 210 460 300"/><path d="M190 170 Q420 170 520 230"/></g></svg>',
    lotus: '<svg viewBox="0 0 1000 420" preserveAspectRatio="xMidYMax slice" aria-hidden="true"><g fill="currentColor" opacity=".8"><ellipse cx="250" cy="330" rx="110" ry="34"/><ellipse cx="520" cy="350" rx="130" ry="38"/><ellipse cx="760" cy="320" rx="100" ry="30"/><ellipse cx="380" cy="380" rx="140" ry="40"/></g><g fill="var(--accent)" opacity=".65"><path d="M250 330 q20 -70 0 -100 q-20 30 0 100"/><path d="M520 350 q24 -80 0 -120 q-24 40 0 120"/><path d="M760 320 q18 -60 0 -90 q-18 30 0 90"/></g></svg>',
    pagoda: '<svg viewBox="0 0 1000 420" preserveAspectRatio="xMidYMax slice" aria-hidden="true"><g fill="currentColor"><rect x="470" y="150" width="60" height="270"/><path d="M430 180 L500 120 L570 180 Z"/><path d="M410 240 L500 170 L590 240 Z"/><path d="M390 300 L500 220 L610 300 Z"/><path d="M370 360 L500 270 L630 360 Z"/><rect x="490" y="80" width="20" height="50"/></g></svg>'
  };

  function renderSceneLayer(layer, scene) {
    layer.dataset.recipe = scene.recipe;
    layer.dataset.scene = scene.name;
    layer.style.setProperty('--s1', scene.palette[0]);
    layer.style.setProperty('--s2', scene.palette[1]);
    layer.style.setProperty('--s3', scene.palette[2]);
    layer.style.setProperty('--accent', scene.accent);

    const far = layer.querySelector('.far');
    const mid = layer.querySelector('.mid');
    const near = layer.querySelector('.near');
    far.innerHTML = scene.far ? '<div class="prop ' + scene.far + '"></div>' : '';
    mid.innerHTML = scene.mid ? '<div class="prop ' + scene.mid + '"></div>' : '';
    near.innerHTML = scene.near ? '<div class="prop ' + scene.near + '"></div>' : '';

    if (scene.far && PROP_SVG[scene.far]) far.firstElementChild.innerHTML = PROP_SVG[scene.far];
    if (scene.mid && PROP_SVG[scene.mid]) mid.firstElementChild.innerHTML = PROP_SVG[scene.mid];
    if (scene.near && PROP_SVG[scene.near]) near.firstElementChild.innerHTML = PROP_SVG[scene.near];

    layer.querySelector('.celestial').innerHTML = scene.orb && scene.orb !== 'none' ? '<div class="orb ' + scene.orb + '"></div>' : '';
    layer.querySelector('.light').innerHTML = scene.beam && scene.beam !== 'none' ? '<div class="beam ' + scene.beam + '"></div>' : '';

    const photo = layer.querySelector('.photo');
    layer.classList.remove('has-photo');
    photo.classList.remove('loaded');
    photo.style.backgroundImage = 'none';
    if (scene.image) {
      const token = (layer._photoToken || 0) + 1;
      layer._photoToken = token;
      const img = new Image();
      img.decoding = 'async';
      img.onload = function () {
        if (layer._photoToken !== token) return;
        photo.style.backgroundImage = 'url("' + scene.image + '")';
        photo.classList.add('loaded');
        layer.classList.add('has-photo');
      };
      img.onerror = function () {
        if (layer._photoToken !== token) return;
        layer.classList.remove('has-photo');
      };
      img.src = scene.image;
    }

    const particles = layer.querySelector('.particles');
    particles.innerHTML = '';
    if (reducedMotion()) return;

    const cfg = RECIPE_PARTICLES[scene.recipe] || { type: 'none', count: 0 };
    if (!cfg.count) return;
    const mobile = window.matchMedia('(max-width: 520px)').matches;
    const base = scene.image ? 0.55 : 1;
    const count = Math.ceil(cfg.count * base * (mobile ? 0.65 : 1));
    const frag = document.createDocumentFragment();
    for (let i = 0; i < count; i++) frag.appendChild(makeParticle(cfg));
    particles.appendChild(frag);
  }

  function SceneView(host) {
    this.host = host;
    this.layers = [this.createLayer(), this.createLayer()];
    this.host.appendChild(this.layers[0]);
    this.host.appendChild(this.layers[1]);
    this.active = 0;
    this.currentScene = null;
    this.timer = null;
  }

  SceneView.prototype.createLayer = function () {
    const el = document.createElement('div');
    el.className = 'scene-layer';
    el.innerHTML = '<div class="sky"></div><div class="clouds"></div><div class="celestial"></div><div class="far"></div><div class="mid"></div><div class="near"></div><div class="light"></div><div class="photo"></div><div class="particles"></div><div class="haze"></div><div class="vignette"></div><div class="grain"></div>';
    return el;
  };

  SceneView.prototype.set = function (sceneName, immediate) {
    const scene = DATA.sceneMap[sceneName] || DATA.scenes[0];
    if (!scene) return;
    if (this.currentScene === scene.name && !immediate) return;
    this.currentScene = scene.name;

    const nextIndex = 1 - this.active;
    const next = this.layers[nextIndex];
    const prev = this.layers[this.active];

    renderSceneLayer(next, scene);

    if (immediate || reducedMotion()) {
      prev.classList.remove('active');
      next.classList.add('active');
      prev.querySelector('.particles').innerHTML = '';
      this.active = nextIndex;
      return;
    }

    next.classList.add('active');
    prev.classList.remove('active');
    const oldIndex = this.active;
    this.active = nextIndex;
    clearTimeout(this.timer);
    this.timer = setTimeout(function () {
      prev.querySelector('.particles').innerHTML = '';
    }, 2000);
  };

  // ---------- 渲染：今天 ----------

  const mainScene = new SceneView($('#sceneHost'));
  const daySceneView = new SceneView($('#daySceneHost'));

  function renderToday() {
    const day = ensureTodaySegment();
    const now = new Date();
    const week = ['日', '一', '二', '三', '四', '五', '六'][now.getDay()];
    $('#yearText').textContent = now.getFullYear() + ' 年';
    $('#weekText').textContent = '星期' + week;
    $('#dateMain').textContent = (now.getMonth() + 1) + ' 月 ' + now.getDate() + ' 日';
    $('#greeting').textContent = greetingForHour(now.getHours());

    const seg = currentSegment(day);
    if (seg) {
      mainScene.set(seg.scene);
      const s = DATA.sceneMap[seg.scene];
      $('#sceneCaption').textContent = s ? s.line : '';
    }

    renderChips(day);
    renderRibbon(day);
    renderTimeline(day);
  }

  function renderChips(day) {
    const seg = currentSegment(day);
    if (!seg) return;
    const w = DATA.weatherMap[seg.weather] || DATA.weathers[0];
    const s = DATA.sceneMap[seg.scene] || DATA.scenes[0];
    $('#weatherChip').innerHTML = '<span class="dot" style="--c:' + w.color + '"></span>' + escapeHtml(w.name);
    $('#weatherChip').title = '切换天气';
    $('#sceneChip').innerHTML = '<span class="dot" style="--c:' + s.accent + '"></span>' + escapeHtml(s.name);
    $('#sceneChip').title = s.line;
  }

  function renderRibbon(day) {
    const ribbon = $('#weatherRibbon');
    const segs = day.segments || [];
    if (!segs.length) {
      ribbon.innerHTML = '';
      ribbon.classList.add('is-empty');
      return;
    }
    const start = dayStartTs(day.date);
    const end = dayEndTs(day.date);
    const now = Date.now();
    const parts = segs.map(function (s) {
      const a = Math.max(s.start, start);
      const b = Math.min(s.end || Math.min(end, Math.max(s.start, now)), end);
      return { s: s, dur: Math.max(1, b - a) };
    });
    const total = parts.reduce(function (sum, p) { return sum + p.dur; }, 0) || 1;
    ribbon.innerHTML = parts.map(function (p) {
      const title = timeLabel(p.s.start) + ' · ' + p.s.weather + ' · ' + p.s.scene;
      return '<button class="ribbon-seg" data-seg="' + escapeAttr(p.s.id) + '" style="--c:' + weatherColor(p.s.weather) +
        ';flex-grow:' + (p.dur / total).toFixed(4) + '" title="' + escapeAttr(title) + '" aria-label="' + escapeAttr(title) + '"></button>';
    }).join('');
    ribbon.classList.remove('is-empty');
  }

  function bubbleHtml(b) {
    const w = DATA.weatherMap[b.weather] || { name: b.weather || '', color: '#b0a89a' };
    const s = DATA.sceneMap[b.scene] || { name: b.scene || '', accent: '#f2c07a' };
    const tags = (Array.isArray(b.tags) ? b.tags : []).map(function (t) {
      return '<span class="tag">#' + escapeHtml(t) + '</span>';
    }).join(' ');
    return '<article class="bubble" data-bubble="' + escapeAttr(b.id) + '" tabindex="0" role="button" aria-label="打开泡泡">' +
      '<div class="bubble-text">' + escapeHtml(b.text || '') + '</div>' +
      '<div class="bubble-foot">' +
      '<span class="bubble-dot" style="--c:' + w.color + '"></span>' +
      '<span>' + escapeHtml(w.name) + '</span>' +
      '<span>·</span>' +
      '<span>' + escapeHtml(s.name) + '</span>' +
      '<span>·</span>' +
      '<span>' + timeLabel(b.createdAt) + '</span>' +
      (tags ? '<span>·</span>' + tags : '') +
      '</div>' +
      '</article>';
  }

  function renderTimeline(day) {
    const timeline = $('#todayTimeline');
    const segs = day.segments || [];
    if (!segs.length) {
      timeline.innerHTML = '<div class="empty"><strong>今天还没有泡泡</strong>写一句，落进这场天气里。</div>';
      return;
    }
    const totalBubbles = state.bubbles.filter(function (b) { return b.dateKey === day.date; }).length;
    let html = '';
    segs.forEach(function (seg) {
      const bubbles = state.bubbles
        .filter(function (b) { return b.segmentId === seg.id; })
        .sort(function (a, b) { return a.createdAt - b.createdAt; });
      html += '<section class="segment" data-seg="' + escapeAttr(seg.id) + '">' +
        '<div class="segment-head">' +
        '<span class="segment-time">' + timeLabel(seg.start) + '</span>' +
        '<span class="segment-weather"><i class="weather-dot" style="--c:' + weatherColor(seg.weather) + '"></i>' + escapeHtml(seg.weather) + '</span>' +
        '<span class="segment-scene">' + escapeHtml(seg.scene) + '</span>' +
        '<span class="segment-line"></span>' +
        '</div>';
      if (bubbles.length) {
        html += '<div class="bubble-list">' + bubbles.map(bubbleHtml).join('') + '</div>';
      }
      html += '</section>';
    });
    if (!totalBubbles) {
      html += '<div class="empty"><strong>今天还没有泡泡</strong>写一句，落进这场天气里。</div>';
    }
    timeline.innerHTML = html;
  }

  // ---------- 泡泡输入 ----------

  function resizeInput() {
    const el = $('#bubbleInput');
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 150) + 'px';
  }

  function sendBubble() {
    const input = $('#bubbleInput');
    const text = input.value.trim();
    if (!text) return;
    const day = ensureTodaySegment();
    const seg = currentSegment(day);
    if (!seg) return;
    const bubble = {
      id: uid(),
      text: text,
      createdAt: Date.now(),
      dateKey: day.date,
      segmentId: seg.id,
      weather: seg.weather,
      scene: seg.scene,
      tags: extractTags(text)
    };
    state.bubbles.push(bubble);
    saveState();
    input.value = '';
    resizeInput();
    renderToday();
    requestAnimationFrame(function () {
      const el = document.querySelector('[data-bubble="' + bubble.id + '"]');
      if (el) {
        el.classList.add('fresh');
        el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    });
  }

  // ---------- 浮层滚动锁 ----------

  function syncScrollLock() {
    const open = ['#pickerOverlay', '#bubbleOverlay', '#searchOverlay', '#dayOverlay'].some(function (sel) {
      const el = $(sel);
      return el && !el.classList.contains('hidden');
    });
    document.body.style.overflow = open ? 'hidden' : '';
  }

  // ---------- 选择器 ----------

  function openPicker(tab) {
    pickerTab = tab || 'weather';
    const day = ensureTodaySegment();
    const seg = currentSegment(day);
    if (seg) {
      const w = DATA.weatherMap[seg.weather];
      if (w) pickerFamily = w.family;
    }
    $('#pickerOverlay').classList.remove('hidden');
    syncScrollLock();
    renderPicker();
  }

  function closePicker() {
    $('#pickerOverlay').classList.add('hidden');
    syncScrollLock();
  }

  function renderPicker() {
    const tabs = $$('#pickerTabs button');
    tabs.forEach(function (b) { b.classList.toggle('active', b.dataset.tab === pickerTab); });
    const body = $('#pickerBody');
    if (pickerTab === 'weather') {
      const day = ensureTodaySegment();
      const seg = currentSegment(day);
      const currentWeather = seg ? seg.weather : null;
      const family = DATA.familyMap[pickerFamily] || DATA.families[0];
      const variants = DATA.weathers.filter(function (w) { return w.family === family.id; });

      body.innerHTML =
        '<div class="family-grid">' + DATA.families.map(function (f) {
          return '<button class="family-btn' + (f.id === pickerFamily ? ' active' : '') + '" data-family="' + f.id + '" style="--c:' + f.color + '">' +
            '<span class="family-icon">' + f.icon + '</span><span>' + f.name + '</span></button>';
        }).join('') + '</div>' +
        '<div class="variant-grid">' + variants.map(function (w) {
          return '<button class="variant-btn' + (w.name === currentWeather ? ' active' : '') + '" data-weather="' + escapeAttr(w.name) + '" style="--c:' + w.color + '">' + w.name + '</button>';
        }).join('') + '</div>' +
        '<p class="hint">' + escapeHtml(family.name) + ' · ' + variants.length + ' 种。选一个，天就变了。</p>';
      return;
    }

    const day = ensureTodaySegment();
    const seg = currentSegment(day);
    const currentScene = seg ? seg.scene : null;
    const scenes = pickerGroup === '全部' ? DATA.scenes : DATA.scenes.filter(function (s) { return s.group === pickerGroup; });
    body.innerHTML =
      '<div class="scene-group-row">' + DATA.groups.map(function (g) {
        return '<button class="group-chip' + (g === pickerGroup ? ' active' : '') + '" data-group="' + escapeAttr(g) + '">' + g + '</button>';
      }).join('') + '</div>' +
      '<div class="scene-grid">' + scenes.map(function (s) {
        return '<button class="scene-card' + (s.name === currentScene ? ' active' : '') + '" data-scene="' + escapeAttr(s.name) + '" style="--s1:' + s.palette[0] + ';--s2:' + s.palette[1] + ';--accent:' + s.accent + ';background-image:url(\'' + (s.thumb || '') + '\')">' +
          '<span class="scene-name">' + escapeHtml(s.name) + '</span>' +
          '<span class="scene-line">' + escapeHtml(s.line) + '</span>' +
          '</button>';
      }).join('') + '</div>';
  }

  function chooseWeather(name) {
    updateSegment({ weather: name });
    closePicker();
  }

  function chooseScene(name) {
    updateSegment({ scene: name });
    closePicker();
  }

  // ---------- 回顾 ----------

  function showView(name) {
    currentView = name;
    $('#viewToday').classList.toggle('hidden', name !== 'today');
    $('#viewReview').classList.toggle('hidden', name !== 'review');
    $('#viewSettings').classList.toggle('hidden', name !== 'settings');

    let hash = '#/';
    if (name === 'review') hash = reviewMode === 'year' ? '#/review/year' : '#/review';
    if (name === 'settings') hash = '#/settings';
    if (location.hash !== hash) {
      try { history.replaceState(null, '', hash); }
      catch (e) { location.hash = hash; }
    }

    if (name === 'today') renderToday();
    if (name === 'review') renderReview();
    if (name === 'settings') renderSettings();
    window.scrollTo(0, 0);
  }

  function renderReview() {
    $$('#reviewTabs button').forEach(function (b) {
      b.classList.toggle('active', b.dataset.review === reviewMode);
    });
    if (reviewMode === 'year') renderYear();
    else renderMonth();
  }

  function renderMonth() {
    const y = reviewYear;
    const m = reviewMonth;
    const first = new Date(y, m, 1);
    const start = (first.getDay() + 6) % 7;
    const days = new Date(y, m + 1, 0).getDate();
    const keys = [];
    for (let d = 1; d <= days; d++) keys.push(y + '-' + pad(m + 1) + '-' + pad(d));

    const top = topFamilies(keys);
    const bar = top.map(function (pair) {
      const fam = DATA.familyMap[pair[0]];
      return '<span class="climate-seg" style="--c:' + (fam ? fam.color : '#fff') + ';flex-grow:' + pair[1] + '"></span>';
    }).join('');
    const legend = top.slice(0, 4).map(function (pair) {
      const fam = DATA.familyMap[pair[0]];
      return '<span class="legend-dot"><i style="--c:' + (fam ? fam.color : '#fff') + '"></i>' + (fam ? fam.name : pair[0]) + ' ' + pair[1] + '</span>';
    }).join('');

    let cells = '';
    for (let i = 0; i < start; i++) cells += '<span class="day-cell is-blank" aria-hidden="true"></span>';
    for (let d = 1; d <= days; d++) {
      const key = y + '-' + pad(m + 1) + '-' + pad(d);
      const day = state.days[key];
      const segs = (day && day.segments) || [];
      const dom = dominantWeather(day);
      const tint = dom ? weatherColor(dom) : 'transparent';
      const isToday = key === todayKey();
      const hasData = segs.length > 0;
      const summary = dom ? weatherTrail(day) : '没有记录';
      cells += '<button class="day-cell' + (hasData ? '' : ' is-empty') + (isToday ? ' is-today' : '') +
        '" data-date="' + key + '"' + (hasData ? '' : ' disabled') +
        ' aria-label="' + escapeAttr(formatDateShort(key) + '，' + summary) + '">' +
        '<span class="day-tint" style="--tint:' + tint + '"></span>' +
        '<span class="day-num">' + d + '</span>' +
        '<span class="mini-ribbon">' + segs.map(function (s) {
          return '<i class="mini-seg" style="--c:' + weatherColor(s.weather) + '"></i>';
        }).join('') + '</span>' +
        '</button>';
    }

    $('#reviewContent').innerHTML =
      '<div class="review-head">' +
      '<div class="review-title">' + formatMonthTitle(y, m) + '</div>' +
      '<div class="review-nav">' +
      '<button class="icon-btn" data-nav="prev" aria-label="上个月"><svg class="icon"><use href="#i-back"></use></svg></button>' +
      '<button class="icon-btn" data-nav="next" aria-label="下个月"><svg class="icon flip"><use href="#i-back"></use></svg></button>' +
      '</div>' +
      '</div>' +
      '<div class="climate-bar">' + bar + '</div>' +
      '<div class="review-summary">' + escapeHtml(summaryLine(keys)) + '</div>' +
      '<div class="year-legend">' + legend + '</div>' +
      '<div class="weekdays">' + ['一', '二', '三', '四', '五', '六', '日'].map(function (w) { return '<span>' + w + '</span>'; }).join('') + '</div>' +
      '<div class="month-grid">' + cells + '</div>';
  }

  function renderYear() {
    const y = reviewYear;
    const keys = [];
    for (let m = 0; m < 12; m++) {
      const days = new Date(y, m + 1, 0).getDate();
      for (let d = 1; d <= days; d++) keys.push(y + '-' + pad(m + 1) + '-' + pad(d));
    }

    const top = topFamilies(keys);
    const legend = top.slice(0, 4).map(function (pair) {
      const fam = DATA.familyMap[pair[0]];
      return '<span class="legend-dot"><i style="--c:' + (fam ? fam.color : '#fff') + '"></i>' + (fam ? fam.name : pair[0]) + ' ' + pair[1] + '</span>';
    }).join('');

    const isLeap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
    const totalDays = isLeap ? 366 : 365;
    const step = 360 / totalDays;
    let angle = 0;
    const stops = [];
    for (let m = 0; m < 12; m++) {
      const days = new Date(y, m + 1, 0).getDate();
      for (let d = 1; d <= days; d++) {
        const key = y + '-' + pad(m + 1) + '-' + pad(d);
        const dom = dominantWeather(state.days[key]);
        const color = dom ? weatherColor(dom) : 'rgba(244,239,230,.08)';
        stops.push(color + ' ' + angle.toFixed(2) + 'deg ' + (angle + step).toFixed(2) + 'deg');
        angle += step;
      }
    }
    const topName = top.length ? (DATA.familyMap[top[0][0]] || {}).name : '';
    const wheel = '<div class="year-wheel" style="background-image: conic-gradient(' + stops.join(',') + ')">' +
      '<div class="year-wheel-hole">' +
      '<span class="year-wheel-year">' + y + '</span>' +
      '<span class="year-wheel-sub">' + (topName ? topName + '最多' : '还没有天气') + '</span>' +
      '</div></div>';

    let months = '';
    for (let m = 0; m < 12; m++) {
      const days = new Date(y, m + 1, 0).getDate();
      const monthKeys = [];
      for (let d = 1; d <= days; d++) monthKeys.push(y + '-' + pad(m + 1) + '-' + pad(d));
      const mtop = topFamilies(monthKeys);
      const mtotal = mtop.reduce(function (s, p) { return s + p[1]; }, 0);
      const bars = mtop.map(function (pair) {
        const fam = DATA.familyMap[pair[0]];
        return '<i style="--c:' + (fam ? fam.color : '#fff') + ';flex-grow:' + pair[1] + '"></i>';
      }).join('');
      months += '<button class="year-month-card" data-month="' + m + '">' +
        '<span class="year-month-name">' + (m + 1) + ' 月</span>' +
        '<span class="year-month-bar">' + bars + '</span>' +
        '<span class="year-month-count">' + (mtotal ? mtotal + ' 天' : '—') + '</span>' +
        '</button>';
    }

    $('#reviewContent').innerHTML =
      '<div class="review-head">' +
      '<div class="review-title">' + y + ' 年</div>' +
      '<div class="review-nav">' +
      '<button class="icon-btn" data-nav="prev" aria-label="上一年"><svg class="icon"><use href="#i-back"></use></svg></button>' +
      '<button class="icon-btn" data-nav="next" aria-label="下一年"><svg class="icon flip"><use href="#i-back"></use></svg></button>' +
      '</div>' +
      '</div>' +
      '<div class="review-summary">' + escapeHtml(summaryLine(keys)) + '</div>' +
      '<div class="year-legend">' + legend + '</div>' +
      wheel +
      '<div class="year-months">' + months + '</div>';
  }

  function changeMonth(delta) {
    reviewMonth += delta;
    if (reviewMonth < 0) { reviewMonth = 11; reviewYear--; }
    if (reviewMonth > 11) { reviewMonth = 0; reviewYear++; }
    renderReview();
  }

  function changeYear(delta) {
    reviewYear += delta;
    renderReview();
  }

  // ---------- 某一天 ----------

  function openDay(key) {
    const day = state.days[key];
    if (!day) return;
    openDayKey = key;
    const segs = day.segments || [];
    const dom = dominantWeather(day);
    let sceneName = segs.length ? segs[0].scene : null;
    if (!sceneName && dom) {
      const w = DATA.weatherMap[dom];
      if (w && w.scenes && w.scenes[0]) sceneName = w.scenes[0];
    }
    const scene = DATA.sceneMap[sceneName] || DATA.scenes[0];
    daySceneView.set(scene.name, true);

    $('#dayTitle').textContent = formatDateShort(key);
    $('#daySub').textContent = (dom ? weatherTrail(day) : '没有天气记录') + (segs.length ? ' · ' + segs.length + ' 段' : '');
    $('#daySceneLine').textContent = scene.line || '';

    const epigraph = '<div class="epigraph-wrap">' +
      '<label class="epigraph-label" for="epigraphInput">题记</label>' +
      '<input id="epigraphInput" class="epigraph-input" type="text" maxlength="80" placeholder="给这一天写一句题记…" value="' + escapeAttr(day.epigraph || '') + '">' +
      '</div>';

    let body = epigraph;
    if (!segs.length) {
      body += '<div class="empty"><strong>这一天没有天气</strong>也许那天，你只是路过。</div>';
    } else {
      body += '<div class="day-ribbon">' + segs.map(function (s) {
        return '<span class="day-seg" style="--c:' + weatherColor(s.weather) + '" title="' + escapeAttr(timeLabel(s.start) + ' · ' + s.weather + ' · ' + s.scene) + '"></span>';
      }).join('') + '</div>';

      segs.forEach(function (seg) {
        const bubbles = state.bubbles
          .filter(function (b) { return b.segmentId === seg.id; })
          .sort(function (a, b) { return a.createdAt - b.createdAt; });
        body += '<section class="segment">' +
          '<div class="segment-head">' +
          '<span class="segment-time">' + timeLabel(seg.start) + '</span>' +
          '<span class="segment-weather"><i class="weather-dot" style="--c:' + weatherColor(seg.weather) + '"></i>' + escapeHtml(seg.weather) + '</span>' +
          '<span class="segment-scene">' + escapeHtml(seg.scene) + '</span>' +
          '<span class="segment-line"></span>' +
          '</div>' +
          (bubbles.length ? '<div class="bubble-list">' + bubbles.map(bubbleHtml).join('') + '</div>' : '') +
          '</section>';
      });

      if (!state.bubbles.some(function (b) { return b.dateKey === key; })) {
        body += '<div class="empty"><strong>这一天没有泡泡</strong>只有天气，也算来过。</div>';
      }
    }

    $('#dayBody').innerHTML = body;
    $('#dayOverlay').classList.remove('hidden');
    syncScrollLock();
  }

  function closeDay() {
    $('#dayOverlay').classList.add('hidden');
    openDayKey = null;
    syncScrollLock();
  }

  // ---------- 泡泡详情 ----------

  function openBubble(id) {
    const b = state.bubbles.find(function (x) { return x.id === id; });
    if (!b) return;
    currentBubbleId = id;
    const w = DATA.weatherMap[b.weather] || { name: b.weather || '' };
    const s = DATA.sceneMap[b.scene] || { name: b.scene || '' };
    $('#bubbleMeta').textContent = b.dateKey + ' ' + timeLabel(b.createdAt) + ' · ' + w.name + ' · ' + s.name;
    renderBubbleBody(b);
    $('#bubbleOverlay').classList.remove('hidden');
    syncScrollLock();
  }

  function renderBubbleBody(b) {
    const tags = (Array.isArray(b.tags) ? b.tags : []).map(function (t) { return '<span class="tag">#' + escapeHtml(t) + '</span>'; }).join(' ');
    $('#bubbleBody').innerHTML =
      '<div class="bubble-text">' + escapeHtml(b.text || '') + '</div>' +
      (tags ? '<div class="bubble-foot">' + tags + '</div>' : '') +
      '<div class="bubble-actions">' +
      '<button class="btn" data-act="edit">编辑</button>' +
      '<button class="btn" data-act="copy">复制</button>' +
      '<button class="btn danger-btn" data-act="delete">戳破</button>' +
      '</div>';
  }

  function editBubble(id) {
    const b = state.bubbles.find(function (x) { return x.id === id; });
    if (!b) return;
    $('#bubbleBody').innerHTML =
      '<textarea id="editBubbleText" class="edit-bubble-text" rows="6">' + escapeHtml(b.text) + '</textarea>' +
      '<div class="bubble-actions">' +
      '<button class="btn" data-act="save" data-id="' + escapeAttr(b.id) + '">保存</button>' +
      '<button class="btn" data-act="cancel">取消</button>' +
      '</div>';
    const ta = $('#editBubbleText');
    if (ta) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }
  }

  function saveBubbleEdit(id) {
    const b = state.bubbles.find(function (x) { return x.id === id; });
    const ta = $('#editBubbleText');
    if (!b || !ta) return;
    const text = ta.value.trim();
    if (!text) return;
    b.text = text;
    b.tags = extractTags(text);
    b.updatedAt = Date.now();
    saveState();
    closeBubble();
    refreshAll();
    toast('改好了');
  }

  function deleteBubble(id) {
    const idx = state.bubbles.findIndex(function (x) { return x.id === id; });
    if (idx < 0) return;
    const removed = state.bubbles.splice(idx, 1)[0];
    lastDeleted = { bubble: removed, index: idx };
    saveState();
    closeBubble();
    refreshAll();
    toast('戳破了一颗泡泡', '撤销', function () {
      if (!lastDeleted) return;
      state.bubbles.splice(lastDeleted.index, 0, lastDeleted.bubble);
      lastDeleted = null;
      saveState();
      refreshAll();
    });
  }

  function closeBubble() {
    $('#bubbleOverlay').classList.add('hidden');
    syncScrollLock();
  }

  function refreshAll() {
    if (currentView === 'today') renderToday();
    if (currentView === 'review') renderReview();
    if (openDayKey) openDay(openDayKey);
  }

  // ---------- 搜索 ----------

  function openSearch() {
    $('#searchOverlay').classList.remove('hidden');
    syncScrollLock();
    const input = $('#searchInput');
    input.value = '';
    renderSearch('');
    setTimeout(function () { input.focus(); }, 60);
  }

  function closeSearch() {
    $('#searchOverlay').classList.add('hidden');
    syncScrollLock();
  }

  function renderSearch(q) {
    const query = (q || '').trim().toLowerCase();
    let items;
    if (!query) {
      items = state.bubbles.slice().sort(function (a, b) { return b.createdAt - a.createdAt; }).slice(0, 12);
    } else {
      items = state.bubbles.filter(function (b) {
        const text = (b.text || '').toLowerCase();
        const tags = Array.isArray(b.tags) ? b.tags : [];
        return text.indexOf(query) !== -1 ||
          tags.some(function (t) { return String(t).toLowerCase().indexOf(query) !== -1; });
      }).sort(function (a, b) { return b.createdAt - a.createdAt; }).slice(0, 50);
    }

    if (!items.length) {
      $('#searchResults').innerHTML = '<div class="empty"><strong>没有找到</strong>也许它换了个说法。</div>';
      return;
    }

    $('#searchResults').innerHTML = (query ? '' : '<p class="hint">最近</p>') + items.map(function (b) {
      const full = b.text || '';
      let text = full;
      if (query && text.length > 120) {
        const i = text.toLowerCase().indexOf(query);
        const start = Math.max(0, i - 40);
        text = (start > 0 ? '…' : '') + text.slice(start, start + 120) + (start + 120 < full.length ? '…' : '');
      } else if (text.length > 160) {
        text = text.slice(0, 160) + '…';
      }
      const w = DATA.weatherMap[b.weather] || { name: b.weather || '' };
      return '<button class="search-item" data-bubble="' + escapeAttr(b.id) + '">' +
        '<div class="search-item-text">' + escapeHtml(text) + '</div>' +
        '<div class="search-item-meta">' + (b.dateKey || '') + ' · ' + escapeHtml(w.name) + ' · ' + escapeHtml(b.scene || '') + '</div>' +
        '</button>';
    }).join('');
  }

  // ---------- 设置 ----------

  function renderSettings() {
    const toggle = $('#reduceMotion');
    if (toggle) toggle.checked = !!(state.settings && state.settings.reducedMotion);
    const hint = $('#installHint');
    if (!hint) return;
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
      hint.textContent = '已经是一个 App 了。';
    } else if (deferredPrompt) {
      hint.textContent = '点击上面的按钮安装。';
    } else {
      hint.textContent = '如果浏览器没有弹出安装，请用菜单里的“添加到主屏幕”。';
    }
  }

  function applyReducedMotion() {
    const on = !!(state.settings && state.settings.reducedMotion);
    document.documentElement.dataset.reduce = on ? '1' : '0';
  }

  // ---------- 导出 / 导入 ----------

  function download(filename, text, mime) {
    const blob = new Blob([text], { type: mime || 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function exportMarkdown() {
    const lines = ['# 浮想', ''];
    const keys = Object.keys(state.days).sort();
    if (!keys.length) {
      lines.push('还没有记录。');
    }
    keys.forEach(function (key) {
      const day = state.days[key];
      const segs = (day.segments || []).slice().sort(function (a, b) { return a.start - b.start; });
      lines.push('## ' + key + ' · ' + formatDateShort(key).split(' · ')[1]);
      if (day.epigraph) lines.push('', '> ' + day.epigraph);
      if (!segs.length) {
        lines.push('', '（这一天没有天气记录）');
      }
      segs.forEach(function (seg) {
        lines.push('', '### ' + timeLabel(seg.start) + ' · ' + seg.weather + ' · ' + seg.scene);
        const bubbles = state.bubbles
          .filter(function (b) { return b.segmentId === seg.id; })
          .sort(function (a, b) { return a.createdAt - b.createdAt; });
        bubbles.forEach(function (b) {
          lines.push('', b.text);
          if (b.tags && b.tags.length) lines.push('', b.tags.map(function (t) { return '#' + t; }).join(' '));
        });
      });
      lines.push('', '---');
    });
    download('浮想-' + todayKey() + '.md', lines.join('\n'), 'text/markdown;charset=utf-8');
    toast('已导出 Markdown');
  }

  function exportJson() {
    download('浮想-' + todayKey() + '.json', JSON.stringify(state, null, 2), 'application/json;charset=utf-8');
    toast('已导出 JSON');
  }

  function importJsonFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function () {
      try {
        const data = JSON.parse(String(reader.result));
        if (!data || data.version !== 1 || !data.days || !Array.isArray(data.bubbles)) {
          toast('这个文件不像浮想的备份');
          return;
        }
        if (!confirm('导入会覆盖当前数据，继续？')) return;
        state = data;
        if (!state.settings) state.settings = { reducedMotion: false };
        state.bubbles.forEach(function (b) { if (!Array.isArray(b.tags)) b.tags = extractTags(b.text || ''); });
        activeSegmentId = null;
        lastDateKey = todayKey();
        saveState();
        applyReducedMotion();
        ensureTodaySegment();
        renderToday();
        if (currentView === 'review') renderReview();
        toast('导入完成');
      } catch (e) {
        toast('导入失败：文件格式不对');
      }
    };
    reader.readAsText(file);
  }

  // ---------- Toast ----------

  let toastTimer = null;

  function toast(message, actionLabel, action) {
    const el = $('#toast');
    el.innerHTML = '<span>' + escapeHtml(message) + '</span>' +
      (actionLabel ? '<button id="toastAction">' + escapeHtml(actionLabel) + '</button>' : '');
    el.classList.remove('hidden');
    if (actionLabel) {
      const btn = $('#toastAction');
      if (btn) btn.onclick = function () { action(); hideToast(); };
    }
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, 5000);
  }

  function hideToast() {
    $('#toast').classList.add('hidden');
  }

  // ---------- 演示数据 ----------

  function seedDemo() {
    if (state.bubbles.length) return;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const y = today.getFullYear();
    const m = today.getMonth();
    const d = today.getDate();

    function addDay(offset, segments, bubbles) {
      const date = new Date(y, m, d + offset);
      const key = dateKey(date);
      const day = { date: key, epigraph: '', segments: [] };
      segments.forEach(function (s, i) {
        const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), s.h, s.min || 0).getTime();
        const next = segments[i + 1];
        const end = next ? new Date(date.getFullYear(), date.getMonth(), date.getDate(), next.h, next.min || 0).getTime() : null;
        day.segments.push({ id: uid(), start: start, end: end, weather: s.w, scene: s.sc });
      });
      state.days[key] = day;
      (bubbles || []).forEach(function (b, i) {
        const seg = day.segments[Math.min(typeof b.seg === 'number' ? b.seg : 0, day.segments.length - 1)];
        state.bubbles.push({
          id: uid(),
          text: b.text,
          createdAt: seg.start + (i + 1) * 60000,
          dateKey: key,
          segmentId: seg.id,
          weather: seg.weather,
          scene: seg.scene,
          tags: extractTags(b.text)
        });
      });
    }

    addDay(0, [
      { h: 9, min: 12, w: '晴', sc: '花园' },
      { h: 11, min: 40, w: '多云', sc: '芦苇荡晚风' }
    ], [
      { text: '想把「浮想」做成一个不用表演的地方。打开就写，写完就忘，偶尔回头看。', seg: 0 },
      { text: '今天忽然觉得，产品里最贵的不是功能，是克制。#产品', seg: 0 },
      { text: '窗外的芦苇一层一层地低下去。这个画面应该被记住。#灵感', seg: 1 }
    ]);

    addDay(-1, [
      { h: 21, min: 10, w: '小雨', sc: '雨夜路灯' }
    ], [
      { text: '雨把路灯照成了一条一条的线。走回家的路上，什么都不想说。' }
    ]);

    addDay(-3, [
      { h: 7, min: 30, w: '雾', sc: '晨雾森林' }
    ], [
      { text: '早上的雾很大，树只露出一点点轮廓。忽然觉得，很多事情看不清也没关系。' }
    ]);

    const lastMonth = new Date(y, m - 1, Math.min(d, 28));
    addDay(-Math.round((today - lastMonth) / 86400000), [
      { h: 19, min: 20, w: '阴', sc: '古镇石桥烟雨' }
    ], [
      { text: '桥下的水把整条街的灯都揉皱了。' }
    ]);

    const lastYear = new Date(y - 1, m, d);
    addDay(-Math.round((today - lastYear) / 86400000), [
      { h: 22, min: 5, w: '晴', sc: '夏夜屋顶星空' }
    ], [
      { text: '去年的今天，我也在屋顶上看星星。那时候还没想好要做浮想。' }
    ]);

    // 给回顾视图一点天气纹理：过去 45 天，每天一段天气
    const demoWeathers = [
      ['晴', '花园'], ['多云', '芦苇荡晚风'], ['小雨', '雨夜路灯'], ['雾', '晨雾森林'],
      ['阴', '老书店午后光尘'], ['小雪', '雪中路灯'], ['晴', '海边灯塔黄昏'], ['阵雨', '雨后天台彩虹']
    ];
    for (let off = 1; off <= 45; off++) {
      const date = new Date(y, m, d - off);
      const key = dateKey(date);
      if (state.days[key]) continue;
      const pair = demoWeathers[off % demoWeathers.length];
      state.days[key] = {
        date: key,
        epigraph: '',
        segments: [{ id: uid(), start: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 8 + (off % 8), 0).getTime(), end: null, weather: pair[0], scene: pair[1] }]
      };
    }

    saveState();
  }

  // ---------- 事件 ----------

  function bindEvents() {
    $('#sendBtn').addEventListener('click', sendBubble);

    const input = $('#bubbleInput');
    input.addEventListener('input', resizeInput);
    input.addEventListener('keydown', function (e) {
      if (e.isComposing || e.keyCode === 229) return;
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendBubble();
      }
    });

    $('#weatherChip').addEventListener('click', function () { openPicker('weather'); });
    $('#sceneChip').addEventListener('click', function () { openPicker('scene'); });

    $('#reviewBtn').addEventListener('click', function () { showView('review'); });
    $('#settingsBtn').addEventListener('click', function () { showView('settings'); });
    $('#settingsBtn2').addEventListener('click', function () { showView('settings'); });
    $('#reviewBack').addEventListener('click', function () { showView('today'); });
    $('#settingsBack').addEventListener('click', function () { showView('today'); });
    $('#reviewToday').addEventListener('click', function () {
      reviewYear = new Date().getFullYear();
      reviewMonth = new Date().getMonth();
      reviewMode = 'month';
      showView('review');
    });

    $('#reviewTabs').addEventListener('click', function (e) {
      const btn = e.target.closest('button[data-review]');
      if (!btn) return;
      reviewMode = btn.dataset.review;
      showView('review');
    });

    $('#reviewContent').addEventListener('click', function (e) {
      const nav = e.target.closest('[data-nav]');
      if (nav) {
        if (reviewMode === 'year') changeYear(nav.dataset.nav === 'next' ? 1 : -1);
        else changeMonth(nav.dataset.nav === 'next' ? 1 : -1);
        return;
      }
      const cell = e.target.closest('.day-cell[data-date]');
      if (cell && !cell.disabled) { openDay(cell.dataset.date); return; }
      const row = e.target.closest('.year-month-card[data-month], .year-row[data-month]');
      if (row) {
        reviewMonth = Number(row.dataset.month);
        reviewMode = 'month';
        showView('review');
      }
    });

    $('#todayTimeline').addEventListener('click', function (e) {
      const bubble = e.target.closest('[data-bubble]');
      if (bubble) openBubble(bubble.dataset.bubble);
    });

    $('#todayTimeline').addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      const bubble = e.target.closest('[data-bubble]');
      if (bubble) openBubble(bubble.dataset.bubble);
    });

    $('#weatherRibbon').addEventListener('click', function (e) {
      const seg = e.target.closest('[data-seg]');
      if (!seg) return;
      const day = ensureTodaySegment();
      const target = day.segments.find(function (s) { return s.id === seg.dataset.seg; });
      if (!target) return;
      mainScene.set(target.scene);
      const el = document.querySelector('.segment[data-seg="' + target.id + '"]');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    $('#dayClose').addEventListener('click', closeDay);
    $('#dayOverlay').addEventListener('click', function (e) {
      if (e.target.id === 'dayOverlay') closeDay();
    });
    $('#dayBody').addEventListener('click', function (e) {
      const bubble = e.target.closest('[data-bubble]');
      if (bubble) openBubble(bubble.dataset.bubble);
    });
    $('#dayBody').addEventListener('change', function (e) {
      if (e.target.id !== 'epigraphInput') return;
      if (!openDayKey) return;
      const day = state.days[openDayKey];
      if (!day) return;
      day.epigraph = e.target.value.trim();
      saveState();
      toast('题记收好了');
    });

    $('#pickerClose').addEventListener('click', closePicker);
    $('#pickerBackdrop').addEventListener('click', closePicker);
    $('#pickerTabs').addEventListener('click', function (e) {
      const btn = e.target.closest('button[data-tab]');
      if (!btn) return;
      pickerTab = btn.dataset.tab;
      renderPicker();
    });
    $('#pickerBody').addEventListener('click', function (e) {
      const fam = e.target.closest('[data-family]');
      if (fam) { pickerFamily = fam.dataset.family; renderPicker(); return; }
      const weather = e.target.closest('[data-weather]');
      if (weather) { chooseWeather(weather.dataset.weather); return; }
      const group = e.target.closest('[data-group]');
      if (group) { pickerGroup = group.dataset.group; renderPicker(); return; }
      const scene = e.target.closest('[data-scene]');
      if (scene) { chooseScene(scene.dataset.scene); }
    });

    $('#bubbleClose').addEventListener('click', closeBubble);
    $('#bubbleOverlay').addEventListener('click', function (e) {
      if (e.target.id === 'bubbleOverlay') closeBubble();
    });
    $('#bubbleBody').addEventListener('click', function (e) {
      const act = e.target.closest('[data-act]');
      if (!act) return;
      const meta = $('#bubbleMeta').textContent;
      const idFromSave = act.dataset.id;
      if (act.dataset.act === 'edit') {
        // 从 meta 里找回 id 不可靠；用当前打开的泡泡 id
        const id = currentBubbleId;
        if (id) editBubble(id);
        return;
      }
      if (act.dataset.act === 'save') { saveBubbleEdit(idFromSave); return; }
      if (act.dataset.act === 'cancel') {
        const id = currentBubbleId;
        const b = state.bubbles.find(function (x) { return x.id === id; });
        if (b) renderBubbleBody(b);
        return;
      }
      if (act.dataset.act === 'copy') {
        const id = currentBubbleId;
        const b = state.bubbles.find(function (x) { return x.id === id; });
        if (!b) return;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(b.text).then(function () { toast('已复制'); }).catch(function () { toast('复制失败'); });
        } else {
          toast('这个浏览器不支持复制');
        }
        return;
      }
      if (act.dataset.act === 'delete') {
        const id = currentBubbleId;
        if (id) deleteBubble(id);
      }
    });

    $('#searchBtn').addEventListener('click', openSearch);
    $('#searchClose').addEventListener('click', closeSearch);
    $('#searchOverlay').addEventListener('click', function (e) {
      if (e.target.id === 'searchOverlay') closeSearch();
    });
    $('#searchInput').addEventListener('input', function (e) { renderSearch(e.target.value); });
    $('#searchResults').addEventListener('click', function (e) {
      const item = e.target.closest('[data-bubble]');
      if (!item) return;
      closeSearch();
      openBubble(item.dataset.bubble);
    });

    $('#exportMd').addEventListener('click', exportMarkdown);
    $('#exportJson').addEventListener('click', exportJson);
    $('#importBtn').addEventListener('click', function () { $('#importFile').click(); });
    $('#importFile').addEventListener('change', function (e) {
      importJsonFile(e.target.files && e.target.files[0]);
      e.target.value = '';
    });
    $('#clearData').addEventListener('click', function () {
      if (!confirm('确定清空全部数据？建议先导出 JSON。')) return;
      localStorage.removeItem(STORAGE_KEY);
      state = defaultState();
      activeSegmentId = null;
      lastDateKey = todayKey();
      ensureTodaySegment();
      applyReducedMotion();
      renderToday();
      toast('已经清空');
    });
    $('#reduceMotion').addEventListener('change', function (e) {
      state.settings.reducedMotion = e.target.checked;
      saveState();
      applyReducedMotion();
      const day = ensureTodaySegment();
      const seg = currentSegment(day);
      if (seg) mainScene.set(seg.scene, true);
      if (openDayKey) {
        const d = state.days[openDayKey];
        if (d && d.segments.length) daySceneView.set(d.segments[0].scene, true);
      }
    });

    $('#installBtn').addEventListener('click', function () {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(function () { deferredPrompt = null; renderSettings(); });
      } else {
        $('#installHint').textContent = '用浏览器菜单里的“添加到主屏幕”即可。';
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if (!$('#pickerOverlay').classList.contains('hidden')) { closePicker(); return; }
        if (!$('#bubbleOverlay').classList.contains('hidden')) { closeBubble(); return; }
        if (!$('#searchOverlay').classList.contains('hidden')) { closeSearch(); return; }
        if (!$('#dayOverlay').classList.contains('hidden')) { closeDay(); return; }
      }
    });

    window.addEventListener('hashchange', handleHash);

    window.addEventListener('beforeinstallprompt', function (e) {
      e.preventDefault();
      deferredPrompt = e;
      renderSettings();
    });

    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) checkDate();
    });

    setInterval(checkDate, 60000);
  }

  // ---------- 日期切换 ----------

  function checkDate() {
    const k = todayKey();
    if (k !== lastDateKey) {
      lastDateKey = k;
      activeSegmentId = null;
      ensureTodaySegment();
      renderToday();
    }
  }

  // ---------- 路由 ----------

  function handleHash() {
    const h = location.hash;
    if (h.indexOf('#/review/year') === 0) {
      reviewMode = 'year';
      showView('review');
    } else if (h.indexOf('#/review') === 0) {
      reviewMode = 'month';
      showView('review');
    } else if (h.indexOf('#/settings') === 0) {
      showView('settings');
    } else {
      showView('today');
    }
  }

  // ---------- 初始化 ----------

  function init() {
    if (IS_DEMO) seedDemo();
    applyReducedMotion();

    const monthParam = PARAMS.get('month');
    if (monthParam) {
      const parts = monthParam.split('-').map(Number);
      if (parts.length === 2 && parts[0] && parts[1] >= 1 && parts[1] <= 12) {
        reviewYear = parts[0];
        reviewMonth = parts[1] - 1;
      }
    }

    ensureTodaySegment();
    bindEvents();
    renderToday();
    handleHash();
    renderSettings();

    const dayParam = PARAMS.get('day');
    if (dayParam && state.days[dayParam]) {
      setTimeout(function () { openDay(dayParam); }, 300);
    }
    const pickerParam = PARAMS.get('picker');
    if (pickerParam === 'weather' || pickerParam === 'scene') {
      setTimeout(function () { openPicker(pickerParam); }, 300);
    }
    const sceneParam = PARAMS.get('scene');
    if (sceneParam && DATA.sceneMap[sceneParam]) {
      setTimeout(function () { updateSegment({ scene: sceneParam }); }, 300);
    }

    if ('serviceWorker' in navigator && (location.protocol === 'http:' || location.protocol === 'https:')) {
      window.addEventListener('load', function () {
        navigator.serviceWorker.register('sw.js').catch(function () {});
      });
    }

    if (IS_DEMO) {
      setTimeout(function () { toast('这是演示数据，不会影响你的正式记录'); }, 800);
    }
  }

  init();
})();


