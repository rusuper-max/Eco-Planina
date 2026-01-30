/**
 * Typed Supabase helpers and utility types
 * Generated types are in database.ts
 */
import type { Database } from './database';

// =============================================================================
// Table Types - Row (full record), Insert (creating), Update (partial update)
// =============================================================================

// Users
export type User = Database['public']['Tables']['users']['Row'];
export type UserInsert = Database['public']['Tables']['users']['Insert'];
export type UserUpdate = Database['public']['Tables']['users']['Update'];

// Companies
export type Company = Database['public']['Tables']['companies']['Row'];
export type CompanyInsert = Database['public']['Tables']['companies']['Insert'];
export type CompanyUpdate = Database['public']['Tables']['companies']['Update'];

// Regions
export type Region = Database['public']['Tables']['regions']['Row'];
export type RegionInsert = Database['public']['Tables']['regions']['Insert'];
export type RegionUpdate = Database['public']['Tables']['regions']['Update'];

// Pickup Requests
export type PickupRequest = Database['public']['Tables']['pickup_requests']['Row'];
export type PickupRequestInsert = Database['public']['Tables']['pickup_requests']['Insert'];
export type PickupRequestUpdate = Database['public']['Tables']['pickup_requests']['Update'];

// Driver Assignments
export type DriverAssignment = Database['public']['Tables']['driver_assignments']['Row'];
export type DriverAssignmentInsert = Database['public']['Tables']['driver_assignments']['Insert'];
export type DriverAssignmentUpdate = Database['public']['Tables']['driver_assignments']['Update'];

// Waste Types
export type WasteType = Database['public']['Tables']['waste_types']['Row'];
export type WasteTypeInsert = Database['public']['Tables']['waste_types']['Insert'];
export type WasteTypeUpdate = Database['public']['Tables']['waste_types']['Update'];

// Equipment
export type Equipment = Database['public']['Tables']['equipment']['Row'];
export type EquipmentInsert = Database['public']['Tables']['equipment']['Insert'];
export type EquipmentUpdate = Database['public']['Tables']['equipment']['Update'];

// Inventories
export type Inventory = Database['public']['Tables']['inventories']['Row'];
export type InventoryInsert = Database['public']['Tables']['inventories']['Insert'];
export type InventoryUpdate = Database['public']['Tables']['inventories']['Update'];

// Inventory Items
export type InventoryItem = Database['public']['Tables']['inventory_items']['Row'];
export type InventoryItemInsert = Database['public']['Tables']['inventory_items']['Insert'];
export type InventoryItemUpdate = Database['public']['Tables']['inventory_items']['Update'];

// Inventory Transactions
export type InventoryTransaction = Database['public']['Tables']['inventory_transactions']['Row'];
export type InventoryTransactionInsert = Database['public']['Tables']['inventory_transactions']['Insert'];
export type InventoryTransactionUpdate = Database['public']['Tables']['inventory_transactions']['Update'];

// Vehicles
export type Vehicle = Database['public']['Tables']['vehicles']['Row'];
export type VehicleInsert = Database['public']['Tables']['vehicles']['Insert'];
export type VehicleUpdate = Database['public']['Tables']['vehicles']['Update'];

// Fuel Logs
export type FuelLog = Database['public']['Tables']['fuel_logs']['Row'];
export type FuelLogInsert = Database['public']['Tables']['fuel_logs']['Insert'];
export type FuelLogUpdate = Database['public']['Tables']['fuel_logs']['Update'];

// Activity Logs
export type ActivityLog = Database['public']['Tables']['activity_logs']['Row'];
export type ActivityLogInsert = Database['public']['Tables']['activity_logs']['Insert'];
export type ActivityLogUpdate = Database['public']['Tables']['activity_logs']['Update'];

// =============================================================================
// Enum Types
// =============================================================================

export type UserRole =
  | 'developer'
  | 'admin'
  | 'company_admin'
  | 'supervisor'
  | 'manager'
  | 'driver'
  | 'client';

export type RequestStatus =
  | 'pending'
  | 'processing'
  | 'processed'
  | 'rejected'
  | 'assigned'
  | 'picked_up'
  | 'delivered'
  | 'completed';

export type AssignmentStatus =
  | 'assigned'
  | 'picked_up'
  | 'delivered'
  | 'completed'
  | 'cancelled';

export type TransactionType =
  | 'inbound'
  | 'outbound'
  | 'adjustment';

// =============================================================================
// Utility Types
// =============================================================================

// For use with Supabase client
export type Tables = Database['public']['Tables'];
export type TableName = keyof Tables;

// Get Row type for a table
export type TableRow<T extends TableName> = Tables[T]['Row'];

// Get Insert type for a table
export type TableInsert<T extends TableName> = Tables[T]['Insert'];

// Get Update type for a table
export type TableUpdate<T extends TableName> = Tables[T]['Update'];

// =============================================================================
// Extended Types (with joins/relations)
// =============================================================================

// User with region info
export interface UserWithRegion extends User {
  region?: Region | null;
}

// Pickup request with client and waste type info
export interface PickupRequestWithDetails extends PickupRequest {
  client?: User | null;
  waste_type_info?: WasteType | null;
  region?: Region | null;
}

// Driver assignment with full details
export interface DriverAssignmentWithDetails extends DriverAssignment {
  driver?: User | null;
  request?: PickupRequest | null;
}

// Inventory item with waste type
export interface InventoryItemWithWasteType extends InventoryItem {
  waste_type?: WasteType | null;
}

// =============================================================================
// Function parameter types
// =============================================================================

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface DateRangeParams {
  startDate?: string;
  endDate?: string;
}

export interface FilterParams extends PaginationParams, DateRangeParams {
  search?: string;
  status?: string;
  regionId?: string;
}
