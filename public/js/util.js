'use strict';

// =======================
// POMOCNÉ FUNKCIE
// =======================
const U = {
  rnd: (a, b) => a + Math.floor(Math.random() * (b - a + 1)),
  pick: arr => arr[Math.floor(Math.random() * arr.length)],
  chance: p => Math.random() < p,
  range: n => [...Array(n).keys()],

  shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  },

  sample: (arr, k) => U.shuffle(arr).slice(0, k),

  esc(s) {
    return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  },

  setEq(a, b) {
    const A = new Set(a), B = new Set(b);
    if (A.size !== B.size) return false;
    for (const x of A) if (!B.has(x)) return false;
    return true;
  },

  symDiff(a, b) {
    const A = new Set(a), B = new Set(b);
    let c = 0;
    for (const x of A) if (!B.has(x)) c++;
    for (const x of B) if (!A.has(x)) c++;
    return c;
  },

  list: arr => arr.length ? arr.join(', ') : '—',

  // Matica ako tabuľka s „hranatými zátvorkami“
  matrix(M, rowL, colL, cls) {
    let h = '<table class="mx">';
    if (colL) h += '<tr><th></th>' + colL.map(c => `<th>${c}</th>`).join('') + '</tr>';
    M.forEach((row, i) => {
      h += '<tr>' + (rowL ? `<th>${rowL[i]}</th>` : '') +
        row.map((v, j) => `<td class="${cls ? cls(i, j, v) : ''}">${v}</td>`).join('') + '</tr>';
    });
    return h + '</table>';
  },

  fmtTime(s) {
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }
};

// =======================
// KRESLENIE (SVG)
// =======================
const Draw = {
  circlePos(n, W) {
    const R = W / 2 - 28, c = W / 2;
    return U.range(n).map(i => {
      const a = -Math.PI / 2 + 2 * Math.PI * i / n;
      return [c + R * Math.cos(a), c + R * Math.sin(a)];
    });
  },

  nodes(pos, labels, nodeCls) {
    return pos.map(([x, y], i) =>
      `<circle cx="${x}" cy="${y}" r="15" class="node ${nodeCls ? nodeCls(i) : ''}"/>` +
      `<text x="${x}" y="${y}" class="nlabel">${labels[i]}</text>`).join('');
  },

  // Neorientovaný graf – vrcholy na kružnici
  graph(n, edges, labels, opts = {}) {
    const W = opts.size || 280;
    const pos = opts.pos || Draw.circlePos(n, W);
    const H = opts.height || W;
    let s = `<svg class="gsvg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">`;
    for (const [a, b] of edges) {
      s += `<line x1="${pos[a][0]}" y1="${pos[a][1]}" x2="${pos[b][0]}" y2="${pos[b][1]}" class="edge"/>`;
    }
    s += Draw.nodes(pos, labels, opts.nodeCls);
    return s + '</svg>';
  },

  // Strom nakreslený po úrovniach od koreňa
  tree(n, edges, labels, root, opts = {}) {
    const adj = U.range(n).map(() => []);
    edges.forEach(([a, b]) => { adj[a].push(b); adj[b].push(a); });
    const lvl = Array(n).fill(-1);
    lvl[root] = 0;
    const order = [root];
    for (let i = 0; i < order.length; i++) {
      for (const w of adj[order[i]]) if (lvl[w] < 0) { lvl[w] = lvl[order[i]] + 1; order.push(w); }
    }
    const maxL = Math.max(...lvl);
    const rows = U.range(maxL + 1).map(l => order.filter(v => lvl[v] === l));
    const W = Math.max(300, Math.max(...rows.map(r => r.length)) * 60);
    const H = (maxL + 1) * 70 + 20;
    const pos = Array(n);
    rows.forEach((r, l) => r.forEach((v, k) => { pos[v] = [W * (k + 1) / (r.length + 1), 30 + l * 70]; }));
    return Draw.graph(n, edges, labels, { pos, size: W, height: H, nodeCls: opts.nodeCls });
  },

  // Orientovaný graf relácie (šípky + slučky)
  digraph(elems, pairs) {
    const n = elems.length, W = 260, c = W / 2;
    const pos = Draw.circlePos(n, W);
    const idx = x => elems.indexOf(x);
    let s = `<svg class="gsvg" viewBox="0 0 ${W} ${W}" width="${W}" height="${W}">` +
      `<defs><marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">` +
      `<path d="M0,0 L10,5 L0,10 z" class="arrowhead"/></marker></defs>`;
    for (const [a, b] of pairs) {
      const i = idx(a), j = idx(b);
      const [x1, y1] = pos[i];
      if (i === j) {
        const dx = x1 - c, dy = y1 - c, L = Math.hypot(dx, dy) || 1;
        const lx = x1 + dx / L * 24, ly = y1 + dy / L * 24;
        s += `<circle cx="${lx}" cy="${ly}" r="10" class="edge loop"/>`;
        continue;
      }
      const [x2, y2] = pos[j];
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
      const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy);
      const cx = mx - dy / L * 18, cy = my + dx / L * 18; // ohnutie doľava
      // koniec skrátime o polomer vrchola
      const ex = x2 - (x2 - cx) / Math.hypot(x2 - cx, y2 - cy) * 16;
      const ey = y2 - (y2 - cy) / Math.hypot(x2 - cx, y2 - cy) * 16;
      s += `<path d="M${x1},${y1} Q${cx},${cy} ${ex},${ey}" class="edge" marker-end="url(#arr)"/>`;
    }
    s += Draw.nodes(pos, elems);
    return s + '</svg>';
  },

  // Hasseho diagram: levels[i] = úroveň prvku, covers = [[dolný, horný], ...]
  hasse(labels, levels, covers) {
    const n = labels.length;
    const maxL = Math.max(...levels);
    const rows = U.range(maxL + 1).map(l => U.range(n).filter(i => levels[i] === l));
    // jednoduché zoradenie podľa barycentra nižších susedov (menej kríženia)
    const xOf = {};
    rows.forEach((r, l) => {
      if (l > 0) {
        r.sort((a, b) => bary(a) - bary(b));
      }
      r.forEach((v, k) => { xOf[v] = (k + 1) / (r.length + 1); });
    });
    function bary(v) {
      const low = covers.filter(([a, b]) => b === v).map(([a]) => xOf[a]).filter(x => x !== undefined);
      return low.length ? low.reduce((s, x) => s + x, 0) / low.length : 0.5;
    }
    const maxW = Math.max(...rows.map(r => r.length));
    const W = Math.max(320, maxW * 100), H = (maxL + 1) * 75 + 20;
    const pos = U.range(n).map(i => [xOf[i] * W, H - 30 - levels[i] * 75]);
    let s = `<svg class="gsvg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">`;
    for (const [a, b] of covers) {
      s += `<line x1="${pos[a][0]}" y1="${pos[a][1]}" x2="${pos[b][0]}" y2="${pos[b][1]}" class="edge"/>`;
    }
    pos.forEach(([x, y], i) => {
      const w = Math.max(26, labels[i].length * 8 + 12);
      s += `<rect x="${x - w / 2}" y="${y - 12}" width="${w}" height="24" rx="12" class="hnode"/>` +
        `<text x="${x}" y="${y}" class="nlabel">${U.esc(labels[i])}</text>`;
    });
    return s + '</svg>';
  }
};
