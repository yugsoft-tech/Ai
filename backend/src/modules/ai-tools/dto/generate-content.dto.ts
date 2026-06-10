import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class GenerateContentDto {
  @IsString()
  @MaxLength(2000)
  prompt: string;

  @IsOptional()
  @IsUUID()
  bookId?: string;

  @IsOptional()
  @IsUUID()
  chapterId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  grade?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  chapterTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  subject?: string;
}
