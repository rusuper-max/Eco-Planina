import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
    Building2, Users, Truck, User, ZoomIn, ZoomOut, Maximize2, Minimize2,
    RefreshCw, Save, Network, Phone, Mail, X, Edit3, Shield, Briefcase,
    Package, FileText, ChevronDown, ChevronUp, Hash, MapPin, Recycle,
    LogIn, Calendar, TrendingUp
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context';
import { useCompany } from '../../context/CompanyContext';
import toast from 'react-hot-toast';

// LocalStorage keys
const POSITIONS_STORAGE_KEY = 'eco_n8n_editor_positions_v2';
const BRANCH_POSITIONS_KEY = 'eco_n8n_branch_positions_v1';
const HELP_HIDDEN_KEY = 'eco_n8n_help_hidden';

// ============================================================================
// ROLE CONFIGURATION
// ============================================================================

const ROLES = {
    company_admin: {
        label: 'Admin Firme',
        color: 'bg-purple-600',
        hex: '#7c3aed',
        icon: Users,
        borderColor: 'border-purple-500',
        canDrag: false // Cannot be moved
    },
    supervisor: {
        label: 'Supervizor',
        color: 'bg-blue-600',
        hex: '#2563eb',
        icon: Shield,
        borderColor: 'border-blue-500',
        canDrag: false // Cannot be moved
    },
    manager: {
        label: 'Menadžer',
        color: 'bg-emerald-600',
        hex: '#059669',
        icon: Briefcase,
        borderColor: 'border-emerald-500',
        canDrag: true
    },
    driver: {
        label: 'Vozač',
        color: 'bg-amber-500',
        hex: '#f59e0b',
        icon: Truck,
        borderColor: 'border-amber-500',
        canDrag: true
    },
    client: {
        label: 'Klijent',
        color: 'bg-slate-500',
        hex: '#64748b',
        icon: User,
        borderColor: 'border-slate-500',
        canDrag: true
    }
};

const BRANCH_COLORS = {
    default: { bg: 'bg-slate-800/60', border: 'border-rose-600/50', label: 'bg-rose-600' },
    unassigned: { bg: 'bg-slate-800/40', border: 'border-slate-600/50', label: 'bg-slate-600' },
    centrala: { bg: 'bg-purple-900/30', border: 'border-purple-500/50', label: 'bg-purple-600' }
};

// ============================================================================
// NODE CARD COMPONENT
// ============================================================================

