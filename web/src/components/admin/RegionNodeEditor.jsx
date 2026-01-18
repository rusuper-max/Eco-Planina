import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
    Building2, Users, Truck, User, ZoomIn, ZoomOut, Maximize2, Minimize2,
    RefreshCw, Save, Network, Phone, Mail, X, LogIn, Edit3, Shield, Briefcase,
    Package, FileText, ChevronDown, ChevronUp, Hash, MapPin
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context';
import toast from 'react-hot-toast';

// ============================================================================
// ROLE CONFIGURATION
// ============================================================================

const ROLES = {
    company_admin: {
        label: 'Admin',
        color: 'bg-purple-600',
        hex: '#7c3aed',
        icon: Users,
        borderColor: 'border-purple-500'
    },
    supervisor: {
        label: 'Supervizor',
        color: 'bg-blue-600',
        hex: '#2563eb',
        icon: Shield,
        borderColor: 'border-blue-500'
    },
    manager: {
        label: 'Menadžer',
        color: 'bg-emerald-600',
        hex: '#059669',
        icon: Briefcase,
        borderColor: 'border-emerald-500'
    },
    driver: {
        label: 'Vozač',
        color: 'bg-amber-500',
        hex: '#f59e0b',
        icon: Truck,
        borderColor: 'border-amber-500'
    },
    client: {
        label: 'Klijent',
        color: 'bg-slate-500',
        hex: '#64748b',
        icon: User,
        borderColor: 'border-slate-500'
    }
};

const BRANCH_COLORS = {
    default: { bg: 'bg-slate-800/60', border: 'border-rose-600/50', label: 'bg-rose-600' },
    unassigned: { bg: 'bg-slate-800/40', border: 'border-slate-600/50', label: 'bg-slate-600' },
    uprava: { bg: 'bg-purple-900/30', border: 'border-purple-500/50', label: 'bg-purple-600' }
};

// ============================================================================
// NODE CARD COMPONENT
// ============================================================================

