/**
 * DriverMessagesView - Poruke prikaz za vozače
 * Ekstraktovano iz DriverDashboard.jsx
 */
import React from 'react';
import { MessageCircle, User, Plus, ArrowLeft, Send, RefreshCw, Check, CheckCheck, Users } from 'lucide-react';
import { formatTimeAgo, getRoleLabel } from '../utils';

export const DriverMessagesView = ({
    user,
    conversations,
    selectedChat,
    setSelectedChat,
    chatMessages,
    newMessage,
    setNewMessage,
    sendingMessage,
    loadingMessages,
    showNewChatModal,
    setShowNewChatModal,
    companyMembers,
    messagesEndRef,
    openChat,
    handleSendMessage
}) => {
    if (!selectedChat) {
        // Conversations list
        return (
            <div className="flex-1 overflow-y-auto">
                <div className="p-4 border-b bg-slate-50 flex items-center justify-between">
                    <div>
                        <h2 className="font-bold text-slate-800">Poruke</h2>
                        <p className="text-sm text-slate-500">Razgovori sa menadžerima i klijentima</p>
                    </div>
                    <button
                        onClick={() => setShowNewChatModal(true)}
                        className="px-3 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 flex items-center gap-2 text-sm"
                    >
                        <Plus size={16} /> Nova poruka
                    </button>
                </div>
                {conversations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                        <MessageCircle size={48} className="mb-3 opacity-50" />
                        <p className="text-sm">Nemate poruka</p>
                        <button
                            onClick={() => setShowNewChatModal(true)}
                            className="mt-3 text-emerald-600 hover:text-emerald-700 text-sm font-medium"
                        >
                            Započni razgovor
                        </button>
                    </div>
                ) : (
                    <div className="divide-y">
                        {conversations.map(conv => (
                            <button
                                key={conv.partnerId}
                                onClick={() => openChat(conv.partner)}
                                className="w-full p-4 hover:bg-slate-50 text-left flex items-center gap-3"
                            >
                                <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center">
                                    <User size={24} className="text-slate-500" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <p className="font-medium text-slate-800 truncate">{conv.partner.name}</p>
                                            <span className="text-xs text-slate-400">({getRoleLabel(conv.partner.role)})</span>
                                        </div>
                                        <span className="text-xs text-slate-400">{formatTimeAgo(conv.lastMessageAt)}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm text-slate-500 truncate flex-1">{conv.lastMessage}</p>
                                        {conv.unread > 0 && (
                                            <span className="w-5 h-5 bg-emerald-600 text-white text-xs rounded-full flex items-center justify-center">
                                                {conv.unread}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                {/* New Chat Modal */}
                {showNewChatModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden">
                            <div className="p-4 border-b flex items-center justify-between">
                                <h3 className="font-bold text-slate-800">Nova poruka</h3>
                                <button
                                    onClick={() => setShowNewChatModal(false)}
                                    className="p-2 hover:bg-slate-100 rounded-lg"
                                >
                                    <ArrowLeft size={20} />
                                </button>
                            </div>
                            <div className="overflow-y-auto max-h-96">
                                {companyMembers.length === 0 ? (
                                    <div className="p-8 text-center text-slate-400">
                                        <Users size={32} className="mx-auto mb-2 opacity-50" />
                                        <p className="text-sm">Nema dostupnih korisnika</p>
                                    </div>
                                ) : (
                                    <div className="divide-y">
                                        {companyMembers.map(member => (
                                            <button
                                                key={member.id}
                                                onClick={() => openChat(member)}
                                                className="w-full p-4 hover:bg-slate-50 text-left flex items-center gap-3"
                                            >
                                                <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center">
                                                    <User size={20} className="text-slate-500" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-slate-800">{member.name}</p>
                                                    <p className="text-xs text-slate-500">{getRoleLabel(member.role)}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Chat view
    return (
        <>
            <div className="p-4 border-b bg-slate-50 flex items-center gap-3">
                <button
                    onClick={() => setSelectedChat(null)}
                    className="p-2 hover:bg-slate-200 rounded-lg"
                >
                    <ArrowLeft size={20} />
                </button>
                <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center">
                    <User size={20} className="text-slate-500" />
                </div>
                <div>
                    <p className="font-medium text-slate-800">{selectedChat.name}</p>
                    <p className="text-xs text-slate-500">{getRoleLabel(selectedChat.role)}</p>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loadingMessages ? (
                    <div className="flex items-center justify-center h-32">
                        <RefreshCw className="animate-spin text-slate-400" size={24} />
                    </div>
                ) : chatMessages.length === 0 ? (
                    <div className="text-center text-slate-400 py-8">
                        <p className="text-sm">Započnite razgovor</p>
                    </div>
                ) : (
                    chatMessages.map(msg => (
                        <div
                            key={msg.id}
                            className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[75%] px-4 py-2 rounded-2xl ${msg.sender_id === user?.id
                                    ? 'bg-emerald-600 text-white rounded-br-md'
                                    : 'bg-slate-200 text-slate-800 rounded-bl-md'
                                    }`}
                            >
                                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                <div className={`flex items-center justify-end gap-1 mt-1 ${msg.sender_id === user?.id ? 'text-emerald-200' : 'text-slate-400'}`}>
                                    <span className="text-xs">{formatTimeAgo(msg.created_at)}</span>
                                    {msg.sender_id === user?.id && (
                                        msg.is_read ? <CheckCheck size={14} /> : <Check size={14} />
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSendMessage} className="p-4 border-t bg-white">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Napišite poruku..."
                        className="flex-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim() || sendingMessage}
                        className="px-4 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {sendingMessage ? <RefreshCw size={20} className="animate-spin" /> : <Send size={20} />}
                    </button>
                </div>
            </form>
        </>
    );
};

export default DriverMessagesView;
