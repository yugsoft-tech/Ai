'use client';

import React, { useEffect, useState } from 'react';
import AdminHeader from '@/components/admin/AdminHeader';
import { Users, Mail, Shield, MoreVertical, Edit2, Trash2, Loader2 } from 'lucide-react';
import api from '@/services/api';

export default function UserDirectoryPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await api.get('/users');
        setUsers(response.data?.data || response.data);
      } catch (error) {
        console.error('Failed to fetch users', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUsers();
  }, []);

  return (
    <div className="p-8 max-w-[1600px] mx-auto relative">
      <AdminHeader 
        title="User Directory" 
        description="Manage teachers, students, and system administrators." 
      />

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white">Registered Users</h2>
        <button className="px-4 py-2 bg-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.12)] border border-[rgba(255,255,255,0.1)] text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-2">
          <span className="text-lg leading-none mb-0.5">+</span> Invite User
        </button>
      </div>

      <div className="glass-panel rounded-xl overflow-hidden border border-[rgba(255,255,255,0.1)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-400">
            <thead className="bg-[rgba(255,255,255,0.02)] border-b border-[rgba(255,255,255,0.05)] text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-6 py-4 font-semibold">User</th>
                <th className="px-6 py-4 font-semibold">Role</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Last Active</th>
                <th className="px-6 py-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(255,255,255,0.05)]">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-neon-purple" />
                    Loading users...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const displayName = user.email.split('@')[0];
                  return (
                  <tr key={user.id} className="hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[rgba(255,255,255,0.05)] flex items-center justify-center border border-[rgba(255,255,255,0.1)]">
                          <span className="text-white font-bold uppercase">{displayName.charAt(0)}</span>
                        </div>
                        <div>
                          <div className="font-medium text-gray-200">{displayName}</div>
                          <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                            <Mail size={10} />
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Shield size={14} className={
                          user.role === 'ADMIN' ? 'text-neon-purple' : 
                          user.role === 'TEACHER' ? 'text-emerald-500' : 'text-blue-400'
                        } />
                        <span className={`text-xs font-bold tracking-wide ${
                          user.role === 'ADMIN' ? 'text-neon-purple' : 
                          user.role === 'TEACHER' ? 'text-emerald-500' : 'text-blue-400'
                        }`}>
                          {user.role}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="flex items-center gap-1.5 text-xs text-gray-300">
                        <div className={`w-1.5 h-1.5 rounded-full ${user.isActive ? 'bg-emerald-500' : 'bg-gray-500'}`}></div>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs">Recently</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button className="p-2 text-gray-500 hover:text-white transition-colors rounded-lg hover:bg-[rgba(255,255,255,0.05)]">
                          <Edit2 size={16} />
                        </button>
                        <button className="p-2 text-gray-500 hover:text-red-400 transition-colors rounded-lg hover:bg-[rgba(239,68,68,0.1)]">
                          <Trash2 size={16} />
                        </button>
                        <button className="p-2 text-gray-500 hover:text-white transition-colors rounded-lg hover:bg-[rgba(255,255,255,0.05)]">
                          <MoreVertical size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
