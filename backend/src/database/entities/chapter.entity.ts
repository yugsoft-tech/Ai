import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Book } from './book.entity';
import { BookChunk } from './book-chunk.entity';

@Entity('chapters')
export class Chapter {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'book_id', type: 'uuid' })
  bookId: string;

  @ManyToOne(() => Book, (book) => book.chapters, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'book_id' })
  book: Book;

  @Column({ length: 500 })
  title: string;

  // ── AI-extracted structural metadata ──────────────────────────────────────

  /** The unit/section this chapter belongs to (e.g. "Unit-2 Life Around Us") */
  @Column({ name: 'unit_title', type: 'varchar', length: 500, nullable: true })
  unitTitle: string | null;

  /** Sequential chapter number extracted by AI */
  @Column({ name: 'chapter_number', type: 'int', nullable: true })
  chapterNumber: number | null;

  /**
   * Key vocabulary/keywords for this chapter, extracted by AI.
   * Stored as a JSONB array so it is queryable and type-safe.
   */
  @Column({ name: 'approximate_keywords', type: 'jsonb', nullable: true })
  approximateKeywords: string[] | null;

  // ─────────────────────────────────────────────────────────────────────────

  @OneToMany(() => BookChunk, (chunk) => chunk.chapter)
  chunks: BookChunk[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
