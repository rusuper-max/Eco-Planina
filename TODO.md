# EcoLogistics TODO

> Prioritizovana lista zadataka za stabilnost i skalabilnost aplikacije.
> Poslednje ažuriranje: 16.01.2026.

---

## 🔴 Prioritet 1: Stabilnost i Bezbednost

### 1.1 RLS Audit [DONE ✅]
- [x] Pregledati sve RLS politike za `users` tabelu
  - [x] ⚠️ **KRITIČNA RUPA PRONAĐENA I POPRAVLJENA**
  - [x] Kreiran `026_security_prevent_role_self_promotion.sql`
  - [x] Trigger sprečava korisnike da menjaju svoj `role`, `company_code`, `is_owner`
  - [x] company_admin ne može promovisati nikoga na admin/developer
- [x] Pregledati RLS za `driver_assignments` - OK (004_fix_rls_recursion.sql)
- [x] Pregledati RLS za `processed_requests` - OK (015_fix_processed_requests_policy.sql)
- [x] Pregledati RLS za `pickup_requests` - OK (001_supabase_auth_migration.sql)
- [ ] Dokumentovati sve politike u SECURITY.md (opciono)

### 1.2 Error Boundaries (React) [DONE ✅]
- [x] Kreirati `ErrorBoundary` komponentu za web
- [x] Specijalizovani wrapperi: `MapErrorBoundary`, `AnalyticsErrorBoundary`, `TableErrorBoundary`
- [x] Fallback UI sa "Pokušaj ponovo" i "Početna" dugmadima
- [x] Dev-only error details prikaz
- [ ] (Opciono) Wrap-ovati kritične sekcije u Dashboard.jsx

### 1.3 Deploy Pending Migracija
- [ ] Pokrenuti `006_company_admin_role.sql` na produkciji
- [x] Pokrenuti `026_security_prevent_role_self_promotion.sql` na produkciji ✅ **DEPLOYED**
- [ ] Deploy `auth-register` Edge Function sa claim logikom

---

## 🟠 Prioritet 2: Offline Support (Mobile)

### 2.1 Offline Queue za Vozače
- [ ] Implementirati AsyncStorage persistence za assignments
- [ ] Queue za offline akcije (pickup, delivery)
- [ ] Sync queue kad se vrati konekcija
- [ ] UI indikator za offline mod
- [ ] Retry logika sa exponential backoff

### 2.2 Caching
- [ ] Keširati waste types lokalno
- [ ] Keširati company settings
- [ ] Keširati poslednje assignments

---

## 🟡 Prioritet 3: Testing

### 3.1 E2E Smoke Test (Web)
- [ ] Setup Playwright
- [ ] Test: Client kreira zahtev
- [ ] Test: Manager vidi i obrađuje zahtev
- [ ] Test: (opciono) Driver flow

### 3.2 Mobile Testing
- [ ] Ručno testiranje happy path na iOS/Android
- [ ] (Kasnije) Setup Detox ili Maestro

---

## 🟢 Prioritet 4: TypeScript

### 4.1 Supabase Types
- [ ] Generisati tipove: `supabase gen types typescript`
- [ ] Kreirati `/src/types/database.ts`
- [ ] Koristiti tipove u kritičnim hookovima

### 4.2 Postepena Migracija
- [ ] Migrirati utils fajlove
- [ ] Migrirati context fajlove
- [ ] (Kasnije) Migrirati komponente

---

## 🔵 Prioritet 5: Features

### 5.1 Push Notifikacije
- [ ] EAS Build setup
- [ ] Expo Notifications konfiguracija
- [ ] Supabase trigger za nove assignments
- [ ] Test na fizičkom uređaju

### 5.2 Client Import (Dovršiti)
- [ ] Test Excel import flow end-to-end
- [ ] Test claim profile flow (shadow → registered)
- [ ] Dodati import dugme za `company_admin` u Osoblje tab

### 5.3 UI Poboljšanja
- [ ] Mobile notifikacije layout fix
- [ ] Role filter u region expand (za velike liste)
- [ ] Dark mode (opciono)

---

## ✅ Nedavno Završeno

- [x] Route optimization (Web + Mobile) - Nearest Neighbor algoritam
- [x] Bulk waste type assignment
- [x] Company Admin: Read-only Aktivni Zahtevi tab
- [x] Client Import Modal
- [x] Shadow contact claim logic u auth-register
- [x] Phone normalization utility
- [x] Driver ima svoj zasebni Dashboard
- [x] Company Admin impersonacija (samo niže role, ista firma)
- [x] RegionsPage sa tabovima (Filijale/Dodeli/Vizuelni)

---

## 📝 Napomene

- **Monorepo**: Razmotriti Turborepo/Nx kad kreneš TS + shared types
- **Sentry**: Razmotriti za production error tracking
- **Analytics**: Mixpanel/Amplitude za user behavior tracking
