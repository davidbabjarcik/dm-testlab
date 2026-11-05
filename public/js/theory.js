'use strict';

// Teória podľa prednášok (Myšková, DM FEI TUKE). practice = id úloh na precvičenie.
const THEORY = [
  {
    id: 'semantika', topic: 'logic', title: 'Formuly, tautológia, splniteľnosť',
    practice: ['formula-type'],
    html: `
<p><b>Pravdivostné ohodnotenie</b> priradí každej premennej 0 alebo 1. Hodnotu formuly vypočítame podľa tabuliek spojok:</p>
<table class="tt"><tr><th>α</th><th>β</th><th>¬α</th><th>α ∧ β</th><th>α ∨ β</th><th>α ⇒ β</th><th>α ⇔ β</th></tr>
<tr><td>0</td><td>0</td><td>1</td><td>0</td><td>0</td><td>1</td><td>1</td></tr>
<tr><td>0</td><td>1</td><td>1</td><td>0</td><td>1</td><td>1</td><td>0</td></tr>
<tr><td>1</td><td>0</td><td>0</td><td>0</td><td>1</td><td><b>0</b></td><td>0</td></tr>
<tr><td>1</td><td>1</td><td>0</td><td>1</td><td>1</td><td>1</td><td>1</td></tr></table>
<ul>
<li><b>Tautológia</b> – pravdivá pri <i>každom</i> ohodnotení (v poslednom stĺpci samé 1).</li>
<li><b>Kontradikcia</b> – nepravdivá pri každom ohodnotení (samé 0).</li>
<li><b>Splniteľná formula</b> – existuje aspoň jedno ohodnotenie, pri ktorom je pravdivá.</li>
<li><b>Systém S je splniteľný</b> – existuje <i>jedno</i> ohodnotenie, pri ktorom sú pravdivé <i>všetky</i> formuly naraz.</li>
</ul>
<div class="tip"><b>Postup:</b> pri n premenných má tabuľka 2ⁿ riadkov (2 → 4, 3 → 8). Píš stĺpce pre podformuly zvnútra von, nech sa nepomýliš.</div>
<p><b>Dôležité ekvivalencie:</b></p>
<ul>
<li>α ⇒ β |=| ¬α ∨ β (nahradenie implikácie)</li>
<li>α ⇔ β |=| (α ⇒ β) ∧ (β ⇒ α) |=| (¬α ∨ β) ∧ (¬β ∨ α)</li>
<li>¬(α ∧ β) |=| ¬α ∨ ¬β, ¬(α ∨ β) |=| ¬α ∧ ¬β (De Morgan)</li>
<li>α ∧ (β ∨ γ) |=| (α ∧ β) ∨ (α ∧ γ), α ∨ (β ∧ γ) |=| (α ∨ β) ∧ (α ∨ γ) (distributívnosť)</li>
<li>α ∨ (β ∧ α) |=| α, α ∧ (β ∨ α) |=| α (absorpcia), ¬¬α |=| α</li>
</ul>`
  },
  {
    id: 'vyplyvanie', topic: 'logic', title: 'Vyplývanie S ⊨ φ',
    practice: ['entail'],
    html: `
<p><b>S ⊨ φ</b> (φ vyplýva zo S) ⇔ φ je pravdivá pri <i>každom</i> ohodnotení, pri ktorom sú pravdivé všetky formuly zo S.</p>
<div class="tip"><b>Ako na to tabuľkou:</b> zvýrazni riadky, kde sú všetky formuly zo S rovné 1. Ak je v každom zvýraznenom riadku φ = 1, potom S ⊨ φ. Stačí jeden zvýraznený riadok s φ = 0 a vyplývanie neplatí (to je protipríklad).</div>
<p><b>Rýchlejšia úvaha (hľadanie protipríkladu):</b> chceme, aby bolo S pravdivé a φ nepravdivá. Ak to nejde (vyjde spor), φ vyplýva.</p>
<p><b>Príklad:</b> S = {p ⇒ q, q ⇒ r}, φ = p ⇒ r. Aby bola φ nepravdivá, musí byť p = 1, r = 0. Z p ⇒ q potom q = 1, ale q ⇒ r = 1 ⇒ 0 = 0 – spor. Teda S ⊨ φ.</p>
<p><b>Vety z prednášky:</b></p>
<ol>
<li>Ak φ ∈ S, tak S ⊨ φ.</li>
<li>Tautológia vyplýva z každého systému.</li>
<li>Ak je S <b>nesplniteľný</b>, tak S ⊨ φ pre <b>každú</b> formulu φ.</li>
<li><b>S ⊨ φ ⇔ S ∪ {¬φ} je nesplniteľný</b> – na tom stojí rezolučná metóda.</li>
</ol>`
  },
  {
    id: 'kt', topic: 'logic', title: 'Klauzuly, KT/DT, NDT/NKT, Karnaughova mapa',
    practice: ['cnf', 'boolean-min'],
    html: `
<ul>
<li><b>Literál</b> = premenná alebo jej negácia (p, ¬q).</li>
<li><b>Klauzula</b> (elementárna disjunkcia) = l₁ ∨ l₂ ∨ … ∨ lₖ. Aj samotný literál je klauzula.</li>
<li><b>KT</b> (konjunktívny tvar) = konjunkcia klauzúl, <b>DT</b> = disjunkcia elementárnych konjunkcií.</li>
<li><b>NKT/NDT</b> = každá elementárna disjunkcia/konjunkcia obsahuje <i>všetky</i> premenné.</li>
</ul>
<p><b>Prepis na klauzuly (3 kroky):</b></p>
<ol>
<li>Odstráň ⇒ a ⇔.</li>
<li>Negácie posuň k premenným (De Morgan, ¬¬α = α).</li>
<li>Roznásob ∨ cez ∧ (distributívnosť).</li>
</ol>
<p><b>Príklad:</b> ¬x ⇔ t |=| (¬x ⇒ t) ∧ (t ⇒ ¬x) |=| (x ∨ t) ∧ (¬t ∨ ¬x) → 2 klauzuly.<br>
u ⇒ (y ∧ z) |=| ¬u ∨ (y ∧ z) |=| (¬u ∨ y) ∧ (¬u ∨ z) → 2 klauzuly.<br>
¬(x ⇒ (y ∨ z)) |=| x ∧ ¬y ∧ ¬z → <b>3 klauzuly</b>: {x}, {¬y}, {¬z}.</p>
<div class="tip"><b>Pozor:</b> x ∧ y sú <b>dve</b> klauzuly (x a y), nie jedna!</div>
<p><b>Boolovská funkcia z tabuľky:</b></p>
<ul>
<li><b>NDT</b>: pre každý riadok s f = 1 jedna elementárna konjunkcia (premenná s hodnotou 0 → negovaná). Napr. 010 → ¬x ∧ y ∧ ¬z.</li>
<li><b>NKT</b>: pre každý riadok s f = 0 jedna elementárna disjunkcia (premenná s hodnotou <b>1</b> → negovaná). Napr. 001 → x ∨ y ∨ ¬z.</li>
</ul>
<p><b>Karnaughova mapa</b> pre 3 premenné: riadky x = 0, 1, stĺpce yz v poradí <b>00, 10, 11, 01</b> (susedné sa líšia v jednom bite, mapa sa „zatáča“ cez okraj). Združuj jednotky (pre MDT) alebo nuly (pre MKT) do obdĺžnikov veľkosti 1, 2, 4. Premenná, ktorá sa v skupine mení, vypadne.</p>
<p>Napr. (¬x ∧ ¬y ∧ ¬z) ∨ (¬x ∧ y ∧ ¬z) |=| ¬x ∧ ¬z, lebo y ∨ ¬y |=| T.</p>`
  },
  {
    id: 'rezolucia', topic: 'logic', title: 'Rezolučná metóda',
    practice: ['resolution', 'clauses-sat'],
    html: `
<p><b>Pravidlo rezolúcie:</b> z klauzúl α ∨ ¬l a β ∨ l odvodíme <b>rezolventu</b> α ∨ β. Z l a ¬l odvodíme <b>prázdnu klauzulu F</b> (spor).</p>
<table class="res"><tr><th>1. klauzula</th><th>2. klauzula</th><th>rezolventa</th></tr>
<tr><td>p ∨ q</td><td>¬p ∨ ¬r</td><td>q ∨ ¬r</td></tr>
<tr><td>p</td><td>¬p ∨ r</td><td>r</td></tr>
<tr><td>p ∨ q</td><td>¬p ∨ ¬q</td><td>q ∨ ¬q – tautológia (nič nám nedá)</td></tr>
<tr><td>p</td><td>¬p</td><td>F</td></tr></table>
<div class="tip"><b>Pozor:</b> rezolvuje sa vždy cez <b>jednu</b> premennú. Z p ∨ q a ¬p ∨ ¬q <b>nie je</b> F.</div>
<p><b>Robinsonov princíp:</b> systém klauzúl K je splniteľný ⇔ rezolučný uzáver R*(K) neobsahuje F.</p>
<p><b>Postup pre S ⊨ φ:</b></p>
<ol>
<li>Zober S ∪ {¬φ}.</li>
<li>Každú formulu prepíš na klauzuly (pozor na ¬φ!).</li>
<li>Rezolvuj, kým nedostaneš F (→ S ⊨ φ platí) alebo kým neprestanú pribúdať nové klauzuly (→ neplatí).</li>
</ol>
<p><b>Príklad:</b> S = {p ⇒ q, q ⇒ r}, φ = p ⇒ r. Klauzuly: 1. ¬p ∨ q, 2. ¬q ∨ r, 3. p, 4. ¬r (z ¬φ = p ∧ ¬r).<br>
5. q (1, 3), 6. r (2, 5), 7. F (4, 6) ⇒ S ⊨ φ.</p>
<p><b>Zrýchlená rezolučná metóda:</b> vyber premennú p a rozdeľ K na</p>
<ul>
<li>K≠(p) – klauzuly bez p,</li>
<li>K₀(p) – klauzuly s ¬p,</li>
<li>K₁(p) – klauzuly s p,</li>
<li>K₀₁(p) – všetky rezolventy (jedna z K₀, druhá z K₁), tautológie vyhoď.</li>
</ul>
<p>Nový systém K(p) = K≠(p) ∪ K₀₁(p) už p neobsahuje a je splniteľný ⇔ K je splniteľný. Opakuj pre ďalšie premenné. Ak vznikne F, systém je nesplniteľný. Ak zmiznú všetky klauzuly, je splniteľný. Ohodnotenie potom dopočítaš spätne.</p>`
  },
  {
    id: 'relacie', topic: 'rel', title: 'Binárne relácie a ich vlastnosti',
    practice: ['relation-props'],
    html: `
<p><b>Binárna relácia</b> na A je ľubovoľná podmnožina R ⊆ A × A. Zobrazujeme ju maticou (1 = dvojica je v R) alebo grafom (šípka a → b).</p>
<table class="res"><tr><th>vlastnosť</th><th>definícia</th><th>v grafe / matici</th></tr>
<tr><td><b>reflexívna</b></td><td>∀a: (a, a) ∈ R</td><td>slučka pri <i>každom</i> vrchole, na diagonále samé 1</td></tr>
<tr><td><b>symetrická</b></td><td>(a, b) ∈ R ⇒ (b, a) ∈ R</td><td>každá šípka má aj spätnú, matica je symetrická</td></tr>
<tr><td><b>antisymetrická</b></td><td>(a, b) ∈ R ∧ (b, a) ∈ R ⇒ a = b</td><td>medzi rôznymi vrcholmi nikdy nie sú šípky oboma smermi</td></tr>
<tr><td><b>tranzitívna</b></td><td>(a, b), (b, c) ∈ R ⇒ (a, c) ∈ R</td><td>každá cesta a → b → c má aj „skratku“ a → c</td></tr></table>
<ul>
<li><b>Ekvivalencia</b> = reflexívna + symetrická + tranzitívna. Rozdelí A na <b>triedy ekvivalencie</b> R[a] = {x; (a, x) ∈ R}. Dve triedy sú buď rovnaké, alebo disjunktné.</li>
<li><b>Čiastočné usporiadanie</b> = reflexívna + antisymetrická + tranzitívna (⊆, ≤, deliteľnosť na N).</li>
</ul>
<div class="tip"><b>Pasce:</b>
<ul>
<li>{(1, 2), (2, 1)} je symetrická, ale <b>nie tranzitívna</b> – chýba (1, 1) a (2, 2).</li>
<li>Prázdna relácia je symetrická, antisymetrická aj tranzitívna, ale nie reflexívna.</li>
<li>Symetrická a antisymetrická zároveň môže byť iba relácia so samými slučkami.</li>
<li>„Nie je symetrická“ neznamená „je antisymetrická“.</li>
<li>Pri tranzitívnosti kontroluj aj dvojice so slučkou a prípady a = c: z (1, 2), (2, 1) treba (1, 1)!</li>
</ul></div>
<p><b>Zobrazenie</b> je relácia, kde každé a má práve jeden obraz. Injektívne = rôzne vzory majú rôzne obrazy, surjektívne = každé b má vzor, bijektívne = oboje (len vtedy je f⁻¹ zobrazenie).</p>`
  },
  {
    id: 'zvazy', topic: 'rel', title: 'Hasseho diagram, zväzy, komplementy',
    practice: ['lattice'],
    html: `
<p><b>Hasseho diagram</b> čiastočne usporiadanej množiny (A, R): menšie prvky kreslíme nižšie a hranou spojíme a, b iba vtedy, keď <b>b pokrýva a</b> (a < b a neexistuje x s a < x < b). Slučky ani „tranzitívne“ hrany sa nekreslia.</p>
<ul>
<li><b>Najväčší / najmenší prvok</b> – je v relácii so všetkými. <b>Maximálny / minimálny</b> – nad ním / pod ním už nič nie je (môže ich byť viac).</li>
<li><b>Supremum (spojenie) x ∨ y</b> = najmenšie spoločné horné ohraničenie. <b>Infimum (priesek) x ∧ y</b> = najväčšie spoločné dolné ohraničenie.</li>
<li><b>Zväz</b> = každé dve prvky majú spojenie aj priesek.</li>
</ul>
<div class="tip"><b>Pozor pri (A, ⊆):</b> spojenie nie je vždy zjednotenie! Ak A = {∅, {a}, {c}, {b,d}, …} a {c} ∪ {b,d} = {b,c,d} ∉ A, spojením je najmenšia množina z A, ktorá obe obsahuje (napr. {a,b,c,d}). Priesek = najväčšia množina z A obsiahnutá v oboch.</div>
<p>V (D(n), |): spojenie = NSN, priesek = NSD (ak patria do A).</p>
<p><b>Komplement</b> prvku x je x′ s vlastnosťou x ∧ x′ = 0 (najmenší prvok) a x ∨ x′ = I (najväčší prvok). Prvok môže mať 0, 1 alebo viac komplementov.</p>
<ul>
<li><b>Komplementárny zväz</b> – každý prvok má aspoň jeden komplement.</li>
<li><b>Distributívny zväz</b> – platí x ∧ (y ∨ z) = (x ∧ y) ∨ (x ∧ z). Je distributívny ⇔ neobsahuje podzväz N₅ ani M₅.</li>
<li><b>Boolovský zväz</b> = distributívny + komplementárny. Každý prvok má <b>práve jeden</b> komplement (napr. (P(M), ⊆)).</li>
</ul>
<div class="tip"><b>Rýchly test distributívnosti:</b> ak má nejaký prvok dva rôzne komplementy, zväz nie je distributívny.</div>
<p><b>Postup pri úlohe so zväzom:</b></p>
<ol>
<li>Zoraď prvky podľa „výšky“ a nakresli pokrytia.</li>
<li>Pre každú neporovnateľnú dvojicu nájdi sup a inf. Ak všetky existujú, je to zväz.</li>
<li>Komplementy hľadaj medzi prvkami, ktorých priesek s x je 0: skontroluj, či je ich spojenie I.</li>
</ol>`
  },
  {
    id: 'grafy', topic: 'graph', title: 'Grafy, stupne, Havlova veta',
    practice: ['havel'],
    html: `
<p><b>Graf</b> G = (V, H), H obsahuje dvojprvkové podmnožiny V. <b>Stupeň</b> δ(v) = počet hrán pri v.</p>
<ul>
<li><b>Σ δ(v) = 2|H|</b>, preto je počet vrcholov nepárneho stupňa vždy párny.</li>
<li>V grafe s n vrcholmi je 0 ≤ δ(v) ≤ n − 1.</li>
<li>Kₙ – kompletný graf, Dₙ – diskrétny (bez hrán), K<sub>m,n</sub> – kompletný bipartitný.</li>
</ul>
<p><b>Havlova veta:</b> nech s₁ ≥ s₂ ≥ … ≥ sₙ. Postupnosť je grafová ⇔ je grafová postupnosť s₂ − 1, …, s<sub>s₁+1</sub> − 1, s<sub>s₁+2</sub>, …, sₙ.<br>
Teda: <b>zober najväčšie číslo s₁, vyhoď ho a od nasledujúcich s₁ čísel odčítaj 1</b>. Zoraď a opakuj.</p>
<div class="havel">
<div><u>6</u>, <b>6, 5, 3, 3, 3, 2</b></div>
<div><u>5</u>, <b>4, 2, 2, 2, 1</b></div>
<div><u>3</u>, <b>1, 1, 1</b>, 0</div>
<div>0, 0, 0, 0 <span class="oktxt">✔ grafová</span></div></div>
<p>Ak vznikne záporné číslo alebo s₁ je väčšie ako počet zvyšných čísel, postupnosť <b>nie je</b> grafová.</p>
<div class="tip"><b>Úloha s k</b> (napr. 2, 6, 6, 5, k, 3, 3):
<ol>
<li>k ≤ n − 1.</li>
<li>Súčet musí byť párny → parita k.</li>
<li>Vrchol stupňa n − 1 je spojený so všetkými, takže nikto nemá stupeň 0. Dva takéto vrcholy → každý má stupeň aspoň 2.</li>
<li>Zvyšné kandidáty over Havlovou vetou.</li>
</ol>
Napíš zdôvodnenie aj pre hodnoty, ktoré nevyhovujú!</div>
<p><b>Súvislosť:</b> sled (môže sa opakovať čokoľvek), ťah (neopakujú sa hrany), cesta (neopakujú sa vrcholy ani hrany), kružnica (uzavretá cesta dĺžky ≥ 3). Súvislý graf má aspoň |V| − 1 hrán. Most = hrana, artikulácia = vrchol, ktorých odstránenie poruší súvislosť.</p>`
  },
  {
    id: 'vzdialenosti', topic: 'graph', title: 'Vzdialenosti a matica susednosti',
    practice: ['matrix-dist'],
    html: `
<p><b>Vzdialenosť</b> d(u, v) = dĺžka najkratšej cesty. <b>Excentricita</b> e(u) = max d(u, v). <b>Polomer</b> r(G) = min e(u), <b>priemer</b> P(G) = max e(u), <b>stred</b> = vrcholy s e(u) = r(G). Platí r ≤ P ≤ 2r.</p>
<p><b>Matica susednosti</b> B: bᵢⱼ = 1 ⇔ {vᵢ, vⱼ} je hrana. Je symetrická, na diagonále sú nuly, súčet riadku = stupeň.</p>
<p><b>Výpočet vzdialeností „bez kreslenia“ (podľa prednášky):</b></p>
<ol>
<li>B⁽¹⁾ = B + jednotky na diagonále.</li>
<li>B⁽ᵏ⁾ = B⁽ᵏ⁻¹⁾ · B⁽¹⁾ s <b>boolovským</b> násobením a sčítaním (1 + 1 = 1).</li>
<li>b⁽ᵏ⁾ᵢⱼ = 1 ⇔ d(vᵢ, vⱼ) ≤ k, teda d(vᵢ, vⱼ) = najmenšie k, pre ktoré je b⁽ᵏ⁾ᵢⱼ = 1.</li>
</ol>
<div class="tip"><b>Rýchly trik:</b> prvok (i, j) v B⁽ᵏ⁺¹⁾ je 1 ⇔ niektorý sused vᵢ (alebo vᵢ sám) má v riadku B⁽ᵏ⁾ na pozícii j jednotku. Teda: OR riadkov všetkých susedov.
<ul>
<li>Vzdialenosť <b>presne 3</b> = nula v B⁽²⁾, jednotka v B⁽³⁾.</li>
<li>Vzdialenosť <b>&gt; 3</b> = nula aj v B⁽³⁾.</li>
</ul></div>
<p>Excentricitu vrchola vᵢ prečítaš ako najmenšie k, pri ktorom je celý i-ty riadok B⁽ᵏ⁾ jednotkový.</p>
<p><b>Matica incidencie</b> A (vrcholy × hrany): v každom stĺpci sú práve dve jednotky. Platí A · Aᵀ = B + D.</p>`
  },
  {
    id: 'stromy', topic: 'graph', title: 'Stromy a kostry',
    practice: ['tree-center', 'spanning'],
    html: `
<ul>
<li><b>Strom</b> = súvislý graf bez kružníc. Má |H| = |V| − 1 hrán a aspoň 2 listy (vrcholy stupňa 1). Medzi každými dvoma vrcholmi vedie práve jedna cesta.</li>
<li><b>Les</b> = graf, ktorého komponenty sú stromy.</li>
</ul>
<p><b>Stred stromu:</b> opakovane odstraňuj všetky listy.</p>
<ul>
<li>Ostane <b>jeden vrchol</b> → to je stred, r(T) = počet iterácií, P(T) = 2r(T).</li>
<li>Ostane <b>jedna hrana</b> → stred sú jej 2 vrcholy, r(T) = počet iterácií + 1, P(T) = 2r(T) − 1.</li>
</ul>
<p><b>Kostra</b> grafu G = faktor (obsahuje všetky vrcholy), ktorý je stromom. Existuje ⇔ G je súvislý. Hrany kostry sú <b>vetvy</b>, ostatné <b>tetivy</b>. Pridanie tetivy vytvorí práve jednu kružnicu (fundamentálny systém kružníc, ich počet je |H| − |V| + 1).</p>
<p><b>Počet kostier:</b></p>
<ul>
<li>Kₙ má nⁿ⁻² kostier (Cayley), napr. K₄ → 16.</li>
<li>Všeobecne: zostroj D − B (D = diagonálna matica stupňov, B = matica susednosti), vyškrtni i-ty riadok a i-ty stĺpec a vypočítaj determinant. To je počet kostier.</li>
</ul>
<div class="tip">Determinant 3×3 rátaj Sarrusovým pravidlom, 4×4 rozvojom podľa riadku s nulami. Vyškrtni ten vrchol, ktorý dá najviac núl.</div>`
  }
];
