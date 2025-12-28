# 📚 Documentation Index

Welcome to the MARHAS Backend documentation.

## 📁 Structure

```
docs/
├── api/                    # API Reference
│   ├── GENERAL.md         # General API endpoints
│   └── MULTI_ROLE_AUTH.md # Multi-role authentication API
├── guides/                 # Development Guides
│   ├── ARCHITECTURE.md    # System architecture
│   └── SECURITY.md        # Security best practices
└── README.md              # This file
```

## 🔗 Quick Links

### API Documentation
- [General API](./api/GENERAL.md) - Basic endpoints (auth, users)
- [Multi-Role Auth API](./api/MULTI_ROLE_AUTH.md) - Complete multi-role authentication system

### Guides
- [Architecture](./guides/ARCHITECTURE.md) - System design and module structure
- [Security](./guides/SECURITY.md) - Security practices and implementation

## 🚀 Getting Started

1. Clone the repository
2. Copy `.env.example` to `.env`
3. Configure environment variables
4. Run `npm install`
5. Run database migrations (see [Database Setup](#database-setup))
6. Run `npm run start:dev`

## 💾 Database Setup

Run the following SQL files in Supabase SQL Editor:

1. `database/multi_role_auth_schema.sql` - Multi-role authentication tables
2. `database/attendance_schema.sql` - Attendance system tables

## 👤 Create First Admin

```bash
npx ts-node scripts/seed-admin.ts
```

Or with parameters:
```bash
npx ts-node scripts/seed-admin.ts admin@smkmarhas.sch.id YourPassword123! "Admin Utama"
```
