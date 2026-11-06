(() => {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const ROUNDS = 10;
  const MAX_PTS = 1000;
  const TOLERANCE = 0.10; // в пределах ±10% считаем, что цена «совпала»

  /* Шкала цен: 2 000–10 000 ₽ с шагом 100, дальше до 20 000 ₽ с шагом 500 */
  const STEPS = [];
  for (let p = 2000; p <= 10000; p += 100) STEPS.push(p);
  for (let p = 10500; p <= 20000; p += 500) STEPS.push(p);
  const START_INDEX = STEPS.indexOf(6000);

  const JOKES = {
    under: [
      'Просто квартира в шоке, просто риелтор в обмороке 😱',
      'Ожидание: «ну, три тысячи, наверное». Реальность: Суздаль, детка, тут даже ставни — премиум 💅',
      'Ты оценил так, будто на дворе 2012-й и в Суздале всё ещё распродажа. Добро пожаловать в 2026 🫠',
      'Друг, который «да давайте снимем дом на всех за пятьсот рублей» — это ты. Мы тебя любим, но платить будет кто-то другой 🏠💸'
    ],
    ok: [
      'Гадалка из Суздаля подала заявление по собственному — ты её полностью заменил 🔮',
      'Эйчары, вам сюда: человек умеет в рынок. Берём без испытательного 🤝',
      'Это не «угадал», это чуйка. Авито в шоке, мама гордится, борщ стынет 🍲💯',
      'Ровно как в сторис: никаких фильтров, чистая правда. Ты — оракул посуточной аренды 😎👌'
    ],
    over: [
      'Тот самый момент, когда ты решил, что это пентхаус в «Москва-Сити», а это ставни, печка и котик на подоконнике 🏰🐈',
      'Мы не говорим «дорого», мы говорим «инвестиция в атмосферу». Риелтор уже плачет от счастья 😭💸',
      'Ты заплатил бы за вайб, но вайб тут и так включён бесплатно. Сэкономил? Нет. Переплатил! 🛎️',
      'Окей, барин, остынь: это не пентхаус, а сорок метров и самовар. Но самовар хороший 🫖👑'
    ]
  };

  const ARCHETYPES = {
    under: {
      medal: '🌾', title: 'Крестьянин',
      text: 'Копеечка рубль бережёт! Ты чаще называл цену ниже настоящей. В Суздале сутки дороже, чем кажется: здесь продают не метры, а атмосферу.'
    },
    ok: {
      medal: '💰', title: 'Купец',
      text: 'Торговаться умеешь! Твои цены, как правило, совпадали с настоящими. Рынок чувствуешь нутром — хоть сейчас на ярмарку.'
    },
    over: {
      medal: '🎩', title: 'Барин',
      text: 'Размах-то какой! Цены у тебя, как правило, выше настоящих: тройка, самовар и чаевые — всё включено. А квартиры-то дешевле.'
    }
  };

  const TIERS = [
    [8500, 'Золотой глаз — оценщик от бога ✨'],
    [6500, 'Меткий глаз — рынок тебе знаком 👀'],
    [4000, 'Почти местный — ещё пара поездок в Суздаль 🚌'],
    [2000, 'Турист — зато с хорошим настроением 📸'],
    [0, 'Нужны чай, баранки и риелтор 🫖']
  ];

  /* ---------- утилиты ---------- */
  const fmt = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const rub = (n) => fmt(n) + ' ₽';
  const shuffle = (a) => {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* без хранилища тоже работает */ } }
  };

  /* Очки за раунд: до 1000, затем плавно падают по мере роста относительной ошибки */
  function scoreFor(guess, real) {
    const err = Math.abs(guess - real) / real;
    return Math.round(MAX_PTS * Math.exp(-3 * Math.max(0, err - 0.02)));
  }
  function categoryFor(guess, real) {
    const d = (guess - real) / real;
    if (d > TOLERANCE) return 'over';
    if (d < -TOLERANCE) return 'under';
    return 'ok';
  }
  const verdictFor = (pts) =>
    pts >= 950 ? 'В яблочко! 🎯' : pts >= 800 ? 'Почти в точку!' : pts >= 550 ? 'Неплохо!' : pts >= 300 ? 'Тепло… но не очень' : 'Мимо, и сильно 🙈';

  /* ---------- элементы ---------- */
  const el = {
    start: $('#scrStart'), game: $('#scrGame'), final: $('#scrFinal'),
    startBtn: $('#startBtn'), bestLine: $('#bestLine'),
    roundLabel: $('#roundLabel'), scoreLabel: $('#scoreLabel'), progress: $('#progress'),
    gal: $('#gal'), dots: $('#dots'), count: $('#photoCount'), prev: $('#prevPhoto'), next: $('#nextPhoto'),
    infoMain: $('#infoMain'), infoAddr: $('#infoAddr'),
    panelGuess: $('#panelGuess'), panelResult: $('#panelResult'),
    priceVal: $('#priceVal'), slider: $('#slider'), minus: $('#minus'), plus: $('#plus'),
    trackWrap: $('#trackWrap'), flag: $('#flag'), rate: $('#rateBtn'),
    minLabel: $('#minLabel'), maxLabel: $('#maxLabel'),
    rGuess: $('#rGuess'), rReal: $('#rReal'), rDiff: $('#rDiff'), rDiffLabel: $('#rDiffLabel'), rDiffCell: $('#rDiffCell'),
    rPts: $('#rPts'), rVerdict: $('#rVerdict'), rLink: $('#rLink'), nextBtn: $('#nextBtn'),
    joke: $('#joke')
  };

  /* ---------- состояние игры ---------- */
  let game = null;
  const jokeBag = { under: [], ok: [], over: [] };
  let lastJoke = '';

  function pickJoke(cat) {
    if (!jokeBag[cat].length) {
      jokeBag[cat] = shuffle(JOKES[cat].slice());
      if (jokeBag[cat][jokeBag[cat].length - 1] === lastJoke && jokeBag[cat].length > 1) jokeBag[cat].reverse();
    }
    lastJoke = jokeBag[cat].pop();
    return lastJoke;
  }

  function show(name) {
    ['start', 'game', 'final'].forEach((k) => { el[k].hidden = k !== name; });
    document.body.classList.toggle('in-game', name === 'game');
    document.body.classList.toggle('in-final', name === 'final');
  }

  function newGame() {
    const lots = shuffle(window.LOTS.slice()).slice(0, ROUNDS);
    game = { lots, idx: 0, score: 0, results: [], rated: false };
    jokeBag.under = []; jokeBag.ok = []; jokeBag.over = [];
    buildProgress();
    show('game');
    renderRound();
  }

  function buildProgress() {
    el.progress.innerHTML = '<i></i>'.repeat(ROUNDS);
  }
  function updateProgress() {
    const done = game.results.length;
    [...el.progress.children].forEach((seg, i) => {
      seg.className = i < done ? 'done' : i === done ? 'cur' : '';
    });
    el.progress.setAttribute('aria-valuenow', String(done));
    el.roundLabel.textContent = `Квартира ${Math.min(game.idx + 1, ROUNDS)} из ${ROUNDS}`;
    el.scoreLabel.textContent = '★ ' + fmt(game.score);
  }

  /* ---------- галерея ---------- */
  function setPhotos(lot) {
    el.gal.innerHTML = '';
    el.dots.innerHTML = '';
    lot.imgs.forEach((f, i) => {
      const im = new Image();
      im.src = 'img/lots/' + f;
      im.alt = `Фото ${i + 1}: ${lot.kind}, ${lot.area} м²`;
      im.decoding = 'async';
      im.draggable = false;
      el.gal.appendChild(im);
      el.dots.appendChild(document.createElement('i'));
    });
    el.gal.scrollLeft = 0;
    updatePhotoState();
  }
  function photoIndex() {
    const w = el.gal.clientWidth || 1;
    return Math.max(0, Math.min(el.gal.children.length - 1, Math.round(el.gal.scrollLeft / w)));
  }
  function updatePhotoState() {
    const i = photoIndex(), n = el.gal.children.length;
    [...el.dots.children].forEach((d, k) => d.classList.toggle('on', k === i));
    el.count.textContent = `${i + 1}/${n}`;
    el.prev.disabled = i === 0;
    el.next.disabled = i >= n - 1;
  }
  function goPhoto(delta) {
    const w = el.gal.clientWidth;
    el.gal.scrollTo({ left: (photoIndex() + delta) * w, behavior: reduced ? 'auto' : 'smooth' });
  }
  el.gal.addEventListener('scroll', () => requestAnimationFrame(updatePhotoState), { passive: true });
  el.prev.addEventListener('click', () => goPhoto(-1));
  el.next.addEventListener('click', () => goPhoto(1));
  el.gal.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { goPhoto(-1); e.preventDefault(); }
    if (e.key === 'ArrowRight') { goPhoto(1); e.preventDefault(); }
  });

  /* ---------- бегунок ---------- */
  const ratio = (i) => i / (STEPS.length - 1);
  function syncSlider() {
    const i = +el.slider.value;
    el.priceVal.textContent = fmt(STEPS[i]);
    el.slider.style.setProperty('--r', ratio(i));
  }
  el.slider.addEventListener('input', syncSlider);
  const nudge = (d) => {
    if (game && game.rated) return;
    el.slider.value = Math.max(0, Math.min(STEPS.length - 1, +el.slider.value + d));
    syncSlider();
  };
  el.minus.addEventListener('click', () => nudge(-1));
  el.plus.addEventListener('click', () => nudge(1));
  el.slider.addEventListener('keydown', (e) => { if (e.key === 'Enter') rate(); });
  el.minLabel.textContent = rub(STEPS[0]);
  el.maxLabel.textContent = rub(STEPS[STEPS.length - 1]);

  /* ---------- раунд ---------- */
  function renderRound() {
    const lot = game.lots[game.idx];
    game.rated = false;
    setPhotos(lot);
    el.infoMain.textContent = `${lot.kind} · ${lot.area} м²${lot.extra ? ' · ' + lot.extra : ''}`;
    el.infoAddr.textContent = lot.addr;
    el.slider.disabled = false;
    el.slider.value = START_INDEX;
    el.flag.hidden = true;
    el.panelGuess.hidden = false;
    el.panelResult.hidden = true;
    el.joke.hidden = true;
    syncSlider();
    updateProgress();
    const nxt = game.lots[game.idx + 1];
    if (nxt) { const p = new Image(); p.src = 'img/lots/' + nxt.imgs[0]; }
  }

  function rate() {
    if (game.rated) return;
    game.rated = true;
    const lot = game.lots[game.idx];
    const guess = STEPS[+el.slider.value];
    const real = lot.price;
    const diff = guess - real;                 // > 0 — переплата, < 0 — недоплата
    const pct = Math.round(Math.abs(diff) / real * 100);
    const cat = categoryFor(guess, real);
    const pts = scoreFor(guess, real);

    game.score += pts;
    game.results.push({ lot, guess, real, diff, cat, pts });
    el.slider.disabled = true;

    el.rGuess.textContent = rub(guess);
    el.rReal.textContent = rub(real);
    el.rDiffCell.className = 'cell diff ' + cat;
    if (diff === 0) {
      el.rDiffLabel.textContent = 'Разница';
      el.rDiff.innerHTML = '0 ₽<i>копейка в копейку</i>';
    } else {
      el.rDiffLabel.textContent = diff > 0 ? 'Переплата' : 'Недоплата';
      el.rDiff.innerHTML = `${diff > 0 ? '+' : '−'}${rub(Math.abs(diff))}<i>${pct}% от цены</i>`;
    }
    el.rVerdict.textContent = verdictFor(pts);
    el.rLink.href = lot.url;
    el.nextBtn.textContent = game.idx >= ROUNDS - 1 ? 'Итог' : 'Дальше';
    countUp(el.rPts, pts);

    el.panelGuess.hidden = true;
    el.panelResult.hidden = false;

    el.joke.textContent = pickJoke(cat);
    const tilt = (Math.random() < 0.5 ? -1 : 1) * (1.2 + Math.random() * 1.6);
    el.joke.style.setProperty('--tilt', tilt.toFixed(1) + 'deg');
    el.joke.hidden = false;
    // перезапуск анимации появления
    el.joke.style.animation = 'none'; void el.joke.offsetWidth; el.joke.style.animation = '';

    updateProgress();
    // отметить текущий сегмент как пройденный сразу после оценки
    el.progress.children[game.idx].className = 'done';
    el.progress.setAttribute('aria-valuenow', String(game.results.length));
  }

  function countUp(node, to) {
    if (reduced || to === 0) { node.textContent = fmt(to); return; }
    const t0 = performance.now(), dur = 650;
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / dur);
      node.textContent = fmt(to * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  function next() {
    if (!game.rated) return;
    if (game.idx >= ROUNDS - 1) { finish(); return; }
    game.idx++;
    renderRound();
  }

  /* ---------- итог ---------- */
  function archetypeOf(results) {
    const c = { under: 0, ok: 0, over: 0 };
    results.forEach((r) => c[r.cat]++);
    const max = Math.max(c.under, c.ok, c.over);
    const leaders = Object.keys(c).filter((k) => c[k] === max);
    // при ничьей игрок «Купец» — цены в среднем сходятся
    return { key: leaders.length === 1 ? leaders[0] : 'ok', counts: c };
  }

  function finish() {
    const { key, counts } = archetypeOf(game.results);
    const a = ARCHETYPES[key];
    $('#fMedal').textContent = a.medal;
    $('#fTitle').textContent = a.title;
    $('#fText').textContent = a.text;
    $('#fScore').textContent = fmt(game.score);
    $('#fTier').textContent = TIERS.find(([min]) => game.score >= min)[1];
    $('#sUnder').textContent = counts.under;
    $('#sOk').textContent = counts.ok;
    $('#sOver').textContent = counts.over;

    const over = game.results.reduce((s, r) => s + Math.max(0, r.diff), 0);
    const under = game.results.reduce((s, r) => s + Math.max(0, -r.diff), 0);
    $('#fMoney').innerHTML =
      `Всего переплатил: <b>${rub(over)}</b><br>Всего недоплатил: <b>${rub(under)}</b>`;

    $('#fStrip').innerHTML = game.results.map((r, i) => {
      const sym = r.cat === 'over' ? '▲' : r.cat === 'under' ? '▼' : '●';
      const d = r.diff === 0 ? 'точно' : (r.diff > 0 ? '+' : '−') + rub(Math.abs(r.diff));
      return `<i class="${r.cat}" title="${i + 1}. ${rub(r.guess)} вместо ${rub(r.real)} (${d}), ${r.pts} б.">${sym}</i>`;
    }).join('');

    const best = Math.max(+store.get('suzgadal-best') || 0, game.score);
    store.set('suzgadal-best', String(best));
    game.summary = `Я — ${a.title} в игре «Сузгадаль»: ${fmt(game.score)} баллов из 10 000. А ты кто?`;
    show('final');
    updateBest();
  }

  function updateBest() {
    const best = +store.get('suzgadal-best') || 0;
    el.bestLine.textContent = best ? `Твой рекорд: ${fmt(best)} баллов` : 'Суздаль и окрестности · данные Авито';
  }

  async function share() {
    const text = game && game.summary ? game.summary : 'Играй в «Сузгадаль» — угадай цену суздальской квартиры!';
    const url = location.href.split('#')[0];
    const btn = $('#shareBtn');
    try {
      if (navigator.share) { await navigator.share({ title: 'Сузгадаль', text, url }); return; }
      await navigator.clipboard.writeText(`${text} ${url}`);
      btn.textContent = 'Скопировано!';
      setTimeout(() => { btn.textContent = 'Поделиться'; }, 1800);
    } catch (e) { /* пользователь закрыл окно «поделиться» */ }
  }

  /* ---------- события ---------- */
  el.startBtn.addEventListener('click', newGame);
  el.rate.addEventListener('click', rate);
  el.nextBtn.addEventListener('click', next);
  $('#againBtn').addEventListener('click', newGame);
  $('#shareBtn').addEventListener('click', share);

  updateBest();
  show('start');
})();
