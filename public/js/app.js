'use strict';

// =======================
// ÚLOŽISKO (Electron JSON alebo localStorage v prehliadači)
// =======================
const Store = {
  async load(name, def) {
    try {
      if (window.api) {
        const d = await window.api.loadJSON(name + '.json');
        return d ?? def;
      }
      const s = localStorage.getItem('dmtl_' + name);
      return s ? JSON.parse(s) : def;
    } catch { return def; }
  },
  save(name, data) {
    try {
      if (window.api) return window.api.saveJSON(name + '.json', data);
      localStorage.setItem('dmtl_' + name, JSON.stringify(data));
    } catch { /* bez ukladania */ }
  }
};

// =======================
// STAV
// =======================
let histList = [], wrongQ = [], favQ = [], stats = {}, settings = { theme: 'dark' };
let timerInterval = null;

const $ = id => document.getElementById(id);

function showScreen(name) {
  document.querySelectorAll('[data-screen]').forEach(s => { s.style.display = s.dataset.screen === name ? 'block' : 'none'; });
  window.scrollTo(0, 0);
}

function stopTimer() { clearInterval(timerInterval); timerInterval = null; }

function startTimer(seconds, el, onEnd) {
  stopTimer();
  let left = seconds;
  el.textContent = '⏱ ' + U.fmtTime(left);
  timerInterval = setInterval(() => {
    left--;
    el.textContent = '⏱ ' + U.fmtTime(Math.max(0, left));
    el.classList.toggle('warn', left <= 300);
    if (left <= 0) { stopTimer(); onEnd(); }
  }, 1000);
}

// =======================
// GLOBÁLNE UDALOSTI (čipy, symboly, náhľad formuly)
// =======================
document.addEventListener('click', e => {
  const chip = e.target.closest('.chip');
  if (chip && !chip.closest('.locked')) {
    const group = chip.parentElement;
    if (group.classList.contains('single')) {
      group.querySelectorAll('.chip').forEach(c => { if (c !== chip) c.classList.remove('on'); });
    }
    chip.classList.toggle('on');
    return;
  }
  const sym = e.target.closest('.sym');
  if (sym && !sym.closest('.locked')) {
    const input = sym.closest('.fwrap').querySelector('input');
    const s = input.selectionStart ?? input.value.length, t = input.selectionEnd ?? s;
    const ins = sym.dataset.s;
    input.value = input.value.slice(0, s) + ins + input.value.slice(t);
    input.focus();
    input.setSelectionRange(s + ins.length, s + ins.length);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return;
  }
  const pr = e.target.closest('[data-practice]');
  if (pr) openPractice(pr.dataset.practice);
});

document.addEventListener('input', e => {
  if (!e.target.classList.contains('formula')) return;
  const prev = e.target.parentElement.querySelector('.fprev');
  const v = e.target.value.trim();
  if (!v) { prev.textContent = ''; prev.className = 'fprev'; return; }
  try {
    prev.textContent = '✓ ' + Logic.str(Logic.parse(v));
    prev.className = 'fprev ok';
  } catch (err) {
    prev.textContent = '✗ ' + err.message;
    prev.className = 'fprev bad';
  }
});

// =======================
// SPÄTNÁ VÄZBA K ÚLOHE
// =======================
function feedbackHTML(res) {
  const cls = p => p.pts === p.max ? 'ok' : p.pts > 0 ? 'mid' : 'bad';
  const icon = p => p.pts === p.max ? '✔' : p.pts > 0 ? '◐' : '✘';
  return `<div class="fb"><div class="fb-total ${cls({ pts: res.score, max: res.max })}">Body: ${res.score} / ${res.max}</div>` +
    res.parts.map(p => `<div class="fb-row ${cls(p)}"><div class="fb-head"><span>${icon(p)} ${p.label}</span><span>${p.pts}/${p.max} b</span></div>` +
      (p.pts === p.max ? '' : `<div class="fb-det">Tvoja odpoveď: <i>${U.esc(p.your)}</i><br>Správne: <b>${U.esc(p.correct)}</b></div>`) + '</div>').join('') + '</div>';
}

