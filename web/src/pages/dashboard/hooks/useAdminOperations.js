/**
 * useAdminOperations - Hook za admin operacije
 * Ekstraktovano iz Dashboard.jsx
 */
import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';

export const useAdminOperations = ({
  getAdminStats,
  fetchAllCompanies,
  fetchAllUsers,
  fetchAllMasterCodes,
  generateMasterCode: generateMasterCodeApi,
  deleteMasterCode: deleteMasterCodeApi,
  deleteUser: deleteUserApi,
  impersonateUser: impersonateUserApi,
  resetUserPassword: resetUserPasswordApi,
  updateMasterCodePrice: updateMasterCodePriceApi,
  updateUser: updateUserApi,
  updateCompany: updateCompanyApi,
  deleteCompany: deleteCompanyApi,
  navigate
}) => {
  const [stats, setStats] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [users, setUsers] = useState([]);
  const [masterCodes, setMasterCodes] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [editingCompany, setEditingCompany] = useState(null);

  // Refresh functions
  const refreshUsers = useCallback(async () => {
    setUsers(await fetchAllUsers());
  }, [fetchAllUsers]);

  const refreshCompanies = useCallback(async () => {
    setCompanies(await fetchAllCompanies());
  }, [fetchAllCompanies]);

  // Load admin stats
  const loadAdminStats = useCallback(async () => {
    setStats(await getAdminStats());
  }, [getAdminStats]);

  // Generate master code
  const handleGenerateCode = useCallback(async () => {
    try {
      await generateMasterCodeApi();
      setMasterCodes(await fetchAllMasterCodes());
    } catch (err) {
      toast.error(err.message);
    }
  }, [generateMasterCodeApi, fetchAllMasterCodes]);

  // Copy code to clipboard
  const handleCopyCode = useCallback((code) => {
    navigator.clipboard.writeText(code);
    toast.success('Kopirano!');
  }, []);

  // Delete master code
  const handleDeleteCode = useCallback(async (id) => {
    if (window.confirm('Obrisati?')) {
      try {
        await deleteMasterCodeApi(id);
        setMasterCodes(await fetchAllMasterCodes());
      } catch (err) {
        toast.error(err.message);
      }
    }
  }, [deleteMasterCodeApi, fetchAllMasterCodes]);

  // Update master code price
  const handleUpdateCodePrice = useCallback(async (codeId, priceData) => {
    try {
      await updateMasterCodePriceApi(codeId, priceData);
      setMasterCodes(await fetchAllMasterCodes());
    } catch (err) {
      toast.error(err.message);
    }
  }, [updateMasterCodePriceApi, fetchAllMasterCodes]);

  // Delete user
  const handleDeleteUser = useCallback(async (id) => {
    if (window.confirm('Obrisati?')) {
      try {
        await deleteUserApi(id);
        setUsers(await fetchAllUsers());
      } catch (err) {
        toast.error(err.message);
      }
    }
  }, [deleteUserApi, fetchAllUsers]);

  // Impersonate user
  const handleImpersonateUser = useCallback(async (userId) => {
    if (!window.confirm('Želite da pristupite ovom nalogu?')) return;
    try {
      const result = await impersonateUserApi(userId);
      if (result.role === 'company_admin') navigate('/company-admin');
      else if (result.role === 'manager') navigate('/manager');
      else if (result.role === 'driver') navigate('/driver');
      else if (result.role === 'client') navigate('/client');
      else navigate('/admin');
      window.location.reload();
    } catch (err) {
      toast.error(`Greška: ${err.message}. Ako problem i dalje postoji, osvežite stranicu.`);
    }
  }, [impersonateUserApi, navigate]);

  // Reset user password
  const handleResetPassword = useCallback(async (userId, newPassword) => {
    try {
      await resetUserPasswordApi(userId, newPassword);
      toast.success('Lozinka uspesno resetovana');
    } catch (err) {
      throw err;
    }
  }, [resetUserPasswordApi]);

  // Save edited user
  const handleSaveUser = useCallback(async (userId, data) => {
    await updateUserApi(userId, data);
    refreshUsers();
    setEditingUser(null);
  }, [updateUserApi, refreshUsers]);

  // Save edited company
  const handleSaveCompany = useCallback(async (companyCode, data) => {
    await updateCompanyApi(companyCode, data);
    refreshCompanies();
    setEditingCompany(null);
  }, [updateCompanyApi, refreshCompanies]);

  // Delete company
  const handleDeleteCompany = useCallback(async (companyCode) => {
    await deleteCompanyApi(companyCode);
    refreshCompanies();
    setEditingCompany(null);
  }, [deleteCompanyApi, refreshCompanies]);

  // Export users to CSV
  const handleExportUsers = useCallback(() => {
    const headers = [
      { key: 'name', label: 'Ime' },
      { key: 'phone', label: 'Telefon' },
      { key: 'role', label: 'Uloga' },
      { key: 'companyName', label: 'Firma' },
      { key: 'address', label: 'Adresa' }
    ];
    const data = users.map(u => ({
      name: u.name,
      phone: u.phone,
      role: u.role === 'developer' ? 'Developer' : u.role === 'admin' ? 'Admin' : u.role === 'manager' ? 'Menadžer' : 'Klijent',
      companyName: u.company?.name || '',
      address: u.address || ''
    }));
    // Export logic would go here
    console.log('Export users:', data, headers);
  }, [users]);

  // Export companies to CSV
  const handleExportCompanies = useCallback(() => {
    const headers = [
      { key: 'name', label: 'Naziv' },
      { key: 'code', label: 'ECO Kod' },
      { key: 'status', label: 'Status' },
      { key: 'managerCount', label: 'Menadžeri' },
      { key: 'clientCount', label: 'Klijenti' }
    ];
    const data = companies.map(c => ({
      name: c.name,
      code: c.code,
      status: c.status === 'frozen' ? 'Zamrznuta' : 'Aktivna',
      managerCount: c.managerCount || 0,
      clientCount: c.clientCount || 0
    }));
    // Export logic would go here
    console.log('Export companies:', data, headers);
  }, [companies]);

  return {
    stats,
    setStats,
    companies,
    setCompanies,
    users,
    setUsers,
    masterCodes,
    setMasterCodes,
    editingUser,
    setEditingUser,
    editingCompany,
    setEditingCompany,
    refreshUsers,
    refreshCompanies,
    loadAdminStats,
    handleGenerateCode,
    handleCopyCode,
    handleDeleteCode,
    handleUpdateCodePrice,
    handleDeleteUser,
    handleImpersonateUser,
    handleResetPassword,
    handleSaveUser,
    handleSaveCompany,
    handleDeleteCompany,
    handleExportUsers,
    handleExportCompanies
  };
};

export default useAdminOperations;
