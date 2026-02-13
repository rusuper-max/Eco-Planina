# EcoLogistics - TODO Lista

> Linearna lista zadataka - radimo redom od vrha ka dnu
> Poslednje ažuriranje: 31.01.2026.

---

## ✅ Završeno (78 zadataka)

1. ~~Supabase Auth migracija~~
2. ~~Context split (5 context-a)~~
3. ~~DashboardComponents refaktoring (4,858 → 87 linija)~~
4. ~~Error Boundaries~~
5. ~~RLS Security Audit~~
6. ~~Region sistem~~
7. ~~Driver Assignment sistem~~
8. ~~Excel Export~~
9. ~~Manager/Driver Analytics~~
10. ~~Timeline prikaz~~
11. ~~Client Import~~
12. ~~Route Optimization~~
13. ~~Period filter na analitici i istoriji~~
14. ~~Admin Password Reset Edge Function~~
15. ~~Empty States~~
16. ~~Activity Log~~
17. ~~Company Staff/Settings~~
18. ~~Help sistem~~
19. ~~Real-time notifikacije~~
20. ~~Mobile Auth migracija~~
21. ~~Driver Dashboard (mobile)~~
22. ~~Two-step pickup flow~~
23. ~~Touch optimizacija~~
24. ~~Ukloniti DEBUG console.log (~83 uklonjeno)~~
25. ~~Obrisati backup context fajlove (3 fajla)~~
26. ~~Waste Types - slika upload fix (RPC funkcija 042)~~
27. ~~Client lokacija fix (RPC funkcija 014)~~
28. ~~Activity Log - "Odbijen" za rejected zahteve (migracija 043)~~
29. ~~Realtime za driver_assignments (migracija 051)~~
30. ~~Duplikat zahteva bug fix - Atomic RPC (migracija 052)~~
31. ~~Client location save sa pickup_requests update (migracija 053)~~
32. ~~Activity Log - ispravno "Odbijen" umesto "Obrađen" (migracija 054)~~
33. ~~Location warning button u tabeli zahteva (trepćuća ikonica)~~
34. ~~Weight input - blokiranje slova e/E/+/- u ProcessRequestModal~~
35. ~~BulkWasteTypeModal - redizajn na split-panel layout~~
36. ~~Driver task list polling fix (uvek aktivno, ne samo na tasks tab)~~
37. ~~Manager status kolona - 45s fallback polling za realtime~~
38. ~~Inventory sistem - osnovne tabele (055, 056)~~
39. ~~Inventory trigger za automatski ulaz (056)~~
40. ~~Retroaktivni import (057)~~
41. ~~Supervisor rola - many-to-many sa regionima (059)~~
42. ~~Supervisor RLS fix - infinite recursion (060, 061)~~
43. ~~Inventory RLS fix za company_admin (062)~~
44. ~~Assign region to inventory RPC (063)~~
45. ~~Inventory UI - checkbox za filijale u modalu~~
46. ~~Filijale prikaz - naziv skladišta na kartici~~
47. ~~Manager inventory page fix (Dashboard.jsx render case)~~
48. ~~Supervisor web routing fix (App.jsx + DataContext filtering)~~
49. ~~Supervisor pristup Osoblje stranici (CompanyStaffPage.jsx)~~
50. ~~Mobile registracija fix - dodavanje Authorization header~~
51. ~~Mobile kamera/galerija fix - poboljšan pickImage~~
52. ~~Mobile bulk akcije za vozače (long press selekcija)~~
53. ~~RLS Security fix - Enable RLS na driver_location_history, master_codes, impersonation_log~~
54. ~~Inventory Outbound kompletno (DB + UI + DataContext funkcije)~~
55. ~~Vehicles kompletno (CRUD + dodela vozača + primarno vozilo)~~
56. ~~**DriverViewScreen.js refaktoring** (2,373 → 748 linija + 7 hooks + 6 komponenti)~~
57. ~~**Dashboard.jsx refaktoring** (2,097 → 1,464 linija + 7 hooks + 5 komponenti + 2 config)~~
58. ~~**DataContext.jsx refaktoring** (1,781 → 354 linija + 7 hooks)~~
59. ~~**DriverDashboard.jsx refaktoring** (1,623 → 322 linija + 3 hooks + 5 komponenti)~~
60. ~~**Security - API ključevi** (app.config.js + .env support)~~
61. ~~**PDF Dokumenti** (Prijemnica + Otpremnica sa @react-pdf/renderer)~~
62. ~~**Fuel Logs** (DB migracija + Web UI za evidenciju goriva)~~
63. ~~**Inventory Poboljšanja** (Manual adjustment + Low stock alert + Chart)~~
64. ~~**Vizuelni Editor Proširenje** (WarehouseContainer + VehicleBadge + UnconnectedPanel)~~
65. ~~**Fuel Logs RLS Fix** (migracija 070 - idempotentni indeksi)~~
66. ~~**Bulk Update Supervisor Fix** (migracija 071 - supervisor dodat u update_client_details)~~
67. ~~**Developer Impersonation Fix** (migracija 072 - RLS bypass za dev impersonaciju)~~
68. ~~**Inventory RLS Konsolidacija** (migracija 073 - supervisor filtriranje po regionima)~~
69. ~~**Supervisor Inventory Frontend** (filtriranje skladišta/transakcija po regionima)~~
70. ~~**Supervisor Analytics Frontend** (filtriranje podataka po regionima + driver blokada)~~
71. ~~**Playwright E2E Testing Setup** (konfiguracija + smoke testovi + auth/request test scaffolding)~~
72. ~~**TypeScript Setup** (supabase gen types + tsconfig + typed client + helper types)~~
73. ~~**Sentry Error Tracking** (SDK + config + ErrorBoundary integracija + user context)~~
74. ~~**Bundle Size Optimizacija** (React.lazy + Vite manualChunks - index.js 3,434kB → 253kB, -93%)~~
75. ~~**PWA Podrška** (vite-plugin-pwa + Service Worker + Install Prompt + Offline caching)~~
76. ~~**Onboarding Wizard** (4-step wizard za nove company_admin korisnike - regions, waste types, staff)~~
77. ~~**Inventory "Stanje" Bug Fix** (useMemo redosled - visibleInventoryItems definisan pre upotrebe)~~
78. ~~**Map Bulk Assignment** (Cluster click modal sa "Dodeli grupno"/"Zumiraj" + user settings za omogućavanje)~~

