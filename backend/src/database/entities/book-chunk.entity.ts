import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { vectorTransformer } from '../types/vector-column.transformer';
import { Chapter } from './chapter.entity';

@Entity('book_chunks')
export class BookChunk {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'chapter_id', type: 'uuid' })
  chapterId: string;

  @ManyToOne(() => Chapter, (chapter) => chapter.chunks, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'chapter_id' })
  chapter: Chapter;

  @Column({ name: 'content_text', type: 'text' })
  contentText: string;

  @Column({ name: 'page_number', type: 'int', nullable: true })
  pageNumber: number | null;

  @Column({
    type: 'vector',
    length: 768,
    nullable: true,
    transformer: vectorTransformer,
  })
  embedding: number[] | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
