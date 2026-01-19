// Re-export React hooks
export { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react';
export { createPortal } from 'react-dom';

// Re-export React Router hooks
export { useNavigate } from 'react-router-dom';

// Re-export Auth context (legacy combined hook for backward compatibility)
export { useAuth, useHelpMode } from '../context';

// Re-export Supabase
export { supabase } from '../config/supabase';

// Re-export Leaflet components
export { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
export { default as MarkerClusterGroup } from 'react-leaflet-cluster';
export { default as L } from 'leaflet';

// Re-export Lucide icons
export {
    LayoutDashboard, Truck, Users, Settings, LogOut, Mountain, MapPin, Bell, Search, Menu, X, Plus, Recycle, BarChart3,
    FileText, Building2, AlertCircle, CheckCircle2, Clock, Package, Send, Trash2, Eye, Copy, ChevronRight, Phone,
    RefreshCw, Info, Box, ArrowUpDown, ArrowUp, ArrowDown, Filter, Upload, Image, Globe, ChevronDown, MessageCircle, Edit3, ArrowLeft, History, Calendar, XCircle, Printer, Download, FileSpreadsheet,
    Lock, Unlock, AlertTriangle, LogIn, Scale, EyeOff, Network, UserCheck, ClipboardList, Warehouse
} from 'lucide-react';

// Re-export utilities
export { getRemainingTime, getCurrentUrgency } from '../utils/timeUtils';
export { createIcon, createCustomIcon, urgencyIcons, URGENCY_COLORS, WASTE_ICONS_MAP, markerStyles, getStablePosition } from '../utils/mapUtils';
export { uploadImage, deleteImage } from '../utils/storage';
export { getFillLevelColor } from '../utils/styleUtils';

// Re-export common components
export { Modal, ModalWithFooter, StatCard, EmptyState, SidebarItem, CountdownTimer, FillLevelBar, ImageUploader, RequestStatusBadge, NotificationBell, HelpButton, HelpOverlay, RecycleLoader } from '../components/common';

// Re-export map components
export { MapView, DraggableMarker, LocationPicker, FitBounds } from '../components/map';

// Re-export request components
export {
    NewRequestForm,
    ClientRequestsView,
    ClientHistoryView,
    ManagerRequestsTable,
    HistoryTable,
    EditProcessedRequestModal,
    RequestDetailsModal,
    ProcessRequestModal,
    CreateRequestModal
} from '../components/requests';

// Re-export client components
export {
    ClientsTable,
    ClientDetailsModal,
    ClientEquipmentModal,
    ImportClientsModal
} from '../components/clients';

// Re-export equipment components
export {
    EquipmentManagement,
    WasteTypesManagement
} from '../components/equipment';

// Re-export chat components
export { ChatInterface } from '../components/chat';

// Re-export admin components
export {
    AdminCompaniesTable,
    AdminUsersTable,
    MasterCodesTable,
    UserDetailsModal,
    CompanyEditModal,
    UserEditModal,
    DeleteConfirmationModal,
    PrintExport,
    RegionsPage,
    CompanyStaffPage,
    RegionNodeEditor,
    CompanySettingsPage,
    ActivityLogPage
} from '../components/admin';

// Re-export analytics components
export { AnalyticsPage, ManagerAnalyticsPage, DriverAnalyticsPage } from '../components/analytics';

// Re-export inventory components
export { InventoryPage } from '../components/inventory';

// Re-export vehicles components
export { VehiclesPage } from '../components/vehicles';

// Default waste types constant (kept for backward compatibility)
export const WASTE_TYPES = [
    { id: 'cardboard', label: 'Karton', icon: '📦' },
    { id: 'plastic', label: 'Plastika', icon: '♻️' },
    { id: 'glass', label: 'Staklo', icon: '🍾' },
];
