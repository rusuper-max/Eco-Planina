/**
 * useOutboundOperations - Hook za operacije sa isporukama
 * Ekstraktovano iz DataContext.jsx
 */
import { supabase } from '../../config/supabase';

export const useOutboundOperations = ({ companyCode }) => {
    // Fetch all outbounds for company
    const fetchOutbounds = async (filters = {}) => {
        if (!companyCode) return [];
        try {
            let query = supabase
                .from('inventory_outbound')
                .select(`
                    *,
                    inventory:inventory_id(id, name),
                    waste_type:waste_type_id(id, name, icon),
                    creator:created_by(id, name),
                    sender:sent_by(id, name),
                    confirmer:confirmed_by(id, name),
                    region:region_id(id, name)
                `)
                .eq('company_code', companyCode)
                .order('created_at', { ascending: false });

            if (filters.status) {
                query = query.eq('status', filters.status);
            }
            if (filters.inventoryId) {
                query = query.eq('inventory_id', filters.inventoryId);
            }
            if (filters.limit) {
                query = query.limit(filters.limit);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching outbounds:', error);
            return [];
        }
    };

    // Create new outbound
    const createOutbound = async (outboundData) => {
        if (!companyCode) throw new Error('Niste prijavljeni');
        try {
            const { data, error } = await supabase.rpc('create_outbound', {
                p_inventory_id: outboundData.inventory_id,
                p_waste_type_id: outboundData.waste_type_id,
                p_quantity_kg: outboundData.quantity_kg,
                p_recipient_name: outboundData.recipient_name,
                p_recipient_address: outboundData.recipient_address || null,
                p_recipient_contact: outboundData.recipient_contact || null,
                p_price_per_kg: outboundData.price_per_kg || null,
                p_notes: outboundData.notes || null
            });
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error creating outbound:', error);
            throw error;
        }
    };

    // Send outbound (pending -> sent)
    const sendOutbound = async (outboundId) => {
        try {
            const { data, error } = await supabase.rpc('send_outbound', {
                p_outbound_id: outboundId
            });
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error sending outbound:', error);
            throw error;
        }
    };

    // Confirm outbound (sent -> confirmed)
    const confirmOutbound = async (outboundId, quantityReceivedKg) => {
        try {
            const { data, error } = await supabase.rpc('confirm_outbound', {
                p_outbound_id: outboundId,
                p_quantity_received_kg: quantityReceivedKg
            });
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error confirming outbound:', error);
            throw error;
        }
    };

    // Cancel outbound
    const cancelOutbound = async (outboundId) => {
        try {
            const { data, error } = await supabase.rpc('cancel_outbound', {
                p_outbound_id: outboundId
            });
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error cancelling outbound:', error);
            throw error;
        }
    };

    // Fetch kalo records
    const fetchKalo = async (filters = {}) => {
        if (!companyCode) return [];
        try {
            let query = supabase
                .from('inventory_kalo')
                .select(`
                    *,
                    inventory:inventory_id(id, name),
                    waste_type:waste_type_id(id, name, label, icon),
                    outbound:outbound_id(id, recipient_name, quantity_planned_kg, quantity_received_kg)
                `)
                .eq('company_code', companyCode)
                .order('created_at', { ascending: false });

            if (filters.inventoryId) {
                query = query.eq('inventory_id', filters.inventoryId);
            }
            if (filters.limit) {
                query = query.limit(filters.limit);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching kalo:', error);
            return [];
        }
    };

    return {
        fetchOutbounds,
        createOutbound,
        sendOutbound,
        confirmOutbound,
        cancelOutbound,
        fetchKalo
    };
};
