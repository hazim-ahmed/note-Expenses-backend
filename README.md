# Note Expenses Backend API

Node.js, Express, TypeScript, and Prisma API for the Expense Management System.

## Features
- JWT Authentication & Role-based Access Control (RBAC)
- Profile and username updates with uniqueness validation (`PATCH /auth/profile`, `PATCH /users/:id`)
- Prisma ORM with database integration
- Automated Daily Expense Journals & Cash Vouchers
- Real-time Swagger OpenAPI 3.0 UI (`/api-docs`)
- Comprehensive Markdown Documentation ([API_DOCUMENTATION.md](file:///c:/Users/Silver_Bullet/Desktop/note-Expenses-backend/API_DOCUMENTATION.md))
- Complete Postman Collection ([postman_collection.json](file:///c:/Users/Silver_Bullet/Desktop/note-Expenses-backend/postman_collection.json))
- Winston Logging & Helmet security headers

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Setup
Copy `.env.example` to `.env` and adjust database credentials and JWT secret:
```bash
cp .env.example .env
```

### 3. Database Migration & Prisma Generation
```bash
npm run prisma:generate
npm run db:migrate
npm run db:seed
```

### 4. Run Development Server
```bash
npm run dev
```

### 5. Build for Production
```bash
npm run build
npm start
```

## Deployment Guidelines
- Set `NODE_ENV=production`
- Configure `DATABASE_URL` for production PostgreSQL
- Set `JWT_SECRET` to a strong random key
- Configure CORS origins to point to frontend domain (`https://...`)