---

## 🔴 PRIORITET 1 - Tehnički Dug (HITNO)

Pre dodavanja novih funkcionalnosti, moramo stabilizovati kod.

### 1. ✅ Refaktorisati KRITIČNE fajlove - ZAVRŠENO

| Fajl | Pre | Posle | Smanjenje |
|------|-----|-------|-----------|
| `DriverViewScreen.js` | 2,373 | 748 | -69% ✅ |
| `Dashboard.jsx` | 2,097 | 1,464 | -30% ✅ |
| `DataContext.jsx` | 1,781 | 354 | -80% ✅ |
| `DriverDashboard.jsx` | 1,623 | 322 | -80% ✅ |

**Ukupno:** 7,874 → 2,888 linija (-63%)

**Kreirani moduli:**
- `web/src/pages/driver-dashboard/` - 3 hooks, 5 komponenti, utils
- `web/src/pages/dashboard/` - 7 hooks, 5 komponenti, 2 config
- `web/src/context/hooks/` - 7 hooks
- `mobile/src/screens/driver/` - 7 hooks, 6 komponenti

---

### 2. ✅ Security - API Ključevi 🔒 - ZAVRŠENO
- [x] Konvertovano `app.json` → `app.config.js` (dinamička konfiguracija)
- [x] API ključevi čitaju iz `.env` varijabli sa fallback vrednostima
- [x] Dodato `.env.example` za dokumentaciju
- [x] Ažuriran `.gitignore` da ignoriše `.env`
- [x] `src/config/google.js` i `src/config/supabase.js` koriste env varijable

**Napomena:** Supabase anon key je javni ključ, zaštita je preko RLS politika.

---

## 🟡 PRIORITET 2 - Nove Funkcionalnosti (Srednji)

### 3. ✅ PDF Dokumenti 📄 - ZAVRŠENO
Generisanje PDF dokumenata za vozače i skladište.

- [x] PDF Prijemnica (za obrađene zahteve u HistoryTable)
- [x] PDF Otpremnica (za potvrđene izlaze u OutboundTab)
- [x] PDFDownloadButton komponenta (reusable dugme za preuzimanje)
- [ ] Digitalni potpis klijenta (opciono - canvas na telefonu)