const NodeCard = ({ node, isSelected, isDragging, onMouseDown, onClick, canDrag }) => {
    const RoleConfig = ROLES[node.role] || ROLES.client;
    const Icon = RoleConfig.icon;

    return (
        <div
            data-node="true"
            onMouseDown={canDrag ? onMouseDown : undefined}
            onClick={onClick}
            className={`
                absolute w-44 p-2.5 rounded-lg transition-shadow
                bg-slate-800 border border-slate-700
                ${canDrag ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}
                ${isSelected ? 'ring-2 ring-white shadow-2xl z-50' : 'hover:ring-1 hover:ring-slate-500 z-10'}
                ${isDragging ? 'shadow-2xl opacity-80 z-50' : 'shadow-lg'}
            `}
            style={{
                left: node.x,
                top: node.y,
                transform: isDragging ? 'scale(1.05)' : 'scale(1)',
                transition: isDragging ? 'none' : 'transform 0.1s, box-shadow 0.15s'
            }}
        >
            {/* Role color strip */}
            <div className={`h-1 w-full rounded-full mb-2 ${RoleConfig.color}`} />

            <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-lg ${RoleConfig.color} bg-opacity-20`}>
                    <Icon size={16} className="text-slate-200" />
                </div>
                <div className="flex flex-col overflow-hidden flex-1 min-w-0">
                    <span className="text-sm font-semibold truncate text-slate-200">{node.label}</span>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wide">{RoleConfig.label}</span>
                </div>
            </div>

            {/* Connection dots */}
            <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-slate-500 rounded-full border border-slate-600" />
            <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-slate-500 rounded-full border border-slate-600" />

            {/* Pending indicator */}
            {node.hasPending && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full animate-pulse" />
            )}

            {/* Lock icon for non-draggable */}
            {!canDrag && (
                <div className="absolute -top-1.5 -left-1.5 w-4 h-4 bg-slate-700 rounded-full flex items-center justify-center border border-slate-600">
                    <Shield size={8} className="text-purple-400" />
                </div>
            )}
        </div>
    );
};

// ============================================================================
// COMPANY NODE COMPONENT
// ============================================================================

const CompanyNode = ({ companyName, position, isSelected, onClick }) => (
    <div
        onClick={onClick}
        className={`
            absolute w-52 p-4 rounded-xl cursor-pointer transition-shadow
            bg-gradient-to-br from-purple-900/80 to-slate-800 border-2 border-purple-500
            ${isSelected ? 'ring-2 ring-white shadow-2xl' : 'hover:ring-1 hover:ring-purple-400'}
            shadow-xl z-20
        `}
        style={{ left: position.x, top: position.y }}
    >
        <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-purple-600">
                <Building2 size={24} className="text-white" />
            </div>
            <div className="flex flex-col">
                <span className="text-base font-bold text-white">{companyName || 'Kompanija'}</span>
                <span className="text-xs text-purple-300">Centrala</span>
            </div>
        </div>

        {/* Bottom connection dot */}
        <div className="absolute left-1/2 -bottom-1.5 -translate-x-1/2 w-3 h-3 bg-purple-500 rounded-full border-2 border-slate-900" />
    </div>
);

// ============================================================================
// BRANCH CONTAINER COMPONENT
// ============================================================================

const BranchContainer = ({ branch, isDropTarget, onEditClick, onMouseDown, isDragging }) => {
    const colors = branch.isCentrala ? BRANCH_COLORS.centrala
        : branch.isUnassigned ? BRANCH_COLORS.unassigned
            : BRANCH_COLORS.default;

    return (
        <div
            data-branch="true"
            onMouseDown={onMouseDown}
            className={`
                absolute rounded-xl border-2 backdrop-blur-sm transition-all duration-200
                ${colors.bg} ${colors.border}
                ${isDropTarget ? 'border-emerald-400 bg-emerald-900/20 scale-[1.02]' : ''}
                ${isDragging ? 'shadow-2xl opacity-90 z-30' : ''}
                cursor-grab active:cursor-grabbing
            `}
            style={{
                left: branch.x,
                top: branch.y,
                width: branch.width,
                height: branch.height
            }}
        >
            {/* Title pill */}
            <div className={`
                absolute -top-3.5 left-4 px-3 py-1.5 rounded-full text-xs font-bold 
                tracking-wide uppercase text-white border border-slate-600/50
                flex items-center gap-2 ${colors.label}
            `}>
                {branch.isCentrala ? <Shield size={12} /> : branch.isUnassigned ? <Users size={12} /> : <Building2 size={12} />}
                {branch.label}
            </div>

            {/* Edit button for real branches */}
            {!branch.isCentrala && !branch.isUnassigned && onEditClick && (
                <button
                    onClick={(e) => { e.stopPropagation(); onEditClick(branch); }}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-700/80 hover:bg-slate-600 text-slate-400 hover:text-white transition-colors"
                >
                    <Edit3 size={12} />
                </button>
            )}

            {/* Top connection dot */}
            <div className="absolute left-1/2 -top-1.5 -translate-x-1/2 w-3 h-3 bg-slate-500 rounded-full border-2 border-slate-900" />
        </div>
    );
};

// ============================================================================
// DETAIL SIDEBAR COMPONENT
// ============================================================================

const DetailSidebar = ({ node, onClose, wasteTypes = [], onLoginAs, processedRequests = [] }) => {
    const [expandedWaste, setExpandedWaste] = useState(false);
    const [expandedRequests, setExpandedRequests] = useState(false);

    if (!node) return null;

    const RoleConfig = ROLES[node.role] || ROLES.client;
    const Icon = RoleConfig.icon;
    const userData = node.data || {};

    // Get allowed waste types for clients
    const allowedWasteTypes = userData.allowed_waste_types || [];
    const hasAllWasteTypes = !allowedWasteTypes.length || allowedWasteTypes.length === wasteTypes.length;

    // Calculate requests by waste type for this client
    const requestsByWasteType = useMemo(() => {
        if (node.role !== 'client') return {};
        const clientRequests = processedRequests.filter(r => r.client_id === node.userId);
        const byType = {};
        clientRequests.forEach(req => {
            const wtId = req.waste_type_id;
            const wt = wasteTypes.find(w => w.id === wtId);
            const label = wt?.label || req.waste_label || 'Nepoznato';
            byType[label] = (byType[label] || 0) + 1;
        });
        return byType;
    }, [node, processedRequests, wasteTypes]);

    const totalRequests = Object.values(requestsByWasteType).reduce((a, b) => a + b, 0);

    // Can login as manager or driver
    const canLoginAs = (node.role === 'manager' || node.role === 'driver') && onLoginAs;

    return (
        <div data-sidebar="true" className="absolute right-0 top-0 h-full w-80 bg-slate-800 border-l border-slate-700 shadow-2xl z-40 flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center px-5 py-4 bg-slate-900/50 border-b border-slate-700">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Network size={18} className="text-purple-400" />
                    Detalji
                </h2>
                <button onClick={onClose} className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors">
                    <X size={20} />
                </button>
            </div>

            {/* Content - stop wheel propagation */}
            <div
                className="flex-1 overflow-y-auto p-5 space-y-5"
                onWheel={(e) => e.stopPropagation()}
            >
                {/* Profile header */}
                <div className="flex items-center gap-4">
                    <div className={`p-4 rounded-xl ${RoleConfig.color}`}>
                        <Icon size={28} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-white truncate">{node.label}</h3>
                        <span className={`text-sm px-2 py-0.5 rounded ${RoleConfig.color} bg-opacity-30 text-slate-200`}>
                            {RoleConfig.label}
                        </span>
                    </div>
                </div>

                {/* Login as button for managers/drivers */}
                {canLoginAs && (
                    <button
                        onClick={() => onLoginAs(node)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-colors"
                    >
                        <LogIn size={18} />
                        Uloguj se kao {node.label.split(' ')[0]}
                    </button>
                )}

                {/* Info cards */}
                <div className="bg-slate-700/40 rounded-xl p-4 space-y-4 border border-slate-600/50">
                    {/* Branch */}
                    <div>
                        <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider flex items-center gap-1">
                            <MapPin size={10} /> Filijala
                        </label>
                        <div className="text-slate-200 font-medium mt-1">
                            {node.branchName || 'Nije dodeljen'}
                        </div>
                    </div>

                    {/* Phone */}
                    {userData.phone && (
                        <div>
                            <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider flex items-center gap-1">
                                <Phone size={10} /> Telefon
                            </label>
                            <div className="text-slate-200 mt-1">{userData.phone}</div>
                        </div>
                    )}

                    {/* Email */}
                    {userData.email && (
                        <div>
                            <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider flex items-center gap-1">
                                <Mail size={10} /> Email
                            </label>
                            <div className="text-slate-200 mt-1 text-sm truncate">{userData.email}</div>
                        </div>
                    )}

                    {/* Created at for managers/drivers */}
                    {(node.role === 'manager' || node.role === 'driver') && userData.created_at && (
                        <div>
                            <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider flex items-center gap-1">
                                <Calendar size={10} /> Registrovan
                            </label>
                            <div className="text-slate-200 mt-1 text-sm">
                                {new Date(userData.created_at).toLocaleDateString('sr-Latn-RS', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </div>
                        </div>
                    )}

                    {/* PIB (for clients) */}
                    {node.role === 'client' && userData.pib && (
                        <div>
                            <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider flex items-center gap-1">
                                <Hash size={10} /> PIB
                            </label>
                            <div className="text-slate-200 font-mono bg-slate-800 px-2 py-1 rounded inline-block mt-1">
                                {userData.pib}
                            </div>
                        </div>
                    )}

                    {/* Address (for clients) */}
                    {node.role === 'client' && userData.address && (
                        <div>
                            <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider flex items-center gap-1">
                                <MapPin size={10} /> Adresa
                            </label>
                            <div className="text-slate-200 mt-1 text-sm">{userData.address}</div>
                        </div>
                    )}
                </div>

                {/* Stats for managers/drivers */}
                {(node.role === 'manager' || node.role === 'driver') && (
                    <div className="bg-slate-700/40 rounded-xl p-4 border border-slate-600/50">
                        <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider flex items-center gap-1 mb-3">
                            <TrendingUp size={10} /> Statistika
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                                <div className="text-2xl font-bold text-emerald-400">
                                    {userData.processed_count || 0}
                                </div>
                                <div className="text-xs text-slate-400 mt-1">Obrađeno</div>
                            </div>
                            <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                                <div className="text-2xl font-bold text-blue-400">
                                    {userData.assigned_count || 0}
                                </div>
                                <div className="text-xs text-slate-400 mt-1">Aktivno</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Waste types for clients */}
                {node.role === 'client' && wasteTypes.length > 0 && (
                    <div className="bg-slate-700/40 rounded-xl border border-slate-600/50 overflow-hidden">
                        <button
                            onClick={() => setExpandedWaste(!expandedWaste)}
                            className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-700/50 transition-colors"
                        >
                            <div className="flex items-center gap-2">
                                <Recycle size={16} className="text-emerald-400" />
                                <span className="text-slate-200 font-medium">Vrste robe</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-emerald-400 font-bold text-sm">
                                    {hasAllWasteTypes ? 'Sve' : `${allowedWasteTypes.length}/${wasteTypes.length}`}
                                </span>
                                {expandedWaste ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                            </div>
                        </button>

                        {expandedWaste && (
                            <div className="px-4 pb-3 space-y-2 border-t border-slate-600/50 pt-3">
                                {wasteTypes.map(wt => {
                                    const isAllowed = hasAllWasteTypes || allowedWasteTypes.includes(wt.id);
                                    return (
                                        <div key={wt.id} className={`flex items-center gap-2 text-sm ${isAllowed ? 'text-slate-200' : 'text-slate-500 line-through'}`}>
                                            {wt.customImage ? (
                                                <img src={wt.customImage} alt="" className="w-4 h-4 rounded object-cover" />
                                            ) : (
                                                <span className="text-sm">{wt.icon}</span>
                                            )}
                                            <span>{wt.label}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* Equipment for clients */}
                {node.role === 'client' && userData.equipment_types && userData.equipment_types.length > 0 && (
                    <div className="bg-slate-700/40 rounded-xl p-4 border border-slate-600/50">
                        <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider flex items-center gap-1 mb-2">
                            <Package size={10} /> Oprema
                        </label>
                        <div className="text-emerald-400 font-medium">
                            {userData.equipment_types.length} kom. dodeljeno
                        </div>
                    </div>
                )}

                {/* Request count for clients - EXPANDABLE */}
                {node.role === 'client' && (
                    <div className="bg-slate-700/40 rounded-xl border border-slate-600/50 overflow-hidden">
                        <button
                            onClick={() => totalRequests > 0 && setExpandedRequests(!expandedRequests)}
                            className={`w-full px-4 py-3 flex items-center justify-between ${totalRequests > 0 ? 'hover:bg-slate-700/50 cursor-pointer' : ''} transition-colors`}
                        >
                            <div className="flex items-center gap-2">
                                <FileText size={16} className="text-emerald-400" />
                                <span className="text-slate-200 font-medium">Zahtevi</span>
                            </div>
                            <div className="flex items-center gap-2">
                                {totalRequests > 0 ? (
                                    <>
                                        <span className="text-emerald-400 font-bold text-sm">
                                            {totalRequests} obrađen{totalRequests === 1 ? '' : totalRequests < 5 ? 'a' : 'ih'}
                                        </span>
                                        {expandedRequests ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                                    </>
                                ) : (
                                    <span className="text-slate-500 text-sm">Nema</span>
                                )}
                            </div>
                        </button>

                        {expandedRequests && totalRequests > 0 && (
                            <div className="px-4 pb-3 space-y-2 border-t border-slate-600/50 pt-3">
                                {Object.entries(requestsByWasteType)
                                    .sort((a, b) => b[1] - a[1])
                                    .map(([label, count]) => {
                                        const wt = wasteTypes.find(w => w.label === label);
                                        return (
                                            <div key={label} className="flex items-center justify-between text-sm">
                                                <div className="flex items-center gap-2 text-slate-300">
                                                    {wt?.customImage ? (
                                                        <img src={wt.customImage} alt="" className="w-4 h-4 rounded object-cover" />
                                                    ) : wt?.icon ? (
                                                        <span className="text-sm">{wt.icon}</span>
                                                    ) : (
                                                        <Recycle size={14} className="text-slate-500" />
                                                    )}
                                                    <span>{label}</span>
                                                </div>
                                                <span className="text-emerald-400 font-bold">{count}</span>
                                            </div>
                                        );
                                    })}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Footer info */}
            <div className="p-4 border-t border-slate-700/50 text-xs text-slate-500 leading-relaxed">
                {ROLES[node.role]?.canDrag
                    ? 'Prevlačenjem ovog noda u drugu filijalu automatski se menja dodela.'
                    : 'Ovaj korisnik se ne može pomerati između filijala.'
                }
            </div>
        </div>
    );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const RegionNodeEditor = ({ fullscreen: initialFullscreen = false }) => {
    const { companyName, loginAsUser } = useAuth();
    const { assignUsersToRegion, fetchUsersGroupedByRegion, fetchCompanyRegions, fetchProcessedRequests } = useData();
    const { fetchCompanyWasteTypes } = useCompany();
    const containerRef = useRef(null);

    // Refs for panning and branch dragging (avoid stale closure issues)
    const panningRef = useRef({ active: false, startX: 0, startY: 0, offsetX: 50, offsetY: 20 });
    const branchDragRef = useRef({ active: false, branchId: null, startX: 0, startY: 0, initialBranchX: 0, initialBranchY: 0, initialNodePositions: {} });

    // State
    const [isFullscreen, setIsFullscreen] = useState(initialFullscreen);
    const [data, setData] = useState({ regions: [], unassigned: [] });
    const [allRegions, setAllRegions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [wasteTypes, setWasteTypes] = useState([]);
    const [processedRequests, setProcessedRequests] = useState([]);

    // View state
    const [scale, setScale] = useState(0.85);
    const [offset, setOffset] = useState({ x: 50, y: 20 });
    const [showHelp, setShowHelp] = useState(() => {
        try {
            return localStorage.getItem(HELP_HIDDEN_KEY) !== 'true';
        } catch { return true; }
    });

    // Node dragging
    const [draggingNodeId, setDraggingNodeId] = useState(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [nodePositions, setNodePositions] = useState({});

    // Branch dragging - just track the ID for visual feedback
    const [draggingBranchId, setDraggingBranchId] = useState(null);

    // Selection & sidebar
    const [selectedNode, setSelectedNode] = useState(null);

    // Drop target
    const [dropTarget, setDropTarget] = useState(null);

    // Pending changes
    const [pendingChanges, setPendingChanges] = useState([]);

    // Branch layout
    const [branchLayout, setBranchLayout] = useState([]);

    // ========================================================================
    // DATA LOADING
    // ========================================================================

    useEffect(() => {
        loadData();
        loadWasteTypes();
    }, []);

    const loadWasteTypes = async () => {
        try {
            const wt = await fetchCompanyWasteTypes();
            setWasteTypes(wt || []);
        } catch (err) {
            console.error('Error loading waste types:', err);
        }
    };

    const loadData = async () => {
        setLoading(true);
        try {
            const [groupedData, regions, historyResult] = await Promise.all([
                fetchUsersGroupedByRegion(),
                fetchCompanyRegions(),
                fetchProcessedRequests({ pageSize: 1000 }) // Fetch all history for client counts
            ]);
            setData(groupedData);
            setAllRegions(regions || []);
            setProcessedRequests(historyResult?.data || []);
            setPendingChanges([]);
            initializeLayout(groupedData, regions);
        } catch (err) {
            console.error('Error loading data:', err);
            toast.error('Greška pri učitavanju podataka');
        }
        setLoading(false);
    };

    // ========================================================================
    // LAYOUT INITIALIZATION
    // ========================================================================

    const initializeLayout = useCallback((groupedData, regions) => {
        const positions = {};
        const branches = [];

        const BRANCH_WIDTH = 280;
        const BRANCH_HEIGHT = 380;
        const BRANCH_GAP = 40;
        const BRANCH_START_Y = 320;
        const NODE_WIDTH = 176;
        const NODE_HEIGHT = 60;
        const NODE_GAP = 16;

        // Company position
        const companyX = 500;
        const companyY = 40;
        positions['company'] = { x: companyX, y: companyY };

        const unassigned = groupedData.unassigned || [];
        const regionsData = groupedData.regions || [];

        // Separate company admins and supervisors (they stay in "Centrala")
        const companyAdmins = unassigned.filter(u => u.role === 'company_admin');
        const supervisors = unassigned.filter(u => u.role === 'supervisor');
        const realUnassigned = unassigned.filter(u => u.role !== 'company_admin' && u.role !== 'supervisor');

        // Calculate total width needed
        const totalBranches = regionsData.length + (realUnassigned.length > 0 ? 1 : 0);
        const totalWidth = totalBranches * BRANCH_WIDTH + (totalBranches - 1) * BRANCH_GAP;
        const startX = Math.max(50, companyX - totalWidth / 2 + BRANCH_WIDTH / 2 - 50);

        // FIRST: Load saved branch positions (needed before calculating node positions)
        let savedBranchPos = {};
        try {
            const savedBranches = localStorage.getItem(BRANCH_POSITIONS_KEY);
            if (savedBranches) {
                savedBranchPos = JSON.parse(savedBranches);
            }
        } catch (e) {
            // Ignore
        }

        // Centrala container (for company admins and supervisors)
        const centralaUsers = [...companyAdmins, ...supervisors];
        if (centralaUsers.length > 0) {
            // Use saved position or default
            const defaultCentralaX = companyX + 280;
            const defaultCentralaY = companyY - 20;
            const centralaX = savedBranchPos['centrala']?.x ?? defaultCentralaX;
            const centralaY = savedBranchPos['centrala']?.y ?? defaultCentralaY;

            branches.push({
                id: 'centrala',
                label: 'Centrala',
                x: centralaX,
                y: centralaY,
                width: 200,
                height: 80 + centralaUsers.length * 70,
                isCentrala: true,
                regionId: 'centrala'
            });

            // Position nodes INSIDE the branch (use branch position)
            centralaUsers.forEach((user, i) => {
                positions[`user-${user.id}`] = {
                    x: centralaX + 12,
                    y: centralaY + 40 + i * 76
                };
            });
        }

        // Region branches
        regionsData.forEach((region, regionIdx) => {
            const defaultBranchX = startX + regionIdx * (BRANCH_WIDTH + BRANCH_GAP);
            const defaultBranchY = BRANCH_START_Y;
            const branchId = `region-${region.id}`;

            // Use saved position or default
            const branchX = savedBranchPos[branchId]?.x ?? defaultBranchX;
            const branchY = savedBranchPos[branchId]?.y ?? defaultBranchY;

            const users = region.users || [];
            const managers = users.filter(u => u.role === 'manager');
            const drivers = users.filter(u => u.role === 'driver');
            const clients = users.filter(u => u.role === 'client');

            // Calculate needed height
            const totalUsers = managers.length + drivers.length + clients.length;
            const neededHeight = Math.max(BRANCH_HEIGHT, 80 + totalUsers * (NODE_HEIGHT + NODE_GAP));

            branches.push({
                id: branchId,
                label: region.name,
                x: branchX,
                y: branchY,
                width: BRANCH_WIDTH,
                height: neededHeight,
                regionId: region.id
            });

            // Position nodes INSIDE branch (relative to branch position)
            let nodeY = branchY + 50;
            const nodeX = branchX + (BRANCH_WIDTH - NODE_WIDTH) / 2;

            [...managers, ...drivers, ...clients].forEach((user) => {
                positions[`user-${user.id}`] = { x: nodeX, y: nodeY };
                nodeY += NODE_HEIGHT + NODE_GAP;
            });
        });

        // Unassigned branch
        if (realUnassigned.length > 0) {
            const defaultUnassignedX = startX + regionsData.length * (BRANCH_WIDTH + BRANCH_GAP);
            const defaultUnassignedY = BRANCH_START_Y;

            // Use saved position or default
            const unassignedX = savedBranchPos['unassigned']?.x ?? defaultUnassignedX;
            const unassignedY = savedBranchPos['unassigned']?.y ?? defaultUnassignedY;

            const neededHeight = Math.max(BRANCH_HEIGHT, 80 + realUnassigned.length * (NODE_HEIGHT + NODE_GAP));

            branches.push({
                id: 'unassigned',
                label: 'Nedodeljeni',
                x: unassignedX,
                y: unassignedY,
                width: BRANCH_WIDTH,
                height: neededHeight,
                isUnassigned: true,
                regionId: null
            });

            // Position nodes INSIDE branch
            let nodeY = unassignedY + 50;
            const nodeX = unassignedX + (BRANCH_WIDTH - NODE_WIDTH) / 2;

            realUnassigned.forEach((user) => {
                positions[`user-${user.id}`] = { x: nodeX, y: nodeY };
                nodeY += NODE_HEIGHT + NODE_GAP;
            });
        }

        // Note: We no longer load individual node positions from localStorage
        // Nodes are always positioned relative to their branch position
        // This ensures consistency and prevents nodes from appearing outside their branch

        setNodePositions(positions);
        setBranchLayout(branches);
    }, []);

    // ========================================================================
    // BUILD NODES DATA
    // ========================================================================

    const nodes = useMemo(() => {
        const nodeList = [];
        const regions = data.regions || [];
        const unassigned = data.unassigned || [];

        // Company admins (in Centrala)
        const companyAdmins = unassigned.filter(u => u.role === 'company_admin');
        companyAdmins.forEach(admin => {
            nodeList.push({
                id: `user-${admin.id}`,
                type: 'user',
                role: admin.role,
                label: admin.name,
                userId: admin.id,
                regionId: 'centrala',
                branchName: 'Centrala',
                data: admin,
                hasPending: pendingChanges.some(c => c.userId === admin.id)
            });
        });

        // Supervisors (in Centrala)
        const supervisors = unassigned.filter(u => u.role === 'supervisor');
        supervisors.forEach(sup => {
            nodeList.push({
                id: `user-${sup.id}`,
                type: 'user',
                role: sup.role,
                label: sup.name,
                userId: sup.id,
                regionId: 'centrala',
                branchName: 'Centrala',
                data: sup,
                hasPending: pendingChanges.some(c => c.userId === sup.id)
            });
        });

        // Region users
        regions.forEach(region => {
            const users = (region.users || []).filter(u => u.role !== 'company_admin' && u.role !== 'supervisor');
            users.forEach(user => {
                nodeList.push({
                    id: `user-${user.id}`,
                    type: 'user',
                    role: user.role,
                    label: user.name,
                    userId: user.id,
                    regionId: region.id,
                    branchName: region.name,
                    data: user,
                    hasPending: pendingChanges.some(c => c.userId === user.id)
                });
            });
        });

        // Unassigned (not admins or supervisors)
        const realUnassigned = unassigned.filter(u => u.role !== 'company_admin' && u.role !== 'supervisor');
        realUnassigned.forEach(user => {
            nodeList.push({
                id: `user-${user.id}`,
                type: 'user',
                role: user.role,
                label: user.name,
                userId: user.id,
                regionId: null,
                branchName: 'Nedodeljeni',
                data: user,
                hasPending: pendingChanges.some(c => c.userId === user.id)
            });
        });

        return nodeList;
    }, [data, pendingChanges]);

    // ========================================================================
    // EVENT HANDLERS
    // ========================================================================

    const handleZoom = (delta) => {
        setScale(prev => Math.min(Math.max(prev + delta, 0.4), 1.5));
    };

    const handleWheel = useCallback((e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.05 : 0.05;
        setScale(s => Math.max(0.4, Math.min(1.5, s + delta)));
    }, []);

    // Canvas panning - using refs for real-time tracking
    const handleCanvasMouseDown = (e) => {
        // Get the actual target element
        const target = e.target;
        const isInteractive = target.closest('button') ||
            target.closest('[data-node]') ||
            target.closest('[data-branch]') ||
            target.closest('[data-sidebar]');

        // Start panning if not clicking on an interactive element
        if (!isInteractive) {
            e.preventDefault();
            panningRef.current = {
                active: true,
                startX: e.clientX,
                startY: e.clientY,
                offsetX: offset.x,
                offsetY: offset.y
            };
            setSelectedNode(null);
        }
    };

    const handleCanvasMouseMove = (e) => {
        // Canvas panning using ref
        if (panningRef.current.active) {
            const dx = e.clientX - panningRef.current.startX;
            const dy = e.clientY - panningRef.current.startY;
            setOffset({
                x: panningRef.current.offsetX + dx,
                y: panningRef.current.offsetY + dy
            });
            return;
        }

        // Node dragging
        if (draggingNodeId) {
            const rect = containerRef.current.getBoundingClientRect();
            const x = (e.clientX - rect.left - offset.x) / scale - dragOffset.x;
            const y = (e.clientY - rect.top - offset.y) / scale - dragOffset.y;

            // Use functional update for smoother dragging
            setNodePositions(prev => {
                if (prev[draggingNodeId]?.x === x && prev[draggingNodeId]?.y === y) {
                    return prev;
                }
                return { ...prev, [draggingNodeId]: { x, y } };
            });

            // Check drop target
            const nodeCenter = { x: x + 88, y: y + 30 };
            let foundTarget = null;

            for (const branch of branchLayout) {
                if (branch.isCentrala) continue; // Can't drop into Centrala

                if (
                    nodeCenter.x >= branch.x &&
                    nodeCenter.x <= branch.x + branch.width &&
                    nodeCenter.y >= branch.y &&
                    nodeCenter.y <= branch.y + branch.height
                ) {
                    const node = nodes.find(n => n.id === draggingNodeId);
                    if (node && node.regionId !== branch.regionId) {
                        foundTarget = branch;
                    }
                    break;
                }
            }

            setDropTarget(foundTarget);
        }
    };

    const handleCanvasMouseUp = () => {
        panningRef.current.active = false;

        if (draggingNodeId && dropTarget) {
            const node = nodes.find(n => n.id === draggingNodeId);
            if (node) {
                const change = {
                    userId: node.userId,
                    userName: node.label,
                    fromRegionId: node.regionId,
                    toRegionId: dropTarget.regionId,
                    toRegionName: dropTarget.label
                };
                setPendingChanges(prev => [
                    ...prev.filter(c => c.userId !== change.userId),
                    change
                ]);
                toast.success(`${node.label} → ${dropTarget.label}`);
            }
        }

        setDraggingNodeId(null);
        setDropTarget(null);
    };

    const handleNodeMouseDown = useCallback((e, node) => {
        e.stopPropagation();
        e.preventDefault();

        const roleConfig = ROLES[node.role];
        if (!roleConfig?.canDrag) return; // Don't allow dragging for non-draggable roles

        const rect = e.currentTarget.getBoundingClientRect();
        setDragOffset({
            x: (e.clientX - rect.left) / scale,
            y: (e.clientY - rect.top) / scale
        });
        setDraggingNodeId(node.id);
    }, [scale]);

    const handleNodeClick = useCallback((e, node) => {
        e.stopPropagation();
        if (!draggingNodeId) {
            setSelectedNode(node);
        }
    }, [draggingNodeId]);

    // ========================================================================
    // BRANCH DRAGGING - Using refs for smooth dragging with nodes following
    // ========================================================================

    // Get nodes that belong to a branch
    const getNodesInBranch = useCallback((branchId) => {
        const branch = branchLayout.find(b => b.id === branchId);
        if (!branch) return [];

        return nodes.filter(node => {
            if (branch.isCentrala) {
                return node.regionId === 'centrala';
            } else if (branch.isUnassigned) {
                return node.regionId === null;
            } else {
                return node.regionId === branch.regionId;
            }
        }).map(n => n.id);
    }, [branchLayout, nodes]);

    const handleBranchMouseDown = useCallback((e, branch) => {
        e.stopPropagation();
        e.preventDefault();

        // Store initial positions for smooth dragging
        const nodeIdsInBranch = getNodesInBranch(branch.id);
        const initialNodePos = {};
        nodeIdsInBranch.forEach(nodeId => {
            if (nodePositions[nodeId]) {
                initialNodePos[nodeId] = { ...nodePositions[nodeId] };
            }
        });

        branchDragRef.current = {
            active: true,
            branchId: branch.id,
            startX: e.clientX,
            startY: e.clientY,
            initialBranchX: branch.x,
            initialBranchY: branch.y,
            initialNodePositions: initialNodePos
        };

        setDraggingBranchId(branch.id);
    }, [getNodesInBranch, nodePositions]);

    // Global mouse move/up handlers for branch dragging
    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!branchDragRef.current.active) return;

            const { branchId, startX, startY, initialBranchX, initialBranchY, initialNodePositions } = branchDragRef.current;

            // Calculate delta in screen space, then convert to canvas space
            const dx = (e.clientX - startX) / scale;
            const dy = (e.clientY - startY) / scale;

            // Update branch position
            const newBranchX = initialBranchX + dx;
            const newBranchY = initialBranchY + dy;

            setBranchLayout(prev => prev.map(b =>
                b.id === branchId ? { ...b, x: newBranchX, y: newBranchY } : b
            ));

            // Update all nodes inside the branch with the same delta
            setNodePositions(prev => {
                const updated = { ...prev };
                Object.keys(initialNodePositions).forEach(nodeId => {
                    updated[nodeId] = {
                        x: initialNodePositions[nodeId].x + dx,
                        y: initialNodePositions[nodeId].y + dy
                    };
                });
                return updated;
            });
        };

        const handleMouseUp = () => {
            if (!branchDragRef.current.active) return;

            // Save branch positions to localStorage
            const allBranchPositions = {};
            branchLayout.forEach(b => {
                allBranchPositions[b.id] = { x: b.x, y: b.y };
            });
            localStorage.setItem(BRANCH_POSITIONS_KEY, JSON.stringify(allBranchPositions));

            // Save node positions too
            localStorage.setItem(POSITIONS_STORAGE_KEY, JSON.stringify(nodePositions));

            branchDragRef.current.active = false;
            setDraggingBranchId(null);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [scale, branchLayout, nodePositions]);

    // ========================================================================
    // SAVE CHANGES
    // ========================================================================

    const saveChanges = async () => {
        if (pendingChanges.length === 0) return;
        setSaving(true);
        try {
            const changesByRegion = {};
            pendingChanges.forEach(change => {
                const key = change.toRegionId || 'null';
                if (!changesByRegion[key]) changesByRegion[key] = [];
                changesByRegion[key].push(change.userId);
            });

            for (const [regionId, userIds] of Object.entries(changesByRegion)) {
                await assignUsersToRegion(userIds, regionId === 'null' ? null : regionId);
            }

            // Clear saved positions so nodes get repositioned in their new branches
            localStorage.removeItem(POSITIONS_STORAGE_KEY);

            toast.success(`Sačuvano ${pendingChanges.length} promena`);
            setPendingChanges([]);
            await loadData();
        } catch (err) {
            console.error('Error saving:', err);
            toast.error('Greška: ' + err.message);
        }
        setSaving(false);
    };

    const resetView = () => {
        setScale(0.85);
        setOffset({ x: 50, y: 20 });
    };

    // ========================================================================
    // RENDER
    // ========================================================================

    if (loading) {
        return (
            <div className="bg-slate-900 rounded-2xl h-full min-h-[500px] flex items-center justify-center">
                <RefreshCw size={48} className="animate-spin text-emerald-500" />
            </div>
        );
    }

    const containerStyle = isFullscreen
        ? { position: 'fixed', top: '80px', right: 0, bottom: 0, zIndex: 50, backgroundColor: '#0f172a' }
        : { height: '100%', minHeight: '600px', backgroundColor: '#0f172a', borderRadius: '1rem', overflow: 'hidden' };

    return (
        <div style={containerStyle} className={`flex flex-col ${isFullscreen ? 'left-0 lg:left-64' : ''}`}>
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-800 border-b border-slate-700 flex-shrink-0 z-30">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-purple-600 rounded-xl flex items-center justify-center">
                        <Network size={20} className="text-white" />
                    </div>
                    <div>
                        <h2 className="font-bold text-white text-sm">Vizuelni Editor</h2>
                        <p className="text-xs text-slate-400">Prevuci korisnike između filijala</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {pendingChanges.length > 0 && (
                        <div className="flex items-center gap-2 mr-3">
                            <span className="px-2.5 py-1 bg-amber-500/20 text-amber-400 rounded-lg text-xs font-medium">
                                {pendingChanges.length} promena
                            </span>
                            <button
                                onClick={saveChanges}
                                disabled={saving}
                                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs flex items-center gap-1.5 font-medium transition-colors"
                            >
                                {saving ? <RefreshCw size={12} className="animate-spin" /> : <Save size={14} />}
                                Sačuvaj
                            </button>
                            <button
                                onClick={() => { setPendingChanges([]); loadData(); }}
                                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-xs transition-colors"
                            >
                                Odbaci
                            </button>
                        </div>
                    )}

                    <div className="flex items-center bg-slate-700 rounded-lg">
                        <button onClick={() => handleZoom(0.1)} className="p-1.5 hover:bg-slate-600 rounded-l-lg text-slate-300">
                            <ZoomIn size={14} />
                        </button>
                        <button onClick={resetView} className="text-xs text-slate-400 w-12 text-center hover:bg-slate-600 py-1">
                            {Math.round(scale * 100)}%
                        </button>
                        <button onClick={() => handleZoom(-0.1)} className="p-1.5 hover:bg-slate-600 rounded-r-lg text-slate-300">
                            <ZoomOut size={14} />
                        </button>
                    </div>

                    <button onClick={loadData} className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400" title="Osveži">
                        <RefreshCw size={14} />
                    </button>
                    <button onClick={() => setIsFullscreen(!isFullscreen)} className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400">
                        {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                    </button>
                </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 px-4 py-2 bg-slate-800/50 border-b border-slate-700/50 text-xs flex-shrink-0">
                {Object.entries(ROLES).filter(([k]) => k !== 'supervisor').map(([key, config]) => (
                    <span key={key} className="flex items-center gap-1.5 text-slate-400">
                        <span className={`w-2 h-2 rounded-full ${config.color}`} />
                        {config.label}
                    </span>
                ))}
            </div>

            {/* Canvas */}
            <div
                ref={containerRef}
                className={`flex-1 relative overflow-hidden select-none ${draggingNodeId ? 'cursor-grabbing' : 'cursor-grab'
                    }`}
                style={{
                    backgroundImage: 'radial-gradient(#334155 1px, transparent 1px)',
                    backgroundSize: `${20 * scale}px ${20 * scale}px`,
                    backgroundPosition: `${offset.x}px ${offset.y}px`,
                    backgroundColor: '#0f172a'
                }}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
                onWheel={handleWheel}
            >
                <div className="canvas-bg absolute inset-0" />

                <div
                    className="absolute origin-top-left"
                    style={{
                        transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                        width: '3000px',
                        height: '2000px'
                    }}
                >
                    {/* SVG Connections */}
                    <svg className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
                        {(() => {
                            const companyPos = nodePositions['company'];
                            if (!companyPos) return null;

                            const lines = [];
                            const companyBottom = { x: companyPos.x + 104, y: companyPos.y + 90 };

                            // Lines to branch tops
                            branchLayout.filter(b => !b.isCentrala).forEach(branch => {
                                const branchTop = { x: branch.x + branch.width / 2, y: branch.y };
                                lines.push(
                                    <path
                                        key={`conn-${branch.id}`}
                                        d={`M ${companyBottom.x} ${companyBottom.y} C ${companyBottom.x} ${companyBottom.y + 100}, ${branchTop.x} ${branchTop.y - 100}, ${branchTop.x} ${branchTop.y}`}
                                        fill="none"
                                        stroke="#475569"
                                        strokeWidth="2"
                                        strokeDasharray="8,4"
                                        opacity="0.5"
                                    />
                                );
                            });

                            return lines;
                        })()}
                    </svg>

                    {/* Branch containers */}
                    {branchLayout.map(branch => (
                        <BranchContainer
                            key={branch.id}
                            branch={branch}
                            isDropTarget={dropTarget?.id === branch.id}
                            isDragging={draggingBranchId === branch.id}
                            onMouseDown={(e) => handleBranchMouseDown(e, branch)}
                        />
                    ))}

                    {/* Company node */}
                    <CompanyNode
                        companyName={companyName}
                        position={nodePositions['company'] || { x: 500, y: 40 }}
                        isSelected={false}
                        onClick={() => { }}
                    />

                    {/* User nodes */}
                    {nodes.map(node => {
                        const pos = nodePositions[node.id] || { x: 0, y: 0 };
                        const nodeWithPos = { ...node, x: pos.x, y: pos.y };
                        const canDrag = ROLES[node.role]?.canDrag ?? false;

                        return (
                            <NodeCard
                                key={node.id}
                                node={nodeWithPos}
                                isSelected={selectedNode?.id === node.id}
                                isDragging={draggingNodeId === node.id}
                                canDrag={canDrag}
                                onMouseDown={(e) => handleNodeMouseDown(e, node)}
                                onClick={(e) => handleNodeClick(e, node)}
                            />
                        );
                    })}
                </div>

                {/* Detail sidebar */}
                {selectedNode && (
                    <DetailSidebar
                        node={selectedNode}
                        onClose={() => setSelectedNode(null)}
                        wasteTypes={wasteTypes}
                        processedRequests={processedRequests || []}
                        onLoginAs={loginAsUser ? async (node) => {
                            try {
                                await loginAsUser(node.userId);
                                toast.success(`Prijavljeni kao ${node.label}`);
                            } catch (err) {
                                toast.error('Greška: ' + err.message);
                            }
                        } : null}
                    />
                )}
            </div>

            {/* Instructions - Hide permanently when collapsed */}
            {showHelp && (
                <div className="absolute bottom-4 left-4 z-20">
                    <div className="bg-slate-800/90 border border-slate-700 rounded-xl text-xs text-slate-400 max-w-xs shadow-xl backdrop-blur-sm overflow-hidden">
                        <div className="p-3">
                            <div className="flex items-center justify-between mb-2">
                                <span className="font-bold text-slate-300">Kako koristiti</span>
                                <button
                                    onClick={() => {
                                        setShowHelp(false);
                                        localStorage.setItem(HELP_HIDDEN_KEY, 'true');
                                    }}
                                    className="p-1 hover:bg-slate-700 rounded text-slate-500 hover:text-slate-300 transition-colors"
                                    title="Sakrij trajno"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                            <ul className="list-disc pl-4 space-y-1">
                                <li>Drži klik na praznom prostoru i pomeri za navigaciju</li>
                                <li>Prevuci menadžere, vozače i klijente u druge filijale</li>
                                <li>Prevuci filijale da ih pomeriš na mapi</li>
                                <li>Klikni na osobu za detalje</li>
                                <li>Scroll za zoom</li>
                            </ul>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RegionNodeEditor;
