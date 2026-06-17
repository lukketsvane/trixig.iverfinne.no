# IKEA Trixig+ Design System

Et internt designsystem for AHO GK4 V26 Modul 2 — redesign av IKEA si elektriske skrutrekkar **TRIXIG 3,6 V** til ein reparerbar variant kalla **Trixig+**, med planlagd marknadsintroduksjon i 2028.

> Dette systemet skal lese **som IKEA** — same logo, typografi, brand-palette — og halde seg innanfor TRIXIG-serien sitt etablerte visuelle vokabular: **matt svart pluss éin lyseblå akssent**.

Output frå dette systemet er ment for **figurar og illustrasjonar i debrief, konseptgjennomgang, formføringsplansje og sluttpresentasjon** — ikkje for sjølve produktdesignet.

---

## Kjelder (sources)

- **Figma-fil:** `GK4_Trixig.fig` (montert som lese-berre VFS) — 3 sider, 25 top-level frames.
  - `/Ikea_brand/IkeaBrand` — IKEA brand-referansar (logo-ovalen, free zone, plassering)
  - `/Hovuddokument` — DesignA / Design_B / Design_C, figurar, moodboards, teardown
  - `/kompoenent` — komponent-lager
- **Brand-retningslinjer:** Inter IKEA Systems "Clear & Simple" (2018), særleg s. 60 om voice.
- **TRIXIG-måling:** Visuell måling frå ikea.com sin TRIXIG-side (lyseblå akssent ~#A6C8DC).
- **Uploadar (`uploads/`):** IKEA-logo, Noto IKEA-spesimen, IKEA-skiltsystem-poster, FY26-banner.

Lesaren må ha eigen tilgang til Figma-fila og Inter IKEA Systems-dokumentet for å verifisere; alle kritiske verdiar er kopiert ut hit.

---

## Indeks

| Fil / mappe | Innhald |
|---|---|
| `README.md` | Dette dokumentet (kontekst + content + visual + iconography). |
| `SKILL.md` | Agent Skills-kompatibel header. |
| `colors_and_type.css` | CSS-variablar: fargar, type-roller, spacing, radii, motion. |
| `assets/` | Logoar, spesimens, moodboards, skissefigurar, banners. |
| `preview/` | HTML-cards for Design System-fanen (registrerte som review-assets). |
| `ui_kits/trixig-product/` | Trixig+ produktdokumentasjon-kit (figur-rammer, callouts, parts-list). |
| `slides/` | Plansje-malar for sluttpresentasjon (1280×720). |

---

## CONTENT FUNDAMENTALS

**Språk:** norsk (nynorsk preferert i dette prosjektet — "lyseblå", "synleg", "truverdig"). Engelsk berre i sitat frå Clear & Simple eller IKEA-headlines.

**Tone (frå Clear & Simple s. 60):**
- *Conversational.* — Vi snakkar, vi held ikkje føredrag.
- *Add to the message.* — Kvart ord skal tene innhaldet, ikkje pynte.
- *Accessible.* — Ingen sjargong utan grunn.
- *Respect the reader.* — Aldri talk-down.
- *"We have a point of view and we're happy to share it."* — Direkte, vennleg, sjølvsikker.

**Casing:**
- Sentence case for headlines og UI-knappar — *"Discover all offers made for you."*, ikkje *"Discover All Offers..."*.
- **IKEA er alltid versalar** når det står i løpande tekst, same storleik og font som teksten rundt. Aldri *"Ikea"*.
- Trixig / Trixig+ skrivast med stor T og liten resten. Pluss-teiknet er typografisk, ikkje superscript.

**Person:**
- *"You"* / *"du"* mot lesaren. *"We"* / *"vi"* om IKEA.
- Imperativ er greitt for instruksjonar (*"Skru ut dei to skruene."*).

**Kvalitet på kopi (eksempel):**
- Banner: *"Discover all offers made for you."* — direkte, lovande, men aldri overselt.
- Trixig+ debrief-stil: *"Synleg. Stille. Truverdig."* — tre ord, punktum mellom. Verdiord står ofte aleine.

**Verdiord for Trixig+ (bruk konsekvent):**
- **Synleg** — ingenting skjult under lim eller "design"-deksel; skruver, brytarar og lys står ope.
- **Stille** — lågmælt akssent, ingen visuell aggresjon.
- **Truverdig** — materialet ser ut som det er; matt ABS er svart, ikkje soft-touch-imitasjon.

**Emoji:** Nei. IKEA brukar ikkje emoji. Bruk bold-fargar eller piktogram i staden.

**Tal og einingar:** SI-einingar med mellomrom (*3,6 V*, ikkje *3.6V*). Norsk komma som desimaltegn.

---

## VISUAL FOUNDATIONS

### Colors

**Brand-blå og brand-gul er reservert for logoen og butikkfasadane.** Skal ikkje brukast saman på andre flater. (Sett `--ikea-blue` / `--ikea-yellow` *kun* i logo-kontekst.)

**Sekundærpalett** (kraftig gul, magenta, oransje, grøn, lys cyan, raud, mørk indigo) kan brukast på flater. Aldri pasteller, aldri tonar, aldri fades, aldri gradienter. *"Bold colours, never overdone."*

**Det er greitt å bruke berre svart/kvit.** *"We're cool with black and white."*

**Trixig sub-brand:** matt svart `#1A1A1A` som hovudflate, lyseblå `#A6C8DC` som éin akssent. Det er heile palette-en for produktet sjølv.

### Typography

**Eksklusivt Noto IKEA (Regular + Bold)**, ingen andre fontar. Verdana er den historiske proxien. *Vi har erstatta Noto IKEA med Noto Sans frå Google Fonts av lisensgrunnar* — sjå *Caveats* nedst.

Type-skala er flat: Display 64 / H1 40 / H2 28 / H3 20 / Lead 20 / Body 16 / Small 14 / Caption 12. Letter-spacing er nesten null; IKEA-typografien har lite stilisering.

### Backgrounds

- **Kvit** er primær. **Lys grå** og **gul** er ok. **Aldri blå, aldri svart** under logoen.
- Produktfoto: rein kvit bakgrunn (standard).
- Monteringsanvisningar: gul bakgrunn med blå strektegningar — *etablert IKEA-stil*. Vi bruker dette for Trixig+-eksplosjonsteikningar.
- Hjemmenært, varmt, men sakleg fotografi — aldri studio-stylet, aldri overprodusert.

### Layout & Spacing

- 4px grunn-skala. 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96.
- IKEA-papirløyper: rikeleg whitespace, tekst i venstre kolonne, bilde i høgre. Ikkje sentrer alt.
- **Logoplassering:** øvre venstre (web), sentrert (video-end), nedre høgre (avsendar i print/PPT). Alltid 100 % free zone (25 % i kompakte rom).

### Borders, Radii, Shadow

- **Radii:** R5–R8 mjuke. Knappar R8, kort R8–R12, pill-tags R-full. Trixig+-form-vokabularet.
- **Borders:** 1 px, `--rule` (#E5E5E5) som standard. 2 px på fokus.
- **Shadow:** Ikkje brukast. IKEA er flatt — separer plan med hairlines, flatefarge eller whitespace. Drop shadows er **ikkje** del av systemet.
- **Deboss:** Logoen plasserast på produktet som *debossa* oval, ikkje malt. Vi bruker `--shadow-deboss` for å kommunikere dette i 2D-render.

### Motion

- **Easing:** `cubic-bezier(0.2, 0, 0.2, 1)` — direkte, ikkje bouncy.
- **Varigheit:** 120 / 200 / 320 ms. Ingen lengre.
- **Ingen bouncar, ingen shimmer, ingen parallax-svev.** Berre fades og slides.

### Hover / Press

- **Hover:** marginalt mørkare bakgrunn (`--accent-deep`) eller -8 % luminans.
- **Press:** ingen shrink. Berre raskt fargeskifte (120 ms).
- **Focus:** 2 px solid `--ikea-blue` eller `--trixig-blue` outline, 2 px offset.

### Transparency & Blur

- Generelt nei. IKEA er solid og direkte. Ingen frostet glas, ingen tonal overlay.
- Unntak: protection-gradient over fullbleed-bilde *kan* brukast for tekstlesbarheit, men berre svart-til-transparent, aldri farga.

### Imagery vibe

- Varmt, dagslys, hjemmenært. Ikkje cold studio. Ikkje grain/film. Ikkje B&W (med mindre konseptuelt nødvendig).

### Cards

- Kvit bakgrunn, 1 px `--rule` border, R8, valfritt `--shadow-1`. Ingen farga venstre-border-akssent (AI-trope, unngå).

---

## ICONOGRAPHY

IKEA brukar ein **eigen piktogram-stil** for monteringsanvisningar — flate, blå strektegningar (1.5–2 px stroke), runda hjørner, ingen fyll, ingen skygge. Dette er *den* IKEA-iconografien.

**For Trixig+-figurar:**
- Bruk **blå strek på gul** for monteringsfigurar (følgjer Property101/Property113-rammene i Figma).
- Bruk **kvit strek på matt svart** når vi viser sjølve produktet i kontekst.
- Bruk **svart strek på kvit** for nøytrale UI-ikon (settings, info, etc).

**Kva ikonsett vi bruker:**
- IKEAs eigne piktogram er ikkje opent tilgjengeleg. Vi substituerer med **Lucide** (https://lucide.dev) frå CDN — same flate stilen, same 2 px stroke, runda joins. Flagga som substitusjon under *Caveats*.
- Lucide via CDN: `<script src="https://unpkg.com/lucide@latest"></script>` så `lucide.createIcons()`.

**Emoji:** aldri. **Unicode-symbol:** berre matematiske (×, →, ±) der det er tydeleg klarare enn ord.

**SVG vs PNG:** vektor (SVG/PDF) der mogleg, 300 DPI raster (PNG) elles. Aspect-ratio bevart, transparent bakgrunn for skissefigurar.

**Logo-bruk:**
- Primær: full IKEA-oval (gul fyll, blå tekst, ® topphøgre).
- I Trixig+-kontekst plasserast logoen **debossa** på produktet — ikkje malt. I 2D-render: matt mørkegrå plate med inset-shadow.

Kopiar i `assets/`:
- `ikea_logo.jpg` — full optimisert oval (2019).
- `ikea_logo_alt.webp` — fallback raster.
- `ikea_logo_geometric.webp` — geometriske dekonstruksjonar (4×).
- `noto_ikea_specimen.jpg` — typespesimen.
- `sign_system_poster.jpg` — referanse for line-drawing-stil.
- `banner_offers.gif` — tone-referanse for kommersiell kommunikasjon.
- `figur01.jpg` / `sketch_moodboard.png` — Trixig+-skisser frå Figma.

---

## Caveats

- **Noto IKEA er erstatta med Noto Sans** (Google Fonts) — proprietær lisens. Verdana er dokumentert proxy. **Be brukaren laste opp Noto IKEA-filer dersom dei er tilgjengeleg via IKEA-internt.**
- **Lucide** er substituert for IKEAs interne piktogram-bibliotek.
- TRIXIG-blå hex (`#A6C8DC`) er anslått frå ikea.com — bør verifiserast mot Pantone/Material-spec frå IKEA-of-Sweden.
- Figma-fila er reconstruksjon — verdiar er kryss-sjekka mot Clear & Simple, men spesifikke nyansar (særleg deboss-djupne på logo-plate) kan trenge justering.