**Implementacija:** `web/src/components/pdf/`
- `DeliveryNotePDF.jsx` - Otpremnica za izlaze
- `ReceiptPDF.jsx` - Prijemnica za obrađene zahteve
- `PDFDownloadButton.jsx` - Helper komponenta

**Tehnologija:** @react-pdf/renderer

---

### 4. ✅ Gorivo (Fuel Logs) ⛽ - ZAVRŠENO
Praćenje potrošnje goriva po kamionima.

- [x] DB migracija za fuel_logs (migracija 070)
- [x] Web: Izveštaj potrošnje po vozilu/vozaču
- [x] Web: FuelLogsPage sa kompletnim CRUD
- [x] Web: FuelStatsCards sa statistikom
- [ ] Mobile: Unos goriva (vozač) - opciono
- [ ] Mobile: Upload slike računa - opciono

**Implementacija:** `web/src/components/fuel/`
- `FuelLogsPage.jsx` - Glavna stranica
- `FuelStatsCards.jsx` - Statistika
- `AddFuelLogModal.jsx` - Modal za dodavanje/izmenu

**DB Views:**
- `fuel_stats_by_vehicle` - Statistika po vozilu
- `fuel_stats_monthly` - Mesečna statistika
- `calculate_fuel_consumption()` - RPC funkcija za potrošnju

---

### 5. ✅ Inventory Poboljšanja 📊 - ZAVRŠENO
- [x] Manual adjustment UI (korekcije stanja)
- [x] Alert za nisko stanje (threshold po waste type)
- [x] Grafikon ulaza/izlaza kroz vreme

**Implementacija:** `web/src/components/inventory/`
- `AdjustmentModal.jsx` - Ručna korekcija stanja (dodaj/oduzmi/postavi)
- `LowStockAlert.jsx` - Upozorenje za nizak nivo zaliha
- `InventoryChart.jsx` - CSS grafikon ulaza/izlaza (14 dana)

---

## 🟢 PRIORITET 3 - Nice-to-Have (Nizak)

### 6. ✅ Vizuelni Editor Proširenje 🗺️ - ZAVRŠENO
Dodati skladišta i kamione u RegionNodeEditor.jsx.

- [x] Prikaz skladišta kao grupni kontejner (WarehouseContainer)
- [x] Kamioni sa ikonicama pored vozača (VehicleBadge)
- [x] Nepovezani entiteti sekcija (UnconnectedPanel)

**Implementacija:** `web/src/components/admin/RegionNodeEditor.jsx`
- `WarehouseContainer` - Prikaz skladišta sa zalihama po tipu
- `VehicleBadge` - Registracija vozila pored vozača
- `UnconnectedPanel` - Panel sa vozilima bez vozača i skladištima bez regiona

---

### 7. ✅ Testing 🧪 - SETUP ZAVRŠEN
Playwright E2E framework konfigurisan.

- [x] Setup Playwright (`playwright.config.js`)
- [x] Smoke testovi (login page, register page, validation)
- [x] Auth test scaffolding (login flow, country dropdown, password toggle)
- [x] Request test scaffolding (create request, process request)
- [ ] Test sa pravim kredencijalima (zahteva test korisnike u Supabase)
- [ ] Test: Driver pickup flow

**Implementacija:** `web/e2e/`
- `smoke.spec.js` - Osnovni health check testovi (3 prolaze)
- `auth.spec.js` - Autentifikacija testovi
- `requests.spec.js` - Request management testovi
- `helpers/auth.js` - Login helper funkcije
- `helpers/test-data.js` - Test podaci i selektori

**Pokretanje:**
```bash
npm run test          # Svi testovi
npm run test:smoke    # Samo smoke testovi
npm run test:ui       # Playwright UI mode
npm run test:headed   # Sa vidljivim browserom
```

---

### 8. ✅ TypeScript Migracija 🔷 - SETUP ZAVRŠEN
TypeScript konfiguracija za postepenu migraciju.

