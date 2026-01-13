import { createContext, useContext } from 'react';
import { supabase } from '../config/supabase';
import { useAuth } from './AuthContext';

const CompanyContext = createContext(null);

export const useCompany = () => {
    const context = useContext(CompanyContext);
    if (!context) {
        throw new Error('useCompany must be used within CompanyProvider');
    }
    return context;
};

export const CompanyProvider = ({ children }) => {
    const { user, companyCode, companyName, setUser, setCompanyName } = useAuth();

    const fetchCompanyEquipmentTypes = async () => {
        if (!companyCode) return [];
        try {
            const { data, error } = await supabase
                .from('companies')
                .select('equipment_types')
                .eq('code', companyCode)
                .is('deleted_at', null)
                .single();
            if (error) throw error;
            return data?.equipment_types || [];
        } catch (error) {
            console.error('Error fetching equipment types:', error);
            return [];
        }
    };

    const updateCompanyEquipmentTypes = async (equipmentTypes) => {
        if (!companyCode) throw new Error('Nema kompanije');
        try {
            const { error } = await supabase.from('companies').update({ equipment_types: equipmentTypes }).eq('code', companyCode);
            if (error) throw error;
            return { success: true };
        } catch (error) {
            throw error;
        }
    };

    const fetchCompanyWasteTypes = async () => {
        if (!companyCode) return [];
        try {
            const { data, error } = await supabase
                .from('companies')
                .select('waste_types')
                .eq('code', companyCode)
                .is('deleted_at', null)
                .single();
            if (error) throw error;
            return data?.waste_types || [];
        } catch (error) {
            console.error('Error fetching waste types:', error);
            return [];
        }
    };

    const updateCompanyWasteTypes = async (wasteTypes) => {
        if (!companyCode) throw new Error('Nema kompanije');
        try {
            const { error } = await supabase.from('companies').update({ waste_types: wasteTypes }).eq('code', companyCode);
            if (error) throw error;
            return { success: true };
        } catch (error) {
            throw error;
        }
    };

    const updateProfile = async (newName) => {
        if (!user) throw new Error('Niste prijavljeni');
        try {
            const { error } = await supabase.from('users').update({ name: newName }).eq('id', user.id);
            if (error) throw error;
            const updatedUser = { ...user, name: newName };
            setUser(updatedUser);
            return { success: true };
        } catch (error) {
            throw error;
        }
    };

    const updateCompanyName = async (newName) => {
        if (!companyCode) throw new Error('Nemate firmu');
        try {
            const { error } = await supabase.from('companies').update({ name: newName }).eq('code', companyCode);
            if (error) throw error;
            setCompanyName(newName);
            return { success: true };
        } catch (error) {
            throw error;
        }
    };

    const updateLocation = async (address, lat, lng) => {
        if (!user) throw new Error('Niste prijavljeni');
        try {
            const { error } = await supabase.from('users').update({ address, latitude: lat, longitude: lng }).eq('id', user.id);
            if (error) throw error;
            setUser({ ...user, address, latitude: lat, longitude: lng });
            return { success: true };
        } catch (error) {
            throw error;
        }
    };

    const fetchCompanyDetails = async (code) => {
        try {
            const { data, error } = await supabase.from('companies').select('*').eq('code', code).single();
            if (error) throw error;
            return data;
        } catch (error) {
            return null;
        }
    };

    const value = {
        fetchCompanyEquipmentTypes,
        updateCompanyEquipmentTypes,
        fetchCompanyWasteTypes,
        updateCompanyWasteTypes,
        updateProfile,
        updateCompanyName,
        updateLocation,
        fetchCompanyDetails,
    };

    return <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>;
};

export default CompanyContext;
