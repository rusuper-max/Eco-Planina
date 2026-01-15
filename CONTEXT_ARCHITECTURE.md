# Context Architecture Diagram

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                          Application                             │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                      AuthProvider                          │ │
│  │  • user, authUser, companyCode, companyName                │ │
│  │  • login(), logout(), register()                           │ │
│  │  • impersonateUser(), exitImpersonation()                  │ │
│  │  • isAdmin(), isDeveloper(), isCompanyAdmin()              │ │
│  │                                                             │ │
│  │  ┌──────────────────────────────────────────────────────┐  │ │
│  │  │              DataProvider                            │  │ │
│  │  │  • pickupRequests, clientRequests                    │  │ │
│  │  │  • addPickupRequest(), markRequestAsProcessed()      │  │ │
│  │  │  • fetchCompanyClients(), fetchProcessedRequests()   │  │ │
│  │  │  • Real-time: pickup_requests, client_requests       │  │ │
│  │  │                                                       │  │ │
│  │  │  ┌────────────────────────────────────────────────┐  │  │ │
│  │  │  │          ChatProvider                         │  │  │ │
│  │  │  │  • unreadCount                                │  │  │ │
│  │  │  │  • sendMessage(), fetchMessages()             │  │  │ │
│  │  │  │  • getConversations(), markMessagesAsRead()   │  │  │ │
│  │  │  │  • Real-time: messages                        │  │  │ │
│  │  │  │                                               │  │  │ │
│  │  │  │  ┌──────────────────────────────────────────┐ │  │  │ │
│  │  │  │  │      CompanyProvider                    │ │  │  │ │
│  │  │  │  │  • updateProfile()                      │ │  │  │ │
│  │  │  │  │  • updateCompanyName()                  │ │  │  │ │
│  │  │  │  │  • fetchCompanyWasteTypes()             │ │  │  │ │
│  │  │  │  │  • updateLocation()                     │ │  │  │ │
│  │  │  │  │                                         │ │  │  │ │
│  │  │  │  │  ┌────────────────────────────────────┐ │ │  │  │ │
│  │  │  │  │  │    AdminProvider                  │ │ │  │  │ │
│  │  │  │  │  │  • generateMasterCode()           │ │ │  │  │ │
│  │  │  │  │  │  • fetchAllUsers()                │ │ │  │  │ │
│  │  │  │  │  │  • fetchAllCompanies()            │ │ │  │  │ │
│  │  │  │  │  │  • getAdminStats()                │ │ │  │  │ │
│  │  │  │  │  │  • toggleCompanyStatus()          │ │ │  │  │ │
│  │  │  │  │  │                                   │ │ │  │  │ │
│  │  │  │  │  │     Your App Components           │ │ │  │  │ │
│  │  │  │  │  │                                   │ │ │  │  │ │
│  │  │  │  │  └────────────────────────────────────┘ │ │  │  │ │
│  │  │  │  └──────────────────────────────────────────┘ │  │  │ │
│  │  │  └────────────────────────────────────────────────┘  │  │ │
│  │  └──────────────────────────────────────────────────────┘  │ │
│  └──────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Patterns

### Authentication Flow
```
User Login → AuthContext.login()
    ↓
Supabase Auth
    ↓
Load User Profile
    ↓
Set: user, companyCode, companyName
    ↓
All child contexts can access user data
```

### Request Management Flow
```
Client Creates Request → DataContext.addPickupRequest()
    ↓
Insert into Supabase
    ↓
Real-time subscription triggers
    ↓
Manager sees new request
    ↓
Manager processes → DataContext.markRequestAsProcessed()
    ↓
Move to processed_requests table
    ↓
Client receives notification
```

### Chat Flow
```
User A sends message → ChatContext.sendMessage()
    ↓
Insert into Supabase messages table
    ↓
Real-time subscription on User B
    ↓
User B receives message
    ↓
ChatContext.unreadCount++
    ↓
User B opens chat → ChatContext.markMessagesAsRead()
    ↓
ChatContext.unreadCount--
```

---

## Context Dependencies

