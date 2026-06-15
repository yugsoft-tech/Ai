import { useState, useEffect, useRef } from 'react';

export interface QuizQuestion {
  id: string;
  type: string;
  question: string;
  options: string[];
  correctAnswer: string;
  timeLimit: number;
}

export interface UserAnswer {
  questionId: string;
  selectedAnswer: string;
  timeTaken: number;
}

export const useGamifiedQuiz = (questions: QuizQuestion[], title?: string) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [streak, setStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verifiedScore, setVerifiedScore] = useState<number | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const currentQuestion = questions[currentIndex];
  const isFinished = currentIndex >= questions.length;

  useEffect(() => {
    if (isFinished || isSubmitting) return;

    setTimeLeft(15);
    
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentIndex, isFinished, isSubmitting]);

  const handleTimeout = () => {
    handleAnswer('', 15); // Empty string for selected answer to indicate timeout
  };

  const handleAnswer = (selectedAnswer: string, timeTaken: number = 15 - timeLeft) => {
    if (timerRef.current) clearInterval(timerRef.current);

    setUserAnswers((prev) => [
      ...prev,
      {
        questionId: currentQuestion.id,
        selectedAnswer,
        timeTaken,
      },
    ]);

    // Update streak optimistically on frontend (backend verifies truth)
    const isCorrect = selectedAnswer === currentQuestion.correctAnswer;
    if (isCorrect) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak >= 2) {
        try {
          new Audio('/streak.mp3').play().catch(e => console.warn('Audio play failed:', e));
        } catch(e) {}
      }
    } else {
      setStreak(0);
    }

    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      submitQuiz();
    }
  };

  const submitQuiz = async () => {
    setIsSubmitting(true);
    
    setTimeout(async () => {
      try {
        const payload = {
          title,
          originalQuestions: questions,
          answers: userAnswers,
        };
      } catch (err) {
        console.error(err);
      }
    }, 0);
  };

  // Improved submit handler that gets called when we reach the end
  useEffect(() => {
    if (isFinished && !isSubmitting && userAnswers.length === questions.length) {
      const finishAndSubmit = async () => {
        setIsSubmitting(true);
        try {
          // get token from local storage
          const token = localStorage.getItem('auth-storage') ? JSON.parse(localStorage.getItem('auth-storage')!).state.token : null;
          const headers: any = {
            'Content-Type': 'application/json',
          };
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }
          
          const res = await fetch('http://localhost:4001/api/v1/quiz/validate-score', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              title: title || 'Untitled Quiz',
              originalQuestions: questions,
              answers: userAnswers,
            }),
          });
          const data = await res.json();
          if (data.success) {
            setVerifiedScore(data.verifiedScore);
          }
        } catch (err) {
          console.error('Failed to submit quiz', err);
        } finally {
          setIsSubmitting(false);
        }
      };
      finishAndSubmit();
    }
  }, [isFinished, userAnswers, questions, title]);

  return {
    currentIndex,
    currentQuestion,
    streak,
    timeLeft,
    userAnswers,
    isSubmitting,
    isFinished,
    verifiedScore,
    handleAnswer,
  };
};