function lock(root) {
  root.classList.add('locked');
  root.querySelectorAll('input, select').forEach(i => { i.disabled = true; });
}

function taskCardHTML(t, i, max) {
  return `<div class="card task" id="task${i}">` +
    `<div class="task-h"><span class="task-no">Úloha ${i + 1}.</span> <span class="pts">(${max} b)</span> <span class="task-title">${t.title}</span></div>` +
    `<div class="statement">${t.statement}</div><div class="form">${t.form}</div>` +
    `<div class="result"></div></div>`;
}

function solutionBlock(html, open) {
  return `<details class="solution" ${open ? 'open' : ''}><summary>📘 Riešenie a postup</summary><div class="sol-body">${html}</div></details>`;
}

// =======================
// PRECVIČOVANIE
// =======================
let practice = { id: null, task: null, checked: false };

function renderPracticeList() {
  const box = $('practiceList');
  box.innerHTML = TOPICS.map(tp => {
    const items = Object.values(Tasks).filter(t => t.topic === tp.id);
    return `<div class="card"><h3>${tp.icon} ${tp.name}</h3><div class="gen-grid">` +
      items.map(t => {
        const s = stats[t.id];
        const pct = s && s.max ? Math.round(100 * s.pts / s.max) : null;
        return `<button class="gen-btn" data-practice="${t.id}"><b>${t.title}</b><span>${t.desc}</span>` +
          `<span class="gen-stat">${s ? `${s.n}× · úspešnosť ${pct} %` : 'zatiaľ neriešené'}</span></button>`;
      }).join('') + '</div></div>';
  }).join('');
}

function openPractice(id) {
  practice.id = id;
  showScreen('practice');
  newPractice();
}

function newPractice() {
  const gen = Tasks[practice.id];
  let t;
  try { t = gen.gen(); } catch (err) { console.error(err); t = gen.gen(); }
  practice.task = t;
  practice.checked = false;
  $('practiceTitle').textContent = gen.title;
  $('practiceBox').innerHTML = taskCardHTML(t, 0, 5).replace('Úloha 1.', 'Príklad');
  $('practiceSol').innerHTML = '';
  $('btnCheck').disabled = false;
  window.scrollTo(0, 0);
}

function checkPractice() {
  if (practice.checked) return;
  const root = $('task0');
  const res = practice.task.check(root);
  practice.checked = true;
  lock(root);
  root.querySelector('.result').innerHTML = feedbackHTML(res);
  $('practiceSol').innerHTML = solutionBlock(practice.task.solution, res.score < res.max);
  $('btnCheck').disabled = true;
  const s = stats[practice.id] || { n: 0, pts: 0, max: 0 };
  s.n++; s.pts += res.score; s.max += res.max;
  stats[practice.id] = s;
  Store.save('stats', stats);
}

function showPracticeSolution() {
  $('practiceSol').innerHTML = solutionBlock(practice.task.solution, true);
}

// =======================
// ZÁPOČTOVÝ TEST
// =======================
let exam = null;

function startExam(key) {
  const cfg = EXAMS[key];
  const tasks = cfg.slots.map(slot => Tasks[U.pick(slot)].gen());
  exam = { key, cfg, tasks, start: new Date().toLocaleString('sk-SK'), done: false };
  $('examTitle').textContent = cfg.name;
  $('examSummary').innerHTML = '';
  $('examBox').innerHTML = tasks.map((t, i) => taskCardHTML(t, i, 5)).join('');
  $('btnSubmit').style.display = '';
  $('examTimer').style.display = '';
  showScreen('exam');
  startTimer(cfg.time * 60, $('examTimer'), () => { alert('Čas vypršal – test sa odovzdáva.'); submitExam(); });
}

function confirmSubmitExam() {
  if (confirm('Naozaj chceš odovzdať test?')) submitExam();
}

