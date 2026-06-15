import { create } from 'zustand';
import api from '@/services/api';

const useCurriculumStore = create((set, get) => ({
  books: [],
  classes: [],
  subjects: [],
  chapters: [],
  
  selectedClassId: '',
  selectedSubjectId: '',
  selectedChapterId: '',
  
  isBooksLoading: false,
  isClassesLoading: false,
  isSubjectsLoading: false,
  isChaptersLoading: false,

  chapterDetails: null,
  isChapterDetailsLoading: false,

  fetchBooks: async () => {
    set({ isBooksLoading: true });
    try {
      const response = await api.get('/curriculum/books');
      const data = response.data?.data || response.data;
      const books = Array.isArray(data) ? data : [];
      set({ books });
    } catch (err) {
      console.warn('Failed to fetch books:', err.message);
      set({ books: [] });
    } finally {
      set({ isBooksLoading: false });
    }
  },

  fetchClasses: async () => {
    set({ isClassesLoading: true });
    try {
      const response = await api.get('/curriculum/classes');
      const data = response.data?.data || response.data;
      const classes = Array.isArray(data) ? data : [];
      set({ classes });

      if (classes.length > 0 && !get().selectedClassId) {
        get().setSelectedClassId(classes[0]);
      }
    } catch (err) {
      console.warn('Failed to fetch classes:', err.message);
      set({ classes: [] });
    } finally {
      set({ isClassesLoading: false });
    }
  },

  fetchSubjects: async (classId) => {
    if (!classId) return;
    set({ isSubjectsLoading: true });
    try {
      const response = await api.get(`/curriculum/subjects?classId=${encodeURIComponent(classId)}`);
      const data = response.data?.data || response.data;
      const subjects = Array.isArray(data) ? data : [];
      set({ subjects });

      if (subjects.length > 0) {
        const currentSelectedSubjectId = get().selectedSubjectId;
        if (!currentSelectedSubjectId || !subjects.some(s => s.id === currentSelectedSubjectId)) {
          get().setSelectedSubjectId(subjects[0].id);
        }
      } else {
        get().setSelectedSubjectId('');
      }
    } catch (err) {
      console.warn('Failed to fetch subjects:', err.message);
      set({ subjects: [] });
    } finally {
      set({ isSubjectsLoading: false });
    }
  },

  fetchChapters: async (subjectId) => {
    if (!subjectId) return;
    set({ isChaptersLoading: true });
    try {
      const response = await api.get(`/curriculum/chapters?subjectId=${encodeURIComponent(subjectId)}`);
      const data = response.data?.data || response.data;
      const chapters = Array.isArray(data) ? data : [];
      set({ chapters });

      if (chapters.length > 0) {
        const currentSelectedChapterId = get().selectedChapterId;
        if (!currentSelectedChapterId || !chapters.some(c => c.id === currentSelectedChapterId)) {
          get().setSelectedChapterId(chapters[0].id);
        }
      } else {
        get().setSelectedChapterId('');
      }
    } catch (err) {
      console.warn('Failed to fetch chapters:', err.message);
      set({ chapters: [] });
    } finally {
      set({ isChaptersLoading: false });
    }
  },

  fetchChapterDetails: async (subjectId, chapterId) => {
    if (!subjectId || !chapterId) {
      set({ chapterDetails: null });
      return;
    }
    set({ isChapterDetailsLoading: true });
    try {
      const response = await api.get(`/curriculum/books/${encodeURIComponent(subjectId)}/chapters/${encodeURIComponent(chapterId)}`);
      const data = response.data?.data || response.data;
      set({ chapterDetails: data });
    } catch (err) {
      console.warn('Failed to fetch chapter details:', err.message);
      set({ chapterDetails: null });
    } finally {
      set({ isChapterDetailsLoading: false });
    }
  },

  setSelectedClassId: (classId) => {
    set({ 
      selectedClassId: classId,
      selectedSubjectId: '',
      selectedChapterId: '',
      subjects: [],
      chapters: [],
      chapterDetails: null,
    });
    if (classId) {
      get().fetchSubjects(classId);
    }
  },

  setSelectedSubjectId: (subjectId) => {
    set({ 
      selectedSubjectId: subjectId,
      selectedChapterId: '',
      chapters: [],
      chapterDetails: null,
    });
    if (subjectId) {
      get().fetchChapters(subjectId);
    }
  },

  setSelectedChapterId: (chapterId) => {
    set({ selectedChapterId: chapterId });
    if (chapterId) {
      get().fetchChapterDetails(get().selectedSubjectId, chapterId);
    } else {
      set({ chapterDetails: null });
    }
  },
}));

export default useCurriculumStore;
