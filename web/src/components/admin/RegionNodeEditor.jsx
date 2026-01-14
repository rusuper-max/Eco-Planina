import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Building2, Users, Truck, User, MapPin, ZoomIn, ZoomOut, Maximize2, Minimize2, RefreshCw, Save, Network, Move, Phone, Mail, X, LogIn, Edit3 } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context';
import toast from 'react-hot-toast';

const NODE_COLORS = {
    company: '#7c3aed',
    region: '#e11d48',
    manager: '#059669',
    driver: '#f59e0b',
    client: '#3b82f6',
    company_admin: '#7c3aed',
    unassigned: '#64748b'
};

const ROLE_LABELS = {
    company_admin: 'Admin',
    manager: 'Menadžer',
    driver: 'Vozač',
    client: 'Klijent'
};

const ROLE_ICONS = {
    company_admin: Users,
    manager: Users,
    driver: Truck,
    client: User
};

export const RegionNodeEditor = ({ fullscreen: initialFullscreen = false }) => {
    const { companyName, loginAsUser } = useAuth();
    const { assignUsersToRegion, fetchUsersGroupedByRegion, fetchCompanyRegions, updateRegion } = useData();
    const containerRef = useRef(null);
    const svgRef = useRef(null);

    const [isFullscreen, setIsFullscreen] = useState(initialFullscreen);
    const [data, setData] = useState({ regions: [], unassigned: [] });
    const [allRegions, setAllRegions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [zoom, setZoom] = useState(0.7);
    const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });

    // Node positions
    const [nodePositions, setNodePositions] = useState({});

    // Cached region bounds - only updates on save/load, not while dragging
    const [cachedRegionBounds, setCachedRegionBounds] = useState({});

    // Dragging
    const [draggingNodes, setDraggingNodes] = useState(null);
    const [dragOffsets, setDragOffsets] = useState({});

    // Selection
    const [selectedNodes, setSelectedNodes] = useState(new Set());
    const [isBoxSelecting, setIsBoxSelecting] = useState(false);
    const [boxSelectStart, setBoxSelectStart] = useState({ x: 0, y: 0 });
    const [boxSelectEnd, setBoxSelectEnd] = useState({ x: 0, y: 0 });

    // Hover tooltip
    const [hoveredNode, setHoveredNode] = useState(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

    // More Info popup
    const [selectedNodeInfo, setSelectedNodeInfo] = useState(null);

    // Region edit popup
    const [editingRegion, setEditingRegion] = useState(null);
    const [editRegionName, setEditRegionName] = useState('');

    // Company info popup
    const [showCompanyInfo, setShowCompanyInfo] = useState(false);

    // Drop target
    const [dropTarget, setDropTarget] = useState(null);

    // Pending changes
    const [pendingChanges, setPendingChanges] = useState([]);

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
            initializePositions(groupedData);
        } catch (err) {
            console.error('Error loading data:', err);
            toast.error('Greška pri učitavanju podataka');
        }
        setLoading(false);
    };

    // Initialize positions
    const initializePositions = useCallback((groupedData) => {
        const positions = {};
        const centerX = 600;
        const startY = 100;

        positions['company'] = { x: centerX, y: startY };

        const regions = groupedData.regions || [];
        const unassigned = groupedData.unassigned || [];

        // Separate company admins from unassigned - they go next to company
        const companyAdmins = unassigned.filter(u => u.role === 'company_admin');
        const realUnassigned = unassigned.filter(u => u.role !== 'company_admin');

        // Position company admins around the company node
        if (companyAdmins.length > 0) {
            positions['uprava'] = { x: centerX + 120, y: startY };
            companyAdmins.forEach((admin, i) => {
                const angle = -Math.PI/4 + (i * Math.PI/6); // Spread around top-right
                positions[`user-${admin.id}`] = {
                    x: centerX + 100 + Math.cos(angle) * 50,
                    y: startY + Math.sin(angle) * 50
                };
            });
        }

        const totalRegions = regions.length + (realUnassigned.length > 0 ? 1 : 0);
        const regionSpacing = 320;
        const regionStartX = centerX - ((totalRegions - 1) * regionSpacing) / 2;
        const regionY = startY + 220;

        regions.forEach((region, i) => {
            const regionX = regionStartX + i * regionSpacing;
            positions[`region-${region.id}`] = { x: regionX, y: regionY };

            const users = region.users || [];
            const managers = users.filter(u => u.role === 'manager');
            const others = users.filter(u => u.role !== 'manager' && u.role !== 'company_admin');

            const managerY = regionY + 70;
            const managerSpacing = 90;
            const managerStartX = regionX - ((managers.length - 1) * managerSpacing) / 2;

            managers.forEach((manager, j) => {
                const mx = managerStartX + j * managerSpacing;
                positions[`user-${manager.id}`] = { x: mx, y: managerY };

                const assignedOthers = others.filter((_, idx) => idx % Math.max(managers.length, 1) === j);
                const otherY = managerY + 80;
                const otherSpacing = 65;
                const otherStartX = mx - ((assignedOthers.length - 1) * otherSpacing) / 2;

                assignedOthers.forEach((other, k) => {
                    positions[`user-${other.id}`] = { x: otherStartX + k * otherSpacing, y: otherY };
                });
            });

            if (managers.length === 0 && others.length > 0) {
                const otherSpacing = 65;
                const otherStartX = regionX - ((others.length - 1) * otherSpacing) / 2;
                others.forEach((other, k) => {
                    positions[`user-${other.id}`] = { x: otherStartX + k * otherSpacing, y: regionY + 70 };
                });
            }
        });

        // Real unassigned (not company admins)
        if (realUnassigned.length > 0) {
            const unassignedX = regionStartX + regions.length * regionSpacing;
            positions['unassigned'] = { x: unassignedX, y: regionY };

            const spacing = 65;
            const startX = unassignedX - ((realUnassigned.length - 1) * spacing) / 2;
            realUnassigned.forEach((user, i) => {
                positions[`user-${user.id}`] = { x: startX + i * spacing, y: regionY + 70 };
            });
        }

        setNodePositions(positions);

        // Calculate and cache initial region bounds
        setTimeout(() => {
            updateCachedBounds(positions, groupedData);
        }, 0);
    }, []);

    // Update cached bounds (only called on load/save)
    const updateCachedBounds = useCallback((positions, groupedData) => {
        const bounds = {};
        const regions = groupedData?.regions || data.regions || [];
        const unassigned = groupedData?.unassigned || data.unassigned || [];

        // Separate company admins
        const companyAdmins = unassigned.filter(u => u.role === 'company_admin');
        const realUnassigned = unassigned.filter(u => u.role !== 'company_admin');

        regions.forEach(region => {
            const childIds = (region.users || []).filter(u => u.role !== 'company_admin').map(u => `user-${u.id}`);
            bounds[`region-${region.id}`] = calculateBounds(childIds, positions);
        });

        if (realUnassigned.length > 0) {
            const childIds = realUnassigned.map(u => `user-${u.id}`);
            bounds['unassigned'] = calculateBounds(childIds, positions);
        }

        // Uprava circle for company admins
        if (companyAdmins.length > 0) {
            const childIds = companyAdmins.map(u => `user-${u.id}`);
            bounds['uprava'] = calculateBounds(childIds, positions);
        }

        setCachedRegionBounds(bounds);
    }, [data]);

    const calculateBounds = (childIds, positions) => {
        const childPositions = childIds.map(id => positions[id]).filter(p => p);
        if (childPositions.length === 0) return { cx: 0, cy: 0, r: 80 };

        const xs = childPositions.map(p => p.x);
        const ys = childPositions.map(p => p.y);
        const minX = Math.min(...xs) - 45;
        const maxX = Math.max(...xs) + 45;
        const minY = Math.min(...ys) - 45;
        const maxY = Math.max(...ys) + 45;

        const cx = (minX + maxX) / 2;
        const cy = (minY + maxY) / 2;
        const r = Math.max((maxX - minX) / 2, (maxY - minY) / 2, 70);

        return { cx, cy, r };
    };

    // Build node and edge data
    const { nodes, edges, regionCircles } = useMemo(() => {
        const nodeList = [];
        const edgeList = [];
        const circles = [];

        nodeList.push({
            id: 'company',
            type: 'company',
            label: companyName || 'Kompanija',
            color: NODE_COLORS.company,
            icon: Building2,
            size: 45
        });

        const regions = data.regions || [];
        const unassigned = data.unassigned || [];

        // Separate company admins - they go to "Uprava" circle
        const companyAdmins = unassigned.filter(u => u.role === 'company_admin');
        const realUnassigned = unassigned.filter(u => u.role !== 'company_admin');

        // Create "Uprava" circle for company admins
        if (companyAdmins.length > 0) {
            circles.push({
                id: 'uprava',
                label: 'Uprava',
                color: NODE_COLORS.company_admin,
                regionId: 'uprava',
                childIds: companyAdmins.map(u => `user-${u.id}`),
                isUprava: true
            });

            companyAdmins.forEach(admin => {
                nodeList.push({
                    id: `user-${admin.id}`,
                    type: 'user',
                    role: admin.role,
                    label: admin.name,
                    color: NODE_COLORS.company_admin,
                    icon: ROLE_ICONS.company_admin,
                    size: 32,
                    regionId: 'uprava',
                    userId: admin.id,
                    data: admin
                });

                // Connect admin to company
                edgeList.push({
                    id: `edge-company-admin-${admin.id}`,
                    from: 'company',
                    to: `user-${admin.id}`,
                    color: NODE_COLORS.company_admin,
                    width: 2,
                    dashed: false
                });
            });
        }

        regions.forEach(region => {
            const users = region.users || [];
            const managers = users.filter(u => u.role === 'manager');
            const others = users.filter(u => u.role !== 'manager' && u.role !== 'company_admin');

            circles.push({
                id: `region-${region.id}`,
                label: region.name,
                color: NODE_COLORS.region,
                regionId: region.id,
                childIds: users.filter(u => u.role !== 'company_admin').map(u => `user-${u.id}`)
            });

            // Connect managers to company (not region to company)
            managers.forEach(manager => {
                edgeList.push({
                    id: `edge-company-manager-${manager.id}`,
                    from: 'company',
                    to: `user-${manager.id}`,
                    color: NODE_COLORS.manager,
                    width: 2,
                    dashed: false
                });
            });

            users.filter(u => u.role !== 'company_admin').forEach(user => {
                nodeList.push({
                    id: `user-${user.id}`,
                    type: 'user',
                    role: user.role,
                    label: user.name,
                    color: NODE_COLORS[user.role] || NODE_COLORS.client,
                    icon: ROLE_ICONS[user.role] || User,
                    size: user.role === 'manager' ? 32 : 26,
                    regionId: region.id,
                    userId: user.id,
                    data: user
                });
            });

            managers.forEach((manager, mIdx) => {
                const assignedOthers = others.filter((_, idx) => idx % Math.max(managers.length, 1) === mIdx);
                assignedOthers.forEach(other => {
                    edgeList.push({
                        id: `edge-${manager.id}-${other.id}`,
                        from: `user-${manager.id}`,
                        to: `user-${other.id}`,
                        color: NODE_COLORS.manager,
                        width: 1.5,
                        dashed: true
                    });
                });
            });
        });

        // Real unassigned (not company admins)
        if (realUnassigned.length > 0) {
            circles.push({
                id: 'unassigned',
                label: 'Nedodeljeni',
                color: NODE_COLORS.unassigned,
                regionId: null,
                childIds: realUnassigned.map(u => `user-${u.id}`)
            });

            realUnassigned.forEach(user => {
                nodeList.push({
                    id: `user-${user.id}`,
                    type: 'user',
                    role: user.role,
                    label: user.name,
                    color: NODE_COLORS[user.role] || NODE_COLORS.client,
                    icon: ROLE_ICONS[user.role] || User,
                    size: 26,
                    regionId: null,
                    userId: user.id,
                    data: user
                });

                if (user.role === 'manager' || user.role === 'company_admin') {
                    edgeList.push({
                        id: `edge-company-unassigned-${user.id}`,
                        from: 'company',
                        to: `user-${user.id}`,
                        color: '#64748b',
                        width: 1.5,
                        dashed: true
                    });
                }
            });
        }

        return { nodes: nodeList, edges: edgeList, regionCircles: circles };
    }, [data, companyName]);

    const getPos = useCallback((nodeId) => {
        return nodePositions[nodeId] || { x: 0, y: 0 };
    }, [nodePositions]);

    // Get region bounds - cached for normal regions, dynamic for "uprava"
    const getRegionBounds = useCallback((circleId) => {
        // Uprava circle follows CA nodes dynamically
        if (circleId === 'uprava') {
            const circle = regionCircles.find(c => c.id === 'uprava');
            if (circle) {
                const childPositions = circle.childIds.map(id => nodePositions[id]).filter(p => p);
                if (childPositions.length > 0) {
                    const xs = childPositions.map(p => p.x);
                    const ys = childPositions.map(p => p.y);
                    // Larger padding for Uprava circle so text looks better
                    const padding = 55;
                    const minX = Math.min(...xs) - padding;
                    const maxX = Math.max(...xs) + padding;
                    const minY = Math.min(...ys) - padding;
                    const maxY = Math.max(...ys) + padding;
                    const cx = (minX + maxX) / 2;
                    const cy = (minY + maxY) / 2;
                    // Minimum radius of 65 to ensure text has space
                    const r = Math.max((maxX - minX) / 2, (maxY - minY) / 2, 65);
                    return { cx, cy, r };
                }
            }
        }
        return cachedRegionBounds[circleId] || { cx: 0, cy: 0, r: 80 };
    }, [cachedRegionBounds, nodePositions, regionCircles]);

    const getSVGPoint = useCallback((clientX, clientY) => {
        if (!svgRef.current) return { x: 0, y: 0 };
        const svg = svgRef.current;
        const pt = svg.createSVGPoint();
        pt.x = clientX;
        pt.y = clientY;
        const ctm = svg.getScreenCTM();
        if (!ctm) return { x: 0, y: 0 };
        const svgP = pt.matrixTransform(ctm.inverse());
        return { x: (svgP.x - panOffset.x) / zoom, y: (svgP.y - panOffset.y) / zoom };
    }, [panOffset, zoom]);

    const getLinkedNodes = useCallback((nodeId) => {
        const linked = new Set([nodeId]);

        const circle = regionCircles.find(c => c.id === nodeId);
        if (circle) {
            circle.childIds.forEach(id => linked.add(id));
            return linked;
        }

        const node = nodes.find(n => n.id === nodeId);
        if (node && (node.role === 'manager' || node.role === 'company_admin')) {
            edges.forEach(edge => {
                if (edge.from === nodeId) linked.add(edge.to);
            });
        }

        return linked;
    }, [nodes, edges, regionCircles]);

    const getRegionAtPoint = useCallback((x, y) => {
        for (const circle of regionCircles) {
            const bounds = getRegionBounds(circle.id);
            const dist = Math.sqrt(Math.pow(x - bounds.cx, 2) + Math.pow(y - bounds.cy, 2));
            if (dist < bounds.r + 30) { // +30 for easier drop
                return circle;
            }
        }
        return null;
    }, [regionCircles, getRegionBounds]);

    // Calculate company statistics
    const companyStats = useMemo(() => {
        const regions = data.regions || [];
        const unassigned = data.unassigned || [];

        let totalUsers = 0;
        const byRole = { company_admin: 0, manager: 0, driver: 0, client: 0 };
        const byRegion = {};

        // Count unassigned
        unassigned.forEach(u => {
            totalUsers++;
            if (byRole[u.role] !== undefined) byRole[u.role]++;
        });

        // Count by region
        regions.forEach(region => {
            const users = region.users || [];
            byRegion[region.name] = users.length;
            users.forEach(u => {
                totalUsers++;
                if (byRole[u.role] !== undefined) byRole[u.role]++;
            });
        });

        return { totalUsers, byRole, byRegion, regionCount: regions.length };
    }, [data]);

    // Handle node click for More Info
    const handleNodeClick = useCallback((e, node) => {
        e.stopPropagation();
        if (node.type === 'user') {
            setSelectedNodeInfo(node);
            setShowCompanyInfo(false);
        } else if (node.type === 'company') {
            setShowCompanyInfo(true);
            setSelectedNodeInfo(null);
        }
    }, []);

    const handleNodeMouseDown = useCallback((e, nodeId) => {
        e.stopPropagation();
        if (e.button === 2) return;

        const svgPoint = getSVGPoint(e.clientX, e.clientY);
        let nodesToDrag;

        if (e.shiftKey && selectedNodes.size > 0) {
            const newSelection = new Set(selectedNodes);
            newSelection.add(nodeId);
            setSelectedNodes(newSelection);
            nodesToDrag = Array.from(newSelection);
        } else if (selectedNodes.has(nodeId) && selectedNodes.size > 1) {
            nodesToDrag = Array.from(selectedNodes);
        } else {
            const linked = getLinkedNodes(nodeId);
            nodesToDrag = Array.from(linked);
            setSelectedNodes(new Set([nodeId]));
        }

        const offsets = {};
        nodesToDrag.forEach(id => {
            const pos = getPos(id);
            offsets[id] = { x: svgPoint.x - pos.x, y: svgPoint.y - pos.y };
        });

        setDraggingNodes(nodesToDrag);
        setDragOffsets(offsets);
    }, [getSVGPoint, selectedNodes, getLinkedNodes, getPos]);

    const handleMouseMove = useCallback((e) => {
        const svgPoint = getSVGPoint(e.clientX, e.clientY);

        if (draggingNodes && draggingNodes.length > 0) {
            const newPositions = { ...nodePositions };
            draggingNodes.forEach(id => {
                const offset = dragOffsets[id] || { x: 0, y: 0 };
                newPositions[id] = {
                    x: svgPoint.x - offset.x,
                    y: svgPoint.y - offset.y
                };
            });
            setNodePositions(newPositions);

            // Check drop target
            const userNode = nodes.find(n => draggingNodes.includes(n.id) && n.type === 'user');
            if (userNode) {
                const userPos = newPositions[userNode.id];
                const region = getRegionAtPoint(userPos.x, userPos.y);
                if (region && region.regionId !== userNode.regionId) {
                    setDropTarget(region);
                } else {
                    setDropTarget(null);
                }
            }
        } else if (isBoxSelecting) {
            setBoxSelectEnd(svgPoint);
        } else if (isPanning) {
            setPanOffset({
                x: e.clientX - panStart.x,
                y: e.clientY - panStart.y
            });
        }

        if (hoveredNode) {
            setTooltipPos({ x: e.clientX, y: e.clientY });
        }
    }, [draggingNodes, dragOffsets, nodePositions, isBoxSelecting, isPanning, panStart, getSVGPoint, nodes, getRegionAtPoint, hoveredNode]);

    const handleMouseUp = useCallback(() => {
        if (draggingNodes && dropTarget) {
            const userNode = nodes.find(n => draggingNodes.includes(n.id) && n.type === 'user');
            if (userNode && dropTarget.regionId !== userNode.regionId) {
                const change = {
                    userId: userNode.userId,
                    userName: userNode.label,
                    fromRegionId: userNode.regionId,
                    toRegionId: dropTarget.regionId,
                    toRegionName: dropTarget.label
                };
                setPendingChanges(prev => [...prev.filter(c => c.userId !== change.userId), change]);
                toast.success(`${userNode.label} → ${dropTarget.label}`);
            }
        }

        if (isBoxSelecting) {
            const minX = Math.min(boxSelectStart.x, boxSelectEnd.x);
            const maxX = Math.max(boxSelectStart.x, boxSelectEnd.x);
            const minY = Math.min(boxSelectStart.y, boxSelectEnd.y);
            const maxY = Math.max(boxSelectStart.y, boxSelectEnd.y);

            const selected = new Set();
            nodes.forEach(node => {
                const pos = getPos(node.id);
                if (pos.x >= minX && pos.x <= maxX && pos.y >= minY && pos.y <= maxY) {
                    selected.add(node.id);
                }
            });
            setSelectedNodes(selected);
        }

        setDraggingNodes(null);
        setDropTarget(null);
        setIsBoxSelecting(false);
        setIsPanning(false);
    }, [draggingNodes, dropTarget, nodes, isBoxSelecting, boxSelectStart, boxSelectEnd, getPos]);

    const handleCanvasMouseDown = useCallback((e) => {
        if (e.target !== svgRef.current && e.target.tagName !== 'rect') return;

        const svgPoint = getSVGPoint(e.clientX, e.clientY);

        if (e.shiftKey) {
            setIsBoxSelecting(true);
            setBoxSelectStart(svgPoint);
            setBoxSelectEnd(svgPoint);
        } else {
            setIsPanning(true);
            setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
            setSelectedNodes(new Set());
            setSelectedNodeInfo(null);
            setShowCompanyInfo(false);
        }
    }, [getSVGPoint, panOffset]);

    const handleWheel = useCallback((e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.05 : 0.05;
        setZoom(z => Math.max(0.3, Math.min(2, z + delta)));
    }, []);

    // Save changes - uses assignUsersToRegion (batch)
    const saveChanges = async () => {
        if (pendingChanges.length === 0) return;
        setSaving(true);
        try {
            // Group changes by target region for batch update
            const changesByRegion = {};
            pendingChanges.forEach(change => {
                const key = change.toRegionId || 'null';
                if (!changesByRegion[key]) changesByRegion[key] = [];
                changesByRegion[key].push(change.userId);
            });

            // Execute batch updates
            for (const [regionId, userIds] of Object.entries(changesByRegion)) {
                await assignUsersToRegion(userIds, regionId === 'null' ? null : regionId);
            }

            toast.success(`Sačuvano ${pendingChanges.length} promena`);
            setPendingChanges([]);
            await loadData();
        } catch (err) {
            console.error('Error saving:', err);
            toast.error('Greška pri čuvanju: ' + err.message);
        }
        setSaving(false);
    };

    // Login as user
    const handleLoginAs = async (user) => {
        if (!loginAsUser) {
            toast.error('Funkcija nije dostupna');
            return;
        }
        try {
            await loginAsUser(user.userId);
            toast.success(`Prijavljeni kao ${user.label}`);
        } catch (err) {
            toast.error('Greška: ' + err.message);
        }
    };

    const resetView = () => {
        setZoom(0.7);
        setPanOffset({ x: 0, y: 0 });
        initializePositions(data);
    };

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
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-800 border-b border-slate-700 flex-shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-purple-600 rounded-xl flex items-center justify-center">
                        <Network size={20} className="text-white" />
                    </div>
                    <div>
                        <h2 className="font-bold text-white text-sm">Vizuelni Editor</h2>
                        <p className="text-xs text-slate-400">Klik za info • Shift+drag selekcija</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {pendingChanges.length > 0 && (
                        <div className="flex items-center gap-2 mr-2">
                            <span className="px-2 py-1 bg-amber-500/20 text-amber-400 rounded text-xs">
                                {pendingChanges.length} promena
                            </span>
                            <button onClick={saveChanges} disabled={saving}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs flex items-center gap-1.5">
                                {saving ? <RefreshCw size={12} className="animate-spin" /> : <Save size={12} />}
                                Sačuvaj
                            </button>
                            <button onClick={() => { setPendingChanges([]); loadData(); }}
                                className="px-2 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-xs">
                                Odbaci
                            </button>
                        </div>
                    )}

                    <div className="flex items-center bg-slate-700 rounded-lg">
                        <button onClick={() => setZoom(z => Math.min(2, z + 0.1))} className="p-1.5 hover:bg-slate-600 rounded-l-lg text-slate-300">
                            <ZoomIn size={14} />
                        </button>
                        <button onClick={resetView} className="text-xs text-slate-400 w-10 text-center hover:bg-slate-600 py-1">
                            {Math.round(zoom * 100)}%
                        </button>
                        <button onClick={() => setZoom(z => Math.max(0.3, z - 0.1))} className="p-1.5 hover:bg-slate-600 rounded-r-lg text-slate-300">
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
            <div className="flex items-center gap-3 px-4 py-1 bg-slate-800/50 border-b border-slate-700/50 text-xs flex-shrink-0">
                {Object.entries({ region: 'Filijala', manager: 'Menadžer', driver: 'Vozač', client: 'Klijent' }).map(([k, v]) => (
                    <span key={k} className="flex items-center gap-1 text-slate-400">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: NODE_COLORS[k] }} />
                        {v}
                    </span>
                ))}
            </div>

            {/* Canvas */}
            <div
                ref={containerRef}
                className={`flex-1 relative ${isPanning ? 'cursor-grabbing' : draggingNodes ? 'cursor-grabbing' : 'cursor-grab'}`}
                style={{ background: 'radial-gradient(circle at center, #1e293b 0%, #0f172a 100%)' }}
                onWheel={handleWheel}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                <svg
                    ref={svgRef}
                    width="100%"
                    height="100%"
                    viewBox="0 0 1200 800"
                    preserveAspectRatio="xMidYMid slice"
                    style={{ overflow: 'visible' }}
                >
                    <g transform={`translate(${panOffset.x}, ${panOffset.y}) scale(${zoom})`}>
                        {/* Region circles */}
                        {regionCircles.map(circle => {
                            const bounds = getRegionBounds(circle.id);
                            const isDropping = dropTarget?.id === circle.id;
                            const canEdit = circle.regionId && circle.regionId !== 'uprava' && circle.id !== 'unassigned';

                            return (
                                <g key={circle.id} className="cursor-move"
                                   onMouseDown={(e) => handleNodeMouseDown(e, circle.id)}>
                                    <circle
                                        cx={bounds.cx}
                                        cy={bounds.cy}
                                        r={bounds.r}
                                        fill={isDropping ? `${circle.color}20` : `${circle.color}08`}
                                        stroke={circle.color}
                                        strokeWidth={isDropping ? 3 : 2}
                                        strokeDasharray={circle.isUprava ? "5,3" : "10,5"}
                                    />
                                    <text
                                        x={bounds.cx}
                                        y={bounds.cy - bounds.r + 16}
                                        textAnchor="middle"
                                        fontSize={11}
                                        fill={circle.color}
                                        fontWeight="600"
                                    >
                                        {circle.label}
                                    </text>
                                    {/* Edit button for regions */}
                                    {canEdit && (
                                        <g
                                            className="cursor-pointer"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const region = allRegions.find(r => r.id === circle.regionId);
                                                if (region) {
                                                    setEditingRegion(region);
                                                    setEditRegionName(region.name);
                                                }
                                            }}
                                            onMouseDown={(e) => e.stopPropagation()}
                                        >
                                            <circle
                                                cx={bounds.cx + bounds.r - 10}
                                                cy={bounds.cy - bounds.r + 10}
                                                r={12}
                                                fill="#1e293b"
                                                stroke={circle.color}
                                                strokeWidth={1.5}
                                                className="hover:fill-slate-700 transition-colors"
                                            />
                                            <foreignObject
                                                x={bounds.cx + bounds.r - 18}
                                                y={bounds.cy - bounds.r + 2}
                                                width={16}
                                                height={16}
                                                style={{ pointerEvents: 'none' }}
                                            >
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <Edit3 size={10} color={circle.color} />
                                                </div>
                                            </foreignObject>
                                        </g>
                                    )}
                                </g>
                            );
                        })}

                        {/* Edges */}
                        {edges.map(edge => {
                            const from = getPos(edge.from);
                            let to;
                            if (edge.toRegion) {
                                // Connect to region circle center (top of circle)
                                const bounds = getRegionBounds(edge.to);
                                to = { x: bounds.cx, y: bounds.cy - bounds.r };
                            } else {
                                to = getPos(edge.to);
                            }
                            return (
                                <line
                                    key={edge.id}
                                    x1={from.x} y1={from.y}
                                    x2={to.x} y2={to.y}
                                    stroke={edge.color}
                                    strokeWidth={edge.width}
                                    strokeDasharray={edge.dashed ? '5,3' : 'none'}
                                    opacity={0.35}
                                />
                            );
                        })}

                        {/* Nodes */}
                        {nodes.map(node => {
                            const pos = getPos(node.id);
                            const Icon = node.icon;
                            const isSelected = selectedNodes.has(node.id);
                            const isDragging = draggingNodes?.includes(node.id);
                            const hasPending = pendingChanges.some(c => c.userId === node.userId);

                            return (
                                <g
                                    key={node.id}
                                    className="cursor-pointer"
                                    onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                                    onClick={(e) => handleNodeClick(e, node)}
                                    onMouseEnter={(e) => { setHoveredNode(node); setTooltipPos({ x: e.clientX, y: e.clientY }); }}
                                    onMouseLeave={() => setHoveredNode(null)}
                                    style={{ filter: isDragging ? 'drop-shadow(0 6px 12px rgba(0,0,0,0.5))' : 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}
                                >
                                    {isSelected && (
                                        <circle cx={pos.x} cy={pos.y} r={node.size + 4} fill="none" stroke="#3b82f6" strokeWidth={2} />
                                    )}

                                    <circle
                                        cx={pos.x} cy={pos.y}
                                        r={node.size}
                                        fill={node.color}
                                        stroke={hasPending ? '#f59e0b' : 'rgba(255,255,255,0.15)'}
                                        strokeWidth={hasPending ? 2.5 : 1.5}
                                    />

                                    <foreignObject x={pos.x - node.size/2} y={pos.y - node.size/2} width={node.size} height={node.size} style={{ pointerEvents: 'none' }}>
                                        <div className="w-full h-full flex items-center justify-center">
                                            <Icon size={node.size * 0.5} color="white" />
                                        </div>
                                    </foreignObject>

                                    <text x={pos.x} y={pos.y + node.size + 10} textAnchor="middle" fontSize={9} fill="#94a3b8" style={{ pointerEvents: 'none' }}>
                                        {node.label?.length > 12 ? node.label.substring(0, 10) + '..' : node.label}
                                    </text>
                                </g>
                            );
                        })}

                        {/* Box selection */}
                        {isBoxSelecting && (
                            <rect
                                x={Math.min(boxSelectStart.x, boxSelectEnd.x)}
                                y={Math.min(boxSelectStart.y, boxSelectEnd.y)}
                                width={Math.abs(boxSelectEnd.x - boxSelectStart.x)}
                                height={Math.abs(boxSelectEnd.y - boxSelectStart.y)}
                                fill="rgba(59, 130, 246, 0.1)"
                                stroke="#3b82f6"
                                strokeWidth={1}
                                strokeDasharray="4,4"
                            />
                        )}
                    </g>
                </svg>

                {/* Hover Tooltip */}
                {hoveredNode && hoveredNode.type === 'user' && !draggingNodes && !selectedNodeInfo && (
                    <div
                        className="fixed z-50 bg-slate-800 border border-slate-600 rounded-lg shadow-xl px-3 py-2 pointer-events-none"
                        style={{ left: tooltipPos.x + 12, top: tooltipPos.y + 12 }}
                    >
                        <p className="text-white font-medium text-sm">{hoveredNode.label}</p>
                        <p className="text-slate-400 text-xs">{ROLE_LABELS[hoveredNode.role]}</p>
                    </div>
                )}

                {/* Company Info Popup */}
                {showCompanyInfo && (
                    <div className="absolute top-4 right-4 w-80 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl overflow-hidden z-50">
                        <div className="flex items-center justify-between px-4 py-3 bg-purple-600/20 border-b border-slate-600">
                            <span className="text-white font-semibold text-sm">Detalji firme</span>
                            <button onClick={() => setShowCompanyInfo(false)} className="p-1 hover:bg-slate-600 rounded text-slate-400">
                                <X size={16} />
                            </button>
                        </div>

                        <div className="p-4">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-purple-600">
                                    <Building2 size={24} color="white" />
                                </div>
                                <div>
                                    <p className="text-white font-bold">{companyName || 'Kompanija'}</p>
                                    <p className="text-slate-400 text-sm">{companyStats.totalUsers} korisnika</p>
                                </div>
                            </div>

                            {/* Stats by role */}
                            <div className="mb-4">
                                <p className="text-xs text-slate-500 mb-2 font-medium">Po ulogama</p>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="flex items-center gap-2 px-2 py-1.5 bg-slate-700/50 rounded-lg">
                                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: NODE_COLORS.company_admin }} />
                                        <span className="text-slate-300 text-xs">Admini</span>
                                        <span className="text-white font-bold text-xs ml-auto">{companyStats.byRole.company_admin}</span>
                                    </div>
                                    <div className="flex items-center gap-2 px-2 py-1.5 bg-slate-700/50 rounded-lg">
                                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: NODE_COLORS.manager }} />
                                        <span className="text-slate-300 text-xs">Menadžeri</span>
                                        <span className="text-white font-bold text-xs ml-auto">{companyStats.byRole.manager}</span>
                                    </div>
                                    <div className="flex items-center gap-2 px-2 py-1.5 bg-slate-700/50 rounded-lg">
                                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: NODE_COLORS.driver }} />
                                        <span className="text-slate-300 text-xs">Vozači</span>
                                        <span className="text-white font-bold text-xs ml-auto">{companyStats.byRole.driver}</span>
                                    </div>
                                    <div className="flex items-center gap-2 px-2 py-1.5 bg-slate-700/50 rounded-lg">
                                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: NODE_COLORS.client }} />
                                        <span className="text-slate-300 text-xs">Klijenti</span>
                                        <span className="text-white font-bold text-xs ml-auto">{companyStats.byRole.client}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Stats by region */}
                            <div>
                                <p className="text-xs text-slate-500 mb-2 font-medium">Po filijalama ({companyStats.regionCount})</p>
                                <div className="space-y-1 max-h-32 overflow-y-auto">
                                    {Object.entries(companyStats.byRegion).map(([name, count]) => (
                                        <div key={name} className="flex items-center justify-between px-2 py-1 bg-slate-700/30 rounded">
                                            <span className="text-slate-300 text-xs">{name}</span>
                                            <span className="text-white font-medium text-xs">{count}</span>
                                        </div>
                                    ))}
                                    {Object.keys(companyStats.byRegion).length === 0 && (
                                        <p className="text-slate-500 text-xs italic">Nema filijala</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* More Info Popup */}
                {selectedNodeInfo && (
                    <div className="absolute top-4 right-4 w-72 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl overflow-hidden z-50">
                        <div className="flex items-center justify-between px-4 py-3 bg-slate-700/50 border-b border-slate-600">
                            <span className="text-white font-semibold text-sm">Detalji korisnika</span>
                            <button onClick={() => setSelectedNodeInfo(null)} className="p-1 hover:bg-slate-600 rounded text-slate-400">
                                <X size={16} />
                            </button>
                        </div>

                        <div className="p-4">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: selectedNodeInfo.color }}>
                                    <selectedNodeInfo.icon size={24} color="white" />
                                </div>
                                <div>
                                    <p className="text-white font-bold">{selectedNodeInfo.label}</p>
                                    <p className="text-slate-400 text-sm">{ROLE_LABELS[selectedNodeInfo.role]}</p>
                                </div>
                            </div>

                            <div className="space-y-2 text-sm">
                                {selectedNodeInfo.data?.phone && (
                                    <div className="flex items-center gap-2 text-slate-300">
                                        <Phone size={14} className="text-slate-500" />
                                        {selectedNodeInfo.data.phone}
                                    </div>
                                )}
                                {selectedNodeInfo.data?.email && (
                                    <div className="flex items-center gap-2 text-slate-300">
                                        <Mail size={14} className="text-slate-500" />
                                        {selectedNodeInfo.data.email}
                                    </div>
                                )}
                                {selectedNodeInfo.data?.address && (
                                    <div className="flex items-center gap-2 text-slate-300">
                                        <MapPin size={14} className="text-slate-500" />
                                        <span className="truncate">{selectedNodeInfo.data.address}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-2 text-slate-300">
                                    <Building2 size={14} className="text-slate-500" />
                                    {selectedNodeInfo.role === 'company_admin'
                                        ? 'Uprava'
                                        : selectedNodeInfo.regionId
                                            ? allRegions.find(r => r.id === selectedNodeInfo.regionId)?.name || 'Nepoznata'
                                            : 'Nije dodeljen'}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="mt-4 pt-4 border-t border-slate-700 space-y-2">
                                {/* Login As - only for drivers and managers */}
                                {(selectedNodeInfo.role === 'driver' || selectedNodeInfo.role === 'manager') && loginAsUser && (
                                    <button
                                        onClick={() => handleLoginAs(selectedNodeInfo)}
                                        className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                                    >
                                        <LogIn size={14} />
                                        Uloguj se kao {selectedNodeInfo.label.split(' ')[0]}
                                    </button>
                                )}

                                {/* Quick region change - not for company admins */}
                                {selectedNodeInfo.role !== 'company_admin' && (
                                    <>
                                        <div className="text-xs text-slate-500 mt-2">Prebaci u:</div>
                                        <div className="flex flex-wrap gap-1">
                                            {allRegions.filter(r => r.id !== selectedNodeInfo.regionId).slice(0, 4).map(region => (
                                                <button
                                                    key={region.id}
                                                    onClick={() => {
                                                        setPendingChanges(prev => [
                                                            ...prev.filter(c => c.userId !== selectedNodeInfo.userId),
                                                            {
                                                                userId: selectedNodeInfo.userId,
                                                                userName: selectedNodeInfo.label,
                                                                fromRegionId: selectedNodeInfo.regionId,
                                                                toRegionId: region.id,
                                                                toRegionName: region.name
                                                            }
                                                        ]);
                                                        toast.success(`${selectedNodeInfo.label} → ${region.name}`);
                                                        setSelectedNodeInfo(null);
                                                    }}
                                                    className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-xs"
                                                >
                                                    {region.name}
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                                {selectedNodeInfo.role === 'company_admin' && (
                                    <p className="text-xs text-slate-500 italic">Admin firme ne može biti premešten</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Region Edit Popup */}
                {editingRegion && (
                    <div className="absolute top-4 left-4 w-72 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl overflow-hidden z-50">
                        <div className="flex items-center justify-between px-4 py-3 bg-rose-600/20 border-b border-slate-600">
                            <span className="text-white font-semibold text-sm">Izmeni filijalu</span>
                            <button onClick={() => setEditingRegion(null)} className="p-1 hover:bg-slate-600 rounded text-slate-400">
                                <X size={16} />
                            </button>
                        </div>

                        <div className="p-4">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-rose-600">
                                    <MapPin size={20} color="white" />
                                </div>
                                <div>
                                    <p className="text-white font-bold">{editingRegion.name}</p>
                                    <p className="text-slate-400 text-xs">ID: {editingRegion.id}</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs text-slate-400 block mb-1">Naziv filijale</label>
                                    <input
                                        type="text"
                                        value={editRegionName}
                                        onChange={(e) => setEditRegionName(e.target.value)}
                                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-rose-500"
                                        placeholder="Unesite naziv..."
                                    />
                                </div>

                                <div className="flex gap-2 pt-2">
                                    <button
                                        onClick={() => setEditingRegion(null)}
                                        className="flex-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm"
                                    >
                                        Otkaži
                                    </button>
                                    <button
                                        onClick={async () => {
                                            if (!editRegionName.trim()) {
                                                toast.error('Naziv ne može biti prazan');
                                                return;
                                            }
                                            try {
                                                await updateRegion(editingRegion.id, editRegionName.trim());
                                                toast.success('Filijala ažurirana');
                                                setEditingRegion(null);
                                                await loadData();
                                            } catch (err) {
                                                toast.error('Greška: ' + err.message);
                                            }
                                        }}
                                        disabled={!editRegionName.trim() || editRegionName === editingRegion.name}
                                        className="flex-1 px-3 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium"
                                    >
                                        Sačuvaj
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Instructions */}
                {!draggingNodes && !selectedNodeInfo && !editingRegion && nodes.length > 1 && (
                    <div className="absolute bottom-3 left-3 bg-slate-800/90 backdrop-blur rounded-lg px-3 py-1.5 text-xs text-slate-400">
                        <Move size={11} className="inline mr-1 text-emerald-400" />
                        Drag za pomeranje • Klik za info
                    </div>
                )}
            </div>

            {/* Pending changes footer */}
            {pendingChanges.length > 0 && (
                <div className="px-4 py-2 bg-amber-500/10 border-t border-amber-500/30 flex items-center gap-2 text-xs flex-shrink-0">
                    <span className="text-amber-400 font-medium">{pendingChanges.length} promene:</span>
                    {pendingChanges.slice(0, 3).map((c, i) => (
                        <span key={i} className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded">
                            {c.userName} → {c.toRegionName}
                        </span>
                    ))}
                    {pendingChanges.length > 3 && <span className="text-amber-400/60">+{pendingChanges.length - 3}</span>}
                </div>
            )}
        </div>
    );
};

export default RegionNodeEditor;