function submitExam() {
  if (!exam || exam.done) return;
  exam.done = true;
  stopTimer();
  let score = 0, total = 0;
  const items = exam.tasks.map((t, i) => {
    const root = $('task' + i);
    const res = t.check(root);
    lock(root);
    root.querySelector('.result').innerHTML = feedbackHTML(res) + solutionBlock(t.solution, res.score < res.max);
    score += res.score; total += res.max;
    return { title: t.title, statement: t.statement, parts: res.parts, score: res.score, max: res.max, solution: t.solution };
  });
  const percent = Math.round(100 * score / total);
  $('examSummary').innerHTML = summaryHTML(score, total, percent);
  $('btnSubmit').style.display = 'none';
  $('examTimer').style.display = 'none';
  histList.push({ id: Date.now(), type: 'exam', name: exam.cfg.name, start: exam.start, score, total, percent, items });
  Store.save('history', histList);
  renderHistory();
  window.scrollTo(0, 0);
}

function summaryHTML(score, total, percent) {
  const pass = score >= Math.ceil(total * 16 / 30);
  return `<div class="card summary ${pass ? 'pass' : 'fail'}"><div class="big">${score} / ${total} b (${percent} %)</div>` +
    `<div>${pass ? '✅ Na zápočet by to stačilo' : '❌ Na zápočet by to zatiaľ nestačilo'} – treba aspoň 16 z 30 bodov (pomerne ${Math.ceil(total * 16 / 30)} z ${total}).</div></div>`;
}

function leaveExam() {
  if (exam && !exam.done && !confirm('Test ešte nie je odovzdaný. Naozaj odísť? (výsledok sa neuloží)')) return;
  stopTimer();
  exam = null;
  showScreen('home');
}

// =======================
// ABC KVÍZ
// =======================
const QUIZ_SIZE = 20, QUIZ_TIME = 20 * 60;
let quiz = null;

function startQuiz(type) {
  let pool;
  if (type === 'wrong') pool = QUESTIONS.filter(q => wrongQ.includes(q.id));
  else if (type === 'fav') pool = QUESTIONS.filter(q => favQ.includes(q.id));
  else if (type === 'all') pool = QUESTIONS;
  else pool = QUESTIONS.filter(q => q.topic === type);
  if (!pool.length) { alert(type === 'wrong' ? 'Nemáš žiadne zlé otázky 👍' : 'Nemáš žiadne obľúbené otázky ⭐'); return; }
  const qs = U.shuffle(pool).slice(0, QUIZ_SIZE).map(q => ({ ...q, order: U.shuffle(['a', 'b', 'c']) }));
  quiz = { type, qs, i: 0, score: 0, answered: false, answers: [], start: new Date().toLocaleString('sk-SK') };
  showScreen('quiz');
  startTimer(QUIZ_TIME, $('quizTimer'), endQuiz);
  showQuizQuestion();
}

function showQuizQuestion() {
  const q = quiz.qs[quiz.i];
  quiz.answered = false;
  $('quizQuestion').innerHTML = `<span>${quiz.i + 1}. ${U.esc(q.q)}</span>` +
    `<button class="fav-btn" onclick="toggleFav(${q.id})" title="Obľúbená">${favQ.includes(q.id) ? '⭐' : '☆'}</button>`;
  $('quizAnswers').innerHTML = q.order.map((l, k) =>
    `<div class="answer" data-l="${l}" onclick="answerQuiz('${l}')"><b>${'ABC'[k]})</b> ${U.esc(q[l])}</div>`).join('');
  $('quizExplain').innerHTML = '';
  $('quizProgress').textContent = `Otázka ${quiz.i + 1} / ${quiz.qs.length} · správne ${quiz.score}`;
}

function answerQuiz(l) {
  if (quiz.answered) return;
  quiz.answered = true;
  const q = quiz.qs[quiz.i];
  const ok = l === q.correct;
  document.querySelectorAll('#quizAnswers .answer').forEach(el => {
    if (el.dataset.l === q.correct) el.classList.add('correct');
    else if (el.dataset.l === l) el.classList.add('wrong');
  });
  if (ok) { quiz.score++; wrongQ = wrongQ.filter(x => x !== q.id); }
  else if (!wrongQ.includes(q.id)) wrongQ.push(q.id);
  Store.save('wrong', wrongQ);
  quiz.answers.push({ id: q.id, selected: l, correct: q.correct });
  $('quizExplain').innerHTML = `<div class="explain ${ok ? 'ok' : 'bad'}">${ok ? '✔ Správne.' : '✘ Nesprávne.'} ${U.esc(q.e || '')}</div>`;
  $('quizProgress').textContent = `Otázka ${quiz.i + 1} / ${quiz.qs.length} · správne ${quiz.score}`;
}

