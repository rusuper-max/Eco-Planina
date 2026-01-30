/**
 * useInventoryOperations - Hook za operacije sa zalihama
 * Ekstraktovano iz DataContext.jsx
 */
import { supabase } from '../../config/supabase';

export const useInventoryOperations = ({ user, companyCode }) => {
    // Fetch all inventories for the company
    const fetchInventories = async () => {
        if (!companyCode) return [];
        try {
            const { data, error } = await supabase
                .from('inventories')
                .select('*')
                .eq('company_code', companyCode)
                .is('deleted_at', null)
                .order('name');
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching inventories:', error);
            return [];
        }
    };

    // Create a new inventory (warehouse)
    const createInventory = async (inventoryData) => {
        if (!companyCode) throw new Error('Niste prijavljeni');
        try {
            const { data, error } = await supabase
                .from('inventories')
                .insert({
                    company_code: companyCode,
                    name: inventoryData.name?.trim(),
                    description: inventoryData.description?.trim() || null,
                    manager_visibility: inventoryData.manager_visibility || 'full'
                })
                .select()
                .single();
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error creating inventory:', error);
            throw error;
        }
    };

    // Update an inventory
    const updateInventory = async (inventoryId, updates) => {
        try {
            const { data, error } = await supabase
                .from('inventories')
                .update({
                    name: updates.name?.trim(),
                    description: updates.description?.trim() || null,
                    manager_visibility: updates.manager_visibility
                })
                .eq('id', inventoryId)
                .select()
                .single();
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error updating inventory:', error);
            throw error;
        }
    };

    // Delete an inventory (soft delete)
    const deleteInventory = async (inventoryId) => {
        try {
            const { error } = await supabase
                .from('inventories')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', inventoryId);
            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Error deleting inventory:', error);
            throw error;
        }
    };

    // Fetch inventory items (stock levels) for an inventory or all
    const fetchInventoryItems = async (inventoryId = null) => {
        if (!companyCode) return [];
        try {
            let query = supabase
                .from('inventory_items')
                .select(`
                    *,
                    inventory:inventory_id(id, name, company_code),
                    waste_type:waste_type_id(id, name, label, icon)
                `);

            if (inventoryId) {
                query = query.eq('inventory_id', inventoryId);
            }

            const { data, error } = await query.order('quantity_kg', { ascending: false });
            if (error) throw error;

            return (data || []).filter(item =>
                item.inventory?.company_code === companyCode
            );
        } catch (error) {
            console.error('Error fetching inventory items:', error);
            return [];
        }
    };

    // Fetch inventory transactions (history)
    const fetchInventoryTransactions = async (filters = {}) => {
        if (!companyCode) return [];
        try {
            let query = supabase
                .from('inventory_transactions')
                .select(`
                    *,
                    inventory:inventory_id(id, name, company_code),
                    waste_type:waste_type_id(id, name, label, icon),
                    region:region_id(id, name)
                `)
                .order('created_at', { ascending: false });

            if (filters.inventoryId) {
                query = query.eq('inventory_id', filters.inventoryId);
            }
            if (filters.regionId) {
                query = query.eq('region_id', filters.regionId);
            }
            if (filters.wasteTypeId) {
                query = query.eq('waste_type_id', filters.wasteTypeId);
            }
            if (filters.transactionType) {
                query = query.eq('transaction_type', filters.transactionType);
            }
            if (filters.startDate) {
                query = query.gte('created_at', filters.startDate);
            }
            if (filters.endDate) {
                query = query.lte('created_at', filters.endDate);
            }
            if (filters.limit) {
                query = query.limit(filters.limit);
            }

            const { data, error } = await query;
            if (error) throw error;

            return (data || []).filter(t =>
                t.inventory?.company_code === companyCode
            );
        } catch (error) {
            console.error('Error fetching inventory transactions:', error);
            return [];
        }
    };

    // Create manual inventory adjustment
    const createInventoryAdjustment = async (adjustmentData) => {
        if (!companyCode) throw new Error('Niste prijavljeni');

        // Support both old (positional) and new (object) argument style
        const data = typeof adjustmentData === 'object' && adjustmentData !== null && !Array.isArray(adjustmentData)
            ? adjustmentData
            : {
                inventory_id: arguments[0],
                waste_type_id: arguments[1],
                quantity_kg: arguments[2],
                transaction_type: arguments[3],
                reason: arguments[4]
            };

        // Determine transaction type based on adjustment_type
        // NOTE: Database constraint only allows 'in' and 'out' transaction types
        let transactionType = data.transaction_type || 'in';
        if (data.adjustment_type === 'add') transactionType = 'in';
        if (data.adjustment_type === 'remove') transactionType = 'out';
        if (data.adjustment_type === 'set') transactionType = 'in'; // 'set' uses 'in' with calculated delta

        try {
            // First, get current quantity (use maybeSingle to handle case when item doesn't exist yet)
            const { data: currentItem, error: fetchError } = await supabase
                .from('inventory_items')
                .select('quantity_kg')
                .eq('inventory_id', data.inventory_id)
                .eq('waste_type_id', data.waste_type_id)
                .maybeSingle();

            // Ignore PGRST116 error (no rows) - it's expected for new items
            if (fetchError && fetchError.code !== 'PGRST116') {
                console.warn('Error fetching current item:', fetchError);
            }

            const currentQty = parseFloat(currentItem?.quantity_kg) || 0;

            // Calculate new quantity
            let newQty;
            if (data.adjustment_type === 'add') {
                newQty = currentQty + parseFloat(data.quantity_kg);
            } else if (data.adjustment_type === 'remove') {
                newQty = Math.max(0, currentQty - parseFloat(data.quantity_kg));
            } else if (data.adjustment_type === 'set') {
                newQty = parseFloat(data.quantity_kg);
            } else {
                newQty = data.new_quantity_kg ?? (currentQty + parseFloat(data.quantity_kg));
            }

            // Calculate delta for transaction record
            const delta = newQty - currentQty;

            // Upsert inventory item
            const { error: upsertError } = await supabase
                .from('inventory_items')
                .upsert({
                    inventory_id: data.inventory_id,
                    waste_type_id: data.waste_type_id,
                    quantity_kg: newQty
                }, {
                    onConflict: 'inventory_id,waste_type_id'
                });

            if (upsertError) throw upsertError;

            // Record transaction with adjustment type info in notes
            const adjustmentLabel = {
                'add': 'Korekcija (+)',
                'remove': 'Korekcija (-)',
                'set': 'Postavljeno na'
            }[data.adjustment_type] || 'Korekcija';

            const notesText = data.reason || data.notes
                ? `${adjustmentLabel}: ${data.reason || data.notes}`
                : `${adjustmentLabel}`;

            const { error: txError } = await supabase
                .from('inventory_transactions')
                .insert({
                    inventory_id: data.inventory_id,
                    waste_type_id: data.waste_type_id,
                    transaction_type: transactionType,
                    quantity_kg: Math.abs(delta),
                    source_type: 'korekcija', // Required field - manual adjustment
                    region_id: data.region_id || user?.region_id || null, // Track adjustment region
                    notes: notesText,
                    created_by: data.created_by || user?.id,
                    created_by_name: user?.name || user?.email || 'Sistem'
                });

            if (txError) throw txError;

            return { success: true, newQuantity: newQty };
        } catch (error) {
            console.error('Error creating adjustment:', error);
            throw error;
        }
    };

    // Assign a region to an inventory
    const assignRegionToInventory = async (regionId, inventoryId) => {
        if (!companyCode) throw new Error('Niste prijavljeni');
        try {
            const { data, error } = await supabase.rpc('assign_region_inventory', {
                p_region_id: regionId,
                p_inventory_id: inventoryId ?? null
            });
            if (error) throw error;
            if (!data) throw new Error('Dodela nije sačuvana');
            return data;
        } catch (error) {
            console.error('Error assigning region to inventory:', error);
            throw error;
        }
    };

    // Get aggregated inventory stats by region (for manager view)
    const getInventoryStatsByRegion = async (inventoryId) => {
        if (!companyCode) return [];
        try {
            const { data, error } = await supabase
                .from('inventory_transactions')
                .select(`
                    region_id,
                    region_name,
                    waste_type_id,
                    transaction_type,
                    quantity_kg
                `)
                .eq('inventory_id', inventoryId)
                .eq('transaction_type', 'in');

            if (error) throw error;

            const stats = {};
            (data || []).forEach(t => {
                const key = t.region_id || 'unknown';
                if (!stats[key]) {
                    stats[key] = {
                        region_id: t.region_id,
                        region_name: t.region_name || 'Nepoznato',
                        total_kg: 0,
                        by_waste_type: {}
                    };
                }
                stats[key].total_kg += parseFloat(t.quantity_kg) || 0;
                const wtKey = t.waste_type_id;
                stats[key].by_waste_type[wtKey] = (stats[key].by_waste_type[wtKey] || 0) + (parseFloat(t.quantity_kg) || 0);
            });

            return Object.values(stats).sort((a, b) => b.total_kg - a.total_kg);
        } catch (error) {
            console.error('Error getting inventory stats by region:', error);
            return [];
        }
    };

    return {
        fetchInventories,
        createInventory,
        updateInventory,
        deleteInventory,
        fetchInventoryItems,
        fetchInventoryTransactions,
        createInventoryAdjustment,
        assignRegionToInventory,
        getInventoryStatsByRegion
    };
};
