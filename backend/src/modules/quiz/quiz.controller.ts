import { Body, Controller, Post, Get, UseGuards } from '@nestjs/common';
import { QuizService } from './quiz.service';
import type { QuizValidationPayload } from './quiz.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/jwt-payload.interface';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('quiz')
@UseGuards(JwtAuthGuard)
export class QuizController {
  constructor(private readonly quizService: QuizService) {}

  @Post('validate-score')
  validateScore(
    @Body() payload: QuizValidationPayload,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.quizService.validateScore(payload, user.id);
  }

  @Get('my-results')
  getMyResults(@CurrentUser() user: AuthenticatedUser) {
    return this.quizService.getMyResults(user.id);
  }
}
