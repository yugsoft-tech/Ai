import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/role.enum';
import { AuthenticatedUser } from '../../common/types/jwt-payload.interface';
import { CurriculumService } from './curriculum.service';
import { CreateBookDto } from './dto/create-book.dto';
import { CreateChapterDto } from './dto/create-chapter.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { UpdateChapterDto } from './dto/update-chapter.dto';

@Controller('curriculum')
export class CurriculumController {
  constructor(private readonly curriculumService: CurriculumService) {}

  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @Post('books')
  createBook(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateBookDto,
  ) {
    return this.curriculumService.createBook(user.tenantId, dto);
  }

  @Get('books')
  findAllBooks(@CurrentUser() user: AuthenticatedUser) {
    return this.curriculumService.findAllBooks(user.tenantId);
  }

  @Get('books/:bookId')
  findBook(
    @CurrentUser() user: AuthenticatedUser,
    @Param('bookId') bookId: string,
  ) {
    return this.curriculumService.findBook(user.tenantId, bookId);
  }

  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @Patch('books/:bookId')
  updateBook(
    @CurrentUser() user: AuthenticatedUser,
    @Param('bookId') bookId: string,
    @Body() dto: UpdateBookDto,
  ) {
    return this.curriculumService.updateBook(user.tenantId, bookId, dto);
  }

  @Roles(UserRole.ADMIN)
  @Delete('books/:bookId')
  deleteBook(
    @CurrentUser() user: AuthenticatedUser,
    @Param('bookId') bookId: string,
  ) {
    return this.curriculumService.deleteBook(user.tenantId, bookId);
  }

  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @Post('books/:bookId/chapters')
  createChapter(
    @CurrentUser() user: AuthenticatedUser,
    @Param('bookId') bookId: string,
    @Body() dto: CreateChapterDto,
  ) {
    return this.curriculumService.createChapter(user.tenantId, bookId, dto);
  }

  @Get('books/:bookId/chapters')
  findChapters(
    @CurrentUser() user: AuthenticatedUser,
    @Param('bookId') bookId: string,
  ) {
    return this.curriculumService.findChapters(user.tenantId, bookId);
  }

  @Get('books/:bookId/chapters/:chapterId')
  findChapter(
    @CurrentUser() user: AuthenticatedUser,
    @Param('bookId') bookId: string,
    @Param('chapterId') chapterId: string,
  ) {
    return this.curriculumService.findChapter(
      user.tenantId,
      bookId,
      chapterId,
    );
  }

  @Get('classes')
  findClasses(@CurrentUser() user: AuthenticatedUser) {
    return this.curriculumService.findDistinctClasses(user.tenantId);
  }

  @Get('subjects')
  findSubjects(
    @CurrentUser() user: AuthenticatedUser,
    @Query('classId') classId: string,
  ) {
    return this.curriculumService.findSubjectsByClass(user.tenantId, classId);
  }

  @Get('chapters')
  findChaptersBySubject(
    @CurrentUser() user: AuthenticatedUser,
    @Query('subjectId') subjectId: string,
  ) {
    return this.curriculumService.findChaptersBySubject(user.tenantId, subjectId);
  }
}
