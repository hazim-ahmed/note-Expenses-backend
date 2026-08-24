# Note Expenses Backend API

Node.js, Express, TypeScript, and Prisma API for the Expense Management System.

## Features
- JWT Authentication & Role-based Access Control
- Prisma ORM with PostgreSQL database
- Expense management, Cash Vouchers, Journal entries
- Winston Logging & Helmet security headers
- Swagger API Documentation

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
