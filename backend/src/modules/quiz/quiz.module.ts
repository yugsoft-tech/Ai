import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuizController } from './quiz.controller';
import { QuizService } from './quiz.service';
import { QuizResult } from './entities/quiz-result.entity';

@Module({
  imports: [TypeOrmModule.forFeature([QuizResult])],
  controllers: [QuizController],
  providers: [QuizService],
})
export class QuizModule {}
