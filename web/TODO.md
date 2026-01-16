# EcoLogistics Web - TODO

## Uradjeno

- [x] Postavljen react-hot-toast (Toaster komponenta u App.jsx)
- [x] Zamenjeno svih 53 alert() poziva sa toast notifikacijama
  - DashboardComponents.jsx: 24 alert-a
  - Dashboard.jsx: 20 alert-a
  - DriverManagement.jsx: 6 alert-a
  - DriverDashboard.jsx: 3 alert-a
- [x] Kreirani `src/utils/` helper moduli:
  - `timeUtils.js` - getRemainingTime, getCurrentUrgency
  - `mapUtils.js` - createIcon, createCustomIcon, urgencyIcons, URGENCY_COLORS, WASTE_ICONS_MAP, getStablePosition
  - `storage.js` - uploadImage
  - `styleUtils.js` - getFillLevelColor
  - `index.js` - barrel export
- [x] Kreirane `src/components/common/` komponente:
  - Modal, StatCard, EmptyState, SidebarItem
  - CountdownTimer, FillLevelBar, ImageUploader, RequestStatusBadge
- [x] **DashboardComponents.jsx kompletno refaktorisan!**
  - **Smanjeno sa 4,858 na 87 linija (98.2% redukcija)**
  - Sve komponente izvučene u organizovanu strukturu
  - DashboardComponents.jsx sada samo re-exportuje za backward compatibility
  - Svi ekstraktovani moduli:
    - `src/components/map/` - MapView, DraggableMarker, LocationPicker, FitBounds
    - `src/components/requests/` - 8 komponenti (NewRequestForm, ClientRequestsView, ClientHistoryView, ManagerRequestsTable, HistoryTable, EditProcessedRequestModal, RequestDetailsModal, ProcessRequestModal)
    - `src/components/clients/` - 3 komponente (ClientsTable, ClientDetailsModal, ClientEquipmentModal)
    - `src/components/equipment/` - 2 komponente (EquipmentManagement, WasteTypesManagement)
    - `src/components/chat/` - ChatInterface
    - `src/components/admin/` - 8 komponenti (AdminCompaniesTable, AdminUsersTable, MasterCodesTable, UserDetailsModal, CompanyEditModal, UserEditModal, DeleteConfirmationModal, PrintExport)
    - `src/components/analytics/` - AnalyticsPage
  - Build prolazi bez grešaka ✓

---

## U toku / Planirano

### 1. ~~Razbiti AuthContext~~ ✅ ZAVRŠENO!

**Rezultat:**
- **Pre:** 1 fajl sa 1230 linija (14 state varijabli, 48 funkcija)
- **Posle:** 5 specijalizovanih context-a

**Nova struktura:**
```
src/context/
├── AuthContext.jsx        (425 linija) - Samo auth (login, logout, register, user, impersonation)
├── DataContext.jsx        (317 linija) - Pickup requests, processed requests, clients, real-time subscriptions
├── ChatContext.jsx        (190 linija) - Messages, conversations, unread count
├── CompanyContext.jsx     (135 linija) - Company settings, waste types, equipment
├── AdminContext.jsx       (301 linija) - Admin-only: master codes, all users, all companies
└── AuthContext.old.jsx    (backup)
```

**Postignuti benefiti:**
- ✅ Izolovane state izmene - promena u chat-u ne re-renderuje request listu
- ✅ Lakše održavanje - svaki context ima jasnu odgovornost
- ✅ Bolja organizacija - fajlovi od 135-425 linija umesto 1230
- ✅ Backward compatibility - postojeći kod i dalje radi
- ✅ Build prolazi bez grešaka
- ✅ Sva funkcionalnost očuvana

**Provider struktura u App.jsx:**
```jsx
<AuthProvider>           {/* Base - authentication */}
  <DataProvider>         {/* Depends on Auth */}
    <ChatProvider>       {/* Depends on Auth */}
      <CompanyProvider>  {/* Depends on Auth */}
        <AdminProvider>  {/* Depends on Auth */}
          <AppRoutes />
        </AdminProvider>
      </CompanyProvider>
    </ChatProvider>
  </DataProvider>
</AuthProvider>
```

---

## Buduci rad (posle web stabilizacije)

### 3. Capacitor + Push notifikacije
- Upakovati web app u native Android/iOS
- Implementirati Firebase Cloud Messaging za push
- Offline queue za vozace (kada nema signala)

### 4. ~~Graficki izvestaji~~ ✅ ZAVRŠENO!
- ~~Dashboard sa grafovima za menadzere~~ ✅
- ~~Export u PDF/Excel~~ ✅
- ~~Mesecni/nedeljni sumarni izvestaji~~ ✅

**Implementirano:**
- AnalyticsPage sa pie/bar/line graficima
- ExcelJS biblioteka za profesionalni .xlsx export
- 7 sheet-ova: Sumarno, Po vrsti, Po klijentu, Dnevni trend, Detaljno, Svi zahtevi, Grafici
- Grafici se eksportuju kao PNG slike u Excel
- ManagerAnalyticsPage - pracenje ucinaka menadzera
- PrintExport koristi ExcelJS za sve tipove podataka

---

## Nove funkcionalnosti (Januar 2026)

### 5. Region sistem ✅
- Kreiranje/editovanje/brisanje filijala
- Vizuelni pregled (node editor)
- Batch dodeljivanje korisnika
- Auto-assign pri registraciji
- Zastita od brisanja poslednje filijale

### 6. Manager Analytics ✅
- Pracenje obrade po menadzeru
- processed_by_id/name u processed_requests
- Timeline prikaz sa vozacem i menadzerom

### 7. UI poboljsanja ✅
- Background slike na auth i client panelu
- Siri Excel export modal na desktopu
- Horizontalni layout filtera

---

---

## 8. Driver Assignment (Januar 2026) - ZAVRSENO

### 8.1 Manager funkcionalnosti
- [x] Quick assign dropdown u tabeli zahteva
- [x] RequestStatusBadge komponenta sa popup detaljima
- [x] Prikaz statusa: N/D, Čeka, U toku, Preuzeto, Dostavljeno

### 8.2 RPC funkcija
- [x] `assign_requests_to_driver` sa SECURITY DEFINER
- [x] Denormalizacija podataka u driver_assignments
- [x] Upsert logika (reassign ako vec postoji)

### 8.3 Dashboard integracija
- [x] `handleQuickAssignDriver` funkcija
- [x] `fetchDriverAssignments` sa driver join-om
- [x] Real-time refresh nakon dodele

---

## 9. Preostali zadaci

- [ ] Realtime subscription za vozace (novi zadaci)
- [ ] Chat: ispraviti "Nepoznato" problem
- [ ] Notification preferences UI

---

## Tehnicke napomene

- React 19 + Vite + TailwindCSS v4
- Supabase za backend (Auth, Database, Realtime, Storage)
- Leaflet za mape
- react-hot-toast za notifikacije
