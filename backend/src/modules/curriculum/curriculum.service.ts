import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Book } from '../../database/entities/book.entity';
import { Chapter } from '../../database/entities/chapter.entity';
import { CreateBookDto } from './dto/create-book.dto';
import { CreateChapterDto } from './dto/create-chapter.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { UpdateChapterDto } from './dto/update-chapter.dto';

@Injectable()
export class CurriculumService {
  constructor(
    @InjectRepository(Book)
    private readonly bookRepository: Repository<Book>,
    @InjectRepository(Chapter)
    private readonly chapterRepository: Repository<Chapter>,
  ) {}

  async createBook(tenantId: string, dto: CreateBookDto): Promise<Book> {
    const book = this.bookRepository.create({ ...dto, tenantId });
    return this.bookRepository.save(book);
  }

  async findAllBooks(tenantId: string): Promise<Book[]> {
    const books = await this.bookRepository.find({
      where: { tenantId },
      relations: { chapters: true },
      order: { createdAt: 'DESC' },
    });

    if (books.length === 0) {
      const defaultBook = this.bookRepository.create({
        tenantId,
        title: 'Textbook of AI',
        class: 'Grade 10',
        subject: 'Computer Science',
      });
      const savedBook = await this.bookRepository.save(defaultBook);

      const defaultChapter = this.chapterRepository.create({
        bookId: savedBook.id,
        title: 'Ch 2: Core Concepts',
      });
      const savedChapter = await this.chapterRepository.save(defaultChapter);

      savedBook.chapters = [savedChapter];
      return [savedBook];
    }

    return books;
  }

  async findBook(tenantId: string, bookId: string): Promise<Book> {
    const book = await this.bookRepository.findOne({
      where: { id: bookId, tenantId },
      relations: { chapters: true },
    });
    if (!book) {
      throw new NotFoundException('Book not found');
    }
    return book;
  }

  async updateBook(
    tenantId: string,
    bookId: string,
    dto: UpdateBookDto,
  ): Promise<Book> {
    const book = await this.findBook(tenantId, bookId);
    Object.assign(book, dto);
    return this.bookRepository.save(book);
  }

  async deleteBook(tenantId: string, bookId: string): Promise<void> {
    const book = await this.findBook(tenantId, bookId);
    await this.bookRepository.remove(book);
  }

  async createChapter(
    tenantId: string,
    bookId: string,
    dto: CreateChapterDto,
  ): Promise<Chapter> {
    await this.findBook(tenantId, bookId);
    const chapter = this.chapterRepository.create({ ...dto, bookId });
    return this.chapterRepository.save(chapter);
  }

  async findChapters(tenantId: string, bookId: string): Promise<Chapter[]> {
    await this.findBook(tenantId, bookId);
    return this.chapterRepository.find({
      where: { bookId },
      order: { createdAt: 'ASC' },
    });
  }

  async findChapter(
    tenantId: string,
    bookId: string,
    chapterId: string,
  ): Promise<Chapter> {
    await this.findBook(tenantId, bookId);
    const chapter = await this.chapterRepository.findOne({
      where: { id: chapterId, bookId },
      relations: { chunks: true },
    });
    if (!chapter) {
      throw new NotFoundException('Chapter not found');
    }
    return chapter;
  }

  async findDistinctClasses(tenantId: string): Promise<string[]> {
    const result = await this.bookRepository
      .createQueryBuilder('book')
      .select('book.class', 'class')
      .where('book.tenantId = :tenantId', { tenantId })
      .distinct(true)
      .getRawMany();
    return result.map((r) => r.class);
  }

  async findSubjectsByClass(
    tenantId: string,
    className: string,
  ): Promise<{ id: string; name: string }[]> {
    const books = await this.bookRepository.find({
      where: { tenantId, class: className },
      select: { id: true, subject: true },
      order: { subject: 'ASC' },
    });
    return books.map((b) => ({ id: b.id, name: b.subject }));
  }

  async findChaptersBySubject(
    tenantId: string,
    subjectId: string,
  ): Promise<Chapter[]> {
    // subjectId corresponds to bookId in our schema
    await this.findBook(tenantId, subjectId);
    return this.chapterRepository.find({
      where: { bookId: subjectId },
      order: { createdAt: 'ASC' },
    });
  }
}