function nextQuiz() {
  if (!quiz.answered) {
    if (!confirm('Na otázku si neodpovedal. Preskočiť?')) return;
    const q = quiz.qs[quiz.i];
    quiz.answers.push({ id: q.id, selected: null, correct: q.correct });
  }
  quiz.i++;
  quiz.i < quiz.qs.length ? showQuizQuestion() : endQuiz();
}

function confirmEndQuiz() {
  if (confirm('Naozaj chceš ukončiť kvíz?')) endQuiz();
}

function endQuiz() {
  if (!quiz) return;
  stopTimer();
  const total = quiz.qs.length;
  const percent = Math.round(100 * quiz.score / total);
  const names = { random: 'ABC kvíz', all: 'ABC kvíz', wrong: 'ABC – zlé otázky', fav: 'ABC – obľúbené', logic: 'ABC – logika', rel: 'ABC – relácie a zväzy', graph: 'ABC – grafy' };
  const entry = { id: Date.now(), type: 'quiz', name: names[quiz.type] || 'ABC kvíz', start: quiz.start, score: quiz.score, total, percent, answers: quiz.answers };
  histList.push(entry);
  Store.save('history', histList);
  quiz = null;
  renderHistory();
  openReview(entry);
}

function toggleFav(id) {
  favQ = favQ.includes(id) ? favQ.filter(x => x !== id) : [...favQ, id];
  Store.save('favorites', favQ);
  if (quiz) {
    const btn = document.querySelector('#quizQuestion .fav-btn');
    if (btn) btn.textContent = favQ.includes(id) ? '⭐' : '☆';
  }
}

// =======================
// HISTÓRIA A PREHĽAD
// =======================
function renderHistory() {
  const ul = $('historyList');
  if (!histList.length) { ul.innerHTML = '<li class="muted">Zatiaľ žiadne testy.</li>'; return; }
  ul.innerHTML = histList.slice().reverse().map(t =>
    `<li class="history-item"><span class="history-info ${t.percent >= 53 ? 'oktxt' : 'badtxt'}">${t.start} – <b>${t.name}</b> – ${t.score}/${t.total} (${t.percent} %)</span>` +
    `<button class="btn-small" onclick="openReviewId(${t.id})">Pozrieť</button>` +
    `<button class="btn-small danger" onclick="deleteTest(${t.id})">Zmazať</button></li>`).join('');
}

function openReviewId(id) { openReview(histList.find(t => t.id === id)); }

function openReview(t) {
  const box = $('reviewContent');
  $('reviewTitle').textContent = `${t.name} – ${t.start}`;
  let h = summaryHTML(t.score, t.total, t.percent).replace(/<div>[^<]*zápočet[^<]*<\/div>/, t.type === 'quiz' ? '' : '$&');
  if (t.type === 'quiz') {
    h += t.answers.map((a, i) => {
      const q = QUESTIONS.find(x => x.id === a.id);
      if (!q) return '';
      const ok = a.selected === a.correct;
      return `<div class="card review-card ${ok ? 'review-correct' : 'review-wrong'}"><b>${i + 1}. ${U.esc(q.q)}</b>` +
        ['a', 'b', 'c'].map(l => `<div class="review-answer ${l === q.correct ? 'correct' : l === a.selected ? 'wrong' : ''}">${U.esc(q[l])}</div>`).join('') +
        `<div class="muted">${U.esc(q.e || '')}</div></div>`;
    }).join('');
  } else {
    h += t.items.map((it, i) =>
      `<div class="card task"><div class="task-h"><span class="task-no">Úloha ${i + 1}.</span> <span class="pts">(${it.max} b)</span> <span class="task-title">${it.title}</span></div>` +
      `<div class="statement">${it.statement}</div>${feedbackHTML(it)}${solutionBlock(it.solution, false)}</div>`).join('');
  }
  box.innerHTML = h;
  showScreen('review');
}

