# Security & OPSEC Audit Report

Date: 2026-05-29
Project: MapaPogodyWTrakcieRowerowania
Reviewer: Codex (automated code audit)

## Scope
- App Router pages and client logic
- API route handlers
- Auth/server actions (Supabase)
- Config files (Next, Supabase, CI)
- Dependency vulnerabilities (`npm audit`)
- OPSEC/privacy exposure in public assets

## Findings

### 1) High - Public exposure of sensitive route/location data (OPSEC leak)
**Evidence**
- [public/AA_194_z_noclegami__Copy_.gpx](/C:/Users/Kacper/OneDrive/.STARTUP/MapaPogodyWTrakcieRowerowania/public/AA_194_z_noclegami__Copy_.gpx:6)
- [public/AA_194_z_noclegami__Copy_.gpx](/C:/Users/Kacper/OneDrive/.STARTUP/MapaPogodyWTrakcieRowerowania/public/AA_194_z_noclegami__Copy_.gpx:9)
- [src/app/page.tsx](/C:/Users/Kacper/OneDrive/.STARTUP/MapaPogodyWTrakcieRowerowania/src/app/page.tsx:9)

**Issue**
Pliki GPX s¹ publicznie serwowane z katalogu `public/` i zawieraj¹ precyzyjne punkty trasy oraz nazwy/adresy noclegów.

**Impact**
- Ujawnienie wzorców podró¿y i planów przejazdu
- Ujawnienie punktów noclegowych/adresów
- Ryzyko profilowania u¿ytkownika i doxxingu

**Recommended fix**
- Usuñ realne dane z `public/`; zostaw zanonimizowane sample
- Trzymaj prywatne GPX poza webrootem (np. prywatny bucket + signed URLs)
- Dodaj politykê retencji i anonimizacji danych tras

---

### 2) High - Unauthenticated API endpoints can be abused as public proxy
**Evidence**
- [src/app/api/pois/route.ts](/C:/Users/Kacper/OneDrive/.STARTUP/MapaPogodyWTrakcieRowerowania/src/app/api/pois/route.ts:102)
- [src/app/api/weather/point/route.ts](/C:/Users/Kacper/OneDrive/.STARTUP/MapaPogodyWTrakcieRowerowania/src/app/api/weather/point/route.ts:17)
- [src/app/api/weather/test/route.ts](/C:/Users/Kacper/OneDrive/.STARTUP/MapaPogodyWTrakcieRowerowania/src/app/api/weather/test/route.ts:3)

**Issue**
Endpointy pogodowe/POI s¹ publicznie dostêpne bez auth i bez ograniczeñ ¿¹dañ. Ka¿dy mo¿e wykonywaæ zewnêtrzne zapytania przez Twój backend.

**Impact**
- Abuse/DoS przez boty
- Wyczerpanie limitów providerów
- Wzrost kosztów i degradacja dostêpnoœci

**Recommended fix**
- Wymagaj sesji u¿ytkownika dla endpointów biznesowych
- Dodaj per-IP + per-user rate limit (sliding window/token bucket)
- Dodaj caching odpowiedzi i deduplikacjê zapytañ upstream
- Rozwa¿ WAF/edge rules dla `/api/*`

---

### 3) Medium - Missing input bounds/validation on external-query parameters
**Evidence**
- [src/app/api/weather/point/route.ts](/C:/Users/Kacper/OneDrive/.STARTUP/MapaPogodyWTrakcieRowerowania/src/app/api/weather/point/route.ts:18)
- [src/app/api/pois/route.ts](/C:/Users/Kacper/OneDrive/.STARTUP/MapaPogodyWTrakcieRowerowania/src/app/api/pois/route.ts:104)
- [src/app/api/pois/route.ts](/C:/Users/Kacper/OneDrive/.STARTUP/MapaPogodyWTrakcieRowerowania/src/app/api/pois/route.ts:96)

**Issue**
- `lat/lon/time` s¹ tylko parsowane, ale nie ma twardych zakresów (lat -90..90, lon -180..180)
- BBOX dla POI nie ma limitu maksymalnego obszaru i poprawnoœci geometrii
- `roundBbox` mo¿e zwróciæ `NaN` dla z³ych wejœæ

**Impact**
- Niestabilne zachowanie endpointów
- £atwiejsze abuse endpointów
- Zwiêkszenie loadu i nieprzewidywalne b³êdy

**Recommended fix**
- Walidacja schema (np. Zod) dla query params
- Hard limits na bbox size i maks. czas zakresu forecast
- Odrzucanie `NaN` i out-of-range przed wywo³aniem upstream

---

### 4) Medium - Unbounded in-memory cache can lead to memory growth (DoS risk)
**Evidence**
- [src/app/api/pois/route.ts](/C:/Users/Kacper/OneDrive/.STARTUP/MapaPogodyWTrakcieRowerowania/src/app/api/pois/route.ts:11)
- [src/app/api/pois/route.ts](/C:/Users/Kacper/OneDrive/.STARTUP/MapaPogodyWTrakcieRowerowania/src/app/api/pois/route.ts:135)

**Issue**
Cache `Map` nie ma limitu wielkoœci/eviction policy, tylko TTL. Atakuj¹cy mo¿e generowaæ wiele ró¿nych bbox i pompowaæ pamiêæ procesu.

