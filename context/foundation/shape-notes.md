---
project: "Mapa Pogody W Trakcie Rowerowania"
updated: 2026-05-29
context_type: greenfield
product_type: web-app
target_scale:
  users: medium
timeline_budget:
  mvp_weeks: 3
  hard_deadline: null
  after_hours_only: true
checkpoint:
  current_phase: 8
  phases_completed: [1, 2, 3, 4, 5, 6, 7]
  frs_drafted: 2
  quality_check_status: accepted
---

## Vision & Problem Statement
RowerzyĹ›ci podrĂłĹĽni (krĂłtsze i dĹ‚uĹĽsze trasy) odczuwajÄ… problem w trakcie jazdy, gdy nagle zaczyna padaÄ‡ deszcz.
DziĹ› czÄ™sto przeczekujÄ… deszcz pod mostem, moknÄ…, ryzykujÄ… uszkodzenie sprzÄ™tu i zmieniajÄ… kierunek trasy ad hoc.
RozwiÄ…zanie ma dziaĹ‚aÄ‡ ostrzegawczo: wykrywaÄ‡ ryzyko niekorzystnych warunkĂłw i wspieraÄ‡ korektÄ™ przejazdu.

## User & Persona
GĹ‚Ăłwna persona: rowerzyĹ›ci jeĹĽdĹĽÄ…cy w podrĂłĹĽe rowerowe krĂłtsze i dĹ‚uĹĽsze.

## Access Control
Logowanie emailem i hasĹ‚em.
Role: admin i uĹĽytkownik.

## Success Criteria
### Primary
UĹĽytkownik ustawia lub importuje trasÄ™, system wykrywa niekorzystne warunki pogodowe na odcinkach trasy i ostrzega uĹĽytkownika w trakcie jazdy.

### Secondary
MoĹĽliwoĹ›Ä‡ podania Ĺ›redniej prÄ™dkoĹ›ci uĹĽytkownika, aby lepiej dopasowaÄ‡ alerty pogodowe.

### Guardrails
- PrywatnoĹ›Ä‡ lokalizacji uĹĽytkownika musi byÄ‡ zachowana.
- Mylne alerty muszÄ… byÄ‡ ograniczone.
- Czas reakcji alertu nie moĹĽe przekraczaÄ‡ 1 minuty od wykrycia ryzyka.

## Functional Requirements
- FR-001: UĹĽytkownik moĹĽe dodaÄ‡ swojÄ… trasÄ™ i aplikacja jÄ… wyĹ›wietla. Priority: must-have
  > Socrates: Counter-argument considered: brak. Resolution: FR zostaje bez zmian.

- FR-002: UĹĽytkownik widzi powiadomienia na mapie, gdzie wydarzy siÄ™ niekorzystny warunek pogodowy. Priority: must-have
  > Socrates: Counter-argument considered: zĹ‚e okreĹ›lenie i przewidzenie prognozy pogody. Resolution: FR zostaje, ale wymaga doprecyzowania jakoĹ›ci i progu alertĂłw.
  > Decision: prĂłg jakoĹ›ci â‰¤10% mylnych alertĂłw. MVP nie obejmuje sugestii objazdu â€” tylko wizualizacja zagroĹĽonego odcinka na mapie i powiadomienie uĹĽytkownika.

## User Stories
### US-01
**Given** rowerzysta ma ustawionÄ… trasÄ™
**When** system wykryje na tej trasie zĹ‚Ä… pogodÄ™
**Then** rowerzysta dostaje alert na mapie z miejscem ryzyka i sugestiÄ… korekty (objazd lub zmiana godziny)

## Business Logic
Aplikacja ostrzega uĹĽytkownika przed ryzykiem opadĂłw na trasie na podstawie segmentu trasy, czasu dojazdu i prognozy opadĂłw, aby umoĹĽliwiÄ‡ unikniÄ™cie deszczu lub korektÄ™ przejazdu.

## Non-Functional Requirements
- PrywatnoĹ›Ä‡ lokalizacji: dane lokalizacyjne uĹĽytkownika nie mogÄ… byÄ‡ ujawniane nieuprawnionym osobom.
- JakoĹ›Ä‡ alertĂłw: liczba mylnych alertĂłw musi byÄ‡ ograniczona do uzgodnionego progu jakoĹ›ci.
- ResponsywnoĹ›Ä‡ alertĂłw: alert pojawia siÄ™ maksymalnie w 1 minutÄ™ od wykrycia ryzyka pogodowego.

## Non-Goals
- Brak trybu offline.
- Brak integracji z wieloma mapami naraz (jedna integracja na start).
- Brak funkcji spoĹ‚ecznoĹ›ciowych (udostÄ™pnianie tras, rankingi, czat).

## Open Questions
~~1. Jaki dokĹ‚adnie prĂłg jakoĹ›ci oznacza â€žbrak/mylnych alertĂłw powyĹĽej proguâ€ť?~~ â†’ â‰¤10% mylnych alertĂłw
~~2. Czy sugestia objazdu lub zmiany godziny jest obowiÄ…zkowa w MVP?~~ â†’ nie, MVP tylko pokazuje zagroĹĽony odcinek i powiadamia
~~3. Czy model logowania imiÄ™ + nick ma mieÄ‡ dodatkowÄ… weryfikacjÄ™?~~ â†’ zmienione na email + hasĹ‚o

