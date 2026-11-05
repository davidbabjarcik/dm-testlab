'use strict';

// =======================
// FORMULÁROVÉ PRVKY
// =======================
const F = {
  chips(k, opts, single) {
    return `<div class="chips ${single ? 'single' : ''}" data-k="${k}">` +
      opts.map(o => `<button type="button" class="chip" data-v="${U.esc(o.v)}">${o.l}</button>`).join('') + '</div>';
  },
  radio: (k, opts) => F.chips(k, opts, true),
  yesNo: k => F.radio(k, [{ v: 'y', l: 'áno' }, { v: 'n', l: 'nie' }]),
  num: (k, ph = '') => `<input type="number" class="num" data-k="${k}" placeholder="${ph}">`,
  formula: (k, ph = '') =>
    `<div class="fwrap"><div class="symbar">` +
    ['¬', '∧', '∨', '⇒', '⇔', '(', ')'].map(s => `<button type="button" class="sym" data-s="${s}">${s}</button>`).join('') +
    `</div><input type="text" class="formula" data-k="${k}" placeholder="${ph}" spellcheck="false" autocomplete="off">` +
    `<div class="fprev"></div></div>`,
  assign: (k, vs) =>
    `<div class="assign" data-k="${k}">` + vs.map(x =>
      `<label>v(${x}) = <select data-var="${x}"><option value="">–</option><option value="0">0</option><option value="1">1</option></select></label>`
    ).join('') + '</div>',
  part: (label, pts, inner, hint = '') =>
    `<div class="part"><div class="part-h"><b>${label}</b> <span class="pts">(${pts} b)</span></div>` +
    (hint ? `<div class="hint">${hint}</div>` : '') + inner + '</div>'
};

const read = {
  chips: (root, k) => [...root.querySelectorAll(`[data-k="${k}"] .chip.on`)].map(b => b.dataset.v),
  one: (root, k) => read.chips(root, k)[0] ?? null,
  num(root, k) {
    const v = root.querySelector(`[data-k="${k}"]`).value.trim();
    return v === '' ? null : Number(v);
  },
  text: (root, k) => root.querySelector(`[data-k="${k}"]`).value.trim(),
  assign(root, k) {
    const out = {};
    for (const s of root.querySelectorAll(`[data-k="${k}"] select`)) {
      if (s.value === '') return null;
      out[s.dataset.var] = s.value === '1';
    }
    return out;
  }
};

// po kontrole vyfarbí čipy: správne vybrané / chybne vybrané / chýbajúce
function markChips(root, k, correct) {
  const C = new Set(correct.map(String));
  root.querySelectorAll(`[data-k="${k}"] .chip`).forEach(b => {
    const on = b.classList.contains('on'), ok = C.has(b.dataset.v);
    if (on && ok) b.classList.add('ok');
    else if (on && !ok) b.classList.add('bad');
    else if (!on && ok) b.classList.add('miss');
  });
}

const P = (label, pts, max, your, correct) => ({ label, pts, max, your: your ?? '—', correct });
const result = parts => ({ parts, score: parts.reduce((s, p) => s + p.pts, 0), max: parts.reduce((s, p) => s + p.max, 0) });
const yn = x => x === 'y' ? 'áno' : x === 'n' ? 'nie' : '—';
const YN = b => b ? 'áno' : 'nie';
const fm = f => `<span class="f">${U.esc(typeof f === 'string' ? f : Logic.str(f))}</span>`;

function tryParse(s) {
  if (!s) return { err: 'nevyplnené' };
  try { return { f: Logic.parse(s) }; } catch (e) { return { err: e.message }; }
}

// =======================
// REGISTER ÚLOH
// =======================
const TOPICS = [
  { id: 'logic', name: 'Výroková logika', icon: '🧮' },
  { id: 'rel', name: 'Relácie a zväzy', icon: '🔗' },
  { id: 'graph', name: 'Neorientované grafy', icon: '🕸️' }
];
const Tasks = {};
const reg = (id, topic, title, desc, gen) => { Tasks[id] = { id, topic, title, desc, gen }; };

// ---------- pomocné generátory ----------
const Gen = {
  TEMPL: {
    taut: ['(a ⇒ b) ⇔ (¬b ⇒ ¬a)', '(a ∧ (a ⇒ b)) ⇒ b', '¬(a ∨ b) ⇔ (¬a ∧ ¬b)', '((a ⇒ b) ∧ (b ⇒ c)) ⇒ (a ⇒ c)',
      '(a ⇒ b) ⇔ (¬a ∨ b)', '(a ∧ b) ⇒ (a ∨ c)', '((a ⇒ b) ∧ ¬b) ⇒ ¬a', 'a ∨ (a ⇒ b)', '(a ⇒ (b ⇒ a))',
      '((a ∨ b) ∧ ¬a) ⇒ b'],
    contr: ['(a ⇒ b) ∧ a ∧ ¬b', '(a ⇔ b) ∧ (a ⇔ ¬b)', '¬((a ∧ b) ⇒ a)', '(a ∨ b) ∧ ¬a ∧ ¬b', '¬(a ⇒ (b ⇒ a))',
      '(a ∧ ¬b) ∧ (a ⇒ b)', '¬(a ∨ ¬a) ∨ (b ∧ ¬b)']
  },

  template(cls) {
    const f = Logic.parse(U.pick(Gen.TEMPL[cls]));
    const vs = U.shuffle(['p', 'q', 'r']);
    const map = {};
    ['a', 'b', 'c'].forEach((x, i) => {
      const v = Logic.V(vs[i]);
      map[x] = U.chance(0.25) ? Logic.N(v) : v;
    });
    return Logic.subst(f, map);
  },

  formulaOfClass(cls) {
    if (cls !== 'sat' && U.chance(0.5)) return Gen.template(cls);
    for (let i = 0; i < 3000; i++) {
      const vs = U.pick([['p', 'q'], ['p', 'q', 'r']]);
      const f = Logic.rand(U.pick([2, 3]), vs);
      if (Logic.varsOf([f]).length < 2) continue;
      const s = Logic.str(f);
      if (s.length < 9 || s.length > 38) continue;
      if (Logic.classify(f) === cls) return f;
    }
    return Gen.template(cls === 'sat' ? 'taut' : cls);
  },

  literal(vs) {
    const v = Logic.V(U.pick(vs));
    return U.chance(0.3) ? Logic.N(v) : v;
  },

  // pravidlá typu „ak … tak …“ pre rezolúciu
  rule(vs) {
    const [x, y, z] = U.shuffle(vs).slice(0, 3).map(v => U.chance(0.3) ? Logic.N(Logic.V(v)) : Logic.V(v));
    const { I, A, O, E, N } = Logic;
    return U.pick([
      () => I(x, y), () => I(x, y), () => I(x, A(y, z)), () => I(x, O(y, z)), () => E(x, y),
      () => O(x, y), () => N(A(x, y)), () => I(A(x, y), z), () => I(O(x, y), z)
    ])();
  }
};

// =======================
// 1. TYP FORMULY
// =======================
reg('formula-type', 'logic', 'Tautológia, kontradikcia, splniteľná',
  'Pravdivostná tabuľka a typ formuly.', () => {
    const target = U.pick(['taut', 'contr', 'sat']);
    const f = Gen.formulaOfClass(target);
    const vs = Logic.varsOf([f]);
    const total = 2 ** vs.length;
    const ones = Logic.assignments(vs).filter(v => Logic.ev(f, v)).length;
    const names = { taut: 'tautológia', contr: 'kontradikcia', sat: 'splniteľná, ale nie tautológia' };
    return {
      title: 'Typ formuly',
      statement: `Rozhodnite, či formula ${fm('φ: ' + Logic.str(f))} je tautológia, kontradikcia alebo splniteľná formula. Svoje tvrdenie zdôvodnite tabuľkou pravdivostných hodnôt.`,
      form: F.part('a) Typ formuly', 3, F.radio('t', Object.entries(names).map(([v, l]) => ({ v, l })))) +
        F.part(`b) Pri koľkých ohodnoteniach (z ${total}) je φ pravdivá?`, 2, F.num('n')),
      check(root) {
        const t = read.one(root, 't'), n = read.num(root, 'n');
        markChips(root, 't', [target]);
        return result([
          P('a) typ formuly', t === target ? 3 : 0, 3, t ? names[t] : null, names[target]),
          P('b) počet pravdivých riadkov', n === ones ? 2 : 0, 2, n, ones)
        ]);
      },
      solution: `<p>Tabuľka pravdivostných hodnôt (posledný stĺpec je φ):</p>${Logic.fullTable(f)}` +
        `<p>φ je pravdivá v <b>${ones}</b> z ${total} riadkov, teda je to <b>${names[target]}</b>.</p>` +
        `<p class="muted">Tautológia = samé 1, kontradikcia = samé 0, splniteľná = aspoň jedna 1.</p>`
    };
  });

