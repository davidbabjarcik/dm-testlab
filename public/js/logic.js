'use strict';

// =======================
// VÝROKOVÁ LOGIKA
// formula = strom: {t:'var',n} | {t:'not',a} | {t:'and'|'or'|'imp'|'eq',a,b}
// =======================
const Logic = (() => {
  const SYM = { and: '∧', or: '∨', imp: '⇒', eq: '⇔' };

  const V = n => ({ t: 'var', n });
  const N = a => ({ t: 'not', a });
  const A = (a, b) => ({ t: 'and', a, b });
  const O = (a, b) => ({ t: 'or', a, b });
  const I = (a, b) => ({ t: 'imp', a, b });
  const E = (a, b) => ({ t: 'eq', a, b });

  // ---------- PARSER ----------
  function tokenize(s) {
    const out = [];
    const multi = [['<=>', 'EQ'], ['<->', 'EQ'], ['->', 'IMP'], ['=>', 'IMP'], ['/\\', 'AND'], ['\\/', 'OR']];
    let i = 0;
    while (i < s.length) {
      const c = s[i];
      if (/\s/.test(c)) { i++; continue; }
      const m = multi.find(([k]) => s.startsWith(k, i));
      if (m) { out.push({ t: m[1] }); i += m[0].length; continue; }
      if ('¬!~'.includes(c)) out.push({ t: 'NOT' });
      else if ('∧&*^'.includes(c)) out.push({ t: 'AND' });
      else if ('∨|+'.includes(c)) out.push({ t: 'OR' });
      else if ('⇒→'.includes(c)) out.push({ t: 'IMP' });
      else if ('⇔↔'.includes(c)) out.push({ t: 'EQ' });
      else if (c === '(' || c === ')') out.push({ t: c });
      else if (/[a-zA-Z]/.test(c)) out.push({ t: 'VAR', n: c.toLowerCase() });
      else throw new Error(`Neznámy znak „${c}“`);
      i++;
    }
    return out;
  }

  function parse(s) {
    const tk = tokenize(s);
    let p = 0;
    const eat = t => (tk[p] && tk[p].t === t) ? (p++, true) : false;

    function eq() { let l = imp(); while (eat('EQ')) l = E(l, imp()); return l; }
    function imp() { const l = or(); return eat('IMP') ? I(l, imp()) : l; }
    function or() { let l = and(); while (eat('OR')) l = O(l, and()); return l; }
    function and() { let l = not(); while (eat('AND')) l = A(l, not()); return l; }
    function not() { return eat('NOT') ? N(not()) : atom(); }
    function atom() {
      const x = tk[p];
      if (!x) throw new Error('Formula je neúplná');
      if (x.t === 'VAR') { p++; return V(x.n); }
      if (eat('(')) {
        const e = eq();
        if (!eat(')')) throw new Error('Chýba zátvorka „)“');
        return e;
      }
      throw new Error('Na tomto mieste čakám premennú, ¬ alebo „(“');
    }

    if (!tk.length) throw new Error('Prázdna formula');
    const r = eq();
    if (p < tk.length) {
      throw new Error(tk[p].t === 'VAR'
        ? 'Medzi premennými chýba spojka (pre ∨ použi | alebo +)'
        : 'Nadbytočný symbol alebo zátvorka');
    }
    return r;
  }

  // ---------- VÝPIS ----------
  function str(n) {
    if (n.t === 'var') return n.n;
    if (n.t === 'not') {
      const s = str(n.a);
      return '¬' + (n.a.t === 'var' || n.a.t === 'not' ? s : `(${s})`);
    }
    const wrap = c => {
      const s = str(c);
      if (c.t === 'var' || c.t === 'not') return s;
      if (n.t === 'imp' || n.t === 'eq' || c.t !== n.t) return `(${s})`;
      return s;
    };
    return `${wrap(n.a)} ${SYM[n.t]} ${wrap(n.b)}`;
  }

  // ---------- SÉMANTIKA ----------
  function ev(n, v) {
    switch (n.t) {
      case 'var': return v[n.n];
      case 'not': return !ev(n.a, v);
      case 'and': return ev(n.a, v) && ev(n.b, v);
      case 'or': return ev(n.a, v) || ev(n.b, v);
      case 'imp': return !ev(n.a, v) || ev(n.b, v);
      case 'eq': return ev(n.a, v) === ev(n.b, v);
    }
  }

  function vars(n, s = new Set()) {
    if (n.t === 'var') s.add(n.n);
    else { if (n.a) vars(n.a, s); if (n.b) vars(n.b, s); }
    return s;
  }
  const varsOf = list => { const s = new Set(); list.forEach(f => vars(f, s)); return [...s].sort(); };

  function assignments(vs) {
    const out = [];
    for (let m = 0; m < (1 << vs.length); m++) {
      const v = {};
      vs.forEach((x, i) => { v[x] = !!((m >> (vs.length - 1 - i)) & 1); });
      out.push(v);
    }
    return out;
  }

  const classify = f => {
    const r = assignments(varsOf([f])).map(v => ev(f, v));
    if (r.every(x => x)) return 'taut';
    if (r.every(x => !x)) return 'contr';
    return 'sat';
  };
  const equivalent = (f, g) => assignments(varsOf([f, g])).every(v => ev(f, v) === ev(g, v));
  const entails = (S, phi) => assignments(varsOf([...S, phi])).every(v => !S.every(f => ev(f, v)) || ev(phi, v));
  const satisfiable = S => assignments(varsOf(S)).some(v => S.every(f => ev(f, v)));
  const models = S => assignments(varsOf(S)).filter(v => S.every(f => ev(f, v)));
  const conj = list => list.reduce((acc, f) => acc ? A(acc, f) : f, null);

  // Ekvivalencia formuly s funkciou danou cez premenné vs
  function equivFn(g, vs, fn) {
    const all = [...new Set([...vs, ...varsOf([g])])].sort();
    return assignments(all).every(v => ev(g, v) === fn(v));
  }

  // ---------- TVARY ----------
  const flat = (n, t) => n.t === t ? [...flat(n.a, t), ...flat(n.b, t)] : [n];
  const isLit = n => n.t === 'var' || (n.t === 'not' && n.a.t === 'var');
  const isCNF = n => flat(n, 'and').every(c => flat(c, 'or').every(isLit));
  const isDNF = n => flat(n, 'or').every(c => flat(c, 'and').every(isLit));
  const countLits = n => n.t === 'var' ? 1 : n.t === 'not' ? countLits(n.a) : countLits(n.a) + countLits(n.b);

  // odstránenie ⇒ a ⇔ (ako v prednáške)
  function elim(n) {
    switch (n.t) {
      case 'var': return n;
      case 'not': return N(elim(n.a));
      case 'and': case 'or': return { t: n.t, a: elim(n.a), b: elim(n.b) };
      case 'imp': return O(N(elim(n.a)), elim(n.b));
      case 'eq': {
        const a = elim(n.a), b = elim(n.b);
        return A(O(N(a), b), O(N(b), a));
      }
    }
  }

  // negácie až k premenným (De Morgan, dvojitá negácia)
  function nnf(n) {
    if (n.t === 'not') {
      const a = n.a;
      if (a.t === 'var') return n;
      if (a.t === 'not') return nnf(a.a);
      if (a.t === 'and') return O(nnf(N(a.a)), nnf(N(a.b)));
      if (a.t === 'or') return A(nnf(N(a.a)), nnf(N(a.b)));
    }
    if (n.t === 'and' || n.t === 'or') return { t: n.t, a: nnf(n.a), b: nnf(n.b) };
    return n;
  }

  // ---------- KLAUZULY ----------
  const neg = l => l[0] === '¬' ? l.slice(1) : '¬' + l;
  const varOfLit = l => l.replace('¬', '');
  const litCmp = (x, y) => varOfLit(x).localeCompare(varOfLit(y)) || (x.length - y.length);
  const normClause = c => [...new Set(c)].sort(litCmp);
  const isTautClause = c => c.some(l => c.includes(neg(l)));
  const clauseKey = c => c.join(',');
  const clauseStr = c => c.length ? c.join(' ∨ ') : 'F';
  const clauseSetStr = K => '{' + K.map(clauseStr).join(', ') + '}';

  function dedupe(cs) {
    const seen = new Set(), out = [];
    for (const c of cs) { const k = clauseKey(c); if (!seen.has(k)) { seen.add(k); out.push(c); } }
    return out;
  }
  function removeSubsumed(cs) {
    return cs.filter(c => !cs.some(d => d !== c && d.length < c.length && d.every(l => c.includes(l))));
  }

  function clausesOfNNF(n) {
    if (n.t === 'var') return [[n.n]];
    if (n.t === 'not') return [['¬' + n.a.n]];
    if (n.t === 'and') return [...clausesOfNNF(n.a), ...clausesOfNNF(n.b)];
    const L = clausesOfNNF(n.a), R = clausesOfNNF(n.b), out = [];
    for (const x of L) for (const y of R) out.push([...x, ...y]);
    return out;
  }

  function toClauses(f) {
    let cs = clausesOfNNF(nnf(elim(f))).map(normClause).filter(c => !isTautClause(c));
    return removeSubsumed(dedupe(cs));
  }

  const clausesToFormula = K => {
    if (!K.length) return 'T';
    if (K.length === 1) return clauseStr(K[0]);
    return K.map(c => '(' + clauseStr(c) + ')').join(' ∧ ').replace(/\((¬?[a-z])\)/g, '$1');
  };

  // kroky prepisu formuly do KT (na zobrazenie v riešení)
  function cnfSteps(f) {
    const steps = [str(f)];
    const e = elim(f), sE = str(e);
    if (sE !== steps[steps.length - 1]) steps.push(sE);
    const nn = nnf(e), sN = str(nn);
    if (sN !== steps[steps.length - 1]) steps.push(sN);
    const sK = clausesToFormula(toClauses(f));
    if (sK !== steps[steps.length - 1]) steps.push(sK);
    return steps;
  }

  // ---------- REZOLÚCIA ----------
  function resolvents(c1, c2) {
    const out = [];
    for (const l of c1) {
      if (c2.includes(neg(l))) {
        const r = normClause([...c1.filter(x => x !== l), ...c2.filter(x => x !== neg(l))]);
        if (!isTautClause(r)) out.push(r);
      }
    }
    return out;
  }

  // rezolučný uzáver s pamätaním rodičov
  function saturate(K) {
    const list = K.map(c => ({ c, from: null }));
    const keys = new Set(K.map(clauseKey));
    for (let j = 1; j < list.length; j++) {
      for (let i = 0; i < j; i++) {
        for (const r of resolvents(list[i].c, list[j].c)) {
          const k = clauseKey(r);
          if (keys.has(k)) continue;
          keys.add(k);
          list.push({ c: r, from: [i, j] });
          if (r.length === 0) return { list, empty: list.length - 1 };
          if (list.length > 600) return { list, empty: -1 };
        }
      }
    }
    return { list, empty: -1 };
  }

  // z uzáveru vyberie iba klauzuly potrebné na odvodenie F a prečísluje ich
  function proof(K) {
    const sat = saturate(K);
    if (sat.empty < 0) return null;
    const need = new Set(), st = [sat.empty];
    while (st.length) {
      const x = st.pop();
      if (need.has(x)) continue;
      need.add(x);
      if (sat.list[x].from) st.push(...sat.list[x].from);
    }
    const num = {};
    const rows = [];
    K.forEach((c, i) => { num[i] = i + 1; rows.push({ no: i + 1, c, from: null }); });
    let next = K.length + 1;
    [...need].filter(i => i >= K.length).sort((a, b) => a - b).forEach(i => {
      num[i] = next;
      rows.push({ no: next, c: sat.list[i].c, from: sat.list[i].from.map(x => num[x]) });
      next++;
    });
    return rows;
  }

  // zrýchlená rezolučná metóda (eliminácia premenných)
  function dp(K) {
    let cur = dedupe(K.map(normClause).filter(c => !isTautClause(c)));
    const vs = [...new Set(cur.flat().map(varOfLit))].sort();
    const steps = [];
    for (const p of vs) {
      if (!cur.length) break;
      const Kn = cur.filter(c => !c.includes(p) && !c.includes('¬' + p));
      const K0 = cur.filter(c => c.includes('¬' + p));
      const K1 = cur.filter(c => c.includes(p));
      if (!K0.length && !K1.length) continue;
      const K01 = [];
      for (const a of K0) for (const b of K1) {
        const r = normClause([...a.filter(x => x !== '¬' + p), ...b.filter(x => x !== p)]);
        if (!isTautClause(r)) K01.push(r);
      }
      const K01d = dedupe(K01);
      const empty = K01d.some(c => c.length === 0);
      const nxt = dedupe([...Kn, ...K01d]);
      steps.push({ p, Kn, K0, K1, K01: K01d, next: nxt, empty });
      cur = nxt;
      if (empty) return { steps, sat: false };
    }
    return { steps, sat: true };
  }

  const clauseFormula = c => c.length ? c.map(l => l[0] === '¬' ? N(V(l.slice(1))) : V(l)).reduce((x, y) => O(x, y)) : null;
  const clauseSetSat = K => satisfiable(K.map(clauseFormula));
  const clauseModels = K => models(K.map(clauseFormula));

  // ---------- NÁHODNÉ FORMULY ----------
  function rand(depth, vs, ops = ['and', 'or', 'imp', 'imp', 'eq', 'not']) {
    if (depth <= 0 || U.chance(0.15)) {
      const v = V(U.pick(vs));
      return U.chance(0.3) ? N(v) : v;
    }
    const op = U.pick(ops);
    if (op === 'not') {
      const c = rand(depth - 1, vs, ops.filter(o => o !== 'not'));
      if (c.t === 'not') return c.a;
      if (c.t === 'var') return N(c);
      return N(c);
    }
    let a = rand(depth - 1, vs, ops), b = rand(depth - 1, vs, ops);
    if (str(a) === str(b)) b = rand(depth - 1, vs, ops);
    return { t: op, a, b };
  }

  function subst(n, map) {
    if (n.t === 'var') return map[n.n] || n;
    if (n.t === 'not') return N(subst(n.a, map));
    return { t: n.t, a: subst(n.a, map), b: subst(n.b, map) };
  }

  // ---------- TABUĽKY ----------
  function subformulas(f, acc = [], seen = new Set()) {
    if (f.t !== 'var') {
      if (f.a) subformulas(f.a, acc, seen);
      if (f.b) subformulas(f.b, acc, seen);
      const s = str(f);
      if (!seen.has(s)) { seen.add(s); acc.push(f); }
    }
    return acc;
  }

  // cols: [{h, fn(v) -> bool, main?}], rowCls(v) -> class, cellCls(col, v, val) -> class
  function table(vs, cols, rowCls, cellCls) {
    let h = '<div class="tt-wrap"><table class="tt"><tr>' +
      vs.map(x => `<th class="var">${x}</th>`).join('') +
      cols.map(c => `<th class="${c.main ? 'main' : ''}">${U.esc(c.h)}</th>`).join('') + '</tr>';
    for (const v of assignments(vs)) {
      h += `<tr class="${rowCls ? rowCls(v) : ''}">` +
        vs.map(x => `<td class="var">${+v[x]}</td>`).join('') +
        cols.map(c => {
          const val = c.fn(v);
          return `<td class="${c.main ? 'main' : ''} ${cellCls ? cellCls(c, v, val) : ''}">${+val}</td>`;
        }).join('') + '</tr>';
    }
    return h + '</table></div>';
  }

  // úplná tabuľka formuly so všetkými podformulami
  function fullTable(f) {
    const subs = subformulas(f);
    const cols = subs.map(s => ({ h: str(s), fn: v => ev(s, v), main: s === subs[subs.length - 1] }));
    return table(varsOf([f]), cols);
  }

  const assignStr = v => Object.keys(v).sort().map(k => `v(${k}) = ${+v[k]}`).join(', ');

  return {
    V, N, A, O, I, E, parse, str, ev, vars, varsOf, assignments, classify, equivalent, entails,
    satisfiable, models, conj, equivFn, flat, isCNF, isDNF, countLits, elim, nnf, neg, normClause,
    toClauses, clauseStr, clauseSetStr, clausesToFormula, cnfSteps, saturate, proof, dp, dedupe,
    clauseSetSat, clauseModels, clauseFormula, rand, subst, subformulas, table, fullTable, assignStr
  };
})();
