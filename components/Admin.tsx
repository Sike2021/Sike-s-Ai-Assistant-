
import React, { useState, useEffect } from 'react';
import { Icons } from './Icons';
import { UserProfile } from '../types';
import { SIKE_USERS_KEY, getSavedMessagesKey } from '../utils/appUtils';

export const AdminPanelPage: React.FC = () => {
    const [stats, setStats] = useState({ totalUsers: 0, onlineNow: 0, totalSavedMessages: 0 });
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const allUsers: UserProfile[] = JSON.parse(localStorage.getItem(SIKE_USERS_KEY) || '[]');
        setUsers(allUsers);

        let totalSaved = 0;
        let onlineCount = 0;
        const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);

        allUsers.forEach(user => {
            if (user.lastActive && user.lastActive > fiveMinutesAgo) {
                onlineCount++;
            }
            const savedKey = getSavedMessagesKey(user.email);
            const saved = JSON.parse(localStorage.getItem(savedKey) || '[]');
            totalSaved += saved.length;
        });

        setStats({
            totalUsers: allUsers.length,
            onlineNow: onlineCount,
            totalSavedMessages: totalSaved
        });
    }, []);
    
    const filteredUsers = users.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a,b) => (b.lastActive || 0) - (a.lastActive || 0));

    const timeAgo = (timestamp?: number) => {
        if (!timestamp) return 'Never';
        const now = Date.now();
        const seconds = Math.floor((now - timestamp) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + " years ago";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + " months ago";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + " days ago";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + " hours ago";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + " minutes ago";
        return "Just now";
    };

    return (
        <div className="h-full overflow-y-auto custom-scrollbar p-4 md:p-8 font-commander">
            <div className="max-w-7xl mx-auto space-y-6">
                <h1 className="text-3xl font-bold tracking-wider">ADMIN PANEL</h1>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <StatCard icon={Icons.Users} title="Total Users" value={stats.totalUsers} />
                    <StatCard icon={Icons.MessageSquare} title="Online Now" value={stats.onlineNow} />
                    <StatCard icon={Icons.Bookmark} title="Total Saved Items" value={stats.totalSavedMessages} />
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-slate-800/80 p-6 rounded-lg border border-cm-border">
                         <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Icons.Users className="h-6 w-6 text-cm-primary" /> Registered Users</h2>
                         <input
                            type="text"
                            placeholder="Search by name or email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full mb-4 px-3 py-2 rounded-md bg-cm-surface border border-cm-border focus:ring-cm-primary focus:border-cm-primary"
                         />
                         <div className="overflow-x-auto max-h-[60vh]">
                            <table className="w-full text-left text-sm">
                                <thead className="sticky top-0 bg-slate-800">
                                    <tr>
                                        <th className="p-2">User</th>
                                        <th className="p-2">Email</th>
                                        <th className="p-2">Last Active</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-cm-border">
                                    {filteredUsers.map(user => (
                                        <tr key={user.email} onClick={() => setSelectedUser(user)} className={`cursor-pointer hover:bg-cm-surface transition-colors ${selectedUser?.email === user.email ? 'bg-cm-surface' : ''}`}>
                                            <td className="p-2 flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-cm-surface flex items-center justify-center">
                                                    <Icons.User className="h-5 w-5 text-cm-text-dim" />
                                                </div>
                                                <span>{user.name}</span>
                                            </td>
                                            <td className="p-2 truncate max-w-[200px]">{user.email}</td>
                                            <td className="p-2">{timeAgo(user.lastActive)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                         </div>
                    </div>
                    <div className="bg-slate-800/80 p-6 rounded-lg border border-cm-border">
                         <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Icons.BrainCircuit className="h-6 w-6 text-cm-primary" /> User Details</h2>
                         {selectedUser ? (
                            <div>
                                <h3 className="font-bold">{selectedUser.name}</h3>
                                <p className="text-xs text-cm-text-dim mb-4">{selectedUser.email}</p>
                                <h4 className="font-semibold mt-4 mb-2 text-cm-primary">AI Memory / Preferences:</h4>
                                {selectedUser.notes ? (
                                    <pre className="whitespace-pre-wrap text-xs bg-cm-surface p-3 rounded-md max-h-96 overflow-y-auto custom-scrollbar">{selectedUser.notes}</pre>
                                ) : (
                                    <p className="text-sm text-cm-text-dim italic">No preferences saved.</p>
                                )}
                            </div>
                         ) : (
                            <div className="flex items-center justify-center h-full">
                                <p className="text-cm-text-dim">Select a user to view details</p>
                            </div>
                         )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const StatCard: React.FC<{ icon: React.ElementType, title: string, value: string | number }> = ({ icon: Icon, title, value }) => (
    <div className="bg-slate-800/80 p-6 rounded-lg flex items-center gap-4 border border-cm-border">
        <div className="p-3 rounded-full bg-cm-primary-glow">
            <Icon className="h-8 w-8 text-cm-primary" />
        </div>
        <div>
            <div className="text-3xl font-bold">{value}</div>
            <div className="text-sm text-cm-text-dim">{title}</div>
        </div>
    </div>
);
