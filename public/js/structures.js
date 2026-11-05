'use strict';

// =======================
// RELÁCIE
// R = pole dvojíc [a, b]
// =======================
const Rel = {
  has: (R, a, b) => R.some(([x, y]) => x === a && y === b),

  props(A, R) {
    const has = (a, b) => Rel.has(R, a, b);
    const missing = A.filter(a => !has(a, a));
    const symW = R.find(([a, b]) => !has(b, a));
    const antiW = R.find(([a, b]) => a !== b && has(b, a));
    let transW = null;
    for (const [a, b] of R) {
      for (const [c, d] of R) {
        if (b === c && !has(a, d)) { transW = [a, b, d]; break; }
      }
      if (transW) break;
    }
    return {
      refl: { ok: missing.length === 0, w: missing },
      sym: { ok: !symW, w: symW },
      anti: { ok: !antiW, w: antiW },
      trans: { ok: !transW, w: transW }
    };
  },

  classes(A, R) {
    const seen = new Set(), out = [];
    for (const a of A) {
      if (seen.has(a)) continue;
      const cls = A.filter(x => Rel.has(R, a, x));
      cls.forEach(x => seen.add(x));
      out.push(cls);
    }
    return out;
  },

  pairStr: ([a, b]) => `(${a}, ${b})`,
  setStr: R => '{' + R.map(Rel.pairStr).join(', ') + '}',

  sort: R => [...R].sort((p, q) => p[0] - q[0] || p[1] - q[1]),

  // náhodná relácia na A (niekedy „skoro“ ekvivalencia alebo usporiadanie)
  random(A) {
    const mode = U.pick(['equiv', 'order', 'sym', 'random', 'random']);
    let R = [];
    const add = (a, b) => { if (!Rel.has(R, a, b)) R.push([a, b]); };
    if (mode === 'equiv') {
      const blocks = {};
      A.forEach(a => { const k = U.rnd(0, 2); (blocks[k] = blocks[k] || []).push(a); });
      Object.values(blocks).forEach(bl => bl.forEach(a => bl.forEach(b => add(a, b))));
    } else if (mode === 'order') {
      const perm = U.shuffle(A);
      A.forEach(a => add(a, a));
      for (let i = 0; i < perm.length; i++) {
        for (let j = i + 1; j < perm.length; j++) if (U.chance(0.4)) add(perm[i], perm[j]);
      }
      // tranzitívny uzáver
      let changed = true;
      while (changed) {
        changed = false;
        for (const [a, b] of [...R]) for (const [c, d] of [...R]) {
          if (b === c && !Rel.has(R, a, d)) { add(a, d); changed = true; }
        }
      }
    } else if (mode === 'sym') {
      for (const a of A) for (const b of A) if (a <= b && U.chance(0.3)) { add(a, b); add(b, a); }
    } else {
      for (const a of A) for (const b of A) if (U.chance(0.28)) add(a, b);
    }
    // malá zmena, aby to nebolo vždy „čisté“
    if (mode !== 'random' && U.chance(0.5)) {
      const a = U.pick(A), b = U.pick(A);
      if (Rel.has(R, a, b)) R = R.filter(([x, y]) => !(x === a && y === b));
      else add(a, b);
    }
    return Rel.sort(R);
  }
};

// =======================
// ČIASTOČNE USPORIADANÉ MNOŽINY A ZVÄZY
// =======================
const Poset = {
  make(labels, leq) {
    const n = labels.length;
    const L = U.range(n).map(i => U.range(n).map(j => leq(i, j)));
    const lt = (i, j) => i !== j && L[i][j];

    const covers = [];
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      if (lt(i, j) && !U.range(n).some(k => lt(i, k) && lt(k, j))) covers.push([i, j]);
    }

    const sup = (i, j) => {
      const ub = U.range(n).filter(k => L[i][k] && L[j][k]);
      const r = ub.find(k => ub.every(m => L[k][m]));
      return r === undefined ? -1 : r;
    };
    const inf = (i, j) => {
      const lb = U.range(n).filter(k => L[k][i] && L[k][j]);
      const r = lb.find(k => lb.every(m => L[m][k]));
      return r === undefined ? -1 : r;
    };

    let isLattice = true;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      if (sup(i, j) < 0 || inf(i, j) < 0) isLattice = false;
    }

    const bottom = U.range(n).find(i => U.range(n).every(j => L[i][j]));
    const top = U.range(n).find(i => U.range(n).every(j => L[j][i]));

    const compl = i => (bottom === undefined || top === undefined) ? [] :
      U.range(n).filter(j => inf(i, j) === bottom && sup(i, j) === top);

    let distributive = isLattice;
    if (isLattice) {
      outer:
      for (let x = 0; x < n; x++) for (let y = 0; y < n; y++) for (let z = 0; z < n; z++) {
        if (inf(x, sup(y, z)) !== sup(inf(x, y), inf(x, z))) { distributive = false; break outer; }
      }
    }

    // úroveň = najdlhšia reťaz zdola
    const level = Array(n).fill(0);
    let changed = true;
    while (changed) {
      changed = false;
      for (const [a, b] of covers) if (level[b] < level[a] + 1) { level[b] = level[a] + 1; changed = true; }
    }

    const comparable = [];
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (lt(i, j)) comparable.push([i, j]);

    return { n, labels, L, lt, covers, sup, inf, isLattice, bottom, top, compl, distributive, level, comparable };
  },

  // množinový systém s ⊆
  setLabel(mask, letters) {
    if (!mask) return '∅';
    return '{' + letters.split('').filter((_, i) => mask & (1 << i)).join(',') + '}';
  }
};

