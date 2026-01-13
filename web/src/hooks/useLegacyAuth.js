/**
 * Legacy compatibility hook - combines all contexts into one
 * This allows existing components to continue using useAuth() pattern
 * while we have split contexts internally
 *
 * TODO: Gradually migrate components to use individual contexts
 * (useAuth, useData, useChat, useCompany, useAdmin)
 */

import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useChat } from '../context/ChatContext';
import { useCompany } from '../context/CompanyContext';
import { useAdmin } from '../context/AdminContext';

export const useLegacyAuth = () => {
  const auth = useAuth();
  const data = useData();
  const chat = useChat();
  const company = useCompany();
  const admin = useAdmin();

  // Combine everything into one object for backward compatibility
  return {
    // Auth context
    ...auth,

    // Data context
    ...data,

    // Chat context
    ...chat,

    // Company context
    ...company,

    // Admin context
    ...admin
  };
};

export default useLegacyAuth;
