import { ValueTransformer } from 'typeorm';

/** TypeORM transformer for pgvector columns (768-dim embeddings). */
export const vectorTransformer: ValueTransformer = {
  to: (value: number[] | null | undefined): string | null => {
    if (!value?.length) return null;
    return `[${value.join(',')}]`;
  },
  from: (value: string | null | undefined): number[] | null => {
    if (!value) return null;
    const cleaned = value.replace(/^\[|\]$/g, '');
    return cleaned.split(',').map((n) => parseFloat(n.trim()));
  },
};