function deleteTest(id) {
  if (!confirm('Naozaj chceš zmazať tento test?')) return;
  histList = histList.filter(t => t.id !== id);
  Store.save('history', histList);
  renderHistory();
}

function clearHistory() {
  if (!confirm('Naozaj chceš zmazať CELÚ históriu?')) return;
  histList = [];
  Store.save('history', histList);
  renderHistory();
}

function showQList(kind) {
  const ids = kind === 'wrong' ? wrongQ : favQ;
  const qs = QUESTIONS.filter(q => ids.includes(q.id));
  $('qlistTitle').textContent = kind === 'wrong' ? '❌ Zlé otázky' : '⭐ Obľúbené otázky';
  $('qlistContent').innerHTML = qs.length ? qs.map(q =>
    `<div class="card review-card ${kind === 'wrong' ? 'review-wrong' : 'review-correct'}"><b>${U.esc(q.q)}</b>` +
    ['a', 'b', 'c'].map(l => `<div class="review-answer ${l === q.correct ? 'correct' : ''}">${U.esc(q[l])}</div>`).join('') +
    `<div class="muted">${U.esc(q.e || '')}</div>` +
    `<button class="btn-small danger" onclick="removeFromList('${kind}', ${q.id})">Odstrániť zo zoznamu</button></div>`).join('')
    : `<div class="card muted">${kind === 'wrong' ? 'Nemáš žiadne zlé otázky 👍' : 'Nemáš žiadne obľúbené otázky.'}</div>`;
  showScreen('qlist');
}

function removeFromList(kind, id) {
  if (kind === 'wrong') { wrongQ = wrongQ.filter(x => x !== id); Store.save('wrong', wrongQ); }
  else { favQ = favQ.filter(x => x !== id); Store.save('favorites', favQ); }
  showQList(kind);
}

// =======================
// TEÓRIA
// =======================
function renderTheory() {
  $('theoryNav').innerHTML = TOPICS.map(tp =>
    `<div class="tnav-group"><div class="tnav-h">${tp.icon} ${tp.name}</div>` +
    THEORY.filter(t => t.topic === tp.id).map(t => `<button class="tnav-btn" data-tid="${t.id}" onclick="openTheory('${t.id}')">${t.title}</button>`).join('') +
    '</div>').join('');
}

function openTheory(id) {
  const t = THEORY.find(x => x.id === id) || THEORY[0];
  document.querySelectorAll('.tnav-btn').forEach(b => b.classList.toggle('on', b.dataset.tid === t.id));
  $('theoryContent').innerHTML = `<h2>${t.title}</h2>${t.html}` +
    `<div class="practice-links">Precvičiť: ${t.practice.map(p => `<button class="btn-primary small" data-practice="${p}">${Tasks[p].title}</button>`).join('')}</div>`;
  showScreen('theory');
}

// =======================
// TÉMA A ŠTART
// =======================
function applyTheme() {
  document.body.classList.toggle('dark', settings.theme === 'dark');
}

function toggleTheme() {
  settings.theme = settings.theme === 'dark' ? 'light' : 'dark';
  applyTheme();
  Store.save('settings', settings);
}

function renderExamButtons() {
  $('examButtons').innerHTML = Object.entries(EXAMS).map(([k, e]) =>
    `<button class="exam-btn" onclick="startExam('${k}')"><b>${e.name}</b><span>${e.desc}</span><span class="muted">3 úlohy × 5 b · ${e.time} min</span></button>`).join('');
}

async function init() {
  [histList, wrongQ, favQ, stats, settings] = await Promise.all([
    Store.load('history', []), Store.load('wrong', []), Store.load('favorites', []),
    Store.load('stats', {}), Store.load('settings', { theme: 'dark' })
  ]);
  applyTheme();
  renderExamButtons();
  renderHistory();
  renderTheory();
  $('qCount').textContent = QUESTIONS.length;
  showScreen('home');
}

init();