// =======================
// 2. VYPLÝVANIE
// =======================
reg('entail', 'logic', 'Splniteľnosť a vyplývanie S ⊨ φ',
  'Systém formúl, splniteľnosť a sémantický dôsledok.', () => {
    const vs = ['p', 'q', 'r'];
    const ops = ['imp', 'imp', 'or', 'and', 'eq', 'not'];
    const wantUnsat = U.chance(0.12);
    const wa = U.chance(0.5), wb = U.chance(0.5);
    let S, a, b;
    for (let i = 0; i < 6000; i++) {
      S = [Logic.rand(2, vs, ops), Logic.rand(U.pick([1, 2]), vs, ops)];
      if (S.some(f => Logic.str(f).length > 22 || Logic.classify(f) !== 'sat')) continue;
      if (wantUnsat === Logic.satisfiable(S)) continue;
      a = Logic.rand(U.pick([1, 2]), vs, ops);
      b = Logic.rand(U.pick([1, 2]), vs, ops);
      const sa = Logic.str(a), sb = Logic.str(b);
      if (sa === sb || sa.length > 18 || sb.length > 18) continue;
      if (Logic.classify(a) === 'taut' || Logic.classify(b) === 'taut') continue;
      if (S.some(f => Logic.str(f) === sa || Logic.str(f) === sb)) continue;
      if (!wantUnsat && (Logic.entails(S, a) !== wa || Logic.entails(S, b) !== wb)) continue;
      break;
    }
    const sat = Logic.satisfiable(S), ea = Logic.entails(S, a), eb = Logic.entails(S, b);
    const vars = Logic.varsOf([...S, a, b]);
    const Strue = v => S.every(f => Logic.ev(f, v));
    const cols = [
      ...S.map((f, i) => ({ h: Logic.str(f), fn: v => Logic.ev(f, v) })),
      { h: 'α', fn: v => Logic.ev(a, v), main: true },
      { h: 'β', fn: v => Logic.ev(b, v), main: true }
    ];
    const tbl = Logic.table(vars, cols, v => Strue(v) ? 'hl' : '',
      (c, v, val) => (c.main && Strue(v) && !val) ? 'bad' : '');
    const explain = (name, f, e) => {
      if (!sat) return `<li>S ⊨ ${name}: <b>platí</b> – S je nesplniteľný, preto z neho vyplýva každá formula.</li>`;
      if (e) return `<li>S ⊨ ${name}: <b>platí</b> – vo všetkých zvýraznených riadkoch je ${name} = 1.</li>`;
      const v = Logic.assignments(vars).find(v => Strue(v) && !Logic.ev(f, v));
      return `<li>S ⊨ ${name}: <b>neplatí</b> – protipríklad ${Logic.assignStr(v)}: všetky formuly S sú pravdivé, ale ${name} = 0.</li>`;
    };
    return {
      title: 'Vyplývanie zo systému formúl',
      statement: `Daný je systém formúl ${fm('S = {' + S.map(Logic.str).join(', ') + '}')} a formuly ` +
        `${fm('α: ' + Logic.str(a))}, ${fm('β: ' + Logic.str(b))}. Rozhodnite, či je S splniteľný a či platí S ⊨ α, S ⊨ β.`,
      form: F.part('a) Je systém S splniteľný?', 1, F.yesNo('s')) +
        F.part('b) Platí S ⊨ α?', 2, F.yesNo('a')) +
        F.part('c) Platí S ⊨ β?', 2, F.yesNo('b')),
      check(root) {
        const s = read.one(root, 's'), x = read.one(root, 'a'), y = read.one(root, 'b');
        markChips(root, 's', [sat ? 'y' : 'n']);
        markChips(root, 'a', [ea ? 'y' : 'n']);
        markChips(root, 'b', [eb ? 'y' : 'n']);
        return result([
          P('a) S splniteľný', s === (sat ? 'y' : 'n') ? 1 : 0, 1, yn(s), YN(sat)),
          P('b) S ⊨ α', x === (ea ? 'y' : 'n') ? 2 : 0, 2, yn(x), YN(ea)),
          P('c) S ⊨ β', y === (eb ? 'y' : 'n') ? 2 : 0, 2, yn(y), YN(eb))
        ]);
      },
      solution: `<p>Zvýraznené sú riadky, v ktorých sú pravdivé <b>všetky</b> formuly zo S. Červená 0 = protipríklad.</p>${tbl}` +
        `<ul><li>S je <b>${sat ? 'splniteľný' : 'nesplniteľný'}</b>${sat ? ' (existuje zvýraznený riadok)' : ' (žiadny riadok nie je zvýraznený)'}.</li>` +
        explain('α', a, ea) + explain('β', b, eb) + '</ul>' +
        `<p class="muted">Pravidlo: S ⊨ φ ⇔ v každom riadku, kde je S pravdivý, je pravdivá aj φ ⇔ S ∪ {¬φ} je nesplniteľný.</p>`
    };
  });

// =======================
// 3. KONJUNKTÍVNY TVAR
// =======================
reg('cnf', 'logic', 'Prepis do klauzúl (KT)',
  'Odstránenie ⇒ a ⇔, De Morgan, distributívnosť.', () => {
    let f;
    for (let i = 0; i < 3000; i++) {
      f = Logic.rand(U.pick([2, 3]), ['p', 'q', 'r'], ['imp', 'imp', 'eq', 'or', 'and', 'not']);
      const s = Logic.str(f), K = Logic.toClauses(f);
      if (s.length < 10 || s.length > 32 || Logic.isCNF(f)) continue;
      if (K.length < 2 || K.length > 5 || Logic.classify(f) !== 'sat') continue;
      if (!['imp', 'eq', 'not'].some(t => s.includes({ imp: '⇒', eq: '⇔', not: '¬(' }[t]))) continue;
      break;
    }
    const K = Logic.toClauses(f);
    const steps = Logic.cnfSteps(f);
    return {
      title: 'Konjunktívny tvar',
      statement: `Prepíšte formulu ${fm(Logic.str(f))} do konjunktívneho tvaru (konjunkcia klauzúl) a vypíšte jej klauzuly.`,
      form: F.part('Konjunktívny tvar (KT)', 5, F.formula('k', 'napr. (¬p ∨ q) ∧ (r ∨ ¬q)'),
        'Píš ako konjunkciu disjunkcií literálov. Môžeš použiť tlačidlá alebo ! & | -> <->.'),
      check(root) {
        const r = tryParse(read.text(root, 'k'));
        if (r.err) return result([P('KT', 0, 5, r.err, Logic.clausesToFormula(K))]);
        const eq = Logic.equivalent(f, r.f), cnf = Logic.isCNF(r.f);
        const pts = eq && cnf ? 5 : eq ? 2 : cnf ? 1 : 0;
        const note = eq && cnf ? '' : eq ? ' (ekvivalentná, ale nie je v KT)' : cnf ? ' (je v KT, ale nie je ekvivalentná)' : ' (nie je ekvivalentná)';
        return result([P('KT', pts, 5, Logic.str(r.f) + note, Logic.clausesToFormula(K))]);
      },
      solution: `<ol class="steps">` +
        `<li>Odstránime ⇒ a ⇔: α ⇒ β |=| ¬α ∨ β, α ⇔ β |=| (¬α ∨ β) ∧ (¬β ∨ α).</li>` +
        `<li>Negácie posunieme k premenným (De Morgan, ¬¬α |=| α).</li>` +
        `<li>Roznásobíme ∨ cez ∧ (distributívnosť) a vyhodíme tautologické klauzuly.</li></ol>` +
        `<div class="chain">${steps.map(s => fm(s)).join('<br>|=| ')}</div>` +
        `<p>Klauzuly: ${fm(Logic.clauseSetStr(K))} – spolu <b>${K.length}</b>.</p>` +
        `<p class="muted">Pozor: x ∧ y sú 2 klauzuly, {x} a {y}.</p>`
    };
  });

