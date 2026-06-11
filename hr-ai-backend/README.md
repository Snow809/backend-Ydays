# AI HR Backend Skeleton

NestJS modular monolith skeleton for an AI-powered HR platform. This project is intentionally limited to backend architecture, placeholder services, mock responses, Prisma models, DTOs, guards, decorators, and routes.

It is not a full HRIS/SIRH. Payroll, leave approval workflows, career management, full HR administration, real AI, real S3/MinIO, real Power BI integration, and prediction logic are outside the MVP.

## Stack

- Node.js, NestJS, TypeScript
- PostgreSQL with Prisma ORM
- JWT auth with Passport
- RBAC guards and decorators
- class-validator / class-transformer
- Multer local uploads
- pgvector-ready document chunk structure
- LangChain/LLM placeholders
- BullMQ/Redis placeholders
- Docker Compose
- Swagger at `/api/docs`

## Install

```bash
npm install
cp .env.example .env
npm run prisma:generate
```

## Run Locally

Start PostgreSQL and Redis, then:

```bash
npm run prisma:migrate
npm run prisma:seed
npm run start:dev
```

Health check:

```bash
curl http://localhost:3000/health
```

Default admin:

- Email: `admin@demo.local`
- Password: `admin123`

Demo users seeded for document workflows:

- HR: `hr@demo.local` / `password123`
- Manager: `manager@demo.local` / `password123`
- Collaborator: `employee@demo.local` / `password123`

## Run With Docker

```bash
docker compose up --build
```

In a real setup, run Prisma migrations before using the API:

```bash
docker compose exec backend npm run prisma:migrate
docker compose exec backend npm run prisma:seed
```

## Prisma

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

`DocumentChunk.embedding` is currently a text placeholder. When pgvector is enabled, replace it with a vector-compatible column and add the required PostgreSQL extension/migration.

## API Overview

All application routes use the `/api` prefix, except `GET /health`.

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/users`
- `GET /api/users`
- `GET /api/users/:id`
- `PATCH /api/users/:id/role`
- `PATCH /api/users/:id/deactivate`
- `POST /api/employees`
- `GET /api/employees`
- `GET /api/employees/:id`
- `PATCH /api/employees/:id`
- `POST /api/employees/import`
- `POST /api/documents/upload`
- `GET /api/documents`
- `GET /api/documents/:id`
- `PATCH /api/documents/:id/validate`
- `PATCH /api/documents/:id/archive`
- `POST /api/document-templates`
- `GET /api/document-templates`
- `GET /api/document-templates/active`
- `GET /api/document-templates/:id`
- `PATCH /api/document-templates/:id`
- `PATCH /api/document-templates/:id/deactivate`
- `DELETE /api/document-templates/:id`
- `POST /api/document-requests`
- `GET /api/document-requests/me`
- `GET /api/document-requests/pending-approval`
- `GET /api/document-requests/history`
- `PATCH /api/document-requests/:id/approve`
- `PATCH /api/document-requests/:id/reject`
- `GET /api/document-requests/:id/download`
- `POST /api/rag/query`
- `POST /api/rag/index-document/:documentId`
- `POST /api/chat/ask`
- `GET /api/chat/conversations`
- `GET /api/chat/conversations/:id`
- `POST /api/generated-documents/request`
- `POST /api/generated-documents/:id/generate-draft`
- `PATCH /api/generated-documents/:id/validate`
- `PATCH /api/generated-documents/:id/reject`
- `GET /api/generated-documents`
- `GET /api/generated-documents/:id/download`
- `POST /api/onboarding/generate`
- `GET /api/onboarding`
- `GET /api/onboarding/:id`
- `PATCH /api/onboarding/steps/:id/complete`
- `GET /api/onboarding/:id/progress`
- `GET /api/dashboard/headcount`
- `GET /api/dashboard/absenteeism`
- `GET /api/dashboard/turnover`
- `GET /api/dashboard/onboarding-progress`
- `GET /api/dashboard/ai-usage`
- `GET /api/dashboard/alerts-summary`
- `POST /api/alerts`
- `GET /api/alerts`
- `GET /api/alerts/:id`
- `PATCH /api/alerts/:id/status`
- `GET /api/prediction/workforce-projection`
- `GET /api/prediction/turnover-risk`
- `GET /api/prediction/absenteeism-trend`

## Modular Monolith

The application is one NestJS app with feature modules. It is intentionally not split into microservices. Cross-cutting services such as Prisma, storage, LLM, embeddings, document parsing, auditing, and workers are internal modules that can evolve without changing the deployment model.
