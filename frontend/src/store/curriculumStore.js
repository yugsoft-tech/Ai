import { create } from 'zustand';
import api from '@/services/api';

const useCurriculumStore = create((set, get) => ({
  books: [],
  selectedBookId: '',
  selectedChapterId: '',
  isLoading: false,

  fetchBooks: async () => {
    set({ isLoading: true });
    try {
      const response = await api.get('/curriculum/books');
      // The API response might wrap the actual data under 'data' due to NestJS conventions or the TransformInterceptor
      const data = response.data?.data || response.data;
      const books = Array.isArray(data) ? data : [];
      
      set({ books });

      // Default select the first book if none selected, or if the selected one was deleted
      const currentBookId = get().selectedBookId;
      const bookStillExists = books.some((b) => b.id === currentBookId);
      
      if (books.length > 0 && (!currentBookId || !bookStillExists)) {
        const firstBook = books[0];
        set({ selectedBookId: firstBook.id });
        if (firstBook.chapters && firstBook.chapters.length > 0) {
          set({ selectedChapterId: firstBook.chapters[0].id });
        } else {
          set({ selectedChapterId: '' });
        }
      } else if (books.length === 0) {
        set({ selectedBookId: '', selectedChapterId: '' });
      } else if (bookStillExists) {
        // Double check if selected chapter still exists
        const currentBook = books.find((b) => b.id === currentBookId);
        const chapterStillExists = currentBook?.chapters?.some((c) => c.id === get().selectedChapterId);
        if (!chapterStillExists && currentBook?.chapters && currentBook.chapters.length > 0) {
          set({ selectedChapterId: currentBook.chapters[0].id });
        } else if (!chapterStillExists) {
          set({ selectedChapterId: '' });
        }
      }
    } catch (err) {
      console.warn('Failed to fetch books in curriculumStore:', err.message);
    } finally {
      set({ isLoading: false });
    }
  },

  setSelectedBookId: (bookId) => {
    const book = get().books.find((b) => b.id === bookId);
    set({
      selectedBookId: bookId,
      selectedChapterId: book?.chapters?.[0]?.id || '',
    });
  },

  setSelectedChapterId: (chapterId) => {
    set({ selectedChapterId: chapterId });
  },
}));

export default useCurriculumStore;