// spoločné zobrazenie rezolúcie
function resolutionHTML(K) {
  const pr = Logic.proof(K);
  const d = Logic.dp(K);
  let h = '';
  if (pr) {
    h += `<p><b>Rezolučné odvodenie prázdnej klauzuly F:</b></p><table class="res"><tr><th>č.</th><th>klauzula</th><th>rezolventa z</th></tr>` +
      pr.map(r => `<tr class="${r.c.length ? '' : 'hl'}"><td>${r.no}.</td><td>${fm(Logic.clauseStr(r.c))}</td><td>${r.from ? r.from.join(', ') : ''}</td></tr>`).join('') +
      '</table>';
  }
  h += `<p><b>Zrýchlená rezolučná metóda</b> (eliminácia premenných):</p><table class="res"><tr><th>p</th><th>K≠(p)</th><th>K₀(p) – s ¬p</th><th>K₁(p) – s p</th><th>K₀₁(p) – rezolventy</th></tr>` +
    d.steps.map(s => `<tr class="${s.empty ? 'hl' : ''}"><td><b>${s.p}</b></td><td>${fm(Logic.clauseSetStr(s.Kn))}</td><td>${fm(Logic.clauseSetStr(s.K0))}</td>` +
      `<td>${fm(Logic.clauseSetStr(s.K1))}</td><td>${fm(Logic.clauseSetStr(s.K01))}</td></tr>`).join('') + '</table>';
  h += d.sat
    ? `<p>Prázdnu klauzulu F sme neodvodili, takže systém klauzúl je <b>splniteľný</b>.</p>`
    : `<p>Odvodili sme prázdnu klauzulu <b>F</b>, takže systém klauzúl je <b>nesplniteľný</b>.</p>`;
  return h;
}

// =======================
// 4. REZOLÚCIA – VYPLÝVANIE
// =======================
reg('resolution', 'logic', 'Rezolučná metóda: platí S ⊨ φ?',
  'Prepis S ∪ {¬φ} na klauzuly a hľadanie F.', () => {
    const vs = U.pick([['p', 'q', 'r'], ['p', 'q', 'r', 's'], ['x', 'y', 'z', 't']]);
    const want = U.chance(0.6);
    let S, phi, all, K;
    for (let i = 0; i < 5000; i++) {
      S = U.range(U.pick([2, 3, 3])).map(() => Gen.rule(vs));
      if (!Logic.satisfiable(S)) continue;
      const l1 = Gen.literal(vs), l2 = Gen.literal(vs);
      phi = U.pick([() => l1, () => Logic.I(l1, l2), () => Logic.O(l1, l2)])();
      if (Logic.varsOf([phi]).length < Logic.str(phi).replace(/[^a-z]/g, '').length) continue;
      if (Logic.classify(phi) !== 'sat') continue;
      if (Logic.entails(S, phi) !== want) continue;
      all = [...S, Logic.N(phi)];
      K = Logic.dedupe(all.flatMap(Logic.toClauses));
      if (K.length < 4 || K.length > 9) continue;
      break;
    }
    const ent = Logic.entails(S, phi);
    const vars = Logic.varsOf(all);
    const target = Logic.conj(all);
    const model = Logic.models(all)[0];
    return {
      title: 'Rezolučná metóda',
      statement: `Pomocou rezolučnej metódy rozhodnite, či platí ${fm('S ⊨ φ')}, kde ${fm('S = {' + S.map(Logic.str).join(', ') + '}')} a ${fm('φ: ' + Logic.str(phi))}.`,
      form: F.part('a) Klauzuly systému S ∪ {¬φ}', 2, F.formula('k', 'konjunkcia všetkých klauzúl'),
        'Zapíš všetky klauzuly ako jednu konjunkciu, napr. (¬p ∨ q) ∧ r ∧ ¬s.') +
        F.part('b) Platí S ⊨ φ?', 2, F.yesNo('e')) +
        F.part('c) Ohodnotenie, pri ktorom sú pravdivé všetky formuly S ∪ {¬φ}', 1,
          F.radio('x', [{ v: 'y', l: 'existuje (zadaj ho)' }, { v: 'n', l: 'neexistuje' }]) + F.assign('m', vars)),
      check(root) {
        const r = tryParse(read.text(root, 'k'));
        let pa = 0, ya;
        if (r.err) ya = r.err;
        else {
          const eq = Logic.equivalent(target, r.f), cnf = Logic.isCNF(r.f);
          pa = eq && cnf ? 2 : eq ? 1 : 0;
          ya = Logic.str(r.f) + (eq ? (cnf ? '' : ' (nie je v KT)') : ' (nie je ekvivalentné s S ∪ {¬φ})');
        }
        const e = read.one(root, 'e'), x = read.one(root, 'x'), m = read.assign(root, 'm');
        markChips(root, 'e', [ent ? 'y' : 'n']);
        markChips(root, 'x', [ent ? 'n' : 'y']);
        let pc = 0, yc = yn(x === 'y' ? 'y' : x === 'n' ? 'n' : null);
        if (ent && x === 'n') pc = 1;
        if (!ent && x === 'y') {
          if (m && all.every(f => Logic.ev(f, m))) pc = 1;
          yc = m ? Logic.assignStr(m) + (pc ? '' : ' – toto ohodnotenie nevyhovuje') : 'nevyplnené ohodnotenie';
        }
        return result([
          P('a) klauzuly', pa, 2, ya, Logic.clausesToFormula(K)),
          P('b) S ⊨ φ', e === (ent ? 'y' : 'n') ? 2 : 0, 2, yn(e), YN(ent)),
          P('c) ohodnotenie', pc, 1, x === 'n' ? 'neexistuje' : yc, ent ? 'neexistuje (S ∪ {¬φ} je nesplniteľný)' : Logic.assignStr(model) + ' (alebo iné vyhovujúce)')
        ]);
      },
      solution: `<p>S ⊨ φ platí práve vtedy, keď je S ∪ {¬φ} nesplniteľný. Každú formulu prepíšeme na klauzuly:</p><ul>` +
        all.map((f, i) => `<li>${fm(Logic.cnfSteps(f).join('  |=|  '))}${i === all.length - 1 ? ' <span class="muted">(¬φ)</span>' : ''}</li>`).join('') +
        `</ul><p>Systém klauzúl: ${fm('K = ' + Logic.clauseSetStr(K))}</p>` + resolutionHTML(K) +
        `<p><b>Záver:</b> ${ent ? 'S ∪ {¬φ} je nesplniteľný, teda <b>S ⊨ φ platí</b>.' :
          `S ∪ {¬φ} je splniteľný (napr. ${Logic.assignStr(model)}), teda <b>S ⊨ φ neplatí</b>.`}</p>`
    };
  });

