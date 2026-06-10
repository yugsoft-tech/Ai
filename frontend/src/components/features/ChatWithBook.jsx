import React, { useState, useRef, useEffect } from 'react';
import GlassCard from '@/components/ui/GlassCard';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import BookSelectionForm from '@/components/BookSelectionForm';
import { Send, Sparkles, BookOpen, Loader2, RefreshCw } from 'lucide-react';
import useCurriculumStore from '@/store/curriculumStore';
import api from '@/services/api';

export default function ChatWithBook() {
  // null = show selection form; object = chat is active
  const [selection, setSelection] = useState(null);
  const { setSelectedSubjectId, setSelectedChapterId } = useCurriculumStore();

  const [messages, setMessages] = useState([
    {
      role: 'ai',
      content:
        'Hello! I am your AI Teaching Assistant. How can I help you explain concepts from your selected textbook chapter?',
      citation: 'Assistant',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const endOfMessagesRef = useRef(null);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);

    const queryText = input;
    setInput('');
    setIsLoading(true);

    try {
      const response = await api.post('/rag/chat', {
        query: queryText,
        bookId: selection?.bookId || undefined,
        chapterId: selection?.chapterId || undefined,
        history: messages.map((m) => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.content,
        })),
      });

      const data = response.data?.data || response.data;
      const { answer, sources } = data;

      const citation =
        sources && sources.length > 0
          ? sources[0].chapterTitle
          : 'General Knowledge';

      setMessages((prev) => [
        ...prev,
        { role: 'ai', content: answer, citation },
      ]);
    } catch (err) {
      console.warn('Textbook chat error:', err.message);
      const apiError = err.response?.data?.message;
      let errorMessage = '';
      if (typeof apiError === 'string') {
        errorMessage = apiError;
      } else if (Array.isArray(apiError)) {
        errorMessage = apiError.join(', ');
      } else if (apiError && typeof apiError === 'object') {
        errorMessage = apiError.message || JSON.stringify(apiError);
      } else {
        errorMessage =
          err.response?.data?.error ||
          err.message ||
          'Sorry, I could not complete the request.';
      }

      setMessages((prev) => [
        ...prev,
        { role: 'ai', content: errorMessage, citation: 'System Error' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // ── Step 1: Show BookSelectionForm (no periods field) ──
  if (!selection) {
    return (
      <BookSelectionForm
        hidePeriods
        onGenerate={(data) => {
          setSelection(data);
          // Sync into curriculum store → Textbook Reader loads automatically
          setSelectedSubjectId(data.bookId);
          setSelectedChapterId(data.chapterId);
        }}
      />
    );
  }

  // ── Step 2: Chat UI ──
  return (
    <GlassCard className="h-full flex flex-col relative p-0 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-glass-border bg-obsidian/50 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="text-neon-purple" size={20} />
          <div>
            <h3 className="font-semibold text-white leading-tight">Chat with Textbook</h3>
            <p className="text-xs text-gray-400 leading-tight mt-0.5">
              {selection.chapterTitle}
              <span className="mx-1.5 text-gray-600">·</span>
              {selection.bookTitle}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Sparkles className="text-emerald-green" size={18} />
          <button
            onClick={() => {
              setSelection(null);
              setSelectedSubjectId('');
              setSelectedChapterId('');
            }}
            title="Change book / chapter"
            className="text-gray-400 hover:text-white transition-colors"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex flex-col max-w-[80%] ${
              msg.role === 'user'
                ? 'self-end items-end ml-auto'
                : 'self-start items-start mr-auto'
            }`}
          >
            <div
              className={`p-4 rounded-2xl ${
                msg.role === 'user'
                  ? 'bg-neon-purple text-white rounded-br-sm box-shadow-glow-purple'
                  : 'bg-white/10 text-gray-200 rounded-bl-sm border border-white/5'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
            </div>
            {msg.citation && (
              <span className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                <BookOpen size={10} /> Source: {msg.citation}
              </span>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex flex-col max-w-[80%] self-start items-start mr-auto">
            <div className="p-4 rounded-2xl bg-white/10 text-gray-400 rounded-bl-sm border border-white/5 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-neon-purple animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="w-2.5 h-2.5 rounded-full bg-neon-purple animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="w-2.5 h-2.5 rounded-full bg-neon-purple animate-bounce" style={{ animationDelay: '300ms' }}></span>
            </div>
          </div>
        )}
        <div ref={endOfMessagesRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-glass-border bg-obsidian/80 backdrop-blur-lg">
        <div className="flex gap-2 relative">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask anything about the textbook..."
            className="pr-12 rounded-full"
            disabled={isLoading}
          />
          <Button
            variant="primary"
            onClick={handleSend}
            className="absolute right-1 top-1 bottom-1 rounded-full px-3 py-1 h-auto!"
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
          </Button>
        </div>
      </div>
    </GlassCard>
  );
}
