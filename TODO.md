# EcoLogistics - TODO Lista

## 1. Sistem Notifikacija (Prioritet: VISOK) - ZAVRSENO

### 1.1 Baza podataka
- [x] Kreirati `notifications` tabelu u Supabase
  - `id`, `user_id`, `type`, `title`, `message`, `data` (JSONB), `is_read`, `created_at`
- [x] Dodati `notification_preferences` kolonu na `users` tabelu
- [x] Dodati RLS politike za notifikacije
- [x] Kreirati database triggere za auto-kreiranje notifikacija

### 1.2 Backend - Triggeri za notifikacije
- [x] Trigger: Novi zahtev -> notifikacija menadzeru
- [x] Trigger: Zahtev obradjen -> notifikacija klijentu
- [x] Trigger: Vozac dodeljen -> notifikacija vozacu i klijentu
- [x] Trigger: Novi klijent -> notifikacija menadzeru
- [x] Trigger: Hitni zahtev (24h) -> notifikacija menadzeru (prioritet)

### 1.3 Frontend - Web komponente
- [x] Kreirati `NotificationContext.jsx` - state management
- [x] Kreirati `NotificationBell.jsx` - dropdown komponenta
- [x] Dodati real-time Supabase subscription za notifikacije
- [x] Integrisati zvucni signal za nove notifikacije (opciono)

### 1.4 Podesavanja notifikacija
- [ ] Dodati "Podesavanja" stranicu/modal za notification preferences
- [ ] Toggle za svaki tip notifikacije po ulozi
- [ ] Sacuvati preference u bazi

---

## 2. Sigurnosna poboljsanja (Prioritet: SREDNJI) - ZAVRSENO

### 2.1 Ukloniti hardkodovane kljuceve
- [x] Ukloniti fallback Supabase kljuceve iz `supabase.js`
- [x] Ukloniti fallback Supabase kljuceve iz `AuthContext.jsx`
- [x] Dodati error handling ako env varijable nisu postavljene
- [ ] Proveriti da `.env` nije commitovan u git

### 2.2 Prebaciti admin funkcije u Edge Functions (opciono - nije hitno)
- [ ] `changeUserRole` -> Edge Function
- [ ] `impersonateUser` -> Edge Function (ili ukloniti)

**Napomena:** RLS politike vec stite admin funkcije na database nivou, tako da ovo nije kriticno.

---

## 3. Skalabilnost (Prioritet: NIZAK - kada podaci rastu)

### 3.1 Paginacija
- [ ] Dodati paginaciju za `pickup_requests`
- [ ] Dodati paginacija za `processed_requests`
- [ ] Dodati paginaciju za `clients` listu
- [ ] Implementirati "Load more" ili infinite scroll

---

## 4. UI Poboljsanja - ZAVRSENO

### 4.1 Analitika
- [x] Dodati boje za vrste otpada (12 boja paleta)
- [x] Stampanje izvestaja sa naprednim filterima
- [x] Excel export (CSV sa UTF-8 BOM)
- [x] Modal za izbor perioda, klijenta, vrste otpada

### 4.2 Profesionalni Excel Export (ExcelJS) - NOVO
- [x] Pravi .xlsx format umesto CSV
- [x] 7 sheet-ova sa detaljnim podacima:
  - Sumarno, Po vrsti otpada, Po klijentu, Dnevni trend
  - Detaljan pregled, Svi zahtevi, Grafici (slike)
- [x] Checkbox za izbor sheet-ova pri exportu
- [x] Generisanje pravih grafika (pie, bar, line chart) kao PNG slike
- [x] Profesionalno formatiranje (boje, headeri, granice)
- [x] PrintExport komponenta takodje koristi ExcelJS

### 4.3 Manager Analytics - NOVO
- [x] Nova stranica "Ucanak menadzera" za Company Admin
- [x] Pracenje koliko zahteva je obradio svaki menadzer
- [x] Statistika po tezini, klijentima, vrstama otpada
- [x] Filtriranje po periodu (nedelja, mesec, sve)
- [x] Expandable kartice sa detaljima

### 4.4 Pracenje obrade zahteva - NOVO
- [x] processed_by_id i processed_by_name u processed_requests
- [x] Prikaz menadzera u HistoryTable
- [x] Timeline prikaz sa vozacem i menadzerom

### 4.5 UI poboljsanja - NOVO
- [x] Background slika na Login/Register ekranima
- [x] Background slika na Client panelu
- [x] Siri modal za Excel export na desktopu (max-w-3xl)
- [x] Horizontalni layout filtera u modalu

---

## 5. Filijale (Regije) - ZAVRSENO

### 5.1 Region sistem
- [x] Kreiranje/brisanje/editovanje filijala
- [x] Vizuelni pregled filijala (node editor)
- [x] Batch dodeljivanje korisnika filijalama
- [x] Paginacija kod dodeljivanja (50 po stranici)
- [x] Brzi izbor po srpskim gradovima
- [x] Auto-assign regiona pri registraciji novih korisnika
- [x] Zastita od brisanja poslednje filijale

---

## 6. Tipovi notifikacija po ulozi

### Klijent
| Tip | Opis | Default |
|-----|------|---------|
| `request_processed` | Zahtev obradjen | ON |
| `driver_assigned` | Vozac dodeljen | ON |
| `driver_on_way` | Vozac na putu | OFF |
| `new_message` | Nova poruka | ON |

### Vozac
| Tip | Opis | Default |
|-----|------|---------|
| `new_assignment` | Novi zadatak | ON |
| `assignment_cancelled` | Zadatak otkazan | ON |
| `reminder` | Podsetnik za nedovrsene | OFF |
| `new_message` | Nova poruka | ON |

### Menadzer
| Tip | Opis | Default |
|-----|------|---------|
| `new_request` | Novi zahtev | ON |
| `urgent_request` | Hitni zahtev (24h) | ON |
| `request_expiring` | Zahtev istice | ON |
| `new_client` | Novi klijent | ON |
| `driver_completed` | Vozac zavrsio | OFF |
| `new_message` | Nova poruka | ON |

### Company Admin
| Tip | Opis | Default |
|-----|------|---------|
| Sve od menadzera | + | - |
| `new_manager` | Novi menadzer | ON |
| `weekly_report` | Nedeljni izvestaj | OFF |

---

## Zavrsene faze

1. **Faza 1:** [DONE] Baza + NotificationContext + NotificationBell
2. **Faza 2:** [DONE] Triggeri za kljucne dogadjaje
3. **Faza 3:** [TODO] Podesavanja notifikacija (UI za toggle-ove)
4. **Faza 4:** [DONE] Sigurnosna poboljsanja
5. **Faza 5:** [TODO] Paginacija (kada bude potrebno)
6. **Faza 6:** [DONE] Profesionalni Excel export (ExcelJS)
7. **Faza 7:** [DONE] Manager Analytics
8. **Faza 8:** [DONE] Region sistem kompletiran