// =======================
// 5. SPLNITEĽNOSŤ SYSTÉMU KLAUZÚL
// =======================
reg('clauses-sat', 'logic', 'Splniteľnosť systému klauzúl',
  'Robinsonov princíp a zrýchlená rezolučná metóda.', () => {
    const vs = ['a', 'b', 'c', 'd'];
    const want = U.chance(0.5);
    let K;
    for (let i = 0; i < 20000; i++) {
      const m = U.rnd(5, 7);
      K = Logic.dedupe(U.range(m).map(() => {
        const size = U.pick([1, 2, 2, 2, 3, 3]);
        return Logic.normClause(U.sample(vs, size).map(v => U.chance(0.45) ? '¬' + v : v));
      }));
      if (K.length < 5 || K.filter(c => c.length === 1).length > 2) continue;
      if (Logic.varsOf(K.map(Logic.clauseFormula)).length < 4) continue;
      if (Logic.clauseSetSat(K) === want) break;
    }
    const sat = Logic.clauseSetSat(K);
    const vars = Logic.varsOf(K.map(Logic.clauseFormula));
    const model = sat ? Logic.clauseModels(K)[0] : null;
    return {
      title: 'Splniteľnosť systému klauzúl',
      statement: `Pomocou rezolučnej metódy rozhodnite, či je splniteľný systém klauzúl ${fm('K = ' + Logic.clauseSetStr(K))}. Ak je splniteľný, uveďte ohodnotenie premenných.`,
      form: F.part('a) Je K splniteľný?', 3, F.yesNo('s')) +
        F.part('b) Ohodnotenie, pri ktorom sú pravdivé všetky klauzuly', 2,
          F.radio('x', [{ v: 'y', l: 'existuje (zadaj ho)' }, { v: 'n', l: 'neexistuje' }]) + F.assign('m', vars)),
      check(root) {
        const s = read.one(root, 's'), x = read.one(root, 'x'), m = read.assign(root, 'm');
        markChips(root, 's', [sat ? 'y' : 'n']);
        markChips(root, 'x', [sat ? 'y' : 'n']);
        let pb = 0, yb = x === 'n' ? 'neexistuje' : '—';
        if (!sat && x === 'n') pb = 2;
        if (sat && x === 'y') {
          const ok = m && K.every(c => c.some(l => l[0] === '¬' ? !m[l.slice(1)] : m[l]));
          pb = ok ? 2 : 0;
          yb = m ? Logic.assignStr(m) + (ok ? '' : ' – nesplní všetky klauzuly') : 'nevyplnené';
        }
        return result([
          P('a) splniteľnosť', s === (sat ? 'y' : 'n') ? 3 : 0, 3, yn(s), YN(sat)),
          P('b) ohodnotenie', pb, 2, yb, sat ? Logic.assignStr(model) + ' (alebo iné vyhovujúce)' : 'neexistuje')
        ]);
      },
      solution: resolutionHTML(K) + (sat ? `<p>Vyhovujúce ohodnotenie: <b>${Logic.assignStr(model)}</b>.</p>` : '') +
        `<p class="muted">Robinsonov princíp: K je splniteľný ⇔ rezolučný uzáver R*(K) neobsahuje F.</p>`
    };
  });

// =======================
// 6. BOOLOVSKÁ FUNKCIA – MDT, MKT
// =======================
function minimize(onesMask, n, dnf) {
  // T = minterms, ktoré treba pokryť (jednotky pre DT, nuly pre KT)
  const T = U.range(1 << n).filter(m => ((onesMask >> m) & 1) === (dnf ? 1 : 0));
  const cubes = [];
  const gen = (pre) => {
    if (pre.length === n) { cubes.push(pre); return; }
    ['0', '1', '-'].forEach(c => gen(pre + c));
  };
  gen('');
  const covered = c => U.range(1 << n).filter(m => c.split('').every((ch, i) => ch === '-' || +ch === ((m >> (n - 1 - i)) & 1)));
  const impl = cubes.filter(c => covered(c).every(m => T.includes(m)));
  const contains = (big, small) => big.split('').every((ch, i) => ch === '-' || ch === small[i]);
  const primes = impl.filter(c => !impl.some(d => d !== c && contains(d, c)));
  const lits = c => c.split('').filter(ch => ch !== '-').length;
  let best = null, bestCost = Infinity;
  for (let mask = 1; mask < (1 << primes.length); mask++) {
    const sel = primes.filter((_, i) => mask & (1 << i));
    const cov = new Set(sel.flatMap(covered));
    if (!T.every(m => cov.has(m))) continue;
    const cost = sel.reduce((s, c) => s + lits(c), 0) * 100 + sel.length;
    if (cost < bestCost) { bestCost = cost; best = sel; }
  }
  return { cubes: best || [], lits: best ? best.reduce((s, c) => s + lits(c), 0) : 0, terms: best ? best.length : 0 };
}

function cubeStr(c, vs, dnf) {
  const parts = c.split('').map((ch, i) => ch === '-' ? null :
    dnf ? (ch === '1' ? vs[i] : '¬' + vs[i]) : (ch === '0' ? vs[i] : '¬' + vs[i])).filter(Boolean);
  if (parts.length === 1) return parts[0];
  return '(' + parts.join(dnf ? ' ∧ ' : ' ∨ ') + ')';
}

reg('boolean-min', 'logic', 'Boolovská funkcia: NDT, NKT, minimalizácia',
  'Úplné normálne tvary a Karnaughova mapa.', () => {
    const vs = ['x', 'y', 'z'];
    let mask;
    do { mask = U.rnd(1, 254); } while (![2, 3, 4, 5, 6].includes(8 - popcount(mask)));
    function popcount(m) { let c = 0; while (m) { c += m & 1; m >>= 1; } return c; }
    const val = m => (mask >> m) & 1;
    const bits = m => [(m >> 2) & 1, (m >> 1) & 1, m & 1].join('');
    const zeros = U.range(8).filter(m => !val(m));
    const ones = U.range(8).filter(m => val(m));
    const fn = v => !!val((v.x ? 4 : 0) + (v.y ? 2 : 0) + (v.z ? 1 : 0));
    const mdt = minimize(mask, 3, true), mkt = minimize(mask, 3, false);
    const mdtS = mdt.cubes.map(c => cubeStr(c, vs, true)).join(' ∨ ');
    const mktS = mkt.cubes.map(c => cubeStr(c, vs, false)).join(' ∧ ');
    const lit = (m, i, dnf) => { const b = (m >> (2 - i)) & 1; return dnf ? (b ? vs[i] : '¬' + vs[i]) : (b ? '¬' + vs[i] : vs[i]); };
    const ndt = ones.map(m => '(' + [0, 1, 2].map(i => lit(m, i, true)).join(' ∧ ') + ')').join(' ∨ ');
    const nkt = zeros.map(m => '(' + [0, 1, 2].map(i => lit(m, i, false)).join(' ∨ ') + ')').join(' ∧ ');
    const kOrder = ['00', '10', '11', '01'];
    const kmap = `<table class="kmap"><tr><th>x \\ yz</th>${kOrder.map(c => `<th>${c}</th>`).join('')}</tr>` +
      [0, 1].map(x => `<tr><th>${x}</th>${kOrder.map(c => { const m = x * 4 + parseInt(c, 2); return `<td class="${val(m) ? 'one' : ''}">${val(m)}</td>`; }).join('')}</tr>`).join('') + '</table>';
    const scoreForm = (s, dnf, max, best) => {
      const r = tryParse(s);
      if (r.err) return [0, r.err];
      const eq = Logic.equivFn(r.f, vs, fn);
      const form = dnf ? Logic.isDNF(r.f) : Logic.isCNF(r.f);
      const nL = Logic.countLits(r.f);
      const minimal = nL <= best.lits;
      let pts = 0;
      if (eq && form && minimal) pts = max;
      else if (eq && form) pts = max - 1;
      else if (eq) pts = max === 3 ? 1 : 0;
      const note = !eq ? ' (nerealizuje f)' : !form ? ` (nie je v ${dnf ? 'DT' : 'KT'})` : !minimal ? ` (nie je minimálny: ${nL} literálov, dá sa ${best.lits})` : '';
      return [pts, Logic.str(r.f) + note];
    };
    return {
      title: 'Minimálne tvary boolovskej funkcie',
      statement: `Boolovská funkcia f(x, y, z) nadobúda hodnotu 0 v argumentoch <b>${zeros.map(bits).join(', ')}</b> a hodnotu 1 v ostatných argumentoch. Nájdite jej minimálny disjunktívny tvar (MDT) a minimálny konjunktívny tvar (MKT).`,
      form: F.part('a) MDT', 3, F.formula('d', 'napr. (¬x ∧ ¬z) ∨ (y ∧ z)')) +
        F.part('b) MKT', 2, F.formula('k', 'napr. (y ∨ ¬z) ∧ (¬x ∨ z)')),
      check(root) {
        const [pa, ya] = scoreForm(read.text(root, 'd'), true, 3, mdt);
        const [pb, yb] = scoreForm(read.text(root, 'k'), false, 2, mkt);
        return result([P('a) MDT', pa, 3, ya, mdtS), P('b) MKT', pb, 2, yb, mktS)]);
      },
      solution: `<table class="tt"><tr><th>x</th><th>y</th><th>z</th><th class="main">f</th><th>elem. konjunkcia (f = 1)</th><th>elem. disjunkcia (f = 0)</th></tr>` +
        U.range(8).map(m => `<tr><td>${bits(m)[0]}</td><td>${bits(m)[1]}</td><td>${bits(m)[2]}</td><td class="main">${val(m)}</td>` +
          `<td>${val(m) ? [0, 1, 2].map(i => lit(m, i, true)).join(' ∧ ') : ''}</td><td>${val(m) ? '' : [0, 1, 2].map(i => lit(m, i, false)).join(' ∨ ')}</td></tr>`).join('') +
        `</table><p><b>NDT:</b> ${fm(ndt)}</p><p><b>NKT:</b> ${fm(nkt)}</p>` +
        `<p><b>Karnaughova mapa</b> (stĺpce v poradí 00, 10, 11, 01 – susedné sa líšia v jednom bite):</p>${kmap}` +
        `<p>Jednotky združujeme do čo najväčších obdĺžnikov veľkosti 1, 2, 4 (aj cez okraj mapy) → <b>MDT:</b> ${fm(mdtS)}</p>` +
        `<p>Nuly združujeme rovnako, z každej skupiny vznikne elementárna disjunkcia → <b>MKT:</b> ${fm(mktS)}</p>`
    };
  });

