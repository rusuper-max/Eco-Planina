# Migration Checklist - Context Split

## Phase 1: Setup Providers (Required First)

- [ ] Update your main app file (likely `App.jsx` or `main.jsx`) to wrap with all 5 providers
- [ ] Ensure providers are in correct order (AuthProvider must be outermost):
  ```jsx
  <AuthProvider>
    <DataProvider>
      <ChatProvider>
        <CompanyProvider>
          <AdminProvider>
            {/* App content */}
          </AdminProvider>
        </CompanyProvider>
      </ChatProvider>
    </DataProvider>
  </AuthProvider>
  ```

---

## Phase 2: Update Component Imports

### Components Using Authentication
- [ ] Find all files importing `useAuth` from old AuthContext
- [ ] Update imports (should work without changes if using `import { useAuth } from '../context/AuthContext'`)
- [ ] Test login/logout functionality
- [ ] Test role-based rendering
- [ ] Test impersonation features (admin only)

### Components Using Requests/Data
- [ ] Find components using: `pickupRequests`, `clientRequests`, `addPickupRequest`, etc.
- [ ] Add import: `import { useData } from '../context/DataContext'`
- [ ] Change from: `const { pickupRequests } = useAuth()`
- [ ] Change to: `const { pickupRequests } = useData()`
- [ ] Test request creation
- [ ] Test request processing
- [ ] Test client management

### Components Using Chat/Messages  
- [ ] Find components using: `unreadCount`, `sendMessage`, `fetchMessages`, etc.
- [ ] Add import: `import { useChat } from '../context/ChatContext'`
- [ ] Change from: `const { unreadCount } = useAuth()`
- [ ] Change to: `const { unreadCount } = useChat()`
- [ ] Test message sending
- [ ] Test message reading
- [ ] Test conversation list

### Components Using Company Settings
- [ ] Find components using: `updateProfile`, `updateCompanyName`, `fetchCompanyWasteTypes`, etc.
- [ ] Add import: `import { useCompany } from '../context/CompanyContext'`
- [ ] Change from: `const { updateProfile } = useAuth()`
- [ ] Change to: `const { updateProfile } = useCompany()`
- [ ] Test profile updates
- [ ] Test company settings
- [ ] Test waste/equipment type management

### Components Using Admin Features
- [ ] Find components using: `generateMasterCode`, `fetchAllUsers`, `getAdminStats`, etc.
- [ ] Add import: `import { useAdmin } from '../context/AdminContext'`
- [ ] Change from: `const { generateMasterCode } = useAuth()`
- [ ] Change to: `const { generateMasterCode } = useAdmin()`
- [ ] Test master code generation
- [ ] Test user management
- [ ] Test company management
- [ ] Test admin statistics

---

## Phase 3: Testing

### Authentication Tests
- [ ] Login with manager account
- [ ] Login with client account
- [ ] Login with driver account
- [ ] Login with admin account
- [ ] Logout functionality
- [ ] Session persistence (refresh page)
- [ ] Impersonation (admin → client)
- [ ] Exit impersonation

### Data Flow Tests
- [ ] Client can create pickup request
- [ ] Manager can see company requests
- [ ] Manager can process request
- [ ] Client receives notification when request processed
- [ ] Real-time updates work (open 2 browser windows)

### Chat Tests
- [ ] Send message to another user
- [ ] Receive message (real-time)
- [ ] Mark messages as read
- [ ] Unread count updates correctly
- [ ] Send message to admins feature

### Company Settings Tests
- [ ] Update user profile name
- [ ] Update user location
- [ ] Update company name
- [ ] Update waste types
- [ ] Update equipment types

### Admin Tests
- [ ] Generate master code
- [ ] View all users
- [ ] View all companies
- [ ] View admin statistics
- [ ] Freeze/unfreeze company
- [ ] Delete user (soft delete)
- [ ] Update master code pricing

---

## Phase 4: Performance Check

- [ ] Check network tab - no unnecessary re-fetches
- [ ] Check console - no React warnings
- [ ] Check component re-renders (use React DevTools)
- [ ] Verify real-time subscriptions are properly cleaned up

---

## Phase 5: Cleanup

- [ ] All tests passing
- [ ] No console errors
- [ ] All features working as before
- [ ] Delete `AuthContext.old.jsx` backup file
- [ ] Commit changes with descriptive message

---

## Common Issues & Solutions

### Issue: "useAuth must be used within AuthProvider"
**Solution:** Ensure AuthProvider wraps your entire app in the root component

### Issue: "useData is not defined"
**Solution:** Import the hook: `import { useData } from '../context/DataContext'`

### Issue: Component re-rendering too much
**Solution:** Check if you're using the right context (e.g., don't use AuthContext for data that's in DataContext)

### Issue: Real-time updates not working
**Solution:** Check that subscriptions are set up in the respective contexts and not blocked by browser

### Issue: Can't access company settings
**Solution:** CompanyContext needs `setUser` and `setCompanyName` from AuthContext - ensure you're passing them correctly

---

## Rollback Plan

If something goes wrong:

1. Stop the application
2. Restore original file:
   ```bash
   cp /Users/a1234/Projects/EcoLogistics/web/src/context/AuthContext.old.jsx \
      /Users/a1234/Projects/EcoLogistics/web/src/context/AuthContext.jsx
   ```
3. Remove new context files
4. Restart application
5. Debug the specific issue before trying again

---

## Support Files Created

- `/Users/a1234/Projects/EcoLogistics/CONTEXT_SPLIT_SUMMARY.md` - Complete overview
- `/Users/a1234/Projects/EcoLogistics/CONTEXT_QUICK_REFERENCE.md` - Developer quick reference
- `/Users/a1234/Projects/EcoLogistics/MIGRATION_CHECKLIST.md` - This file

---

Generated: 2026-01-13