**Impact**
- Zu¿ycie RAM
- OOM/restarty procesu
- Spadek dostêpnoœci API

**Recommended fix**
- WprowadŸ LRU z limitem wpisów
- Ogranicz entropy kluczy (canonical bbox + max area)
- Rozwa¿ cache zewnêtrzny (Redis) z quota

---

### 5) Medium - Missing security headers baseline
**Evidence**
- [next.config.ts](/C:/Users/Kacper/OneDrive/.STARTUP/MapaPogodyWTrakcieRowerowania/next.config.ts:3)

**Issue**
Brak konfiguracji nag³ówków bezpieczeñstwa (CSP, X-Frame-Options/frame-ancestors, X-Content-Type-Options, Referrer-Policy, Permissions-Policy).

**Impact**
- S³absza ochrona przed XSS/clickjacking i data-leak vectors

**Recommended fix**
- Dodaj `headers()` w Next config i bazowy CSP
- Dla map/tiles dopisz do CSP dozwolone domeny
- W³¹cz `Strict-Transport-Security` na warstwie edge/reverse-proxy

---

### 6) Medium - Auth error message leakage enables account/user-state enumeration
**Evidence**
- [src/app/(auth)/actions.ts](/C:/Users/Kacper/OneDrive/.STARTUP/MapaPogodyWTrakcieRowerowania/src/app/(auth)/actions.ts:15)
- [src/app/(auth)/actions.ts](/C:/Users/Kacper/OneDrive/.STARTUP/MapaPogodyWTrakcieRowerowania/src/app/(auth)/actions.ts:30)

**Issue**
Raw `error.message` z providera auth jest przekazywany do URL i wyœwietlany u¿ytkownikowi.

**Impact**
- Mo¿liwa enumeracja kont i stanu konta
- Ujawnienie detali implementacyjnych auth

**Recommended fix**
- Mapuj b³êdy auth do generycznych komunikatów UI
- Loguj szczegó³y po stronie serwera, nie w query string

---

### 7) Medium - Weak auth defaults in Supabase local config (risk if mirrored to prod)
**Evidence**
- [supabase/config.toml](/C:/Users/Kacper/OneDrive/.STARTUP/MapaPogodyWTrakcieRowerowania/supabase/config.toml:175)
- [supabase/config.toml](/C:/Users/Kacper/OneDrive/.STARTUP/MapaPogodyWTrakcieRowerowania/supabase/config.toml:178)
- [supabase/config.toml](/C:/Users/Kacper/OneDrive/.STARTUP/MapaPogodyWTrakcieRowerowania/supabase/config.toml:209)
- [supabase/config.toml](/C:/Users/Kacper/OneDrive/.STARTUP/MapaPogodyWTrakcieRowerowania/supabase/config.toml:211)

**Issue**
`minimum_password_length = 6`, brak wymagañ z³o¿onoœci, email confirmations off, secure password change off.

**Impact**
- S³absza odpornoœæ kont na przejêcie

**Recommended fix**
- Minimum 10-12 znaków + wymagania z³o¿onoœci
- `enable_confirmations = true`
- `secure_password_change = true`
- Zweryfikuj ustawienia œrodowiska produkcyjnego oddzielnie od local dev

---

### 8) Low/Medium - Dependency vulnerability present in transitive `postcss` via `next`
**Evidence**
- `npm audit --json` result in this repo (2026-05-29)
- Advisory: GHSA-qx2v-qp2m-jg93 (`postcss < 8.5.10`), severity: moderate

**Issue**
W zale¿noœciach istnieje znane XSS ryzyko zwi¹zane z stringify output w PostCSS.

**Impact**
- Potencjalny wektor XSS zale¿ny od œcie¿ki u¿ycia parsera/stringifiera

**Recommended fix**
- Zaktualizowaæ `next`/transitives do wersji bez podatnoœci
- W CI dodaæ security gate (`npm audit --omit=dev --audit-level=high` + periodic full audit)

## Additional observations (hardening)
- Brak centralnego audytu security eventów (login fail, atypical API spikes)
- Brak captcha/challenge w auth flow (przydatne przy public app)
- Brak formalnej polityki CORS/rate limiting per route

## Prioritized remediation plan
1. **Immediate (P0):** Usun¹æ prywatne GPX z `public/`, dodaæ auth + rate limiting dla `/api/weather/*` i `/api/pois`.
2. **Short-term (P1):** Dodaæ walidacjê inputów (Zod), limity bbox/time, bounded cache (LRU), neutralne komunikaty auth.
3. **Short-term (P1):** W³¹czyæ security headers + CSP.
4. **Mid-term (P2):** Wzmocniæ polityki Supabase auth (password/email confirmation/secure password change) i wdro¿yæ monitorowanie security logów.
5. **Ongoing (P2):** Dependency patch management + regularne skany.

## Quick wins checklist
- [ ] Remove sensitive GPX from `/public`
- [ ] Add auth guard to weather/POI routes
- [ ] Add request rate limiting
- [ ] Add strict query validation + bounds
- [ ] Replace unbounded Map cache with LRU
- [ ] Configure CSP and security headers
- [ ] Normalize auth errors (no raw provider messages)
- [ ] Harden Supabase auth policy
- [ ] Patch vulnerable dependency chain
