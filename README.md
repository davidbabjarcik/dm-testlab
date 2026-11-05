# DM TestLab

**DM TestLab** je offline aplikácia (Electron) na prípravu na zápočet z predmetu
**Diskrétna matematika** (FEI TUKE). Vychádza z prednášok: výroková logika, relácie a zväzy, neorientované grafy.

Na rozdiel od klasického kvízu tu príklady **generuje počítač**. Každý je iný, aplikácia ho sama skontroluje
a ukáže celý postup riešenia.

---

## ✨ Funkcie

- 📝 **Zápočtový test** – 3 úlohy × 5 bodov, 50 minút, ako na skutočnej písomke
  - *Zápočet A* – formula a systém formúl, rezolučná metóda, vlastnosti relácie (podľa tabule)
  - *Zápočet B* – zväz a komplementy, grafová postupnosť, matica susednosti (podľa vzoru Z-05)
  - *Mix* – všetko
- 🎯 **Precvičovanie** – 12 typov príkladov, ku každému kontrola po častiach a riešenie krok po kroku:
  - tautológia / kontradikcia / splniteľná formula (pravdivostná tabuľka)
  - splniteľnosť a vyplývanie S ⊨ φ
  - prepis do klauzúl (KT)
  - rezolučná metóda (S ⊨ φ) – rezolučné odvodenie F aj zrýchlená metóda
  - splniteľnosť systému klauzúl
  - boolovská funkcia – NDT, NKT, MDT, MKT, Karnaughova mapa
  - vlastnosti binárnej relácie (R, S, AS, T, ekvivalencia, čiastočné usporiadanie)
  - Hasseho diagram, zväz, komplementy, distributívnosť
  - grafová postupnosť s parametrom k (Havlova veta)
  - vzdialenosti, polomer a stred z matice susednosti (matice B⁽ᵏ⁾)
  - počet kostier (det(D − B))
  - stred, polomer a priemer stromu
- 🧠 **ABC kvíz z teórie** – 73 otázok s vysvetlením, zlé a obľúbené otázky
- 📘 **Teória** – vysvetlenie každej témy s príkladmi a tipmi na pasce
- 📊 **História** testov s detailom, body a riešeniami
- 🌙 Tmavý / svetlý režim

Formuly sa píšu tlačidlami (¬ ∧ ∨ ⇒ ⇔) alebo z klávesnice: `! & | -> <->`.

---

## 🚀 Spustenie

- 🌐 **Online:** https://davidbabjarcik.github.io/dm-testlab/
- 💾 **Windows inštalátor (.exe):** [Releases](https://github.com/davidbabjarcik/dm-testlab/releases/latest)
- Bez inštalácie – stačí otvoriť `public/index.html` v prehliadači (dáta sa ukladajú do prehliadača).

Zo zdrojového kódu ako desktopová aplikácia:

```bash
npm install
npm start
```

Inštalátor pre Windows (`dist/`):

```bash
npm run build
```

---

## ⚠️ Upozornenie

Aplikácia je pomôcka na učenie. Negarantuje zhodu so skutočnými zápočtovými testami.

🐞 Chyby a návrhy: Discord `david.babjarcik`
