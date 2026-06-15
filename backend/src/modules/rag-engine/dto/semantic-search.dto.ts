import { IsInt, IsOptional, IsString, IsUUID, Max, Min, IsArray } from 'class-validator';

export class SemanticSearchDto {
  @IsString()
  query: string;

  @IsOptional()
  @IsUUID()
  chapterId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  chapterIds?: string[];

  @IsOptional()
  @IsUUID()
  bookId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  topK?: number;
}
