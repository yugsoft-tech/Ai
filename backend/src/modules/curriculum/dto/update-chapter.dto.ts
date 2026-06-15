import { IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateChapterDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  title: string;
}