// =======================
// 7. VLASTNOSTI RELÁCIE
// =======================
reg('relation-props', 'rel', 'Vlastnosti binárnej relácie',
  'Reflexívnosť, symetria, antisymetria, tranzitívnosť.', () => {
    const A = [1, 2, 3, 4];
    let R, pr;
    do {
      R = Rel.random(A);
      pr = Rel.props(A, R);
    } while (R.length < 3 || (pr.sym.ok && pr.anti.ok && pr.refl.ok)); // vylúč identitu
    const isEq = pr.refl.ok && pr.sym.ok && pr.trans.ok;
    const isPO = pr.refl.ok && pr.anti.ok && pr.trans.ok;
    const kind = isEq ? 'eq' : isPO ? 'po' : 'none';
    const kinds = { eq: 'ekvivalencia', po: 'čiastočné usporiadanie', none: 'ani jedno' };
    const names = { refl: 'reflexívna', sym: 'symetrická', anti: 'antisymetrická', trans: 'tranzitívna' };
    const M = A.map(a => A.map(b => Rel.has(R, a, b) ? 1 : 0));
    const why = {
      refl: pr.refl.ok ? 'každý prvok má slučku (na diagonále matice sú samé 1)' : `chýba ${pr.refl.w.map(a => `(${a}, ${a})`).join(', ')}`,
      sym: pr.sym.ok ? 'ku každej dvojici (a, b) je v R aj (b, a)' : `${Rel.pairStr(pr.sym.w)} ∈ R, ale ${Rel.pairStr([pr.sym.w[1], pr.sym.w[0]])} ∉ R`,
      anti: pr.anti.ok ? 'žiadne dva rôzne prvky nie sú v relácii oboma smermi' : `${Rel.pairStr(pr.anti.w)} ∈ R aj ${Rel.pairStr([pr.anti.w[1], pr.anti.w[0]])} ∈ R, pričom ${pr.anti.w[0]} ≠ ${pr.anti.w[1]}`,
      trans: pr.trans.ok ? 'pre každé (a, b), (b, c) ∈ R je aj (a, c) ∈ R' : `(${pr.trans.w[0]}, ${pr.trans.w[1]}) ∈ R a (${pr.trans.w[1]}, ${pr.trans.w[2]}) ∈ R, ale (${pr.trans.w[0]}, ${pr.trans.w[2]}) ∉ R`
    };
    return {
      title: 'Vlastnosti relácie',
      statement: `Na množine A = {1, 2, 3, 4} je daná relácia ${fm('R = ' + Rel.setStr(R))}. Určte, ktoré vlastnosti má, a rozhodnite, či je to ekvivalencia alebo čiastočné usporiadanie.`,
      form: Object.keys(names).map(k => F.part(`Je R ${names[k]}?`, 1, F.yesNo(k))).join('') +
        F.part('Typ relácie', 1, F.radio('kind', Object.entries(kinds).map(([v, l]) => ({ v, l })))),
      check(root) {
        const parts = Object.keys(names).map(k => {
          const u = read.one(root, k);
          markChips(root, k, [pr[k].ok ? 'y' : 'n']);
          return P(names[k], u === (pr[k].ok ? 'y' : 'n') ? 1 : 0, 1, yn(u), YN(pr[k].ok));
        });
        const u = read.one(root, 'kind');
        markChips(root, 'kind', [kind]);
        parts.push(P('typ relácie', u === kind ? 1 : 0, 1, u ? kinds[u] : null, kinds[kind]));
        return result(parts);
      },
      solution: `<div class="row">${U.matrix(M, A, A)}${Draw.digraph(A, R)}</div><ul>` +
        Object.keys(names).map(k => `<li><b>${pr[k].ok ? '' : 'nie je '}${names[k]}</b> – ${why[k]}</li>`).join('') +
        `</ul><p>Typ: <b>${kinds[kind]}</b>${isEq ? `. Triedy ekvivalencie: ${Rel.classes(A, R).map(c => '{' + c.join(', ') + '}').join(', ')}` : ''}.</p>` +
        `<p class="muted">Ekvivalencia = R + S + T, čiastočné usporiadanie = R + AS + T.</p>`
    };
  });

// =======================
// 8. ZVÄZ – HASSE, KOMPLEMENTY
// =======================
function genPoset() {
  const wantLattice = U.chance(0.7);
  for (let t = 0; t < 2000; t++) {
    let labels, leq, desc;
    if (U.chance(0.55)) {
      const letters = 'abcd';
      const pool = U.range(14).map(i => i + 1).filter(m => m !== 15);
      const masks = [0, 15, ...U.sample(pool, U.rnd(4, 6))];
      masks.sort((a, b) => popc(a) - popc(b) || a - b);
      labels = masks.map(m => Poset.setLabel(m, letters));
      leq = (i, j) => (masks[i] & masks[j]) === masks[i];
      desc = `(A, ⊆), kde A = {${labels.join(', ')}}`;
    } else {
      const n = U.pick([12, 18, 20, 24, 28, 30, 36, 40, 42, 45, 48, 50, 54, 60, 63, 66, 70, 72, 84, 90]);
      let ds = U.range(n).map(i => i + 1).filter(d => n % d === 0);
      if (ds.length > 8) ds = [1, n, ...U.sample(ds.filter(d => d !== 1 && d !== n), U.rnd(4, 6))];
      if (ds.length < 5) continue;
      ds.sort((a, b) => a - b);
      labels = ds.map(String);
      leq = (i, j) => ds[j] % ds[i] === 0;
      desc = `(A, |), kde A = {${labels.join(', ')}} a | je relácia deliteľnosti`;
    }
    const po = Poset.make(labels, leq);
    if (po.isLattice !== wantLattice) continue;
    if (po.comparable.length > 26) continue;
    return { po, desc };
  }
  return genPoset();
  function popc(m) { let c = 0; while (m) { c += m & 1; m >>= 1; } return c; }
}

