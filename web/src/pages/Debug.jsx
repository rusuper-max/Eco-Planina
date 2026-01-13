import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';

export default function Debug() {
    const [logs, setLogs] = useState([]);
    const [supabaseStatus, setSupabaseStatus] = useState('checking...');
    const [storageInfo, setStorageInfo] = useState({});
    const [sessionInfo, setSessionInfo] = useState(null);
    const [loading, setLoading] = useState(false);

    const addLog = (message, type = 'info') => {
        const timestamp = new Date().toLocaleTimeString('sr-RS', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            fractionalSecondDigits: 3
        });
        setLogs(prev => [...prev, { timestamp, message, type }]);
    };

    // Check localStorage
    const checkStorage = () => {
        const storage = {};
        const supabaseKeys = [];

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key) {
                const value = localStorage.getItem(key);
                const size = new Blob([value || '']).size;
                storage[key] = {
                    size: `${(size / 1024).toFixed(2)} KB`,
                    preview: value?.substring(0, 100) + (value?.length > 100 ? '...' : '')
                };
                if (key.startsWith('sb-') || key.includes('supabase')) {
                    supabaseKeys.push(key);
                }
            }
        }

        setStorageInfo({
            totalKeys: localStorage.length,
            supabaseKeys,
            items: storage
        });

        addLog(`localStorage: ${localStorage.length} keys, ${supabaseKeys.length} Supabase keys`);
    };

    // Test Supabase connection
    const testSupabase = async () => {
        setLoading(true);
        addLog('Testing Supabase connection...');

        const startTime = performance.now();

        try {
            // Test 1: Basic fetch
            addLog('Test 1: Fetching from companies table...');
            const { data, error } = await supabase
                .from('companies')
                .select('count')
                .limit(1);

            const fetchTime = (performance.now() - startTime).toFixed(0);

            if (error) {
                addLog(`Test 1 FAILED: ${error.message}`, 'error');
            } else {
                addLog(`Test 1 OK: ${fetchTime}ms`, 'success');
            }

            // Test 2: Auth getSession
            addLog('Test 2: Getting auth session...');
            const sessionStart = performance.now();

            const sessionPromise = supabase.auth.getSession();
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Timeout after 5s')), 5000)
            );

            try {
                const { data: sessionData, error: sessionError } = await Promise.race([
                    sessionPromise,
                    timeoutPromise
                ]);

                const sessionTime = (performance.now() - sessionStart).toFixed(0);

                if (sessionError) {
                    addLog(`Test 2 FAILED: ${sessionError.message}`, 'error');
                } else {
                    addLog(`Test 2 OK: ${sessionTime}ms, session: ${sessionData?.session ? 'YES' : 'NO'}`, 'success');
                    setSessionInfo(sessionData?.session ? {
                        user: sessionData.session.user?.email,
                        expires: new Date(sessionData.session.expires_at * 1000).toLocaleString()
                    } : null);
                }
            } catch (e) {
                addLog(`Test 2 TIMEOUT: getSession took >5s - THIS IS THE PROBLEM!`, 'error');
                setSupabaseStatus('SESSION TIMEOUT - Storage corrupted');
            }

            setSupabaseStatus('Connected');

        } catch (err) {
            addLog(`Supabase error: ${err.message}`, 'error');
            setSupabaseStatus('Error: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    // Clear all Supabase storage
    const clearSupabaseStorage = async () => {
        addLog('Clearing Supabase storage...', 'warning');

        // Clear localStorage
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
            addLog(`Removed: ${key}`, 'warning');
        });

        // Clear IndexedDB
        try {
            await new Promise((resolve, reject) => {
                const req = indexedDB.deleteDatabase('supabase-auth-token');
                req.onsuccess = () => {
                    addLog('IndexedDB cleared', 'success');
                    resolve();
                };
                req.onerror = () => {
                    addLog('IndexedDB clear failed', 'error');
                    reject();
                };
                req.onblocked = () => {
                    addLog('IndexedDB blocked - close other tabs', 'warning');
                    resolve();
                };
            });
        } catch (e) {
            addLog(`IndexedDB error: ${e.message}`, 'error');
        }

        // Also clear sessionStorage
        sessionStorage.clear();
        addLog('sessionStorage cleared', 'success');

        addLog('Storage cleared! Refresh the page.', 'success');
        checkStorage();
    };

    // Check IndexedDB
    const checkIndexedDB = async () => {
        addLog('Checking IndexedDB...');

        try {
            const databases = await indexedDB.databases();
            addLog(`IndexedDB databases: ${databases.map(d => d.name).join(', ') || 'none'}`);

            // Check if supabase DB exists
            const hasSupabaseDB = databases.some(d => d.name?.includes('supabase'));
            if (hasSupabaseDB) {
                addLog('Supabase IndexedDB found - may be corrupted', 'warning');
            }
        } catch (e) {
            addLog(`IndexedDB check failed: ${e.message}`, 'error');
        }
    };

    // Run initial checks
    useEffect(() => {
        addLog('Debug page loaded');
        addLog(`User Agent: ${navigator.userAgent.includes('Chrome') ? 'Chrome' : navigator.userAgent.includes('Safari') ? 'Safari' : 'Other'}`);
        checkStorage();
        checkIndexedDB();
    }, []);

    return (
        <div className="min-h-screen bg-slate-100 p-4">
            <div className="max-w-4xl mx-auto space-y-4">
                <div className="bg-white rounded-xl p-6 shadow">
                    <h1 className="text-2xl font-bold mb-4">🔧 EcoMountain Debug</h1>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="p-4 bg-slate-50 rounded-lg">
                            <p className="text-sm text-slate-500">Browser</p>
                            <p className="font-mono">
                                {navigator.userAgent.includes('Chrome') ? '🟡 Chrome' :
                                 navigator.userAgent.includes('Safari') ? '🟢 Safari' :
                                 '⚪ Other'}
                            </p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-lg">
                            <p className="text-sm text-slate-500">Supabase Status</p>
                            <p className={`font-mono ${supabaseStatus.includes('TIMEOUT') ? 'text-red-600' : ''}`}>
                                {supabaseStatus}
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-2 flex-wrap mb-6">
                        <button
                            onClick={testSupabase}
                            disabled={loading}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                            {loading ? '⏳ Testing...' : '🧪 Test Supabase'}
                        </button>
                        <button
                            onClick={clearSupabaseStorage}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                        >
                            🗑️ Clear Storage
                        </button>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700"
                        >
                            🔄 Reload
                        </button>
                        <button
                            onClick={() => window.location.href = '/'}
                            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                        >
                            🏠 Go Home
                        </button>
                    </div>

                    {/* Session Info */}
                    {sessionInfo && (
                        <div className="mb-6 p-4 bg-emerald-50 rounded-lg">
                            <p className="text-sm font-medium text-emerald-800">Active Session</p>
                            <p className="text-sm text-emerald-600">User: {sessionInfo.user}</p>
                            <p className="text-sm text-emerald-600">Expires: {sessionInfo.expires}</p>
                        </div>
                    )}

                    {/* Storage Info */}
                    <div className="mb-6">
                        <h2 className="font-bold mb-2">📦 LocalStorage ({storageInfo.totalKeys || 0} keys)</h2>
                        {storageInfo.supabaseKeys?.length > 0 && (
                            <div className="mb-2 p-2 bg-amber-50 rounded text-sm">
                                <strong>Supabase keys:</strong> {storageInfo.supabaseKeys.join(', ')}
                            </div>
                        )}
                        <div className="max-h-40 overflow-auto bg-slate-50 rounded p-2 text-xs font-mono">
                            {Object.entries(storageInfo.items || {}).map(([key, val]) => (
                                <div key={key} className="mb-1">
                                    <span className={key.includes('supabase') || key.startsWith('sb-') ? 'text-amber-600' : 'text-slate-600'}>
                                        {key}
                                    </span>
                                    <span className="text-slate-400"> ({val.size})</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Logs */}
                    <div>
                        <h2 className="font-bold mb-2">📋 Logs</h2>
                        <div className="bg-slate-900 text-slate-100 rounded-lg p-4 max-h-96 overflow-auto font-mono text-sm">
                            {logs.map((log, i) => (
                                <div
                                    key={i}
                                    className={`${
                                        log.type === 'error' ? 'text-red-400' :
                                        log.type === 'success' ? 'text-emerald-400' :
                                        log.type === 'warning' ? 'text-amber-400' :
                                        'text-slate-300'
                                    }`}
                                >
                                    <span className="text-slate-500">[{log.timestamp}]</span> {log.message}
                                </div>
                            ))}
                            {logs.length === 0 && (
                                <p className="text-slate-500">No logs yet...</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Instructions */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
                    <h2 className="font-bold text-amber-800 mb-2">⚠️ Chrome Problem?</h2>
                    <ol className="list-decimal list-inside space-y-2 text-amber-700">
                        <li>Click <strong>"Test Supabase"</strong> and check if it times out</li>
                        <li>If Test 2 shows TIMEOUT, click <strong>"Clear Storage"</strong></li>
                        <li>Click <strong>"Reload"</strong> to refresh the page</li>
                        <li>Click <strong>"Go Home"</strong> and try logging in again</li>
                    </ol>
                </div>
            </div>
        </div>
    );
}
