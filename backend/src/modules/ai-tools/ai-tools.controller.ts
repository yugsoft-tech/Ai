import { Body, Controller, Param, Post, ForbiddenException } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/role.enum';
import { AuthenticatedUser } from '../../common/types/jwt-payload.interface';
import { AiOrchestratorService } from './ai-orchestrator.service';
import { AiToolType } from './ai-tool-type';
import { GenerateContentDto } from './dto/generate-content.dto';

@Controller('ai-tools')
export class AiToolsController {
  constructor(private readonly orchestrator: AiOrchestratorService) {}

  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT)
  @Post(':tool/generate')
  generate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('tool') tool: string,
    @Body() dto: GenerateContentDto,
  ) {
    if (user.role === UserRole.STUDENT && tool !== 'gamified-quiz') {
      throw new ForbiddenException('Students can only access the Gamified Quiz Generator');
    }

    return this.orchestrator.generate(
      user.tenantId,
      tool as AiToolType,
      dto,
    );
  }
}
