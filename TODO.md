# EcoLogistics - TODO Lista

> Linearna lista zadataka - radimo redom od vrha ka dnu
> Poslednje ažuriranje: 19.01.2026.

---

## ✅ Završeno

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

---

## 📋 Sledeće (radimo redom)

### 1. Kamioni (Vehicles) 🚛 - PRIORITET
Osnovno praćenje voznog parka.

**Tabela `vehicles`:**
- `id`, `company_code`
- `registration` - Registracija (obavezno, jedinstveno po firmi)
- `name` - Naziv vozila (npr. "Mercedes Sprinter")
- `brand`, `model` (opciono)
- `year` (opciono)
- `status` - active/maintenance/retired
- `notes`
- `created_at`, `updated_at`, `deleted_at`

**Tabela `vehicle_drivers` (many-to-many):**
- `vehicle_id`, `driver_id`
- Jedan kamion može imati više vozača
- Jedan vozač može voziti više kamiona

**Funkcionalnost:**
- [ ] DB migracija za vehicles + vehicle_drivers
- [ ] RLS politike (company isolation)
- [ ] CRUD UI u Podešavanjima → Vozila
- [ ] Prikaz vozila u vizuelnom editoru
- [ ] Dodela vozača kamionima

---

### 2. Vizuelni Editor - Proširenje 🗺️
Dodati skladišta i kamione u vizuelni prikaz hijerarhije.

**Prikaz:**
```
Firma
├── Skladište A
│   ├── Filijala 1
│   │   ├── Manager 1
│   │   ├── Vozač 1 → Kamion ABC-123
│   │   └── Klijenti...
│   └── Filijala 2
│       └── ...
├── Skladište B
│   └── ...
└── Kamioni (nepovezani)
    └── Kamion XYZ-999 (bez vozača)
```

**Funkcionalnost:**
- [ ] Prikaz skladišta kao root node
- [ ] Filijale grupisane pod skladištima
- [ ] Kamioni sa ikonicama
- [ ] Drag-drop za dodelu vozača kamionima
- [ ] Prikaz nepovezanih entiteta

---

### 3. Izvoz (Shipments/Otpremnice) 📦
Slanje robe prerađivačima i praćenje.

**Tabela `shipments`:**
- `id`, `company_code`, `inventory_id`
- `recipient_name` - Naziv firme primaoca
- `recipient_address`
- `recipient_contact` - Telefon/email
- `items` - JSONB array:
  ```json
  [{
    "waste_type_id": "uuid",
    "quantity_sent_kg": 1500,
    "quantity_received_kg": null,  // popunjava se na potvrdi
    "price_per_kg": 0.50
  }]
  ```
- `status` - draft/sent/confirmed/paid
- `vehicle_id` - Koji kamion prevozi (opciono)
- `driver_id` - Koji vozač (opciono)
- `sent_at`, `confirmed_at`, `paid_at`
- `total_amount` - Izračunata cena
- `notes`, `kalo_notes` (razlika u merenju)
- `created_by`, `created_at`

**Tabela `shipment_recipients` (opciono za često korišćene primaoce):**
- `id`, `company_code`
- `name`, `address`, `contact`
- `default_prices` - JSONB {waste_type_id: price_per_kg}

**Funkcionalnost:**
- [ ] DB migracija za shipments
- [ ] Nova stranica "Izvoz" u meniju
- [ ] Kreiranje otpremnice (izbor iz inventory)
- [ ] Automatsko oduzimanje iz inventory na status=sent
- [ ] Potvrda prijema sa razlikom (kalo)
- [ ] PDF generisanje otpremnice
- [ ] Istorija izvoza

---

### 4. Inventory - Poboljšanja 📊
- [ ] Manual adjustment UI (korekcije stanja)
- [ ] Alert za nisko stanje
- [ ] Grafikon ulaza/izlaza kroz vreme
- [ ] Export inventory report u Excel

---

### 5. PDF Dokumenti 📄
- [ ] PDF Prijemnica (za vozače)
- [ ] PDF Otpremnica (za izvoz)
- [ ] Digitalni potpis klijenta (na telefonu)
- [ ] Automatsko slanje na email

---

### 6. Gorivo (Fuel Logs) ⛽
Praćenje potrošnje goriva po kamionima.

**Tabela `fuel_logs`:**
- `vehicle_id`, `driver_id`, `date`
- `liters`, `price_per_liter`, `total_price`
- `odometer_km`
- `receipt_image_url`
- `notes`

**Funkcionalnost:**
- [ ] DB migracija za fuel_logs
- [ ] Unos goriva u vozač mobile app
- [ ] Slika računa
- [ ] Izveštaj potrošnje po vozilu/vozaču

---

### 7. Refaktorisati Web velike fajlove
- [ ] `Dashboard.jsx` (1892) → useDashboardHandlers hook
- [ ] `DriverDashboard.jsx` (1623) → MapSection, ListSection
- [ ] `AnalyticsPage.jsx` (1449) → Chart komponente
- [ ] `DataContext.jsx` (1070) → RegionContext split

---

### 8. Testing
- [ ] Setup Playwright (E2E)
- [ ] Test: Client kreira zahtev
- [ ] Test: Manager obrađuje
- [ ] Test: Driver flow

---

### 9. TypeScript Migracija
- [ ] `supabase gen types typescript`
- [ ] Kreirati `/src/types/database.ts`
- [ ] Migrirati utils
- [ ] Migrirati context-e

---

### 10. Nice-to-Have (opciono)
- [ ] PWA podrška (installable web app)
- [ ] Dark mode
- [ ] Realtime za vozače
- [ ] Notification preferences UI
- [ ] Istorija za klijente (mobile)
- [ ] SECURITY.md dokumentacija
- [ ] Sentry integracija
- [ ] QR kodovi za klijente (brže kreiranje zahteva)
- [ ] Napredniji algoritam rute (Google/Mapbox API)
- [ ] Onboarding wizard za novu firmu

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
- Web: React 19, Vite, TailwindCSS v4, Leaflet
- Mobile: React Native, Expo SDK
- Backend: Supabase (PostgreSQL, Auth, Realtime, Storage)
- Export: ExcelJS

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

### Migracije (poslednje)
- 055 - Inventory sistem (tabele)
- 056 - Inventory trigger (automatski ulaz)
- 057 - Retroaktivni import
- 059 - Supervisor rola
- 060, 061 - Supervisor RLS fix
- 062 - Inventory RLS fix
- 063 - assign_region_inventory RPC

---

*Ažurirano: 19.01.2026.*