// =======================
// GRAFY
// =======================
const Graph = {
  // Havlova veta – kroky
  havel(seq) {
    let s = [...seq];
    const steps = [];
    while (true) {
      s.sort((a, b) => b - a);
      if (s.some(x => x < 0)) return { ok: false, steps, last: s, reason: 'vzniklo záporné číslo' };
      if (s.every(x => x === 0)) return { ok: true, steps, last: s };
      const d = s[0], rest = s.slice(1);
      if (d > rest.length) return { ok: false, steps, last: s, reason: `${d} > ${rest.length} (počet ostatných vrcholov)` };
      const nx = rest.map((x, i) => i < d ? x - 1 : x);
      steps.push({ from: [...s], d, to: nx });
      s = nx;
    }
  },

  // zostrojenie grafu so zadanými stupňami (Havel–Hakimi)
  construct(seq) {
    const n = seq.length, rem = [...seq], edges = [];
    while (true) {
      const order = U.range(n).sort((a, b) => rem[b] - rem[a]);
      const v = order[0];
      if (rem[v] === 0) return edges;
      const others = order.filter(x => x !== v).slice(0, rem[v]);
      if (others.length < rem[v] || others.some(x => rem[x] <= 0)) return null;
      others.forEach(x => { edges.push([v, x]); rem[x]--; });
      rem[v] = 0;
    }
  },

  adj(n, edges) {
    const M = U.range(n).map(() => Array(n).fill(0));
    edges.forEach(([a, b]) => { M[a][b] = 1; M[b][a] = 1; });
    return M;
  },

  dist(n, edges) {
    const B = Graph.adj(n, edges);
    return U.range(n).map(s => {
      const d = Array(n).fill(Infinity);
      d[s] = 0;
      const q = [s];
      for (let i = 0; i < q.length; i++) {
        for (let w = 0; w < n; w++) if (B[q[i]][w] && d[w] === Infinity) { d[w] = d[q[i]] + 1; q.push(w); }
      }
      return d;
    });
  },

  // B(1), B(2), ... (boolovské násobenie)
  boolPowers(B) {
    const n = B.length;
    const B1 = B.map((r, i) => r.map((x, j) => (i === j ? 1 : x)));
    const out = [B1];
    let cur = B1;
    while (out.length < n - 1 && cur.some(r => r.includes(0))) {
      const nx = U.range(n).map(i => U.range(n).map(j => U.range(n).some(k => cur[i][k] && B1[k][j]) ? 1 : 0));
      out.push(nx);
      if (nx.every((r, i) => r.every((x, j) => x === cur[i][j]))) break;
      cur = nx;
    }
    return out;
  },

  // determinant celočíselnej matice (Bareiss)
  det(M) {
    const a = M.map(r => [...r]), n = a.length;
    let sign = 1, prev = 1;
    for (let k = 0; k < n - 1; k++) {
      if (a[k][k] === 0) {
        const s = U.range(n).find(i => i > k && a[i][k] !== 0);
        if (s === undefined) return 0;
        [a[k], a[s]] = [a[s], a[k]];
        sign = -sign;
      }
      for (let i = k + 1; i < n; i++) for (let j = k + 1; j < n; j++) {
        a[i][j] = (a[i][j] * a[k][k] - a[i][k] * a[k][j]) / prev;
      }
      prev = a[k][k];
    }
    return sign * a[n - 1][n - 1];
  },

  randomTree(n) {
    const edges = [];
    for (let i = 1; i < n; i++) edges.push([U.rnd(0, i - 1), i]);
    const perm = U.shuffle(U.range(n));
    return edges.map(([a, b]) => [perm[a], perm[b]]);
  },

  randomConnected(n, extra) {
    const edges = Graph.randomTree(n);
    const has = (a, b) => edges.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
    let tries = 0;
    while (extra > 0 && tries++ < 100) {
      const a = U.rnd(0, n - 1), b = U.rnd(0, n - 1);
      if (a !== b && !has(a, b)) { edges.push([a, b]); extra--; }
    }
    return edges;
  },

  degrees(n, edges) {
    const d = Array(n).fill(0);
    edges.forEach(([a, b]) => { d[a]++; d[b]++; });
    return d;
  },

  // stred stromu postupným odstraňovaním listov
  treeCenter(n, edges) {
    let alive = new Set(U.range(n));
    let E = edges.map(e => [...e]);
    const rounds = [];
    while (alive.size > 2) {
      const deg = {};
      alive.forEach(v => { deg[v] = 0; });
      E.forEach(([a, b]) => { deg[a]++; deg[b]++; });
      const leaves = [...alive].filter(v => deg[v] <= 1);
      rounds.push(leaves);
      leaves.forEach(v => alive.delete(v));
      E = E.filter(([a, b]) => alive.has(a) && alive.has(b));
    }
    return { rounds, center: [...alive] };
  }
};
