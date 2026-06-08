## 📖 Overview

The **Yugsoft Tech Backend API** is the core engine powering the Educational AI platform. It is a highly scalable, modular, and secure backend built on top of **NestJS 11**. It orchestrates user authentication, curriculum management, AI integrations, and a sophisticated RAG (Retrieval-Augmented Generation) pipeline for intelligent document interactions.

---

## 🛠️ Technology Stack & Libraries

This backend leverages modern, enterprise-grade technologies:

### Core Framework & Architecture
*   **[NestJS (v11)](https://nestjs.com/)**: A progressive Node.js framework for building efficient, reliable, and scalable server-side applications using TypeScript.
*   **TypeScript**: Ensures type safety and highly maintainable code.

### Database & ORM
*   **[PostgreSQL](https://www.postgresql.org/) (via Neon DB)**: Primary relational database.
*   **[pgvector](https://github.com/pgvector/pgvector)**: PostgreSQL extension for vector similarity search (crucial for our RAG pipeline).
*   **[TypeORM](https://typeorm.io/)**: Advanced Object-Relational Mapper for TypeScript, used for database migrations and entity management.
*   **[pg](https://node-postgres.com/)**: Non-blocking PostgreSQL client for Node.js.

### Authentication & Security
*   **Passport.js & JWT (`@nestjs/jwt`, `passport-jwt`)**: Stateless, secure endpoint protection using JSON Web Tokens.
*   **Bcrypt (`bcrypt`)**: Secure password hashing.
*   **Class Validator & Transformer (`class-validator`, `class-transformer`)**: Automatic payload validation and serialization.
*   **RBAC (Role-Based Access Control)**: Custom decorators & guards to isolate `Admin`, `Teacher`, and `Student` roles.

### Artificial Intelligence & RAG
*   **[OpenAI SDK](https://github.com/openai/openai-node) / Google Gemini API**: Integrated for generating embeddings (1536-d or 768-d depending on the model) and Chat Completions.
*   **Semantic Chunking**: Custom logic to split large PDFs into contextual overlapping chunks.

### Document Processing & Utilities
*   **[Tesseract.js](https://tesseract.projectnaptha.com/)**: 100% Free Local Optical Character Recognition (OCR) pipeline.
*   **[PDF-Poppler](https://www.npmjs.com/package/pdf-poppler)**: Converts PDF pages to images for OCR ingestion.
*   **[PDFKit](https://pdfkit.org/)**: Server-side PDF generation.
*   **[PptxGenJS](https://gitbrent.github.io/PptxGenJS/)**: Dynamic generation of PowerPoint presentations (PPTX).
*   **[Puppeteer](https://pptr.dev/)**: Headless browser automation for advanced document scraping and generation.

---

## 📂 Project Structure

```text
backend/src/
├── common/             # Global Guards, Filters, Interceptors, and Decorators
├── config/             # Environment configuration mapping
├── database/           # TypeORM Data Source, Entities, and Migrations (pgvector setup)
└── modules/
    ├── auth/           # Signup, Login, and JWT Strategy
    ├── users/          # Tenant-scoped user management profiles
    ├── curriculum/     # Course, Books & Chapters management
    ├── rag-engine/     # PDF extraction, OCR processing, semantic chunking & cosine search
    ├── ai-tools/       # AI orchestrator: Worksheets, Lesson-plans, PPTs, Homework
    └── compiler/       # Document export and compilation (PDF/PPTX)
```

---

## ⚙️ Prerequisites & System Setup (CRITICAL)

Because this backend features a completely free, local OCR pipeline, it relies on system-level binaries for PDF manipulation. **You MUST install Poppler on your host machine.**

### 1. Install Poppler
*   **Windows:** Download [Poppler for Windows](https://github.com/oschwartz10612/poppler-windows/releases/), extract to `C:\poppler`, and add `C:\poppler\Library\bin` to your System `PATH` Environment Variable.
*   **Ubuntu/Linux:** `sudo apt-get update && sudo apt-get install poppler-utils`
*   **macOS:** `brew install poppler`

### 2. Node.js & NPM
Ensure you have Node.js (v18+ recommended) installed.

---

## 🚀 Installation & Running the Application

### 1. Install Dependencies
Navigate into the backend folder and install the NPM packages:
```bash
cd backend
npm install
```

### 2. Configure Environment Variables
Copy the `.env.example` to `.env` and fill in your secure credentials:
```bash
cp .env.example .env
```
*Required variables include your Database URL, JWT Secret, and API Keys (Gemini/OpenAI).*

### 3. Database Initialization (Migrations)
Before running the application, you must apply the TypeORM migrations to create the tables and enable the `vector` extension in PostgreSQL:
```bash
npm run migration:run
```

### 4. Start the Server
Run the NestJS application in development mode with hot-reloading:
```bash
npm run start:dev
```
*The API will be available at `http://localhost:4001` (or your configured `PORT`).*

---

## 🧠 The RAG Pipeline Workflow

Our Retrieval-Augmented Generation process is built directly into the `rag-engine` module:
1. **Upload**: A Teacher/Admin uploads a PDF file to a specific Chapter.
2. **Extraction (`PdfExtractionService`)**: The PDF is parsed. If it contains scanned images, `pdf-poppler` converts pages to images, and `tesseract.js` extracts the text locally.
3. **Chunking (`ChunkingService`)**: The extracted text is split into logical, overlapping chunks (e.g., 800 tokens with 100 overlap).
4. **Embedding Generation**: The chunks are sent to the LLM Embedding API to generate dense vectors.
5. **Vector Storage**: Vectors are saved into PostgreSQL using the `pgvector` extension.
6. **Querying**: When a user asks a question, the query is vectorized, and a **Cosine Distance** search (`embedding <=> query_vector`) is executed in PostgreSQL to fetch the most relevant context.

---

## 🛡️ Security Measures

*   **Validation:** Global `ValidationPipe` is enabled to automatically whitelist payloads and strip unknown/malicious fields.
*   **Authentication:** `JwtAuthGuard` protects all endpoints by default, except those explicitly marked with `@Public()`.
*   **Authorization:** The `RolesGuard` strictly enforces access via `@Roles(UserRole.ADMIN | TEACHER | STUDENT)`.
*   **Tenancy Isolation:** All curriculum data and RAG queries are scoped strictly by the `tenantId` extracted from the authenticated user's JWT.

---

## 📡 API Overview

| Method | Path | Auth Required | Description |
|--------|------|---------------|-------------|
| **GET** | `/health` | Public | System Health Check |
| **POST** | `/auth/signup` | Public | Register a new user / tenant |
| **POST** | `/auth/login` | Public | Authenticate and retrieve JWT |
| **GET** | `/users/me` | JWT | Fetch current user profile |
| **CRUD** | `/users` | Admin | Manage users within a tenant |
| **CRUD** | `/curriculum/books`| JWT + Roles | Manage Books & Chapters |
| **POST** | `/rag/ingest` | Teacher+ | Upload & Vectorize PDF for a chapter |
| **POST** | `/rag/search` | JWT | Semantic cosine search for Q&A |
| **POST** | `/ai-tools/:tool/generate`| Teacher+ | Generate worksheets, lesson-plans, etc. |
| **POST** | `/compiler/pdf/*` | Teacher+ | Export generated content as PDF/PPTX |

---

<div align="center">
  <p>Proprietary — Yugsoft Tech.</p>
</div>