reg('lattice', 'rel', 'Hasseho diagram, zväz, komplementy',
  'Čiastočne usporiadaná množina (A, ⊆) alebo (A, |).', () => {
    const { po, desc } = genPoset();
    const L = po.labels;
    const key = ([i, j]) => `${i}-${j}`;
    const coverKeys = po.covers.map(key);
    const compl = U.range(po.n).map(i => po.compl(i));
    const complementary = po.isLattice && compl.every(c => c.length > 0);
    const incomparable = [];
    for (let i = 0; i < po.n; i++) for (let j = i + 1; j < po.n; j++) if (!po.L[i][j] && !po.L[j][i]) incomparable.push([i, j]);
    const supinf = incomparable.map(([i, j]) => {
      const s = po.sup(i, j), f = po.inf(i, j);
      return `<tr><td>${U.esc(L[i])}, ${U.esc(L[j])}</td><td>${s < 0 ? '<span class="badtxt">neexistuje</span>' : U.esc(L[s])}</td><td>${f < 0 ? '<span class="badtxt">neexistuje</span>' : U.esc(L[f])}</td></tr>`;
    }).join('');
    const complRows = U.range(po.n).map(i =>
      `<div class="crow"><span class="clabel">${U.esc(L[i])}:</span>${F.chips('c' + i, U.range(po.n).filter(j => j !== i).map(j => ({ v: j, l: U.esc(L[j]) })))}</div>`).join('');
    return {
      title: 'Zväz a komplementy',
      statement: `Daná je čiastočne usporiadaná množina ${fm(desc)}. (a) Znázornite Hasseho diagram. (b) Rozhodnite, či je to zväz. (c) Určte všetky komplementy ku každému prvku, ak existujú, a rozhodnite, či ide o komplementárny zväz.`,
      form: F.part('a) Hasseho diagram', 2, F.chips('h', po.comparable.map(p => ({ v: key(p), l: `${U.esc(L[p[0]])} – ${U.esc(L[p[1]])}` }))),
        'Vyber všetky dvojice (dolný – horný), ktoré budú v diagrame spojené hranou, t. j. horný prvok pokrýva dolný.') +
        F.part('b) Je to zväz?', 1, F.yesNo('z')) +
        F.part('c) Komplementy jednotlivých prvkov', 1, complRows,
          `Komplement x′ prvku x: x ∧ x′ = ${U.esc(L[po.bottom])} (najmenší) a x ∨ x′ = ${U.esc(L[po.top])} (najväčší). Ak prvok nemá komplement, nevyberaj nič.`) +
        F.part('d) Je to komplementárny zväz?', 1, F.yesNo('k')),
      check(root) {
        const h = read.chips(root, 'h');
        markChips(root, 'h', coverKeys);
        const sd = U.symDiff(h, coverKeys);
        const z = read.one(root, 'z'), k = read.one(root, 'k');
        markChips(root, 'z', [po.isLattice ? 'y' : 'n']);
        markChips(root, 'k', [complementary ? 'y' : 'n']);
        let wrongRows = 0;
        U.range(po.n).forEach(i => {
          const sel = read.chips(root, 'c' + i).map(Number);
          markChips(root, 'c' + i, compl[i]);
          if (!U.setEq(sel, compl[i])) wrongRows++;
        });
        return result([
          P('a) hrany Hasseho diagramu', sd === 0 ? 2 : sd === 1 ? 1 : 0, 2, `${h.length} hrán, ${sd} chýb`, `${coverKeys.length} hrán`),
          P('b) je zväz', z === (po.isLattice ? 'y' : 'n') ? 1 : 0, 1, yn(z), YN(po.isLattice)),
          P('c) komplementy', wrongRows === 0 ? 1 : 0, 1, wrongRows ? `${wrongRows} riadkov zle` : 'všetko správne',
            U.range(po.n).map(i => `${L[i]}: ${compl[i].length ? compl[i].map(j => L[j]).join(', ') : '—'}`).join('; ')),
          P('d) komplementárny zväz', k === (complementary ? 'y' : 'n') ? 1 : 0, 1, yn(k), YN(complementary))
        ]);
      },
      solution: `<p><b>a)</b> Hasseho diagram – hrana vedie od x k y, keď y pokrýva x (x < y a medzi nimi nie je iný prvok):</p>` +
        Draw.hasse(L, po.level, po.covers) +
        `<p><b>b)</b> Pre neporovnateľné dvojice hľadáme spojenie (supremum = najmenšie horné ohraničenie) a priesek (infimum = najväčšie dolné ohraničenie):</p>` +
        (incomparable.length ? `<table class="res"><tr><th>dvojica</th><th>spojenie ∨</th><th>priesek ∧</th></tr>${supinf}</table>` : '<p>Všetky prvky sú porovnateľné (reťazec).</p>') +
        `<p>Pre porovnateľné prvky je spojenie väčší a priesek menší z nich. Teda <b>${po.isLattice ? 'je to zväz' : 'nie je to zväz'}</b>${po.isLattice ? '' : ' – niektorá dvojica nemá spojenie alebo priesek'}.</p>` +
        `<p><b>c)</b> Komplementy (x ∧ x′ = ${U.esc(L[po.bottom])}, x ∨ x′ = ${U.esc(L[po.top])}):</p><ul>` +
        U.range(po.n).map(i => `<li>${U.esc(L[i])}: ${compl[i].length ? compl[i].map(j => U.esc(L[j])).join(', ') : '<span class="badtxt">nemá komplement</span>'}</li>`).join('') +
        `</ul><p><b>d)</b> ${complementary ? 'Každý prvok má komplement → <b>komplementárny zväz</b>.' : po.isLattice ? 'Niektorý prvok nemá komplement → <b>nie je</b> komplementárny zväz.' : 'Nie je to zväz, teda ani komplementárny zväz.'}</p>` +
        (po.isLattice ? `<p class="muted">Navyše: zväz ${po.distributive ? '<b>je</b> distributívny' : '<b>nie je</b> distributívny (obsahuje podzväz N₅ alebo M₅; v distributívnom zväze má každý prvok najviac jeden komplement)'}${po.distributive && complementary ? ' a komplementárny, teda je to boolovský zväz' : ''}.</p>` : '')
    };
  });

// =======================
// 9. HAVLOVA VETA
// =======================
function havelHTML(seq) {
  const h = Graph.havel(seq);
  let s = '<div class="havel">';
  h.steps.forEach(st => {
    s += `<div>${st.from.map((x, i) => i === 0 ? `<u>${x}</u>` : i <= st.d ? `<b>${x}</b>` : x).join(', ')}</div>`;
  });
  s += `<div>${h.last.join(', ')} ${h.ok ? '<span class="oktxt">✔ samé nuly → grafová</span>' : `<span class="badtxt">✘ ${h.reason} → nie je grafová</span>`}</div></div>`;
  return { html: s, ok: h.ok };
}

