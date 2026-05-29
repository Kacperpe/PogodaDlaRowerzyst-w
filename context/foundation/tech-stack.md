---
starter_id: next
package_manager: npm
project_name: mapa-pogody-w-trakcie-rowerowania
hints:
  language_family: js
  team_size: solo
  deployment_target: vercel
  ci_provider: github-actions
  ci_default_flow: auto-deploy-on-merge
  bootstrapper_confidence: verified
  path_taken: standard
  quality_override: false
  self_check_answers: null
  has_auth: true
  has_payments: false
  has_realtime: false
  has_ai: false
  has_background_jobs: false
---

## Why this stack
Ten stack minimalizuje czas wejścia dla MVP web-app w 3 tygodnie po godzinach. Next.js z TypeScript daje szybkie budowanie interfejsu i logiki w jednym projekcie, a Vercel upraszcza wdrożenie i auto-deploy po merge bez dodatkowej infrastruktury. To podejście pasuje do wymagań produktu ostrzegającego rowerzystę podczas trasy, przy zachowaniu prostoty implementacji i możliwości późniejszej rozbudowy.

## Zewnętrzne API i biblioteki

### Mapa: Leaflet + OpenStreetMap
- Biblioteka: `leaflet` + `react-leaflet`
- Typy: `@types/leaflet`
- Kafelki: OpenStreetMap (darmowe, brak klucza API)
- Uzasadnienie: open-source, zero kosztów przy skali, dedykowane warstwy rowerowe OSM, bogaty ekosystem pluginów (routing, polylines, markery)

### Pogoda: Open-Meteo
- Biblioteka: `@openmeteo/sdk` lub natywny `fetch` (REST API)
- Klucz API: nie wymagany
- Uzasadnienie: całkowicie darmowe, brak rejestracji, dobre pokrycie Europy, prognozy co 1h, pola `precipitation` i `weathercode` wystarczające do alertów opadów
