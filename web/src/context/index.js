/**
 * Context exports with backward compatibility
 *
 * For legacy code, use useAuth() which combines all contexts
 * For new code, use individual hooks: useAuthOnly, useData, useChat, useCompany, useAdmin
 */

// Export providers
export { AuthProvider } from './AuthContext';
export { DataProvider } from './DataContext';
export { ChatProvider } from './ChatContext';
export { CompanyProvider } from './CompanyContext';
export { AdminProvider } from './AdminContext';
export { NotificationProvider } from './NotificationContext';

// Export individual hooks (recommended for new code)
export { useAuth as useAuthOnly } from './AuthContext';
export { useData } from './DataContext';
export { useChat } from './ChatContext';
export { useCompany } from './CompanyContext';
export { useAdmin } from './AdminContext';
export { useNotifications } from './NotificationContext';

// Export legacy combined hook (for backward compatibility)
export { useLegacyAuth as useAuth } from '../hooks/useLegacyAuth';