reg('havel', 'graph', 'Grafová postupnosť s parametrom k',
  'Havlova veta, parita, zostrojenie grafu.', () => {
    let n, seq, pos, valid;
    for (let t = 0; t < 3000; t++) {
      n = U.rnd(6, 8);
      let edges = [];
      const full = U.chance(0.5) ? U.rnd(1, 2) : 0; // vrcholy stupňa n-1 ako v teste
      for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) {
        if (a < full || U.chance(0.4)) edges.push([a, b]);
      }
      const deg = Graph.degrees(n, edges);
      if (deg.some(d => d === 0)) continue;
      seq = U.shuffle(deg);
      pos = U.rnd(0, n - 1);
      valid = U.range(n).filter(k => { const s = [...seq]; s[pos] = k; return Graph.havel(s).ok; });
      const parityOk = U.range(n).filter(k => (seq.reduce((a, b) => a + b, 0) - seq[pos] + k) % 2 === 0);
      if (valid.length === 0) continue;
      if (valid.length === parityOk.length && U.chance(0.75)) continue; // nech je to zaujímavé
      break;
    }
    const restSum = seq.reduce((a, b) => a + b, 0) - seq[pos];
    const shown = seq.map((x, i) => i === pos ? 'k' : x).join(', ');
    const kMin = valid[0];
    const sMin = [...seq]; sMin[pos] = kMin;
    const edgesMin = Graph.construct(sMin);
    const parityOk = U.range(n).filter(k => (restSum + k) % 2 === 0);
    const labels = sMin.map((d, i) => `v${i + 1}`);
    return {
      title: 'Grafová postupnosť',
      statement: `Určte, pre aké hodnoty k je postupnosť <b>${shown}</b> grafová. V oboch prípadoch (áno aj nie) svoje tvrdenie zdôvodnite. Pre najmenšie vyhovujúce k určte počet hrán grafu.`,
      form: F.part('a) Všetky hodnoty k, pre ktoré je postupnosť grafová', 3, F.chips('k', U.range(n).map(k => ({ v: k, l: 'k = ' + k })))) +
        F.part('b) Počet hrán grafu pre najmenšie vyhovujúce k', 2, F.num('e')),
      check(root) {
        const ks = read.chips(root, 'k').map(Number);
        markChips(root, 'k', valid);
        const sd = U.symDiff(ks, valid);
        const e = read.num(root, 'e'), m = (restSum + kMin) / 2;
        return result([
          P('a) hodnoty k', Math.max(0, 3 - sd), 3, U.list(ks), U.list(valid)),
          P('b) počet hrán', e === m ? 2 : 0, 2, e, `${m} (súčet stupňov / 2)`)
        ]);
      },
      solution: `<ul><li>Graf má ${n} vrcholov, stupeň vrchola je najviac ${n - 1}, teda k ∈ {0, …, ${n - 1}}.</li>` +
        `<li>Súčet stupňov = ${restSum} + k musí byť párny (= 2|H|), teda k ∈ {${parityOk.join(', ')}}.</li>` +
        (seq.filter((x, i) => i !== pos && x === n - 1).length ? `<li>Vrchol stupňa ${n - 1} je spojený so všetkými ostatnými, preto žiadny vrchol nemôže mať stupeň 0${seq.filter((x, i) => i !== pos && x === n - 1).length >= 2 ? ' ani 1' : ''}.</li>` : '') +
        `</ul><p>Havlova veta (podčiarknutý člen odoberieme, od tučných odčítame 1):</p><div class="havel-grid">` +
        parityOk.map(k => { const s = [...seq]; s[pos] = k; const r = havelHTML(s); return `<div class="card-mini"><b>k = ${k}</b>${r.html}</div>`; }).join('') +
        `</div><p><b>Výsledok:</b> postupnosť je grafová pre k ∈ {${valid.join(', ')}}.</p>` +
        (edgesMin ? `<p>Graf pre k = ${kMin} (stupne ${sMin.join(', ')}), počet hrán = ${(restSum + kMin) / 2}:</p>${Draw.graph(n, edgesMin, labels.map((l, i) => `${sMin[i]}`))}` : '')
    };
  });

// =======================
// 10. VZDIALENOSTI Z MATICE SUSEDNOSTI
// =======================
reg('matrix-dist', 'graph', 'Vzdialenosti, polomer a stred z matice',
  'Matice B⁽ᵏ⁾ s boolovským násobením.', () => {
    let n, edges, D, diam;
    for (let t = 0; t < 2000; t++) {
      n = U.rnd(6, 7);
      edges = Graph.randomConnected(n, U.rnd(0, 2));
      D = Graph.dist(n, edges);
      diam = Math.max(...D.flat());
      const has3 = D.flat().includes(3);
      if (diam >= 3 && diam <= 5 && has3 && (diam >= 4 || U.chance(0.4))) break;
    }
    const B = Graph.adj(n, edges);
    const lab = U.range(n).map(i => `v${i + 1}`);
    const pairs = [];
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) pairs.push([i, j]);
    const pk = ([i, j]) => `${i}-${j}`;
    const pl = ([i, j]) => `{${lab[i]}, ${lab[j]}}`;
    const d3 = pairs.filter(([i, j]) => D[i][j] === 3).map(pk);
    const dgt = pairs.filter(([i, j]) => D[i][j] > 3).map(pk);
    const ecc = D.map(r => Math.max(...r));
    const rad = Math.min(...ecc);
    const center = U.range(n).filter(i => ecc[i] === rad);
    const pows = Graph.boolPowers(B);
    return {
      title: 'Vzdialenosti v grafe',
      statement: `Graf G je zadaný maticou susednosti B. Bez kreslenia grafu určte: (a) dvojice vrcholov, ktoré majú vzdialenosť rovnú 3; (b) dvojice vrcholov, ktoré majú vzdialenosť väčšiu ako 3; (c) polomer a stred grafu G.` +
        `<div class="center">B = ${U.matrix(B, lab, lab)}</div>`,
      form: F.part('a) Vzdialenosť presne 3', 2, F.chips('a', pairs.map(p => ({ v: pk(p), l: pl(p) })))) +
        F.part('b) Vzdialenosť väčšia ako 3', 1, F.chips('b', pairs.map(p => ({ v: pk(p), l: pl(p) })))) +
        F.part('c) Polomer r(G)', 1, F.num('r')) +
        F.part('d) Stred grafu', 1, F.chips('s', lab.map((l, i) => ({ v: i, l })))),
      check(root) {
        const a = read.chips(root, 'a'), b = read.chips(root, 'b'), r = read.num(root, 'r');
        const s = read.chips(root, 's').map(Number);
        markChips(root, 'a', d3); markChips(root, 'b', dgt); markChips(root, 's', center);
        const sa = U.symDiff(a, d3);
        const nm = keys => U.list(keys.map(k => pl(k.split('-').map(Number))));
        return result([
          P('a) vzdialenosť 3', sa === 0 ? 2 : sa === 1 ? 1 : 0, 2, nm(a), nm(d3)),
          P('b) vzdialenosť > 3', U.setEq(b, dgt) ? 1 : 0, 1, nm(b), nm(dgt)),
          P('c) polomer', r === rad ? 1 : 0, 1, r, rad),
          P('d) stred', U.setEq(s, center) ? 1 : 0, 1, U.list(s.map(i => lab[i])), U.list(center.map(i => lab[i])))
        ]);
      },
      solution: `<p>B⁽¹⁾ = B + jednotky na diagonále, B⁽ᵏ⁾ = B⁽ᵏ⁻¹⁾ · B⁽¹⁾ (boolovsky: 1 + 1 = 1). Platí b⁽ᵏ⁾ᵢⱼ = 1 ⇔ d(vᵢ, vⱼ) ≤ k. Zvýraznené sú jednotky, ktoré pribudli v danom kroku.</p><div class="mx-row">` +
        pows.map((M, k) => `<div><div class="mx-title">B<sup>(${k + 1})</sup></div>${U.matrix(M, lab, lab, (i, j) => (k > 0 && M[i][j] && !pows[k - 1][i][j]) ? 'new' : '')}</div>`).join('') +
        `</div><ul><li>Vzdialenosť 3 (nula v B⁽²⁾, jednotka v B⁽³⁾): ${U.list(d3.map(k => pl(k.split('-').map(Number))))}</li>` +
        `<li>Vzdialenosť &gt; 3 (nula aj v B⁽³⁾): ${U.list(dgt.map(k => pl(k.split('-').map(Number)) + ` (d = ${D[k.split('-')[0]][k.split('-')[1]]})`))}</li></ul>` +
        `<table class="res"><tr><th>vrchol</th>${lab.map(l => `<th>${l}</th>`).join('')}</tr><tr><td>excentricita e(v)</td>${ecc.map((e, i) => `<td class="${center.includes(i) ? 'hl' : ''}">${e}</td>`).join('')}</tr></table>` +
        `<p>Polomer r(G) = min e(v) = <b>${rad}</b>, priemer P(G) = max e(v) = ${diam}, stred = <b>{${center.map(i => lab[i]).join(', ')}}</b>. Kontrola: r ≤ P ≤ 2r.</p>` +
        `<p>Pre kontrolu – graf:</p>${Draw.graph(n, edges, lab, { nodeCls: i => center.includes(i) ? 'hlnode' : '' })}`
    };
  });

