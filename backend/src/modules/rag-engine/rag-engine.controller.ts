import {
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/role.enum';
import { AuthenticatedUser } from '../../common/types/jwt-payload.interface';
import { IngestPdfDto } from './dto/ingest-pdf.dto';
import { SemanticSearchDto } from './dto/semantic-search.dto';
import { RagChatDto } from './dto/rag-chat.dto';
import { RagEngineService } from './rag-engine.service';

@Controller('rag')
export class RagEngineController {
  constructor(private readonly ragEngineService: RagEngineService) {}

  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @Post('ingest')
  @UseInterceptors(FileInterceptor('file'))
  ingestPdf(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: IngestPdfDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.ragEngineService.ingestPdf(
      user.tenantId,
      dto.chapterId,
      file.buffer,
    );
  }

  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT)
  @Post('search')
  search(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SemanticSearchDto,
  ) {
    return this.ragEngineService.semanticSearch(user.tenantId, dto);
  }

  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT)
  @Post('chat')
  chat(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RagChatDto,
  ) {
    return this.ragEngineService.chat(user.tenantId, dto);
  }

  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @Post('ingest-book')
  @UseInterceptors(FileInterceptor('file'))
  ingestBook(
    @CurrentUser() user: AuthenticatedUser,
    @Body('bookId') bookId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.ragEngineService.processAndIngestTextbook(user.tenantId, bookId, file.buffer);
  }
}