```
AuthContext (No dependencies)
    ↓
    ├── Provides: user, companyCode, companyName, isLoading
    ├── Provides: login(), logout(), register()
    └── Provides: isAdmin(), isDeveloper(), isCompanyAdmin()
    
DataContext (Depends on AuthContext)
    ↓
    ├── Uses: user (for permissions)
    ├── Uses: companyCode (for filtering)
    ├── Provides: pickupRequests, clientRequests
    └── Provides: Region management (CRUD, batch assign)
    
ChatContext (Depends on AuthContext)
    ↓
    ├── Uses: user (for sender_id)
    ├── Uses: companyCode (for messages)
    └── Provides: unreadCount, messages
    
CompanyContext (Depends on AuthContext)
    ↓
    ├── Uses: user, companyCode, companyName
    ├── Uses: setUser, setCompanyName (to update state)
    └── Provides: Company management functions
    
AdminContext (Depends on AuthContext)
    ↓
    ├── Uses: user (for audit trail)
    ├── Uses: isAdmin(), isDeveloper() (for permissions)
    └── Provides: Admin operation functions
```

---

## Real-time Subscriptions

### DataContext Subscriptions
```
┌─────────────────────────────────────────────────┐
│  Pickup Requests Channel                        │
│  • Filter: company_code = current company       │
│  • Events: INSERT, UPDATE, DELETE               │
│  • Action: Re-fetch pickupRequests              │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  Client Requests Channel                        │
│  • Filter: user_id = current user               │
│  • Events: INSERT, UPDATE, DELETE               │
│  • Action: Re-fetch clientRequests              │
│  • Special: Detect status change to 'processed' │
└─────────────────────────────────────────────────┘
```

### ChatContext Subscriptions
```
┌─────────────────────────────────────────────────┐
│  Messages Channel (Received)                    │
│  • Filter: receiver_id = current user           │
│  • Events: INSERT                               │
│  • Action: Update unread count, trigger callback│
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  Messages Channel (Sent)                        │
│  • Filter: sender_id = current user             │
│  • Events: INSERT                               │
│  • Action: Trigger callback for UI update       │
└─────────────────────────────────────────────────┘
```

---

## State Management Patterns

### AuthContext - Persistent State
- **Purpose:** Core user session that rarely changes
- **Pattern:** useState with localStorage backup
- **Re-render Impact:** High (affects all child contexts)
- **Update Frequency:** Low (login/logout/impersonation)

### DataContext - Live State
- **Purpose:** Dynamic request lists
- **Pattern:** useState + real-time subscriptions
- **Re-render Impact:** Medium (only components using requests)
- **Update Frequency:** High (requests created/processed frequently)

### ChatContext - Live State
- **Purpose:** Message counts and conversations
- **Pattern:** useState + real-time subscriptions
- **Re-render Impact:** Low (only chat-related components)
- **Update Frequency:** Variable (depends on usage)

### CompanyContext - Fetch-on-Demand
- **Purpose:** Company settings (changed infrequently)
- **Pattern:** No state, functions return data
- **Re-render Impact:** None
- **Update Frequency:** Very low (settings rarely change)

### AdminContext - Fetch-on-Demand
- **Purpose:** Admin operations (accessed infrequently)
- **Pattern:** No state, functions return data
- **Re-render Impact:** None
- **Update Frequency:** Very low (admin actions are rare)

---

## Performance Optimization

### Context Splitting Benefits
1. **Reduced Re-renders:** Components only re-render when their specific context changes
2. **Code Splitting:** Can lazy-load admin features for non-admin users
3. **Better Caching:** Browser can cache individual context files
4. **Easier Debugging:** Clear separation makes issues easier to trace

### Best Practices
- Use `useAuth()` only when you need user/auth state
- Use `useData()` only in components that display/manage requests
- Use `useChat()` only in chat/messaging components
- Use `useCompany()` only in settings pages
- Use `useAdmin()` only in admin pages

### Anti-patterns to Avoid
- Don't destructure everything from all contexts in every component
- Don't call context hooks in loops or conditions
- Don't create dependencies between non-Auth contexts

---

Generated: 2026-01-13
Updated: 2026-01-15

---

## New Features (January 2026)

### Region System
- Company can have multiple regions/branches
- Users are assigned to regions
- Auto-assignment on registration
- Last region cannot be deleted

### Manager Analytics
- Track which manager processed each request
- `processed_by_id` and `processed_by_name` in processed_requests
- ManagerAnalyticsPage for Company Admin

### Professional Excel Export
- ExcelJS library for real .xlsx files
- 7 sheets with detailed data
- Chart images (pie, bar, line) generated via Canvas API
- Sheet selection checkboxes