- [x] `supabase gen types typescript` (2,098 linija tipova)
- [x] Kreirati `/src/types/database.ts`
- [x] `tsconfig.json` sa `allowJs: true` za mešanje JS/TS
- [x] Typed Supabase client (`supabase.ts`)
- [x] Helper tipovi (`supabase.ts` - User, PickupRequest, etc.)
- [ ] Postepeno migrirati .jsx → .tsx fajlove

**Implementacija:** `web/src/types/`
- `database.ts` - Auto-generisani tipovi iz Supabase šeme
- `supabase.ts` - Helper tipovi i enumi
- `index.ts` - Centralni export

**Korišćenje:**
```typescript
import type { User, PickupRequest, UserRole } from '../types';
import { typedSupabase, selectFrom } from '../config/supabase';

// Typed query
const { data } = await selectFrom('users').select('*').eq('role', 'driver');
```

---

### 9. ✅ Sentry Error Tracking 🔔 - SETUP ZAVRŠEN
Automatsko praćenje grešaka u produkciji.

- [x] Instaliran `@sentry/react` SDK
- [x] Konfigurisano u `src/config/sentry.ts`
- [x] Integrisano sa ErrorBoundary
- [x] User context pri login/logout
- [x] Env varijable za DSN

**Aktiviranje:**
1. Kreiraj projekat na https://sentry.io
2. Dodaj DSN u `.env`: `VITE_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx`

**Features:**
- Automatsko hvatanje grešaka
- Performance monitoring (10% sampling)
- Session replay za greške
- User context (role, company_code)
- Breadcrumbs za debugging

---

### 10. ✅ PWA Podrška 📱 - ZAVRŠENO
Aplikacija se može instalirati kao native app.

- [x] `vite-plugin-pwa` konfiguracija
- [x] Web App Manifest (ime, ikone, boje)
- [x] Service Worker sa Workbox
- [x] Offline caching (API, slike, fontovi)
- [x] PWAInstallPrompt komponenta
- [ ] PWA ikone (potrebno dizajnirati 192x192 i 512x512)

**Caching strategije:**
- Supabase API: NetworkFirst (1h cache)
- Slike: CacheFirst (30 dana)
- Fontovi: CacheFirst (1 godina)

**Instalacija na telefon:**
1. Otvori sajt u Chrome/Safari
2. Klikni "Instaliraj" na promptu (ili "Dodaj na Home Screen")

---

### 11. ✅ Onboarding Wizard 🎓 - ZAVRŠENO
Vodič za nove company_admin korisnike.

- [x] 4-step wizard (Welcome, Regions, WasteTypes, Staff)
- [x] Progress bar sa statusom
- [x] Automatsko prikazivanje za nove firme
- [x] Pamćenje u localStorage

**Komponente:** `web/src/components/onboarding/`

---

### 12. Ostalo (opciono)
- [ ] QR kodovi za klijente (on hold)

---

## 📚 Reference

### Pokretanje
```bash
# Web
cd web && npm run dev

# Mobile
npx expo start

# Edge Functions (lokalno)
supabase functions serve
```

### Tech Stack
- **Web:** React 19, Vite 7, TailwindCSS v4, Leaflet, TypeScript
- **Mobile:** React Native 0.81, Expo SDK 54
- **Backend:** Supabase (PostgreSQL, Auth, Realtime, Storage, Edge Functions)
- **Testing:** Playwright E2E
- **Monitoring:** Sentry (optional)

### Role Hierarchy
| Rola | Pristup |
|------|---------|
| developer | Sve + debug |
| admin | Sve kompanije |
| company_admin | Svoja firma - upravljanje |
| supervisor | Više filijala - nadgleda menadžere |
| manager | Obrada zahteva u svojoj filijali |
| driver | Preuzimanje/dostava |
| client | Kreiranje zahteva |

### Statistika projekta
- **Završeno:** 78 zadataka
- **Web komponente:** 110+ fajlova (~20K linija)
- **Mobile ekrani:** 40+ fajlova (~10K linija)
- **DB migracije:** 74 verzije
- **Edge Functions:** 4 funkcije
- **E2E testovi:** 5 (3 aktivna, 2 skip)
- **TypeScript tipovi:** 2,098 linija (auto-generated)
- **Initial bundle:** 253 kB (gzip: 76 kB) - optimizovano sa code splitting
- **PWA:** Service Worker + 25 precache entries

---

*Ažurirano: 31.01.2026.*
