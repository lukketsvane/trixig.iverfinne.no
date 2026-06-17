---
name: ikea-trixig-design
description: Use this skill to generate well-branded interfaces and assets for the IKEA Trixig+ project — debrief figures, plansje-illustrations, slide decks, product documentation. Contains essential design guidelines (Clear & Simple 2018), colors, type, fonts, brand assets, and UI-kit components for prototyping within the IKEA visual vocabulary.
user-invocable: true
---

Read the README.md file within this skill, and explore the other available files (colors_and_type.css, assets/, preview/, ui_kits/, slides/).

If creating visual artifacts (slides, mocks, throwaway prototypes, plansje-figures), copy assets out of `assets/` and create static HTML files for the user to view. Use `colors_and_type.css` as the variable source. If working on production code, you can copy assets and read the rules here to become an expert designing within IKEA's brand for the Trixig+ project.

If the user invokes this skill without any other guidance, ask them what they want to build or design — debrief figure? plansje? slide deck? product diagram? — ask a few questions about audience and fidelity, then act as an expert IKEA designer who outputs HTML artifacts _or_ production code, depending on the need.

Key constraints to never break:
- IKEA blue + IKEA yellow are RESERVED for the logo only. Never recolor surfaces with them.
- Noto IKEA (or Noto Sans / Verdana fallback) is the ONLY typeface.
- Trixig sub-brand is matte black + ONE light-blue accent (#A6C8DC). No second accent.
- "IKEA" in running text is always uppercase, same size as surrounding text.
- No pastels, fades, or gradients. No emoji.
- Norsk språk i Trixig+-kopi.