// =======================
// 11. POČET KOSTIER
// =======================
reg('spanning', 'graph', 'Počet kostier grafu',
  'Matica D − B a determinant.', () => {
    const n = U.rnd(4, 5);
    let edges;
    for (let t = 0; t < 500; t++) {
      edges = Graph.randomConnected(n, U.rnd(1, n === 4 ? 2 : 4));
      if (edges.length < n * (n - 1) / 2 || U.chance(0.15)) break;
    }
    const lab = 'abcde'.slice(0, n).split('');
    const B = Graph.adj(n, edges);
    const deg = Graph.degrees(n, edges);
    const L = B.map((r, i) => r.map((x, j) => i === j ? deg[i] : -x));
    const minor = L.slice(1).map(r => r.slice(1));
    const cnt = Graph.det(minor);
    return {
      title: 'Počet kostier',
      statement: `Graf G = (V, H) má vrcholy V = {${lab.join(', ')}} a hrany H = {${edges.map(([a, b]) => `{${lab[a]}, ${lab[b]}}`).join(', ')}}. Vypočítajte počet rôznych kostier grafu G.`,
      form: F.part('a) Počet hrán, ktoré bude mať každá kostra', 1, F.num('h')) +
        F.part('b) Počet rôznych kostier', 4, F.num('k')),
      check(root) {
        const h = read.num(root, 'h'), k = read.num(root, 'k');
        return result([
          P('a) hrán v kostre', h === n - 1 ? 1 : 0, 1, h, `${n - 1} (|V| − 1)`),
          P('b) počet kostier', k === cnt ? 4 : 0, 4, k, cnt)
        ]);
      },
      solution: `${Draw.graph(n, edges, lab, { size: 220 })}<p>Kostra je strom, ktorý obsahuje všetky vrcholy, teda má |V| − 1 = <b>${n - 1}</b> hrán.</p>` +
        `<p>Matica susednosti B, diagonálna matica stupňov D a matica D − B:</p><div class="mx-row">` +
        `<div><div class="mx-title">B</div>${U.matrix(B, lab, lab)}</div><div><div class="mx-title">D</div>${U.matrix(deg.map((d, i) => deg.map((_, j) => i === j ? d : 0)), lab, lab)}</div>` +
        `<div><div class="mx-title">D − B</div>${U.matrix(L, lab, lab)}</div></div>` +
        `<p>Vynecháme 1. riadok a 1. stĺpec (vrchol ${lab[0]}) a vypočítame determinant:</p>` +
        `<div class="center">det ${U.matrix(minor)} = <b>${cnt}</b></div>` +
        `<p>Graf má <b>${cnt}</b> rôznych kostier.</p>` +
        (edges.length === n * (n - 1) / 2 ? `<p class="muted">Je to K${n}, podľa Cayleyho vzorca n^(n−2) = ${n ** (n - 2)}.</p>` : '')
    };
  });

// =======================
// 12. STRED STROMU
// =======================
reg('tree-center', 'graph', 'Stred, polomer a priemer stromu',
  'Postupné odstraňovanie listov.', () => {
    let n, edges, D, diam;
    do {
      n = U.rnd(7, 10);
      edges = Graph.randomTree(n);
      D = Graph.dist(n, edges);
      diam = Math.max(...D.flat());
    } while (diam < 3);
    const lab = U.range(n).map(i => `v${i + 1}`);
    const ecc = D.map(r => Math.max(...r));
    const rad = Math.min(...ecc);
    const center = U.range(n).filter(i => ecc[i] === rad);
    const deg = Graph.degrees(n, edges);
    const leaves = U.range(n).filter(i => deg[i] === 1).length;
    const tc = Graph.treeCenter(n, edges);
    return {
      title: 'Stred stromu',
      statement: `Strom T = (V, H) má vrcholy v1, …, v${n} a hrany H = {${edges.map(([a, b]) => a < b ? [a, b] : [b, a]).sort((x, y) => x[0] - y[0] || x[1] - y[1]).map(([a, b]) => `{${lab[a]}, ${lab[b]}}`).join(', ')}}. Nájdite stred, polomer a priemer stromu.`,
      form: F.part('a) Polomer r(T)', 1, F.num('r')) + F.part('b) Priemer P(T)', 1, F.num('p')) +
        F.part('c) Stred stromu', 2, F.chips('s', lab.map((l, i) => ({ v: i, l })))) +
        F.part('d) Počet listov (vrcholov stupňa 1)', 1, F.num('l')),
      check(root) {
        const r = read.num(root, 'r'), p = read.num(root, 'p'), l = read.num(root, 'l');
        const s = read.chips(root, 's').map(Number);
        markChips(root, 's', center);
        return result([
          P('a) polomer', r === rad ? 1 : 0, 1, r, rad),
          P('b) priemer', p === diam ? 1 : 0, 1, p, diam),
          P('c) stred', U.setEq(s, center) ? 2 : 0, 2, U.list(s.map(i => lab[i])), U.list(center.map(i => lab[i]))),
          P('d) listy', l === leaves ? 1 : 0, 1, l, leaves)
        ]);
      },
      solution: `${Draw.tree(n, edges, lab, center[0], { nodeCls: i => center.includes(i) ? 'hlnode' : '' })}` +
        `<p>Opakovane odstraňujeme všetky listy (vrcholy stupňa 1):</p><ol class="steps">` +
        tc.rounds.map(r => `<li>odstránime ${r.map(i => lab[i]).join(', ')}</li>`).join('') +
        `</ol><p>Zostal${tc.center.length === 1 ? ' jediný vrchol' : 'a hrana'} <b>{${tc.center.map(i => lab[i]).join(', ')}}</b> – to je stred. ` +
        `Počet iterácií = ${tc.rounds.length}, teda r(T) = ${tc.center.length === 1 ? tc.rounds.length : tc.rounds.length + ' + 1'} = <b>${rad}</b>.</p>` +
        `<p>Priemer: ${tc.center.length === 1 ? `stred je jeden vrchol → P(T) = 2r(T) = ${2 * rad}` : `stred sú dva vrcholy → P(T) = 2r(T) − 1 = ${2 * rad - 1}`}.</p>` +
        `<p>Listy (stupeň 1): ${leaves}.</p>`
    };
  });

// =======================
// ZÁPOČTOVÉ TESTY
// =======================
const EXAMS = {
  zA: {
    name: 'Zápočet A – logika a relácie',
    desc: 'Podľa tabule: formula a systém formúl, rezolučná metóda, binárna relácia.',
    time: 50,
    slots: [['entail', 'formula-type'], ['resolution', 'resolution', 'clauses-sat'], ['relation-props']]
  },
  zB: {
    name: 'Zápočet B – zväzy a grafy',
    desc: 'Podľa vzoru Z-05: zväz, grafová postupnosť, matica susednosti.',
    time: 50,
    slots: [['lattice'], ['havel'], ['matrix-dist', 'matrix-dist', 'spanning', 'tree-center']]
  },
  mix: {
    name: 'Mix – všetko',
    desc: 'Po jednej úlohe z logiky, relácií a grafov.',
    time: 50,
    slots: [['formula-type', 'entail', 'cnf', 'resolution', 'clauses-sat', 'boolean-min'], ['relation-props', 'lattice'], ['havel', 'matrix-dist', 'spanning', 'tree-center']]
  }
};
