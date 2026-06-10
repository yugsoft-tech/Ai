'use client';

import React, { useEffect, useState } from 'react';
import AdminHeader from '@/components/admin/AdminHeader';
import CreateBookModal from '@/components/admin/CreateBookModal';
import { BookOpen, MoreVertical, Edit2, Trash2, Loader2 } from 'lucide-react';
import api from '@/services/api';

export default function CurriculumManagementPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [books, setBooks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchBooks = async () => {
    try {
      const response = await api.get('/curriculum/books');
      setBooks(response.data?.data || response.data);
    } catch (error) {
      console.error('Failed to fetch books', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  return (
    <div className="p-8 max-w-[1600px] mx-auto relative">
      <AdminHeader 
        title="Curriculum Management" 
        description="View and manage the ingested textbooks and their extracted knowledge." 
      />

      <CreateBookModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={fetchBooks} />

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white">Ingested Textbooks</h2>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-neon-purple hover:bg-[#7c3aed] text-white rounded-lg text-sm font-semibold transition-colors box-shadow-glow-purple flex items-center gap-2"
        >
          <span className="text-lg leading-none mb-0.5">+</span> Create Book
        </button>
      </div>

      <div className="glass-panel rounded-xl overflow-hidden border border-[rgba(255,255,255,0.1)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-400">
            <thead className="bg-[rgba(255,255,255,0.02)] border-b border-[rgba(255,255,255,0.05)] text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-6 py-4 font-semibold">Textbook Title</th>
                <th className="px-6 py-4 font-semibold">Class/Grade</th>
                <th className="px-6 py-4 font-semibold">Chapters</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Last Updated</th>
                <th className="px-6 py-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(255,255,255,0.05)]">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-neon-purple" />
                    Loading textbooks...
                  </td>
                </tr>
              ) : books.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No books found. Click "Create Book" to get started.
                  </td>
                </tr>
              ) : (
                books.map((book) => (
                  <tr key={book.id} className="hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-neon-purple/10 flex items-center justify-center">
                          <BookOpen size={16} className="text-neon-purple" />
                        </div>
                        <span className="font-medium text-gray-200">{book.title}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-300">{book.class || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-300">{book.chapters?.length || 0}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase bg-emerald-500/10 text-emerald-500 border border-emerald-500/20`}>
                        Ingested
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs">{new Date(book.createdAt).toLocaleDateString()}</td>
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
