export default () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  database: {
    url: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'true',
    synchronize: process.env.DB_SYNCHRONIZE === 'true',
    logging: process.env.DB_LOGGING === 'true',
  },
  jwt: {
    secret: process.env.JWT_SECRET ?? 'dev-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  },
  openai: {
    apiKey: process.env.GEMINI_API_KEY ?? process.env.OPENAI_API_KEY ?? '',
    baseURL: process.env.OPENAI_BASE_URL ?? undefined,
    embeddingModel:
      process.env.GEMINI_EMBEDDING_MODEL ??
      process.env.OPENAI_EMBEDDING_MODEL ??
      'gemini-embedding-2',
    chatModel:
      process.env.GEMINI_CHAT_MODEL ??
      process.env.OPENAI_CHAT_MODEL ??
      'gemini-2.5-flash',
  },
  rag: {
    chunkSize: parseInt(process.env.RAG_CHUNK_SIZE ?? '800', 10),
    chunkOverlap: parseInt(process.env.RAG_CHUNK_OVERLAP ?? '100', 10),
    topK: parseInt(process.env.RAG_TOP_K ?? '5', 10),
    embeddingDimensions: parseInt(process.env.RAG_EMBEDDING_DIMENSIONS ?? '768', 10),
  },
});
