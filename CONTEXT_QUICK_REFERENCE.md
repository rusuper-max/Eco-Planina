# Context Quick Reference Guide

## Import Patterns

```javascript
// Authentication
import { useAuth } from '../context/AuthContext';
const { user, login, logout, isAdmin } = useAuth();

// Data & Requests
import { useData } from '../context/DataContext';
const { pickupRequests, addPickupRequest, markRequestAsProcessed, fetchCompanyRegions, createRegion, deleteRegion, assignUsersToRegion } = useData();

// Chat & Messages
import { useChat } from '../context/ChatContext';
const { unreadCount, sendMessage, fetchMessages } = useChat();

// Company Settings
import { useCompany } from '../context/CompanyContext';
const { updateProfile, updateCompanyName, fetchCompanyWasteTypes } = useCompany();

// Admin Operations
import { useAdmin } from '../context/AdminContext';
const { generateMasterCode, fetchAllUsers, getAdminStats } = useAdmin();
```

---

## Common Use Cases

### User Authentication
```javascript
const { user, login, logout, isLoading } = useAuth();

// Login
await login(phone, password);

// Logout
await logout();

// Check role
if (user?.role === 'manager') { /* ... */ }
```

### Managing Requests
```javascript
const { pickupRequests, addPickupRequest, markRequestAsProcessed } = useData();

// Add request (client)
await addPickupRequest({
  wasteType: 'plastic',
  wasteLabel: 'Plastične flaše',
  fillLevel: 75,
  urgency: 'normal',
  note: 'Extra info'
});

// Process request (manager)
await markRequestAsProcessed(request, proofImageUrl, note, { weight: 50, weight_unit: 'kg' });
```

### Chat Messages
```javascript
const { unreadCount, sendMessage, fetchMessages, markMessagesAsRead } = useChat();

// Send message
await sendMessage(receiverId, 'Hello!');

// Get conversation
const messages = await fetchMessages(partnerId);

// Mark as read
await markMessagesAsRead(senderId);
```

### Company Settings
```javascript
const { updateProfile, updateCompanyName, fetchCompanyWasteTypes } = useCompany();

// Update user profile
await updateProfile('New Name');

// Update company
await updateCompanyName('New Company Name');

// Get waste types
const wasteTypes = await fetchCompanyWasteTypes();
```

### Admin Operations
```javascript
const { fetchAllUsers, generateMasterCode, getAdminStats } = useAdmin();

// Generate code
const code = await generateMasterCode();

// Get stats
const stats = await getAdminStats();

// Fetch users with filter
const clients = await fetchAllUsers({ role: 'client' });
```

### Region Management
```javascript
const { fetchCompanyRegions, createRegion, updateRegion, deleteRegion, assignUsersToRegion } = useData();

// Get all regions
const regions = await fetchCompanyRegions();

// Create region
await createRegion('Beograd');

// Update region
await updateRegion(regionId, 'Novi Sad');

// Delete region (soft delete) - fails if last region
await deleteRegion(regionId);

// Batch assign users to region
await assignUsersToRegion([userId1, userId2], regionId);
```

### Excel Export
```javascript
// AnalyticsPage - Professional Excel export
import { exportToExcel } from '../utils/excelExport';

await exportToExcel({
  data: processedRequests,
  filters: { dateFrom, dateTo, client, wasteType },
  wasteTypes,
  clients,
  fileName: 'izvestaj',
  sheets: { sumarno: true, poVrsti: true, grafici: true, ... }
});
```

---

## Provider Setup

**Required order (AuthProvider must be first):**

```jsx
import { AuthProvider } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { ChatProvider } from './context/ChatContext';
import { CompanyProvider } from './context/CompanyContext';
import { AdminProvider } from './context/AdminContext';

function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <ChatProvider>
          <CompanyProvider>
            <AdminProvider>
              {/* Your app */}
            </AdminProvider>
          </CompanyProvider>
        </ChatProvider>
      </DataProvider>
    </AuthProvider>
  );
}
```

---

## State Reference

| Context | State Variables |
|---------|----------------|
| AuthContext | `user`, `authUser`, `companyCode`, `companyName`, `isLoading`, `originalUser` |
| DataContext | `pickupRequests`, `clientRequests`, `processedNotification` |
| ChatContext | `unreadCount`, `messagesSubscriptionRef` |
| CompanyContext | None (fetch-on-demand) |
| AdminContext | None (fetch-on-demand) |

---

## Real-time Subscriptions

**DataContext:**
- Pickup requests (company-wide)
- Client requests (per user)

**ChatContext:**
- Messages received
- Messages sent

**Usage:**
```javascript
// Messages
const unsubscribe = subscribeToMessages((message, type) => {
  if (type === 'received') {
    // Handle new message
  }
});

// Cleanup
return () => unsubscribe();
```

---

## Role Checks

```javascript
const { user, isAdmin, isDeveloper, isCompanyAdmin } = useAuth();

// Check specific role
if (user?.role === 'client') { /* Client only */ }
if (user?.role === 'manager') { /* Manager only */ }
if (user?.role === 'driver') { /* Driver only */ }
if (user?.role === 'company_admin') { /* Company owner only */ }

// Check admin levels
if (isCompanyAdmin()) { /* Company owner (manages their company) */ }
if (isAdmin()) { /* Super Admin or Developer (manages all companies) */ }
if (isDeveloper()) { /* Developer only (full system access) */ }
```

### Role Hierarchy

| Role | Scope | Can |
|------|-------|-----|
| `developer` / `admin` | All companies | Everything |
| `company_admin` | Own company | Manage users, settings, view all data |
| `manager` | Own company | Process requests, chat, assign drivers |
| `driver` | Own tasks | Accept/reject deliveries |
| `client` | Own requests | Create requests, chat |

---

## Error Handling

All context functions throw errors that should be caught:

```javascript
try {
  await addPickupRequest(data);
} catch (error) {
  console.error('Failed to add request:', error.message);
  // Show error to user
}
```

---

## Impersonation (Admin)

```javascript
const { impersonateUser, exitImpersonation, originalUser } = useAuth();

// Start impersonation
await impersonateUser(userId);

// Check if impersonating
if (originalUser) {
  // Show exit button
}

// Exit impersonation
exitImpersonation();
```

---

Generated: 2026-01-13
Updated: 2026-01-15 (Region system, ExcelJS export, Manager analytics)
