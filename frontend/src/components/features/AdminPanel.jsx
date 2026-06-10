"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, Plus, Trash2, Edit2, UploadCloud, Users, 
  Settings, Database, Sparkles, Loader2, RefreshCw, 
  CheckCircle, ShieldAlert, GraduationCap, School, ChevronRight
} from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import useCurriculumStore from '@/store/curriculumStore';
import useAuthStore from '@/store/authStore';
import api from '@/services/api';

export default function AdminPanel({ activeTab: propActiveTab, setActiveTab: propSetActiveTab }) {
  const { user } = useAuthStore();
  const { books, fetchBooks } = useCurriculumStore();
  
  // Tabs: 'overview', 'curriculum', 'users'
  const [internalActiveTab, setInternalActiveTab] = useState('overview');
  const activeTab = propActiveTab !== undefined ? propActiveTab : internalActiveTab;
  const setActiveTab = propSetActiveTab !== undefined ? propSetActiveTab : setInternalActiveTab;
  const [usersList, setUsersList] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // Book creation/edit state
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [bookTitle, setBookTitle] = useState('');
  const [bookClass, setBookClass] = useState('');
  const [bookSubject, setBookSubject] = useState('');
  const [bookFile, setBookFile] = useState(null);
  const [bookCreationStep, setBookCreationStep] = useState('idle'); // 'idle', 'book', 'chapter', 'ingest'
  
  // Chapter creation/edit state
  const [selectedBook, setSelectedBook] = useState(null);
  const [isChapterModalOpen, setIsChapterModalOpen] = useState(false);
  const [editingChapter, setEditingChapter] = useState(null);
  const [chapterTitle, setChapterTitle] = useState('');
  
  // PDF upload state
  const [uploadChapter, setUploadChapter] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadingChapterId, setUploadingChapterId] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [ingestedChunksCount, setIngestedChunksCount] = useState(null);
  
  // User creation/edit state
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userRole, setUserRole] = useState('teacher');
  const [editingUser, setEditingUser] = useState(null);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  useEffect(() => {
    if (activeTab === 'users' && isAdmin) {
      loadUsers();
    }
  }, [activeTab]);

  const showSuccess = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  const showError = (err) => {
    const apiError = err.response?.data?.message;
    let msg = '';
    if (typeof apiError === 'string') {
      msg = apiError;
    } else if (Array.isArray(apiError)) {
      msg = apiError.join(', ');
    } else {
      msg = err.response?.data?.error || err.message || 'An unexpected error occurred.';
    }
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(''), 5000);
  };

  // --- Users APIs ---
  const loadUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const response = await api.get('/users');
      const data = response.data?.data || response.data;
      setUsersList(Array.isArray(data) ? data : []);
    } catch (err) {
      showError(err);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    setIsActionLoading(true);
    try {
      if (editingUser) {
        const payload = { role: userRole };
        if (userPassword) payload.password = userPassword;
        await api.patch(`/users/${editingUser.id}`, payload);
        showSuccess('User updated successfully!');
      } else {
        await api.post('/users', {
          email: userEmail,
          password: userPassword,
          role: userRole
        });
        showSuccess('User created successfully!');
      }
      setIsUserModalOpen(false);
      resetUserForm();
      loadUsers();
    } catch (err) {
      showError(err);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    setIsActionLoading(true);
    try {
      await api.delete(`/users/${userId}`);
      showSuccess('User deleted successfully!');
      loadUsers();
    } catch (err) {
      showError(err);
    } finally {
      setIsActionLoading(false);
    }
  };

  const resetUserForm = () => {
    setEditingUser(null);
    setUserEmail('');
    setUserPassword('');
    setUserRole('teacher');
  };

  const openEditUser = (userItem) => {
    setEditingUser(userItem);
    setUserEmail(userItem.email);
    setUserPassword('');
    setUserRole(userItem.role);
    setIsUserModalOpen(true);
  };

  // --- Books APIs ---
  const handleSaveBook = async (e) => {
    e.preventDefault();
    setIsActionLoading(true);
    setErrorMessage('');
    try {
      const payload = { title: bookTitle, class: bookClass, subject: bookSubject };
      if (editingBook) {
        await api.patch(`/curriculum/books/${editingBook.id}`, payload);
        showSuccess('Book updated successfully!');
        setIsBookModalOpen(false);
        resetBookForm();
        fetchBooks();
      } else {
        if (bookFile) {
          // 3-step sequence
          setBookCreationStep('book');
          const bookRes = await api.post('/curriculum/books', payload);
          const bookData = bookRes.data?.data || bookRes.data;
          const newBookId = bookData.id;

          setBookCreationStep('chapter');
          const chapterRes = await api.post(`/curriculum/books/${newBookId}/chapters`, {
            title: 'Complete Textbook Content'
          });
          const chapterData = chapterRes.data?.data || chapterRes.data;
          const newChapterId = chapterData.id;

          setBookCreationStep('ingest');
          const formData = new FormData();
          formData.append('file', bookFile);
          formData.append('chapterId', newChapterId);

          await api.post('/rag/ingest', formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          });

          showSuccess('Book created and PDF successfully ingested into RAG!');
          setIsBookModalOpen(false);
          resetBookForm();
          fetchBooks();
        } else {
          await api.post('/curriculum/books', payload);
          showSuccess('Book created successfully!');
          setIsBookModalOpen(false);
          resetBookForm();
          fetchBooks();
        }
      }
    } catch (err) {
      showError(err);
    } finally {
      setIsActionLoading(false);
      setBookCreationStep('idle');
    }
  };

  const handleDeleteBook = async (bookId, e) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this book? This will permanently delete all its chapters and chunks!')) return;
    setIsActionLoading(true);
    try {
      await api.delete(`/curriculum/books/${bookId}`);
      showSuccess('Book deleted successfully!');
      if (selectedBook?.id === bookId) {
        setSelectedBook(null);
      }
      fetchBooks();
    } catch (err) {
      showError(err);
    } finally {
      setIsActionLoading(false);
    }
  };

  const resetBookForm = () => {
    setEditingBook(null);
    setBookTitle('');
    setBookClass('');
    setBookSubject('');
    setBookFile(null);
    setBookCreationStep('idle');
  };

  const openEditBook = (book, e) => {
    e.stopPropagation();
    setEditingBook(book);
    setBookTitle(book.title);
    setBookClass(book.class);
    setBookSubject(book.subject);
    setIsBookModalOpen(true);
  };

  // --- Chapters APIs ---
  const handleSaveChapter = async (e) => {
    e.preventDefault();
    if (!selectedBook) return;
    setIsActionLoading(true);
    try {
      const payload = { title: chapterTitle };
      if (editingChapter) {
        await api.patch(`/curriculum/books/${selectedBook.id}/chapters/${editingChapter.id}`, payload);
        showSuccess('Chapter updated successfully!');
      } else {
        await api.post(`/curriculum/books/${selectedBook.id}/chapters`, payload);
        showSuccess('Chapter created successfully!');
      }
      setIsChapterModalOpen(false);
      setChapterTitle('');
      setEditingChapter(null);
      
      // Refresh selected book details
      const response = await api.get(`/curriculum/books/${selectedBook.id}`);
      setSelectedBook(response.data?.data || response.data);
      fetchBooks();
    } catch (err) {
      showError(err);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDeleteChapter = async (chapterId) => {
    if (!confirm('Are you sure you want to delete this chapter and all its RAG chunks?')) return;
    setIsActionLoading(true);
    try {
      await api.delete(`/curriculum/books/${selectedBook.id}/chapters/${chapterId}`);
      showSuccess('Chapter deleted successfully!');
      // Refresh selected book details
      const response = await api.get(`/curriculum/books/${selectedBook.id}`);
      setSelectedBook(response.data?.data || response.data);
      fetchBooks();
    } catch (err) {
      showError(err);
    } finally {
      setIsActionLoading(false);
    }
  };

  const openEditChapter = (chapter) => {
    setEditingChapter(chapter);
    setChapterTitle(chapter.title);
    setIsChapterModalOpen(true);
  };

  // --- PDF RAG Ingestion ---
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUploadPDF = async (chapterId) => {
    if (!selectedFile) return;
    setUploadingChapterId(chapterId);
    setIngestedChunksCount(null);
    setUploadProgress(10);
    
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('chapterId', chapterId);

    try {
      setUploadProgress(40);
      const response = await api.post('/rag/ingest', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setUploadProgress(100);
      const data = response.data?.data || response.data;
      setIngestedChunksCount(data.chunksCreated ?? 0);
      showSuccess(`PDF successfully processed! Created ${data.chunksCreated} chunks.`);
      
      // Refresh book details to see changes
      const updatedBookRes = await api.get(`/curriculum/books/${selectedBook.id}`);
      setSelectedBook(updatedBookRes.data?.data || updatedBookRes.data);
      setSelectedFile(null);
      setUploadChapter(null);
    } catch (err) {
      showError(err);
      setUploadProgress(0);
    } finally {
      setUploadingChapterId('');
    }
  };

  // Derived information
  const uniqueClasses = Array.from(new Set(books.map((b) => b.class)));
  const uniqueSubjects = Array.from(new Set(books.map((b) => b.subject)));
  const totalChaptersCount = books.reduce((acc, b) => acc + (b.chapters?.length || 0), 0);

  return (
    <div className="w-full min-h-[500px] flex flex-col gap-6 text-white font-sans">
      {/* Top Breadcrumb / Title */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-neon-purple to-emerald-green">
            Tech Administration Canvas
          </h1>
          <p className="text-gray-400 text-sm mt-1">Manage educational curriculum, PDF ingestions, and user permissions.</p>
        </div>
        
        <button 
          onClick={() => {
            fetchBooks();
            if (activeTab === 'users' && isAdmin) loadUsers();
            showSuccess('Refreshed administrative data!');
          }}
          className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors flex items-center gap-2 text-sm"
        >
          <RefreshCw size={14} className={isActionLoading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Floating alert notifications */}
      <AnimatePresence>
        {successMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-4 rounded-xl bg-emerald-green/10 border border-emerald-green/30 text-emerald-green text-sm flex items-center gap-2 box-shadow-glow-green"
          >
            <CheckCircle size={16} />
            {successMessage}
          </motion.div>
        )}
        {errorMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2 box-shadow-glow-red"
          >
            <ShieldAlert size={16} />
            {errorMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation Tabs */}
      <div className="flex border-b border-glass-border">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-6 py-3 border-b-2 text-sm font-semibold transition-all ${
            activeTab === 'overview'
              ? 'border-neon-purple text-white'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('curriculum')}
          className={`px-6 py-3 border-b-2 text-sm font-semibold transition-all ${
            activeTab === 'curriculum'
              ? 'border-neon-purple text-white'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          Curriculum Management
        </button>
        {isAdmin && (
          <button
            onClick={() => setActiveTab('users')}
            className={`px-6 py-3 border-b-2 text-sm font-semibold transition-all ${
              activeTab === 'users'
                ? 'border-neon-purple text-white'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            User Directory
          </button>
        )}
      </div>

      {/* Tab Panels */}
      <div className="flex-1">
        {activeTab === 'overview' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-4 gap-6"
          >
            {/* Stat Cards */}
            <GlassCard className="p-6 flex items-center gap-4 border border-white/5 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-neon-purple/5 rounded-full blur-2xl group-hover:bg-neon-purple/10 transition-colors" />
              <div className="p-4 rounded-xl bg-neon-purple/20 text-neon-purple">
                <BookOpen size={24} />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Total Books</p>
                <h3 className="text-2xl font-bold mt-1 text-white">{books.length}</h3>
              </div>
            </GlassCard>

            <GlassCard className="p-6 flex items-center gap-4 border border-white/5 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-green/5 rounded-full blur-2xl group-hover:bg-emerald-green/10 transition-colors" />
              <div className="p-4 rounded-xl bg-emerald-green/20 text-emerald-green">
                <GraduationCap size={24} />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Unique Classes</p>
                <h3 className="text-2xl font-bold mt-1 text-white">{uniqueClasses.length || 1}</h3>
              </div>
            </GlassCard>

            <GlassCard className="p-6 flex items-center gap-4 border border-white/5 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-colors" />
              <div className="p-4 rounded-xl bg-blue-500/20 text-blue-400">
                <Database size={24} />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Total Chapters</p>
                <h3 className="text-2xl font-bold mt-1 text-white">{totalChaptersCount}</h3>
              </div>
            </GlassCard>

            <GlassCard className="p-6 flex items-center gap-4 border border-white/5 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-500/5 rounded-full blur-2xl group-hover:bg-yellow-500/10 transition-colors" />
              <div className="p-4 rounded-xl bg-yellow-500/20 text-yellow-400">
                <Sparkles size={24} />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">RAG Status</p>
                <h3 className="text-2xl font-bold mt-1 text-emerald-400 flex items-center gap-1.5 text-shadow-glow-green">
                  Active
                </h3>
              </div>
            </GlassCard>

            {/* Quick Actions Panel */}
            <div className="col-span-1 md:col-span-2 flex flex-col gap-6">
              <GlassCard className="p-6 border border-white/5 h-full flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                    <School size={18} className="text-neon-purple" />
                    Quick Curriculum Setup
                  </h3>
                  <p className="text-gray-400 text-sm leading-relaxed mb-4">
                    Quickly add new textbooks, specify classes, and outline chapters to expand the library database.
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button 
                    variant="primary" 
                    onClick={() => {
                      resetBookForm();
                      setIsBookModalOpen(true);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl"
                  >
                    <Plus size={16} /> Create Book
                  </Button>
                  <Button 
                    variant="secondary"
                    onClick={() => setActiveTab('curriculum')}
                    className="flex-1 rounded-xl"
                  >
                    Manage Chapters
                  </Button>
                </div>
              </GlassCard>
            </div>

            {/* System Information */}
            <div className="col-span-1 md:col-span-2">
              <GlassCard className="p-6 border border-white/5 h-full">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Settings size={18} className="text-emerald-green" />
                  Tenant Information
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between border-b border-glass-border pb-2">
                    <span className="text-gray-400">User Email:</span>
                    <span className="text-white font-medium">{user?.email}</span>
                  </div>
                  <div className="flex justify-between border-b border-glass-border pb-2">
                    <span className="text-gray-400">Current Role:</span>
                    <span className="text-neon-purple font-semibold uppercase">{user?.role}</span>
                  </div>
                  <div className="flex justify-between border-b border-glass-border pb-2">
                    <span className="text-gray-400">Institution ID:</span>
                    <span className="text-gray-300 font-mono text-xs truncate max-w-[150px]">{user?.tenantId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">LLM Ingestion Model:</span>
                    <span className="text-emerald-400 font-medium">gemini-embedding-2</span>
                  </div>
                </div>
              </GlassCard>
            </div>
          </motion.div>
        )}

        {activeTab === 'curriculum' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6"
          >
            {/* Books Column (5 cols) */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-white">Books Directory</h3>
                <Button 
                  variant="primary" 
                  onClick={() => {
                    resetBookForm();
                    setIsBookModalOpen(true);
                  }}
                  className="py-1 px-3 text-xs flex items-center gap-1.5 rounded-lg"
                >
                  <Plus size={14} /> New Book
                </Button>
              </div>

              <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar pr-1">
                {books.length === 0 ? (
                  <GlassCard className="p-8 text-center text-gray-500 border border-white/5">
                    No books found. Click "New Book" to create one.
                  </GlassCard>
                ) : (
                  books.map((b) => {
                    const isCurrent = selectedBook?.id === b.id;
                    return (
                      <div
                        key={b.id}
                        onClick={async () => {
                          setIsActionLoading(true);
                          try {
                            const res = await api.get(`/curriculum/books/${b.id}`);
                            setSelectedBook(res.data?.data || res.data);
                          } catch (err) {
                            showError(err);
                          } finally {
                            setIsActionLoading(false);
                          }
                        }}
                        className={`p-4 rounded-xl border transition-all cursor-pointer flex justify-between items-start ${
                          isCurrent 
                            ? 'bg-neon-purple/10 border-neon-purple shadow-[0_0_15px_rgba(139,92,246,0.15)]'
                            : 'bg-white/5 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex-1">
                          <div className="flex gap-2 mb-1.5 flex-wrap">
                            <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-neon-purple/20 text-neon-purple">
                              {b.class}
                            </span>
                            <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-emerald-green/20 text-emerald-green">
                              {b.subject}
                            </span>
                          </div>
                          <h4 className="font-semibold text-white line-clamp-2">{b.title}</h4>
                          <p className="text-xs text-gray-400 mt-2">
                            {b.chapters?.length || 0} chapters registered
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={(e) => openEditBook(b, e)}
                            className="p-1.5 text-gray-400 hover:text-white hover:bg-white/5 rounded transition-colors"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={(e) => handleDeleteBook(b.id, e)}
                            className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Chapters & PDF Ingestion Column (7 cols) */}
            <div className="lg:col-span-7 flex flex-col gap-4">
              {selectedBook ? (
                <>
                  <div className="flex justify-between items-center border-b border-glass-border pb-3">
                    <div>
                      <span className="text-xs text-neon-purple uppercase font-semibold tracking-wider">Active Book</span>
                      <h3 className="text-xl font-bold text-white mt-0.5">{selectedBook.title}</h3>
                      <p className="text-xs text-gray-400">{selectedBook.class} &bull; {selectedBook.subject}</p>
                    </div>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setChapterTitle('');
                        setEditingChapter(null);
                        setIsChapterModalOpen(true);
                      }}
                      className="py-1 px-3 text-xs flex items-center gap-1.5 rounded-lg"
                    >
                      <Plus size={14} /> Add Chapter
                    </Button>
                  </div>

                  {/* Chapters List */}
                  <div className="space-y-4">
                    {(!selectedBook.chapters || selectedBook.chapters.length === 0) ? (
                      <GlassCard className="p-8 text-center text-gray-500 border border-white/5">
                        No chapters in this book. Click "Add Chapter" to build the curriculum.
                      </GlassCard>
                    ) : (
                      selectedBook.chapters.map((ch, index) => {
                        const isUploadingThis = uploadingChapterId === ch.id;
                        const hasUploadOpen = uploadChapter?.id === ch.id;
                        return (
                          <GlassCard key={ch.id} className="p-5 border border-white/5 hover:border-white/10 transition-colors">
                            <div className="flex justify-between items-start gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-400 font-mono">Ch {index + 1}</span>
                                  <h4 className="font-semibold text-white text-base">{ch.title}</h4>
                                </div>
                                <div className="mt-3 flex items-center gap-3">
                                  {/* RAG Status Indicator */}
                                  <div className="flex items-center gap-1.5 text-xs">
                                    <div className={`w-2 h-2 rounded-full ${
                                      ch.chunks && ch.chunks.length > 0 
                                        ? 'bg-emerald-green box-shadow-glow-green' 
                                        : 'bg-yellow-500'
                                    }`} />
                                    <span className={ch.chunks && ch.chunks.length > 0 ? 'text-emerald-400' : 'text-yellow-500'}>
                                      {ch.chunks && ch.chunks.length > 0 
                                        ? `Ingested (${ch.chunks.length} Vector Chunks)` 
                                        : 'Pending Ingestion'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="secondary"
                                  onClick={() => {
                                    setUploadChapter(hasUploadOpen ? null : ch);
                                    setSelectedFile(null);
                                    setIngestedChunksCount(null);
                                  }}
                                  className="py-1 px-2.5 text-xs flex items-center gap-1 rounded-lg"
                                >
                                  <UploadCloud size={13} /> Ingest PDF
                                </Button>
                                <button
                                  onClick={() => openEditChapter(ch)}
                                  className="p-1.5 text-gray-400 hover:text-white hover:bg-white/5 rounded transition-colors"
                                >
                                  <Edit2 size={13} />
                                </button>
                                <button
                                  onClick={() => handleDeleteChapter(ch.id)}
                                  className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>

                            {/* Dropdown PDF Uploader Box */}
                            {hasUploadOpen && (
                              <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="mt-4 pt-4 border-t border-glass-border overflow-hidden"
                              >
                                <div className="p-4 rounded-xl bg-black/40 border border-dashed border-white/10 flex flex-col items-center justify-center text-center">
                                  <UploadCloud size={32} className="text-neon-purple mb-2" />
                                  <p className="text-xs text-gray-400 mb-3">
                                    Upload chapter textbook PDF to extract vector embeddings.
                                  </p>
                                  <input
                                    type="file"
                                    accept=".pdf"
                                    onChange={handleFileChange}
                                    id={`pdf-file-${ch.id}`}
                                    className="hidden"
                                    disabled={isUploadingThis}
                                  />
                                  <div className="flex items-center gap-3">
                                    <label
                                      htmlFor={`pdf-file-${ch.id}`}
                                      className="py-1.5 px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                                    >
                                      {selectedFile ? 'Change File' : 'Select PDF'}
                                    </label>
                                    
                                    {selectedFile && (
                                      <Button
                                        variant="primary"
                                        onClick={() => handleUploadPDF(ch.id)}
                                        disabled={isUploadingThis}
                                        className="py-1.5 px-4 text-xs rounded-lg flex items-center gap-1.5"
                                      >
                                        {isUploadingThis ? (
                                          <>
                                            <Loader2 size={12} className="animate-spin" /> Ingesting...
                                          </>
                                        ) : (
                                          'Run RAG Ingest'
                                        )}
                                      </Button>
                                    )}
                                  </div>

                                  {selectedFile && (
                                    <p className="text-[11px] text-neon-purple font-medium mt-3">
                                      Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                                    </p>
                                  )}

                                  {/* Progress bar */}
                                  {isUploadingThis && (
                                    <div className="w-full max-w-xs bg-white/10 rounded-full h-1.5 mt-4 overflow-hidden">
                                      <div 
                                        className="bg-neon-purple h-full rounded-full transition-all duration-300"
                                        style={{ width: `${uploadProgress}%` }}
                                      />
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </GlassCard>
                        );
                      })
                    )}
                  </div>
                </>
              ) : (
                <div className="h-full flex flex-col justify-center items-center text-center p-12 bg-white/5 rounded-2xl border border-white/10 text-gray-500">
                  <BookOpen size={48} className="text-gray-600 mb-3" />
                  <h4 className="font-semibold text-gray-300">No Book Selected</h4>
                  <p className="text-sm mt-1 max-w-sm">
                    Select a textbook from the list on the left to edit its curriculum chapters and ingest PDFs.
                  </p>
                  <ChevronRight size={24} className="text-gray-600 mt-4 animate-pulse hidden lg:block rotate-90" />
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'users' && isAdmin && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-4"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-white">Institution User Directory</h3>
              <Button 
                variant="primary" 
                onClick={() => {
                  resetUserForm();
                  setIsUserModalOpen(true);
                }}
                className="py-1.5 px-4 text-sm flex items-center gap-1.5 rounded-xl"
              >
                <Plus size={16} /> Create User
              </Button>
            </div>

            {/* Users Table */}
            <GlassCard className="p-0 overflow-hidden border border-white/5">
              {isLoadingUsers ? (
                <div className="p-12 flex justify-center items-center gap-2 text-gray-400">
                  <Loader2 className="animate-spin text-neon-purple" /> Loading user records...
                </div>
              ) : usersList.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  No users found in this tenant directory.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-glass-border bg-white/5 text-gray-400 text-xs font-semibold uppercase tracking-wider">
                        <th className="p-4">Email Address</th>
                        <th className="p-4">Assigned Role</th>
                        <th className="p-4">Created Date</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-glass-border text-sm text-gray-300">
                      {usersList.map((u) => (
                        <tr key={u.id} className="hover:bg-white/5 transition-colors">
                          <td className="p-4 font-medium text-white">{u.email}</td>
                          <td className="p-4">
                            <span className={`px-2.5 py-0.5 rounded text-xs font-semibold ${
                              u.role === 'admin' 
                                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                : u.role === 'teacher'
                                  ? 'bg-neon-purple/20 text-neon-purple border border-neon-purple/30'
                                  : 'bg-emerald-green/20 text-emerald-green border border-emerald-green/30'
                            }`}>
                              {u.role.toUpperCase()}
                            </span>
                          </td>
                          <td className="p-4 text-gray-400">
                            {new Date(u.createdAt).toLocaleDateString(undefined, {
                              year: 'numeric', month: 'short', day: 'numeric'
                            })}
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => openEditUser(u)}
                                className="p-1.5 text-gray-400 hover:text-white hover:bg-white/5 rounded transition-colors"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteUser(u.id)}
                                disabled={u.id === user.id}
                                className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </GlassCard>
          </motion.div>
        )}
      </div>

      {/* --- Book Modal (Create/Edit) --- */}
      {isBookModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md glass-panel p-6 rounded-2xl border border-white/10"
          >
            <h3 className="text-xl font-bold text-white mb-4">
              {editingBook ? 'Edit Book Details' : 'Create New Book'}
            </h3>
            <form onSubmit={handleSaveBook} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 font-semibold mb-1 uppercase">Book Title</label>
                <Input
                  required
                  value={bookTitle}
                  onChange={(e) => setBookTitle(e.target.value)}
                  placeholder="e.g. Advanced Chemistry Concepts"
                  className="w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 font-semibold mb-1 uppercase">Class / Grade</label>
                  <div className="relative">
                    <Input
                      required
                      value={bookClass}
                      onChange={(e) => setBookClass(e.target.value)}
                      placeholder="e.g. Grade 11"
                      className="w-full"
                    />
                    {uniqueClasses.length > 0 && (
                      <div className="flex gap-1 flex-wrap mt-1.5">
                        {uniqueClasses.slice(0, 3).map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setBookClass(c)}
                            className="text-[10px] bg-white/5 hover:bg-white/15 px-2 py-0.5 rounded text-gray-300 transition-colors"
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 font-semibold mb-1 uppercase">Subject</label>
                  <div className="relative">
                    <Input
                      required
                      value={bookSubject}
                      onChange={(e) => setBookSubject(e.target.value)}
                      placeholder="e.g. Chemistry"
                      className="w-full"
                    />
                    {uniqueSubjects.length > 0 && (
                      <div className="flex gap-1 flex-wrap mt-1.5">
                        {uniqueSubjects.slice(0, 3).map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setBookSubject(s)}
                            className="text-[10px] bg-white/5 hover:bg-white/15 px-2 py-0.5 rounded text-gray-300 transition-colors"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Optional PDF Upload Field */}
              {!editingBook && (
                <div className="border-t border-glass-border pt-4">
                  <label className="block text-xs text-gray-400 font-semibold mb-1.5 uppercase">
                    Upload Textbook PDF (Optional)
                  </label>
                  
                  <div className="p-4 rounded-xl bg-black/40 border border-dashed border-white/10 flex flex-col items-center justify-center text-center">
                    <UploadCloud size={24} className="text-neon-purple mb-1.5" />
                    <p className="text-[11px] text-gray-400 mb-2">
                      Automatically registers content to RAG vectors.
                    </p>
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setBookFile(e.target.files[0]);
                        }
                      }}
                      id="book-pdf-file"
                      className="hidden"
                      disabled={isActionLoading}
                    />
                    <label
                      htmlFor="book-pdf-file"
                      className="py-1 px-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                    >
                      {bookFile ? 'Change File' : 'Select PDF'}
                    </label>

                    {bookFile && (
                      <div className="mt-2.5 flex items-center gap-1.5 text-xs text-emerald-400 font-medium bg-emerald-green/10 border border-emerald-green/20 px-2.5 py-1 rounded-lg">
                        <CheckCircle size={12} />
                        <span className="truncate max-w-[180px]">{bookFile.name}</span>
                        <button
                          type="button"
                          onClick={() => setBookFile(null)}
                          className="text-gray-400 hover:text-red-400 ml-1"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Progress Stepper during ingestion */}
              {isActionLoading && bookCreationStep !== 'idle' && (
                <div className="p-3.5 rounded-xl bg-neon-purple/10 border border-neon-purple/20 text-xs space-y-2 mt-4">
                  <div className="flex justify-between font-semibold text-neon-purple">
                    <span>RAG Ingestion Sequence</span>
                    <span className="animate-pulse">Active</span>
                  </div>
                  <div className="space-y-1.5 text-gray-300">
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${bookCreationStep !== 'book' ? 'bg-neon-purple' : 'bg-neon-purple animate-ping'}`} />
                      <span className={bookCreationStep === 'book' ? 'text-white font-medium' : 'text-gray-400'}>
                        Step 1: Creating book metadata
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${
                        bookCreationStep === 'chapter' ? 'bg-neon-purple animate-ping' :
                        (bookCreationStep === 'ingest' ? 'bg-neon-purple' : 'bg-gray-600')
                      }`} />
                      <span className={bookCreationStep === 'chapter' ? 'text-white font-medium' : 'text-gray-400'}>
                        Step 2: Configuring curriculum indexes
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${bookCreationStep === 'ingest' ? 'bg-neon-purple animate-ping' : 'bg-gray-600'}`} />
                      <span className={bookCreationStep === 'ingest' ? 'text-white font-medium animate-pulse' : 'text-gray-400'}>
                        Step 3: Ingesting vectors (may take a moment)
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-glass-border">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsBookModalOpen(false)}
                  className="flex-1 rounded-xl"
                  disabled={isActionLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="flex-1 rounded-xl flex items-center justify-center gap-1.5"
                  disabled={isActionLoading}
                >
                  {isActionLoading && <Loader2 size={14} className="animate-spin" />}
                  Save Book
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* --- Chapter Modal (Create/Edit) --- */}
      {isChapterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md glass-panel p-6 rounded-2xl border border-white/10"
          >
            <h3 className="text-xl font-bold text-white mb-4">
              {editingChapter ? 'Rename Chapter' : 'Add Chapter'}
            </h3>
            <form onSubmit={handleSaveChapter} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 font-semibold mb-1 uppercase">Chapter Title</label>
                <Input
                  required
                  value={chapterTitle}
                  onChange={(e) => setChapterTitle(e.target.value)}
                  placeholder="e.g. Chapter 1: Chemical Bonds"
                  className="w-full"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-glass-border">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsChapterModalOpen(false)}
                  className="flex-1 rounded-xl"
                  disabled={isActionLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="flex-1 rounded-xl flex items-center justify-center gap-1.5"
                  disabled={isActionLoading}
                >
                  {isActionLoading && <Loader2 size={14} className="animate-spin" />}
                  Save Chapter
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* --- User Modal (Create/Edit) --- */}
      {isUserModalOpen && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md glass-panel p-6 rounded-2xl border border-white/10"
          >
            <h3 className="text-xl font-bold text-white mb-4">
              {editingUser ? 'Edit User Role' : 'Register New User'}
            </h3>
            <form onSubmit={handleSaveUser} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 font-semibold mb-1 uppercase">Email Address</label>
                <Input
                  type="email"
                  required
                  disabled={!!editingUser}
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="name@school.edu"
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 font-semibold mb-1 uppercase">
                  {editingUser ? 'New Password (Optional)' : 'Password'}
                </label>
                <Input
                  type="password"
                  required={!editingUser}
                  value={userPassword}
                  onChange={(e) => setUserPassword(e.target.value)}
                  placeholder={editingUser ? 'Leave blank to keep current' : '•••••••• (min 8 chars)'}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 font-semibold mb-1 uppercase">User Role</label>
                <select
                  value={userRole}
                  onChange={(e) => setUserRole(e.target.value)}
                  className="w-full py-2.5 px-3 border border-glass-border rounded-xl bg-black text-white focus:outline-none focus:ring-2 focus:ring-neon-purple focus:border-transparent transition-all"
                >
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4 border-t border-glass-border">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsUserModalOpen(false)}
                  className="flex-1 rounded-xl"
                  disabled={isActionLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="flex-1 rounded-xl flex items-center justify-center gap-1.5"
                  disabled={isActionLoading}
                >
                  {isActionLoading && <Loader2 size={14} className="animate-spin" />}
                  Save User
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
