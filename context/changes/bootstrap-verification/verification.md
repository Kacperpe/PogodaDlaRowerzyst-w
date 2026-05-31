---
bootstrapped_at: 2026-05-29T11:55:39+02:00
starter_id: 10x-astro-starter
starter_name: "10x Astro Starter (Astro + Supabase + Cloudflare)"
project_name: mapa-pogody-w-trakcie-rowerowania
language_family: js
package_manager: npm
cwd_strategy: git-clone
bootstrapper_confidence: first-class
phase_3_status: ok
audit_command: "npm audit --json"
---

## Hand-off

```yaml
starter_id: 10x-astro-starter
package_manager: npm
project_name: mapa-pogody-w-trakcie-rowerowania
hints:
  language_family: js
  team_size: solo
  deployment_target: cloudflare-pages
  ci_provider: github-actions
  ci_default_flow: auto-deploy-on-merge
  bootstrapper_confidence: first-class
  path_taken: standard
  quality_override: false
  self_check_answers: null
  has_auth: true
  has_payments: false
  has_realtime: true
  has_ai: false
  has_background_jobs: true
```

## Why this stack
Ten projekt to web-app MVP budowane po godzinach w krótkim horyzoncie, więc najlepszy wybór to starter, który daje szybki start i spójne konwencje bez składania wielu narzędzi ręcznie. 10x-astro-starter zapewnia TypeScript, frontend i backend w jednym szkielecie oraz prostą ścieżkę wdrożenia, co ogranicza koszt operacyjny na starcie. Wymagania produktu obejmują alerty pogodowe podczas trasy i rozszerzenie o bota Telegram, dlatego oznaczone są funkcje realtime oraz background jobs, żeby od razu uwzględnić webhooki, kolejki/obsługę zdarzeń i notyfikacje asynchroniczne. Ten wybór utrzymuje wysokie tempo dostarczania i zostawia przestrzeń na późniejszą rozbudowę bez zmiany fundamentu stacku.

## Pre-scaffold verification

| Signal      | Value                                                     | Severity | Notes |
| ----------- | --------------------------------------------------------- | -------- | ----- |
| npm package | not run                                                   | n/a      | cmd_template starts with git clone |
| GitHub repo | https://github.com/przeprogramowani/10x-astro-starter last pushed 2026-05-17T10:33:39Z | fresh    | from card.docs_url |

## Scaffold log

**Resolved invocation**: `git clone https://github.com/przeprogramowani/10x-astro-starter .bootstrap-scaffold && cd .bootstrap-scaffold && npm install`
**Strategy**: git-clone
**Exit code**: 0
**Files moved**: 11
**Conflicts (.scaffold siblings)**: node_modules, public, src, CLAUDE.md, package-lock.json, package.json, README.md, tsconfig.json
**.gitignore handling**: append-merged
**.bootstrap-scaffold cleanup**: deleted

## Post-scaffold audit

**Tool**: npm audit --json
**Summary**: 0 CRITICAL, 0 HIGH, 2 MODERATE, 0 LOW
**Direct vs transitive**: direct/high-critical not distinguished separately in this summary; 1 direct MODERATE (`next`), 1 transitive MODERATE (`postcss`)

#### MODERATE findings

- `next` (direct): vulnerable via `postcss`, range `9.3.4-canary.0 - 16.3.0-canary.5`
- `postcss` (transitive): GHSA-qx2v-qp2m-jg93, CVSS 6.1, range `<8.5.10`

## Hints recorded but not acted on

| Hint                    | Value |
| ----------------------- | ----- |
| bootstrapper_confidence | first-class |
| quality_override        | false |
| path_taken              | standard |
| self_check_answers      | null |
| team_size               | solo |
| deployment_target       | cloudflare-pages |
| ci_provider             | github-actions |
| ci_default_flow         | auto-deploy-on-merge |
| has_auth                | true |
| has_payments            | false |
| has_realtime            | true |
| has_ai                  | false |
| has_background_jobs     | true |

## Next steps

Next: a future skill will set up agent context (CLAUDE.md, AGENTS.md). For now, your project is scaffolded and verified - happy hacking.

Useful manual steps in the meantime:
- `git init` (if you have not already) to start your own repo history.
- Review any `.scaffold` siblings the conflict policy created and decide which version of each file to keep.
- Address audit findings per your project's risk tolerance - the full breakdown is in this log.
