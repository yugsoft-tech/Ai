import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuizResult } from './entities/quiz-result.entity';

export interface AnswerPayload {
  questionId: string;
  selectedAnswer: string;
  timeTaken: number;
}

export interface QuizValidationPayload {
  quizId?: string; // Optional if we are not persisting, but good for interface
  title?: string;
  originalQuestions: any[]; // The questions from the generated quiz to validate against
  answers: AnswerPayload[];
}

@Injectable()
export class QuizService {
  constructor(
    @InjectRepository(QuizResult)
    private quizResultRepository: Repository<QuizResult>,
  ) {}

  async validateScore(payload: QuizValidationPayload, userId?: string) {
    const { originalQuestions, answers, title } = payload;
    
    let totalScore = 0;
    let currentStreak = 0;

    // Create a map of questions for quick lookup
    const questionMap = new Map(originalQuestions.map(q => [q.id, q]));

    for (const answer of answers) {
      const originalQuestion = questionMap.get(answer.questionId);
      
      if (!originalQuestion) {
        // Question not found, break streak and skip scoring for it
        currentStreak = 0;
        continue;
      }

      const isCorrect = originalQuestion.correctAnswer === answer.selectedAnswer;

      if (isCorrect) {
        totalScore += 10; // Base points
        
        if (answer.timeTaken <= 5) {
          totalScore += 5; // Speed bonus
        }

        currentStreak++;
        if (currentStreak >= 3) {
          totalScore += 5; // Streak bonus
        }
      } else {
        currentStreak = 0; // Reset streak
      }
    }

    if (userId && title) {
      const result = this.quizResultRepository.create({
        userId,
        title,
        score: totalScore,
        totalQuestions: originalQuestions.length,
      });
      await this.quizResultRepository.save(result);
    }

    return {
      success: true,
      verifiedScore: totalScore,
    };
  }

  async getMyResults(userId: string) {
    return this.quizResultRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }
}
