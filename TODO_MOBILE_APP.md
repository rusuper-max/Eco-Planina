# Pravljenje Klijent-Vozac Mobilne Aplikacije

## Cilj
Napraviti jednostavnu mobilnu aplikaciju sa dva tipa naloga:
- **Klijent** - kreira zahteve za preuzimanje robe
- **Vozac** - vidi zahteve kompanije, preuzima robu

---

## Faza 1: Auth Migration (Prioritet: VISOK) - ZAVRSENO

Prebaceno sa plain text password na Supabase Auth + Edge Function.

### 1.1 Login Screen
- [x] Prebaciti na Supabase Auth `signInWithPassword`
- [x] Koristiti fake email format: `{phone}@eco.local`
- [x] Ukloniti direktan query na `users` tabelu za auth

### 1.2 Register Screen
- [x] Pozvati Edge Function `auth-register` umesto direktnog inserta
- [x] Podrzati samo `client` i `driver` role
- [x] Ukloniti manager/admin registraciju iz mobile app-a
- [x] Razlicite boje za klijenta (zelena) i vozaca (narandzasta)

### 1.3 AppContext Update
- [x] Dodati Supabase Auth session listener
- [x] AsyncStorage za persistentne sesije
- [x] Update logout da koristi `supabase.auth.signOut()`
- [x] Ociscene stare funkcije za registraciju

---

## Faza 2: Driver Screen (Prioritet: VISOK) - ZAVRSENO

Napravljen nov DriverViewScreen.js

### 2.1 DriverViewScreen.js - Glavni ekran
- [x] Lista DODELJENIH zahteva (iz `driver_assignments` tabele sa join na `pickup_requests`)
- [x] Sortiranje po hitnosti (24h prvo, zatim 48h, pa 72h)
- [x] Pull-to-refresh za osvezavanje liste
- [x] Statistika na vrhu (broj dodeljenih zahteva, hitnih zahteva)

### 2.2 Funkcionalnosti vozaca
- [x] "Preuzeto" dugme - oznacava zahtev kao obradjen
- [x] Prikaz klijent info: ime, adresa, vrsta robe, napomena
- [x] Fill level progress bar

### 2.3 Navigacija
- [x] Dugme za navigaciju do klijenta
- [x] Google Maps na Android-u
- [x] Apple Maps na iOS-u (sa fallback na Google Maps)

### 2.4 Settings
- [x] Profil info (ime, uloga, firma)
- [x] Promena jezika (srpski/engleski)
- [x] Logout dugme

---

## Faza 3: Client Screen Update (Prioritet: SREDNJI) - ZAVRSENO

ClientViewScreen azuriran da ucitava waste types iz baze.

### 3.1 Waste Types iz baze
- [x] Ucitati `waste_types` iz baze umesto hardcoded liste
- [x] Prikazati samo `allowed_waste_types` ako je klijent ogranicen
- [x] Ikonica + naziv za svaku vrstu
- [x] Loading state dok se ucitavaju
- [x] Empty state ako nema vrsta robe

### 3.2 Istorija klijenta (OPCIONO - za kasnije)
- [ ] Tab za prosle zahteve
- [ ] Status zahteva (pending/processed)

---

## Faza 4: UI/UX Polish (Prioritet: NIZAK)

### 4.1 Design uskladjivanje
- [x] Emerald green tema za klijente
- [x] Orange tema za vozace
- [x] Zaobljeni uglovi, shadows
- [x] Loading states

### 4.2 Notifikacije (OPCIONO - za kasnije)
- [ ] Push notifications za vozaca kad stigne novi zahtev
- [ ] Push notifications za klijenta kad je zahtev preuzet

---

## Faza 5: Build & Deploy (Prioritet: VISOK)

### 5.1 Testiranje
- [ ] Test login/register flow
- [ ] Test klijent kreiranje zahteva
- [ ] Test vozac preuzimanje zahteva

### 5.2 APK Build
- [ ] `eas build --platform android --profile preview`
- [ ] Testirati na fizickom uredjaju
- [ ] Fix eventualne build greske

### 5.3 Distribucija
- [ ] APK za interno testiranje
- [ ] (Opciono) Play Store upload

---

## Izmenjeni fajlovi

| Fajl | Opis promene |
|------|--------------|
| `src/screens/RegisterScreen.js` | Kompletno prepisan - samo client/driver, poziva Edge Function |
| `src/screens/DriverViewScreen.js` | **NOV** - ekran za vozace |
| `src/screens/ClientViewScreen.js` | Ucitava waste types iz baze, filtrira po allowed_waste_types |
| `src/context/AppContext.js` | Ociscen, koristi Supabase Auth, dodata fetchWasteTypes, fetchDriverAssignments, updateDriverAssignmentStatus |
| `src/config/supabase.js` | Dodat AsyncStorage za sesije |
| `App.js` | Dodata ruta za driver ulogu |

---

## Procena vremena

| Faza | Procena | Status |
|------|---------|--------|
| Faza 1: Auth Migration | ~3h | ✅ Zavrseno |
| Faza 2: Driver Screen | ~5h | ✅ Zavrseno |
| Faza 3: Client Update | ~2h | ✅ Zavrseno |
| Faza 4: UI Polish | ~2h | ✅ Zavrseno |
| Faza 5: Build & Deploy | ~2h | ⬜ Preostalo |
| **UKUPNO** | **~14h** | ~12h zavrseno |

---

## Napomene

- Manager i Admin ostaju SAMO na webu
- Mobile app je samo za klijente i vozace "na terenu"
- Registracija na mobile-u zahteva ECO kod firme (dobiju od managera)
- Vozac vidi samo DODELJENE zahteve (koristi `driver_assignments` tabelu)
- Manager dodeljuje zahteve vozacima preko web aplikacije

---

---

## Faza 6: Driver Workflow Enhancement - ZAVRSENO (Januar 2026)

### 6.1 Two-step pickup flow
- [x] "Preuzeto" (picked_up) - vozac preuzeo od klijenta
- [x] "Dostavljeno" (delivered) - vozac ispraznio/dostavio
- [x] Timestamps za svaki korak (picked_up_at, delivered_at)

### 6.2 Istorija vozaca
- [x] Perzistentna istorija (ostaje posle relogin-a)
- [x] Koristi denormalizovane podatke iz driver_assignments
- [x] Ne zavisi od pickup_requests tabele

### 6.3 Poboljsanja
- [x] Detaljni modal za istoriju
- [x] Timeline prikaz (assigned -> picked_up -> delivered)

---

## Preostali zadaci (Mobile)

- [ ] Realtime subscription za nove zadatke
- [ ] Push notifikacije (Firebase)
- [ ] APK build i testiranje

---

## Sledeci koraci

1. Pokrenuti `npx expo start`
2. Testirati na Expo Go aplikaciji
3. Napraviti test klijent i driver nalog
4. Build-ovati APK kad sve radi
