"use client";

import React, { useState, useEffect } from 'react';
import { GamifiedQuizUI } from '@/components/features/gamified-quiz/GamifiedQuizUI';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function StudentQuizPage() {
  const { id } = useParams();
  const router = useRouter();
  
  const [isLoading, setIsLoading] = useState(true);
  const [quizData, setQuizData] = useState(null);

  useEffect(() => {
    // Mock fetching quiz data
    const fetchQuiz = async () => {
      setIsLoading(true);
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setQuizData({
        title: id === 'q1' ? 'Introduction to AI' : 'Neural Networks Basics',
        questions: [
          {
            id: '1',
            type: 'story_trivia',
            question: 'What technology is designed to mimic the interconnected neurons of the human brain?',
            options: [
              'Central Processing Unit (CPU)',
              'Artificial Neural Network',
              'Random Access Memory (RAM)',
              'Solid State Drive'
            ],
            correctAnswer: 'Artificial Neural Network',
            timeLimit: 15
          },
          {
            id: '2',
            type: 'word_meaning',
            question: 'Which of the following best describes "Machine Learning"?',
            options: [
              'A machine that builds other machines',
              'A subfield of AI focused on algorithms that learn from data',
              'A type of mechanical engine',
              'A database management system'
            ],
            correctAnswer: 'A subfield of AI focused on algorithms that learn from data',
            timeLimit: 15
          },
          {
            id: '3',
            type: 'riddle',
            question: 'I have weights and biases, but I am not a judge. I have layers, but I am not an onion. What am I?',
            options: [
              'A Neural Network',
              'A Decision Tree',
              'A Support Vector Machine',
              'A Random Forest'
            ],
            correctAnswer: 'A Neural Network',
            timeLimit: 15
          }
        ]
      });
      setIsLoading(false);
    };

    fetchQuiz();
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-indigo-500 mb-4" />
        <p className="text-gray-400 animate-pulse">Loading your quiz...</p>
      </div>
    );
  }

  if (!quizData) return null;

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      <Link 
        href="/student" 
        className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
      >
        <ArrowLeft size={20} /> Back to Dashboard
      </Link>
      
      <GamifiedQuizUI questions={quizData.questions} title={quizData.title} />
    </div>
  );
}
