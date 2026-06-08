'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, FileText, Loader2 } from 'lucide-react';

import api from '@/services/api';

interface CreateBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function CreateBookModal({ isOpen, onClose, onSuccess }: CreateBookModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [bookClass, setBookClass] = useState('');
  const [bookSubject, setBookSubject] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    if (!bookClass.trim() || !bookSubject.trim()) {
      setError('Please provide Class and Subject.');
      return;
    }
    
    setIsUploading(true);
    setError(null);
    
    try {
      // 1. Create a Book entity in the DB
      const bookTitle = file.name.replace('.pdf', '').replace(/_/g, ' ');
      const bookRes = await api.post('/curriculum/books', {
        title: bookTitle,
        class: bookClass,
        subject: bookSubject
      });
      
      const bookId = bookRes.data?.data?.id || bookRes.data?.id;
      
      if (!bookId) {
        throw new Error('Failed to create book record.');
      }

      // 2. Upload PDF for AI RAG Processing
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bookId', bookId);

      await api.post('/rag/ingest-book', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setSuccess(true);
      if (onSuccess) onSuccess();
      
      setTimeout(() => {
        setSuccess(false);
        setFile(null);
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error('Upload error:', err);
      let errorMessage = 'Failed to process textbook.';
      if (err.response?.data?.message) {
        errorMessage = Array.isArray(err.response.data.message) 
          ? err.response.data.message[0] 
          : typeof err.response.data.message === 'object'
            ? JSON.stringify(err.response.data.message)
            : err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg glass-panel rounded-2xl p-6 shadow-2xl border border-[rgba(255,255,255,0.1)] bg-[#0a0a0a]"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            <div className="mb-6">
              <h2 className="text-xl font-bold text-white mb-1">Upload New Textbook</h2>
              <p className="text-sm text-gray-400">
                Upload a PDF. Our AI will automatically chunk it into chapters and blocks.
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                <strong>Upload Failed:</strong> {error}
              </div>
            )}

            {success ? (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4 box-shadow-glow-green">
                  <FileText className="text-emerald-500" size={32} />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Upload Successful!</h3>
                <p className="text-sm text-gray-400">The textbook has been processed and indexed.</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex gap-4 mb-2">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-400 mb-1">Class / Grade</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 6, Grade 10" 
                      value={bookClass}
                      onChange={(e) => setBookClass(e.target.value)}
                      className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-neon-purple transition-colors"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-400 mb-1">Subject</label>
                    <input 
                      type="text" 
                      placeholder="e.g. english, Science" 
                      value={bookSubject}
                      onChange={(e) => setBookSubject(e.target.value)}
                      className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-neon-purple transition-colors"
                    />
                  </div>
                </div>

                <div 
                  className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-colors
                    ${file ? 'border-neon-purple bg-neon-purple/5' : 'border-[rgba(255,255,255,0.1)] hover:border-[rgba(255,255,255,0.2)] hover:bg-[rgba(255,255,255,0.02)]'}
                  `}
                >
                  <input 
                    type="file" 
                    accept=".pdf" 
                    className="hidden" 
                    id="file-upload" 
                    onChange={handleFileChange}
                  />
                  <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center w-full h-full">
                    <div className="w-12 h-12 rounded-full bg-[rgba(255,255,255,0.05)] flex items-center justify-center mb-4">
                      <Upload className="text-gray-400" size={24} />
                    </div>
                    {file ? (
                      <div>
                        <p className="text-sm font-medium text-white mb-1">{file.name}</p>
                        <p className="text-xs text-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm font-medium text-white mb-1">Click to upload or drag and drop</p>
                        <p className="text-xs text-gray-400">PDF up to 50MB</p>
                      </div>
                    )}
                  </label>
                </div>

                <div className="flex gap-3 justify-end">
                  <button 
                    onClick={onClose}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-[rgba(255,255,255,0.05)] transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleUpload}
                    disabled={!file || isUploading}
                    className="px-6 py-2 bg-neon-purple hover:bg-[#7c3aed] disabled:bg-gray-700 disabled:text-gray-400 text-white rounded-lg text-sm font-semibold transition-colors box-shadow-glow-purple flex items-center gap-2"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Processing AI...
                      </>
                    ) : (
                      'Start Ingestion'
                    )}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