const NodeCard = ({ node, isSelected, isDragging, onMouseDown, onClick }) => {
    const RoleConfig = ROLES[node.role] || ROLES.client;
    const Icon = RoleConfig.icon;

    return (
        <div
            onMouseDown={onMouseDown}
            onClick={onClick}
            className={`
                absolute w-44 p-2.5 rounded-lg cursor-pointer transition-all duration-150
                bg-slate-800 border border-slate-700
                ${isSelected ? 'ring-2 ring-white shadow-2xl z-50 scale-105' : 'hover:ring-1 hover:ring-slate-500 z-10'}
                ${isDragging ? 'shadow-2xl scale-105 opacity-90' : 'shadow-lg'}
            `}
            style={{
                left: node.x,
                top: node.y,
                filter: isDragging ? 'drop-shadow(0 10px 20px rgba(0,0,0,0.5))' : undefined
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
        </div>
    );
};

// ============================================================================
// COMPANY NODE COMPONENT
// ============================================================================

const CompanyNode = ({ companyName, position, isSelected, onMouseDown, onClick }) => (
    <div
        onMouseDown={onMouseDown}
        onClick={onClick}
        className={`
            absolute w-52 p-4 rounded-xl cursor-pointer transition-all duration-150
            bg-gradient-to-br from-purple-900/80 to-slate-800 border-2 border-purple-500
            ${isSelected ? 'ring-2 ring-white shadow-2xl scale-105' : 'hover:ring-1 hover:ring-purple-400'}
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

const BranchContainer = ({ branch, isDropTarget, onEditClick }) => {
    const colors = branch.isUprava ? BRANCH_COLORS.uprava
        : branch.isUnassigned ? BRANCH_COLORS.unassigned
            : BRANCH_COLORS.default;

    return (
        <div
            className={`
                absolute rounded-xl border-2 backdrop-blur-sm transition-all duration-200
                ${colors.bg} ${colors.border}
                ${isDropTarget ? 'border-emerald-400 bg-emerald-900/20 scale-[1.02]' : ''}
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
                {branch.isUprava ? <Shield size={12} /> : branch.isUnassigned ? <Users size={12} /> : <Building2 size={12} />}
                {branch.label}
            </div>

            {/* Edit button for real branches */}
            {!branch.isUprava && !branch.isUnassigned && onEditClick && (
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

const DetailSidebar = ({ node, onClose, onLoginAs, wasteTypes = [] }) => {
    const [expandedRequests, setExpandedRequests] = useState(false);

    if (!node) return null;

    const RoleConfig = ROLES[node.role] || ROLES.client;
    const Icon = RoleConfig.icon;
    const userData = node.data || {};

    // Mock request data - in real implementation this would come from the API
    const requestCount = userData.request_count || 0;
    const requestsByType = userData.requests_by_type || {};

    return (
        <div className="absolute right-0 top-0 h-full w-80 bg-slate-800 border-l border-slate-700 shadow-2xl transform transition-transform z-40 flex flex-col">
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

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
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

                    {/* PIB (for clients) */}
                    {userData.pib && (
                        <div>
                            <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider flex items-center gap-1">
                                <Hash size={10} /> PIB
                            </label>
                            <div className="text-slate-200 font-mono bg-slate-800 px-2 py-1 rounded inline-block mt-1">
                                {userData.pib}
                            </div>
                        </div>
                    )}
                </div>

                {/* Request count (for clients) */}
                {node.role === 'client' && (
                    <div className="bg-slate-700/40 rounded-xl border border-slate-600/50 overflow-hidden">
                        <button
                            onClick={() => setExpandedRequests(!expandedRequests)}
                            className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-700/50 transition-colors"
                        >
                            <div className="flex items-center gap-2">
                                <FileText size={16} className="text-emerald-400" />
                                <span className="text-slate-200 font-medium">Broj zahteva</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-emerald-400 font-bold">{requestCount}</span>
                                {expandedRequests ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                            </div>
                        </button>

                        {expandedRequests && Object.keys(requestsByType).length > 0 && (
                            <div className="px-4 pb-3 space-y-2 border-t border-slate-600/50 pt-3">
                                {Object.entries(requestsByType).map(([typeId, count]) => {
                                    const wasteType = wasteTypes.find(w => w.id === typeId);
                                    return (
                                        <div key={typeId} className="flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-2">
                                                <Package size={12} className="text-slate-400" />
                                                <span className="text-slate-300">{wasteType?.label || 'Nepoznato'}</span>
                                            </div>
                                            <span className="text-slate-400">{count}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* Login as button */}
                {onLoginAs && node.role !== 'client' && (
                    <button
                        onClick={() => onLoginAs(node)}
                        className="w-full px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                    >
                        <LogIn size={16} />
                        Prijavi se kao {node.label}
                    </button>
                )}
            </div>

            {/* Footer info */}
            <div className="p-4 border-t border-slate-700/50 text-xs text-slate-500 leading-relaxed">
                Prevlačenjem ovog noda u drugu filijalu automatski se menja dodela.
            </div>
        </div>
    );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const RegionNodeEditor = ({ fullscreen: initialFullscreen = false }) => {
    const { companyName, loginAsUser } = useAuth();
    const { assignUsersToRegion, fetchUsersGroupedByRegion, fetchCompanyRegions, updateRegion } = useData();
    const containerRef = useRef(null);

    // State
    const [isFullscreen, setIsFullscreen] = useState(initialFullscreen);
    const [data, setData] = useState({ regions: [], unassigned: [] });
    const [allRegions, setAllRegions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // View state
    const [scale, setScale] = useState(0.85);
    const [offset, setOffset] = useState({ x: 50, y: 20 });
    const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    // Node dragging
    const [draggingNodeId, setDraggingNodeId] = useState(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [nodePositions, setNodePositions] = useState({});

    // Selection & sidebar
    const [selectedNode, setSelectedNode] = useState(null);

    // Drop target
    const [dropTarget, setDropTarget] = useState(null);

    // Pending changes
    const [pendingChanges, setPendingChanges] = useState([]);

    // Branch layout
    const [branchLayout, setBranchLayout] = useState([]);

    // LocalStorage key
    const POSITIONS_STORAGE_KEY = 'eco_n8n_editor_positions';

    // ========================================================================
    // DATA LOADING
    // ========================================================================

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [groupedData, regions] = await Promise.all([
                fetchUsersGroupedByRegion(),
                fetchCompanyRegions()
            ]);
            setData(groupedData);
            setAllRegions(regions || []);
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

        const allRegions = regions || [];
        const unassigned = groupedData.unassigned || [];
        const regionsData = groupedData.regions || [];

        // Separate company admins
        const companyAdmins = unassigned.filter(u => u.role === 'company_admin');
        const supervisors = unassigned.filter(u => u.role === 'supervisor');
        const realUnassigned = unassigned.filter(u => u.role !== 'company_admin' && u.role !== 'supervisor');

        // Calculate total width needed
        const totalBranches = regionsData.length + (realUnassigned.length > 0 ? 1 : 0);
        const totalWidth = totalBranches * BRANCH_WIDTH + (totalBranches - 1) * BRANCH_GAP;
        const startX = Math.max(50, companyX - totalWidth / 2 + BRANCH_WIDTH / 2 - 50);

        // Uprava (company admins) - small box near company
        if (companyAdmins.length > 0) {
            const upravaX = companyX + 280;
            const upravaY = companyY - 20;
            branches.push({
                id: 'uprava',
                label: 'Uprava',
                x: upravaX,
                y: upravaY,
                width: 200,
                height: 80 + companyAdmins.length * 50,
                isUprava: true,
                regionId: 'uprava'
            });

            companyAdmins.forEach((admin, i) => {
                positions[`user-${admin.id}`] = {
                    x: upravaX + 20,
                    y: upravaY + 40 + i * 70
                };
            });
        }

        // Supervisors - positioned between company and branches
        if (supervisors.length > 0) {
            const supY = companyY + 140;
            const supSpacing = 220;
            const supStartX = companyX - ((supervisors.length - 1) * supSpacing) / 2;

            supervisors.forEach((sup, i) => {
                positions[`user-${sup.id}`] = {
                    x: supStartX + i * supSpacing - NODE_WIDTH / 2,
                    y: supY
                };
            });
        }

        // Region branches
        regionsData.forEach((region, regionIdx) => {
            const branchX = startX + regionIdx * (BRANCH_WIDTH + BRANCH_GAP);
            const branchY = BRANCH_START_Y;

            const users = region.users || [];
            const managers = users.filter(u => u.role === 'manager');
            const drivers = users.filter(u => u.role === 'driver');
            const clients = users.filter(u => u.role === 'client');

            // Calculate needed height
            const rows = Math.ceil((managers.length + drivers.length + clients.length) / 1);
            const neededHeight = Math.max(BRANCH_HEIGHT, 80 + rows * (NODE_HEIGHT + NODE_GAP));

            branches.push({
                id: `region-${region.id}`,
                label: region.name,
                x: branchX,
                y: branchY,
                width: BRANCH_WIDTH,
                height: neededHeight,
                regionId: region.id
            });

            // Position nodes inside branch
            let nodeY = branchY + 50;
            const nodeX = branchX + (BRANCH_WIDTH - NODE_WIDTH) / 2;

            // Managers first
            managers.forEach((user) => {
                positions[`user-${user.id}`] = { x: nodeX, y: nodeY };
                nodeY += NODE_HEIGHT + NODE_GAP;
            });

            // Then drivers
            drivers.forEach((user) => {
                positions[`user-${user.id}`] = { x: nodeX, y: nodeY };
                nodeY += NODE_HEIGHT + NODE_GAP;
            });

            // Then clients
            clients.forEach((user) => {
                positions[`user-${user.id}`] = { x: nodeX, y: nodeY };
                nodeY += NODE_HEIGHT + NODE_GAP;
            });
        });

        // Unassigned branch
        if (realUnassigned.length > 0) {
            const unassignedX = startX + regionsData.length * (BRANCH_WIDTH + BRANCH_GAP);
            const rows = Math.ceil(realUnassigned.length / 1);
            const neededHeight = Math.max(BRANCH_HEIGHT, 80 + rows * (NODE_HEIGHT + NODE_GAP));

            branches.push({
                id: 'unassigned',
                label: 'Nedodeljeni',
                x: unassignedX,
                y: BRANCH_START_Y,
                width: BRANCH_WIDTH,
                height: neededHeight,
                isUnassigned: true,
                regionId: null
            });

            let nodeY = BRANCH_START_Y + 50;
            const nodeX = unassignedX + (BRANCH_WIDTH - NODE_WIDTH) / 2;

            realUnassigned.forEach((user) => {
                positions[`user-${user.id}`] = { x: nodeX, y: nodeY };
                nodeY += NODE_HEIGHT + NODE_GAP;
            });
        }

        // Load saved positions
        try {
            const saved = localStorage.getItem(POSITIONS_STORAGE_KEY);
            if (saved) {
                const savedPositions = JSON.parse(saved);
                Object.keys(savedPositions).forEach(key => {
                    if (positions[key]) {
                        positions[key] = savedPositions[key];
                    }
                });
            }
        } catch (e) {
            // Ignore
        }

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

        // Company admins
        const companyAdmins = unassigned.filter(u => u.role === 'company_admin');
        companyAdmins.forEach(admin => {
            nodeList.push({
                id: `user-${admin.id}`,
                type: 'user',
                role: admin.role,
                label: admin.name,
                userId: admin.id,
                regionId: 'uprava',
                branchName: 'Uprava',
                data: admin,
                hasPending: pendingChanges.some(c => c.userId === admin.id)
            });
        });

        // Supervisors
        const supervisors = unassigned.filter(u => u.role === 'supervisor');
        supervisors.forEach(sup => {
            nodeList.push({
                id: `user-${sup.id}`,
                type: 'user',
                role: sup.role,
                label: sup.name,
                userId: sup.id,
                regionId: null,
                branchName: 'Supervizor',
                data: sup,
                hasPending: pendingChanges.some(c => c.userId === sup.id)
            });
        });

        // Region users
        regions.forEach(region => {
            const users = (region.users || []).filter(u => u.role !== 'company_admin');
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

    const handleCanvasMouseDown = (e) => {
        if (e.target === containerRef.current || e.target.classList.contains('canvas-bg')) {
            setIsDraggingCanvas(true);
            setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
            setSelectedNode(null);
        }
    };

    const handleCanvasMouseMove = (e) => {
        if (isDraggingCanvas) {
            setOffset({
                x: e.clientX - dragStart.x,
                y: e.clientY - dragStart.y
            });
        }

        if (draggingNodeId) {
            const rect = containerRef.current.getBoundingClientRect();
            const x = (e.clientX - rect.left - offset.x) / scale - dragOffset.x;
            const y = (e.clientY - rect.top - offset.y) / scale - dragOffset.y;

            setNodePositions(prev => ({
                ...prev,
                [draggingNodeId]: { x, y }
            }));

            // Check drop target
            const nodeCenter = { x: x + 88, y: y + 30 };
            let foundTarget = null;

            for (const branch of branchLayout) {
                if (branch.isUprava) continue; // Can't drop into Uprava

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
        setIsDraggingCanvas(false);

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

    const handleNodeMouseDown = (e, node) => {
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        setDragOffset({
            x: (e.clientX - rect.left) / scale,
            y: (e.clientY - rect.top) / scale
        });
        setDraggingNodeId(node.id);
    };

    const handleNodeClick = (e, node) => {
        e.stopPropagation();
        if (!draggingNodeId) {
            setSelectedNode(node);
        }
    };

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

            // Save positions
            localStorage.setItem(POSITIONS_STORAGE_KEY, JSON.stringify(nodePositions));

            toast.success(`Sačuvano ${pendingChanges.length} promena`);
            setPendingChanges([]);
            await loadData();
        } catch (err) {
            console.error('Error saving:', err);
            toast.error('Greška: ' + err.message);
        }
        setSaving(false);
    };

    const handleLoginAs = async (node) => {
        if (!loginAsUser) {
            toast.error('Funkcija nije dostupna');
            return;
        }
        try {
            await loginAsUser(node.userId);
            toast.success(`Prijavljeni kao ${node.label}`);
        } catch (err) {
            toast.error('Greška: ' + err.message);
        }
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

                    <button onClick={loadData} className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400">
                        <RefreshCw size={14} />
                    </button>
                    <button onClick={() => setIsFullscreen(!isFullscreen)} className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400">
                        {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                    </button>
                </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 px-4 py-2 bg-slate-800/50 border-b border-slate-700/50 text-xs flex-shrink-0">
                {Object.entries(ROLES).map(([key, config]) => (
                    <span key={key} className="flex items-center gap-1.5 text-slate-400">
                        <span className={`w-2 h-2 rounded-full ${config.color}`} />
                        {config.label}
                    </span>
                ))}
            </div>

            {/* Canvas */}
            <div
                ref={containerRef}
                className={`flex-1 relative overflow-hidden ${isDraggingCanvas ? 'cursor-grabbing' : draggingNodeId ? 'cursor-grabbing' : 'cursor-grab'}`}
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
                    className="absolute origin-top-left transition-transform duration-75 ease-out"
                    style={{
                        transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                        width: '3000px',
                        height: '2000px'
                    }}
                >
                    {/* SVG Connections */}
                    <svg className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
                        {/* Company to supervisors/branches */}
                        {(() => {
                            const companyPos = nodePositions['company'];
                            if (!companyPos) return null;

                            const lines = [];
                            const companyBottom = { x: companyPos.x + 104, y: companyPos.y + 90 };

                            // Lines to branch tops
                            branchLayout.filter(b => !b.isUprava).forEach(branch => {
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
                        />
                    ))}

                    {/* Company node */}
                    <CompanyNode
                        companyName={companyName}
                        position={nodePositions['company'] || { x: 500, y: 40 }}
                        isSelected={false}
                        onMouseDown={() => { }}
                        onClick={() => { }}
                    />

                    {/* User nodes */}
                    {nodes.map(node => {
                        const pos = nodePositions[node.id] || { x: 0, y: 0 };
                        const nodeWithPos = { ...node, x: pos.x, y: pos.y };

                        return (
                            <NodeCard
                                key={node.id}
                                node={nodeWithPos}
                                isSelected={selectedNode?.id === node.id}
                                isDragging={draggingNodeId === node.id}
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
                        onLoginAs={handleLoginAs}
                    />
                )}
            </div>

            {/* Instructions */}
            <div className="absolute bottom-4 left-4 pointer-events-none z-20">
                <div className="bg-slate-800/90 border border-slate-700 p-3 rounded-xl text-xs text-slate-400 max-w-xs shadow-xl backdrop-blur-sm">
                    <p className="font-bold text-slate-300 mb-1.5">Kako koristiti:</p>
                    <ul className="list-disc pl-4 space-y-1">
                        <li>Prevuci korisnike u druge filijale</li>
                        <li>Klikni na osobu za detalje</li>
                        <li>Scroll za zoom, drag za pomicanje</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default RegionNodeEditor;
