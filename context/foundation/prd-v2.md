---
project: "Mapa Pogody W Trakcie Rowerowania"
version: 2
status: draft
created: 2026-05-29
context_type: greenfield
product_type: web-app
target_scale:
  users: medium
  qps: "# TODO: target_scale.qps - see Open Questions"
  data_volume: "# TODO: target_scale.data_volume - see Open Questions"
timeline_budget:
  mvp_weeks: 3
  hard_deadline: null
  after_hours_only: true
---

## Vision & Problem Statement
Rowerzyści podróżni (krótsze i dłuższe trasy) odczuwają problem w trakcie jazdy, gdy nagle zaczyna padać deszcz.
Dziś często przeczekują deszcz pod mostem, mokną, ryzykują uszkodzenie sprzętu i zmieniają kierunek trasy ad hoc.
Rozwiązanie ma działać ostrzegawczo: wykrywać ryzyko niekorzystnych warunków i wspierać korektę przejazdu.

## User & Persona
Główna persona: rowerzyści jeżdżący w podróże rowerowe krótsze i dłuższe.

## Success Criteria
### Primary
Użytkownik ustawia lub importuje trasę, system wykrywa niekorzystne warunki pogodowe na odcinkach trasy i ostrzega użytkownika w trakcie jazdy.

### Secondary
Możliwość podania średniej prędkości użytkownika, aby lepiej dopasować alerty pogodowe.

### Guardrails
- Prywatność lokalizacji użytkownika musi być zachowana.
- Mylne alerty muszą być ograniczone.
- Czas reakcji alertu nie może przekraczać 1 minuty od wykrycia ryzyka.

## User Stories
### US-01: Alert pogodowy na trasie
- **Given** rowerzysta ma ustawioną trasę
- **When** system wykryje na tej trasie złą pogodę
- **Then** rowerzysta dostaje alert na mapie z miejscem ryzyka i sugestią korekty (objazd lub zmiana godziny)

## Functional Requirements
- FR-001: Użytkownik może dodać swoją trasę i aplikacja ją wyświetla. Priority: must-have
  > Socrates: Counter-argument considered: brak. Resolution: FR zostaje bez zmian.

- FR-002: Użytkownik widzi powiadomienia na mapie, gdzie wydarzy się niekorzystny warunek pogodowy. Priority: must-have
  > Socrates: Counter-argument considered: złe określenie i przewidzenie prognozy pogody. Resolution: FR zostaje, ale wymaga doprecyzowania jakości i progu alertów.
  > Decision: próg jakości ≤10% mylnych alertów. MVP nie obejmuje sugestii objazdu - tylko wizualizacja zagrożonego odcinka na mapie i powiadomienie użytkownika.

## Non-Functional Requirements
- Prywatność lokalizacji: dane lokalizacyjne użytkownika nie mogą być ujawniane nieuprawnionym osobom.
- Jakość alertów: liczba mylnych alertów musi być ograniczona do uzgodnionego progu jakości.
- Responsywność alertów: alert pojawia się maksymalnie w 1 minutę od wykrycia ryzyka pogodowego.

## Business Logic
Aplikacja ostrzega użytkownika przed ryzykiem opadów na trasie na podstawie segmentu trasy, czasu dojazdu i prognozy opadów, aby umożliwić uniknięcie deszczu lub korektę przejazdu.

## Access Control
Logowanie emailem i hasłem.
Role: admin i użytkownik.

## Non-Goals
- Brak trybu offline.
- Brak integracji z wieloma mapami naraz (jedna integracja na start).
- Brak funkcji społecznościowych (udostępnianie tras, rankingi, czat).

## Open Questions
1. Jakie są docelowe widełki `target_scale.qps` dla MVP? - Owner: user. Block: no.
2. Jaki jest docelowy poziom `target_scale.data_volume` dla MVP? - Owner: user. Block: no.
