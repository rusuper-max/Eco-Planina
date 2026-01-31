import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { MessageCircle, Plus, X, Users, ChevronRight, ArrowLeft, AlertCircle, Send, Trash2 } from 'lucide-react';
import { RecycleLoader } from '../common';

/**
 * Chat Interface - Real-time messaging between users
 */
export const ChatInterface = ({
    user,
    fetchMessages,
    sendMessage,
    markMessagesAsRead,
    getConversations,
    fetchCompanyClients,
    fetchCompanyMembers,
    sendMessageToAdmins,
    fetchCompanyAdmin,
    sendMessageToCompanyAdmin,
    userRole,
    subscribeToMessages,
    deleteConversation
}) => {
    const [conversations, setConversations] = useState([]);
    const [selectedChat, setSelectedChat] = useState(null);
    const [chatMessages, setChatMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [contacts, setContacts] = useState([]);
    const [showNewChat, setShowNewChat] = useState(false);
    const [showAdminContact, setShowAdminContact] = useState(false);
    const [adminMessage, setAdminMessage] = useState('');
    const [sendingToAdmin, setSendingToAdmin] = useState(false);
    const [companyAdmin, setCompanyAdmin] = useState(null);
    const [showCompanyAdminContact, setShowCompanyAdminContact] = useState(false);
    const [companyAdminMessage, setCompanyAdminMessage] = useState('');
    const [sendingToCompanyAdmin, setSendingToCompanyAdmin] = useState(false);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        loadConversations();
        loadContacts();
        // Load company admin for managers
        if (userRole === 'manager' && fetchCompanyAdmin) {
            fetchCompanyAdmin().then(admin => setCompanyAdmin(admin));
        }
    }, []);

    useEffect(() => {
        if (selectedChat) {
            const openChat = async () => {
                await loadMessages(selectedChat.partnerId);
                await markMessagesAsRead(selectedChat.partnerId);
                setConversations(prev => prev.map(c =>
                    c.partnerId === selectedChat.partnerId ? { ...c, unread: 0 } : c
                ));
                await loadConversations();
            };
            openChat();
        }
    }, [selectedChat]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    useEffect(() => {
        if (!subscribeToMessages) return;
        const unsubscribe = subscribeToMessages(async (newMsg, type) => {
            if (selectedChat) {
                const isFromPartner = newMsg.sender_id === selectedChat.partnerId;
                const isToPartner = newMsg.receiver_id === selectedChat.partnerId;
                if (isFromPartner || isToPartner) {
                    setChatMessages(prev => {
                        if (prev.some(m => m.id === newMsg.id)) return prev;
                        return [...prev, newMsg];
                    });
                    if (type === 'received' && isFromPartner) {
                        await markMessagesAsRead(selectedChat.partnerId);
                        setConversations(prev => prev.map(c =>
                            c.partnerId === selectedChat.partnerId ? { ...c, unread: 0 } : c
                        ));
                    }
                }
            }
            await loadConversations();
        });
        return unsubscribe;
    }, [subscribeToMessages, selectedChat]);

    const loadConversations = async () => {
        setLoading(true);
        const convs = await getConversations();
        setConversations(convs);
        setLoading(false);
    };

    const loadContacts = async () => {
        const members = await fetchCompanyMembers();
        if (userRole === 'client') {
            // Clients see managers
            setContacts((members || []).filter(m => m.role === 'manager'));
        } else if (userRole === 'company_admin') {
            // Company admin sees managers and drivers
            setContacts((members || []).filter(m => m.role === 'manager' || m.role === 'driver'));
        } else {
            // Managers see clients
            setContacts((members || []).filter(m => m.role === 'client'));
        }
    };

    const loadMessages = async (partnerId) => {
        const msgs = await fetchMessages(partnerId);
        setChatMessages(msgs);
    };

    const handleSend = async () => {
        if (!newMessage.trim() || !selectedChat) return;
        const messageContent = newMessage.trim();
        setSending(true);
        setNewMessage('');
        try {
            // Don't add message locally - let realtime subscription handle it
            // This prevents duplicate messages
            await sendMessage(selectedChat.partnerId, messageContent);
            await loadConversations();
        } catch (error) {
            console.error('Error sending message:', error);
            toast.error('Greška pri slanju poruke');
        }
        setSending(false);
    };

    const startNewChat = (contact) => {
        setSelectedChat({
            partnerId: contact.id,
            partner: { name: contact.name, role: contact.role, phone: contact.phone }
        });
        setShowNewChat(false);
    };

    const handleSendToAdmin = async () => {
        if (!adminMessage.trim()) return;
        setSendingToAdmin(true);
        try {
            await sendMessageToAdmins(adminMessage);
            toast.success('Poruka je uspešno poslata administratorima!');
            setAdminMessage('');
            setShowAdminContact(false);
        } catch (error) {
            toast.error('Greška pri slanju: ' + error.message);
        }
        setSendingToAdmin(false);
    };

    const handleSendToCompanyAdmin = async () => {
        if (!companyAdminMessage.trim()) return;
        setSendingToCompanyAdmin(true);
        try {
            await sendMessageToCompanyAdmin(companyAdminMessage);
            toast.success('Poruka je uspešno poslata adminu firme!');
            setCompanyAdminMessage('');
            setShowCompanyAdminContact(false);
            // Refresh conversations to show the new chat
            await loadConversations();
        } catch (error) {
            toast.error('Greška pri slanju: ' + error.message);
        }
        setSendingToCompanyAdmin(false);
    };

    const startChatWithCompanyAdmin = () => {
        if (companyAdmin) {
            setSelectedChat({
                partnerId: companyAdmin.id,
                partner: { name: companyAdmin.name, role: 'company_admin', phone: companyAdmin.phone }
            });
        }
    };

    const formatTime = (dateStr) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
        if (diffDays === 0) return date.toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' });
        if (diffDays === 1) return 'Juče';
        if (diffDays < 7) return date.toLocaleDateString('sr-RS', { weekday: 'short' });
        return date.toLocaleDateString('sr-RS', { day: 'numeric', month: 'short' });
    };

    return (
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden" style={{ height: 'calc(100vh - 200px)', minHeight: '500px' }}>
            <div className="flex h-full">
                {/* Conversations List */}
                <div className={`w-full md:w-96 border-r flex flex-col bg-slate-50 ${selectedChat ? 'hidden md:flex' : 'flex'}`}>
                    <div className="p-4 bg-white border-b flex justify-between items-center">
                        <div>
                            <h2 className="font-bold text-lg text-slate-800">Poruke</h2>
                            <p className="text-xs text-slate-500">{conversations.length} razgovora</p>
                        </div>
                        <div className="flex gap-2">
                            {userRole === 'manager' && companyAdmin && (
                                <button onClick={startChatWithCompanyAdmin} className="p-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 shadow-sm" title="Piši adminu firme">
                                    <Users size={20} />
                                </button>
                            )}
                            {userRole === 'manager' && (
                                <button onClick={() => setShowAdminContact(true)} className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-sm" title="Kontaktiraj tehničku podršku">
                                    <AlertCircle size={20} />
                                </button>
                            )}
                            <button onClick={() => setShowNewChat(true)} className="p-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 shadow-sm">
                                <Plus size={20} />
                            </button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {loading ? (
                            <div className="flex items-center justify-center h-32"><RecycleLoader className="text-emerald-600" size={24} /></div>
                        ) : conversations.length === 0 ? (
                            <div className="p-8 text-center">
                                <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <MessageCircle size={32} className="text-slate-400" />
                                </div>
                                <h3 className="font-semibold text-slate-700 mb-1">Nema razgovora</h3>
                                <p className="text-sm text-slate-500 mb-4">Započnite novi razgovor sa vašim kontaktima</p>
                                <button onClick={() => setShowNewChat(true)} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700">
                                    <Plus size={16} className="inline mr-1" /> Nova poruka
                                </button>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-200">
                                {conversations.map(conv => (
                                    <div
                                        key={conv.partnerId}
                                        className={`w-full p-4 flex items-center gap-3 hover:bg-white text-left transition-colors ${selectedChat?.partnerId === conv.partnerId ? 'bg-white border-l-4 border-l-emerald-500' : ''}`}
                                    >
                                        <button onClick={() => setSelectedChat(conv)} className="flex items-center gap-3 flex-1 min-w-0">
                                            <div className="relative flex-shrink-0">
                                                <div className={`w-12 h-12 bg-gradient-to-br ${['admin', 'developer'].includes(conv.partner.role) ? 'from-blue-400 to-blue-600' : conv.partner.role === 'company_admin' ? 'from-purple-400 to-purple-600' : 'from-emerald-400 to-emerald-600'} rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm`}>
                                                    {['admin', 'developer'].includes(conv.partner.role) ? 'A' : conv.partner.role === 'company_admin' ? 'F' : conv.partner.name?.charAt(0) || '?'}
                                                </div>
                                                {conv.unread > 0 && (
                                                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">{conv.unread}</span>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-center mb-0.5">
                                                    {['admin', 'developer'].includes(conv.partner.role) ? (
                                                        <span className="font-semibold text-blue-600">Tehnička podrška</span>
                                                    ) : conv.partner.role === 'company_admin' ? (
                                                        <span className="font-semibold text-purple-600">{conv.partner.name}</span>
                                                    ) : (
                                                        <span className={`font-semibold truncate ${conv.unread > 0 ? 'text-slate-900' : 'text-slate-700'}`}>{conv.partner.name}</span>
                                                    )}
                                                    <span className="text-xs text-slate-400 ml-2 flex-shrink-0">{formatTime(conv.lastMessageAt)}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-xs px-1.5 py-0.5 rounded ${conv.partner.role === 'client' ? 'bg-blue-100 text-blue-600' : conv.partner.role === 'admin' || conv.partner.role === 'developer' ? 'bg-blue-500 text-white font-medium' : conv.partner.role === 'company_admin' ? 'bg-purple-500 text-white font-medium' : conv.partner.role === 'driver' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                                        {conv.partner.role === 'client' ? 'Klijent' : conv.partner.role === 'admin' || conv.partner.role === 'developer' ? 'Podrška' : conv.partner.role === 'company_admin' ? 'Admin firme' : conv.partner.role === 'driver' ? 'Vozač' : 'Menadžer'}
                                                    </span>
                                                </div>
                                                <p className={`text-sm truncate mt-1 ${conv.unread > 0 ? 'text-slate-700 font-medium' : 'text-slate-500'}`}>{conv.lastMessage}</p>
                                            </div>
                                        </button>
                                        <button
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                if (window.confirm('Obrisati celu konverzaciju?')) {
                                                    try {
                                                        await deleteConversation(conv.partnerId);
                                                        if (selectedChat?.partnerId === conv.partnerId) setSelectedChat(null);
                                                        loadConversations();
                                                    } catch (err) {
                                                        const isServerError = err?.message?.includes('503') || err?.message?.includes('timeout') || err?.message?.includes('connection');
                                                        toast.error(isServerError ? 'Server je trenutno nedostupan. Molimo pokušajte ponovo za nekoliko trenutaka.' : 'Greška pri brisanju: ' + (err?.message || 'Nepoznata greška'));
                                                    }
                                                }
                                            }}
                                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                                            title="Obriši konverzaciju"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Chat Area */}
                <div className={`flex-1 flex flex-col bg-white ${selectedChat ? 'flex' : 'hidden md:flex'}`}>
                    {selectedChat ? (
                        <>
                            {/* Chat Header */}
                            <div className="p-4 border-b bg-white flex items-center gap-3 shadow-sm">
                                <button onClick={() => setSelectedChat(null)} className="md:hidden p-2 hover:bg-slate-100 rounded-lg">
                                    <ArrowLeft size={20} />
                                </button>
                                <div className={`w-11 h-11 ${['admin', 'developer'].includes(selectedChat.partner.role) ? 'bg-gradient-to-br from-blue-400 to-blue-600' : selectedChat.partner.role === 'company_admin' ? 'bg-gradient-to-br from-purple-400 to-purple-600' : 'bg-gradient-to-br from-emerald-400 to-emerald-600'} rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm`}>
                                    {['admin', 'developer'].includes(selectedChat.partner.role) ? 'A' : selectedChat.partner.role === 'company_admin' ? 'F' : selectedChat.partner.name?.charAt(0) || '?'}
                                </div>
                                <div className="flex-1">
                                    <h3 className={`font-bold ${['admin', 'developer'].includes(selectedChat.partner.role) ? 'text-blue-600' : selectedChat.partner.role === 'company_admin' ? 'text-purple-600' : 'text-slate-800'}`}>
                                        {['admin', 'developer'].includes(selectedChat.partner.role) ? 'Tehnička podrška' : selectedChat.partner.role === 'company_admin' ? `Admin firme - ${selectedChat.partner.name}` : selectedChat.partner.name}
                                    </h3>
                                    <p className="text-xs text-slate-500 flex items-center gap-1">
                                        <span className={`w-2 h-2 rounded-full ${selectedChat.partner.role === 'client' ? 'bg-blue-500' : ['admin', 'developer'].includes(selectedChat.partner.role) ? 'bg-blue-500' : selectedChat.partner.role === 'company_admin' ? 'bg-purple-500' : selectedChat.partner.role === 'driver' ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
                                        {selectedChat.partner.role === 'client' ? 'Klijent' : ['admin', 'developer'].includes(selectedChat.partner.role) ? 'Tehnička podrška' : selectedChat.partner.role === 'company_admin' ? 'Admin firme' : selectedChat.partner.role === 'manager' ? 'Menadžer' : selectedChat.partner.role === 'driver' ? 'Vozač' : selectedChat.partner.phone}
                                    </p>
                                </div>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ background: 'linear-gradient(to bottom, #f8fafc, #f1f5f9)' }}>
                                {chatMessages.length === 0 && (
                                    <div className="text-center py-8">
                                        <p className="text-sm text-slate-400">Nema poruka. Pošaljite prvu poruku!</p>
                                    </div>
                                )}
                                {chatMessages.map(msg => (
                                    <div key={msg.id} className={`flex ${msg.sender_id === user.id ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl shadow-sm ${msg.sender_id === user.id
                                            ? 'bg-emerald-600 text-white rounded-br-md'
                                            : 'bg-white text-slate-700 rounded-bl-md border'
                                            }`}>
                                            <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                                            <p className={`text-xs mt-1.5 ${msg.sender_id === user.id ? 'text-emerald-200' : 'text-slate-400'}`}>
                                                {formatTime(msg.created_at)}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Message Input */}
                            <div className="p-4 border-t bg-white">
                                <div className="flex gap-3">
                                    <input
                                        type="text"
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                                        placeholder="Napišite poruku..."
                                        className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white outline-none transition-all"
                                    />
                                    <button
                                        onClick={handleSend}
                                        disabled={sending || !newMessage.trim()}
                                        className="px-5 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors"
                                    >
                                        {sending ? <RecycleLoader size={20} className="animate-spin" /> : <Send size={20} />}
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center bg-slate-50">
                            <div className="text-center p-8">
                                <div className="w-20 h-20 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <MessageCircle size={40} className="text-slate-400" />
                                </div>
                                <h3 className="font-semibold text-slate-700 mb-2">Izaberite razgovor</h3>
                                <p className="text-sm text-slate-500">Izaberite razgovor sa leve strane ili započnite novi</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* New Chat Modal */}
            {showNewChat && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden shadow-2xl">
                        <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                            <div>
                                <h3 className="font-bold text-slate-800">Nova poruka</h3>
                                <p className="text-xs text-slate-500">{contacts.length} kontakata</p>
                            </div>
                            <button onClick={() => setShowNewChat(false)} className="p-2 hover:bg-slate-200 rounded-lg"><X size={20} /></button>
                        </div>
                        <div className="overflow-y-auto max-h-96">
                            {contacts.length === 0 ? (
                                <div className="p-8 text-center text-slate-500">
                                    <Users size={40} className="mx-auto mb-3 text-slate-300" />
                                    <p>Nema dostupnih kontakata</p>
                                </div>
                            ) : (
                                <div className="divide-y">
                                    {contacts.map(contact => (
                                        <button
                                            key={contact.id}
                                            onClick={() => startNewChat(contact)}
                                            className="w-full p-4 flex items-center gap-3 hover:bg-emerald-50 text-left transition-colors"
                                        >
                                            <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm">
                                                {contact.name?.charAt(0) || '?'}
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-semibold text-slate-800">{contact.name}</p>
                                                <p className="text-sm text-slate-500">
                                                    {contact.role === 'client' ? 'Klijent' : contact.role === 'manager' ? 'Menadžer' : contact.role === 'driver' ? 'Vozač' : contact.role === 'admin' || contact.role === 'developer' ? 'Administrator' : contact.role}
                                                </p>
                                            </div>
                                            <ChevronRight size={20} className="text-slate-300" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Admin Contact Modal */}
            {showAdminContact && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
                        <div className="p-4 border-b bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h3 className="font-bold text-lg">Kontaktiraj Admina</h3>
                                    <p className="text-xs text-blue-100">Poruka će biti poslata svim administratorima</p>
                                </div>
                                <button onClick={() => setShowAdminContact(false)} className="p-2 hover:bg-white/20 rounded-lg"><X size={20} /></button>
                            </div>
                        </div>
                        <div className="p-4 space-y-4">
                            <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                                <div className="flex items-center gap-2 text-blue-700 text-sm">
                                    <AlertCircle size={16} />
                                    <span>Koristite ovu opciju za tehničku podršku ili pitanja o sistemu.</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Vaša poruka</label>
                                <textarea
                                    value={adminMessage}
                                    onChange={(e) => setAdminMessage(e.target.value)}
                                    placeholder="Opišite vaš problem ili pitanje..."
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm resize-none"
                                    rows={5}
                                />
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowAdminContact(false)}
                                    className="flex-1 px-4 py-3 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 font-medium"
                                >
                                    Otkaži
                                </button>
                                <button
                                    onClick={handleSendToAdmin}
                                    disabled={sendingToAdmin || !adminMessage.trim()}
                                    className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {sendingToAdmin ? <RecycleLoader size={18} className="animate-spin" /> : <Send size={18} />}
                                    Pošalji
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChatInterface;
