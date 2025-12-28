# 🏫 MARHAS Backend

<div align="center">

![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)

**Backend API untuk Sistem Informasi Sekolah dengan Multi-Role Authentication**

[Documentation](./docs/README.md) · [API Reference](./docs/api/MULTI_ROLE_AUTH.md) · [Architecture](./docs/guides/ARCHITECTURE.md)

</div>

---

## ✨ Features

### 🔐 Multi-Role Authentication
- **6 User Roles**: Student, Teacher, Parent, Admin, Super Admin, OAuth User
- **Role-specific login methods**: NISN (student), NIP/Email (teacher), Email (parent/admin)
- **Registration approval system**: Admin verifies and approves student/teacher registrations
- **Auto-generated passwords**: Secure random passwords for approved users
- **JWT authentication** with refresh tokens
- **Device session tracking**: "Perangkat Terhubung" feature
- **Activity logging**: "Riwayat Aktivitas" feature

### 👨‍👩‍👧 Parent-Student Linking
- **1:1 relationship**: One parent account per student
- **Student approval required**: Students must approve parent link requests
- **Real-time notifications**: Instant notification when parent requests access

### 📢 Notification System
- **Universal broadcast**: Send to all users
- **Role-based broadcast**: Target specific roles (students only, parents only, etc.)
- **Individual notifications**: Send to specific users
- **Read/unread tracking**: Track notification status

### 📊 Admin Dashboard
- **Registration management**: View, approve, reject pending registrations
- **User management**: CRUD operations, suspend/reactivate users
- **Direct user creation**: Create students/teachers without registration flow
- **Dashboard statistics**: Quick overview of system status

### 📱 Attendance System
- **QR Code check-in**: Generate session QR codes
- **Location verification**: Verify student presence
- **Attendance history**: Track attendance records

---

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| Framework | [NestJS](https://nestjs.com/) |
| Language | [TypeScript](https://www.typescriptlang.org/) |
| Database | [Supabase](https://supabase.com/) (PostgreSQL) |
| Authentication | JWT + bcrypt |
| Validation | class-validator, class-transformer |
| Security | Helmet, CORS, Rate Limiting |
| Documentation | Markdown |

---

## 📁 Project Structure

```
nest.js_backend/
├── 📁 database/                    # SQL schema files
│   ├── multi_role_auth_schema.sql  # Auth tables
│   └── attendance_schema.sql       # Attendance tables
├── 📁 docs/                        # Documentation
│   ├── 📁 api/                     # API references
│   └── 📁 guides/                  # Development guides
├── 📁 scripts/                     # Utility scripts
│   └── seed-admin.ts               # First admin creation
├── 📁 src/
│   ├── 📁 admin/                   # Admin module
│   ├── 📁 attendance/              # Attendance module
│   ├── 📁 auth/                    # Authentication module
│   ├── 📁 common/                  # Shared utilities
│   │   ├── decorators/             # Custom decorators
│   │   ├── enums/                  # Shared enums
│   │   ├── filters/                # Exception filters
│   │   ├── guards/                 # Auth guards
│   │   └── interfaces/             # TypeScript interfaces
│   ├── 📁 config/                  # Configuration module
│   ├── 📁 notifications/           # Notifications module
│   ├── 📁 parent-link/             # Parent-student linking
│   ├── 📁 profile/                 # User profile & security
│   ├── 📁 supabase/                # Supabase client
│   ├── 📁 users/                   # Users module
│   ├── app.module.ts               # Root module
│   └── main.ts                     # Application entry
├── .env.example                    # Environment template
├── package.json
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or pnpm
- Supabase account

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/marhas-backend.git
   cd marhas-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your credentials:
   ```env
   # Server
   PORT=3001
   NODE_ENV=development
   
   # Supabase
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   
   # JWT
   JWT_SECRET=your-super-secret-jwt-key-min-32-chars
   JWT_EXPIRATION=15m
   JWT_REFRESH_EXPIRATION=7d
   ```

4. **Setup database**
   
   Run in Supabase SQL Editor:
   ```sql
   -- 1. Run multi-role auth schema
   -- Copy from: database/multi_role_auth_schema.sql
   
   -- 2. Run attendance schema (optional)
   -- Copy from: database/attendance_schema.sql
   ```

5. **Create first admin**
   ```bash
   npx ts-node scripts/seed-admin.ts
   ```

6. **Start the server**
   ```bash
   # Development
   npm run start:dev
   
   # Production
   npm run build
   npm run start:prod
   ```

7. **Test the API**
   ```bash
   curl http://localhost:3001/api/health
   ```

---

## 📖 API Documentation

### Base URL
```
http://localhost:3001/api
```

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/v1/auth/signup/student` | Student registration request |
| POST | `/v1/auth/signup/teacher` | Teacher registration request |
| POST | `/v1/auth/signup/parent` | Parent self-registration |
| POST | `/v1/auth/login/student` | Student login (NISN) |
| POST | `/v1/auth/login/teacher` | Teacher login (NIP/Email) |
| POST | `/v1/auth/login/parent` | Parent login |
| POST | `/v1/auth/login/admin` | Admin login |
| PATCH | `/v1/auth/change-password` | Change password |

### Admin Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/admin/registrations` | List registrations |
| POST | `/v1/admin/registrations/:id/approve` | Approve registration |
| POST | `/v1/admin/registrations/:id/reject` | Reject registration |
| GET | `/v1/admin/users` | List users |
| PATCH | `/v1/admin/users/:id/suspend` | Suspend user |
| POST | `/v1/admin/students` | Direct create student |
| POST | `/v1/admin/teachers` | Direct create teacher |
| POST | `/v1/admin/notifications/broadcast` | Broadcast to all |
| POST | `/v1/admin/notifications/role-broadcast` | Broadcast to roles |
| GET | `/v1/admin/dashboard/stats` | Dashboard statistics |

### Notifications Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/notifications` | Get my notifications |
| GET | `/v1/notifications/unread-count` | Get unread count |
| PATCH | `/v1/notifications/:id/read` | Mark as read |
| PATCH | `/v1/notifications/read-all` | Mark all as read |

### Profile Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/profile` | Get my profile |
| PATCH | `/v1/profile` | Update profile |
| GET | `/v1/profile/security/sessions` | Get device sessions |
| DELETE | `/v1/profile/security/sessions/:id` | Revoke session |
| GET | `/v1/profile/security/activity` | Get activity log |
| PATCH | `/v1/profile/security/password` | Change password |

📚 **Full API documentation**: [docs/api/MULTI_ROLE_AUTH.md](./docs/api/MULTI_ROLE_AUTH.md)

---

## 🔐 Security Features

- **JWT Authentication** with short-lived access tokens
- **Refresh Token Rotation** for session management
- **Password Hashing** with bcrypt (10 rounds)
- **Rate Limiting** - 100 requests/minute
- **CORS** protection
- **Helmet** security headers
- **Input Validation** with class-validator
- **SQL Injection Prevention** via Supabase client
- **NISN/NIP Validation** for sensitive data
- **Activity Logging** for audit trail
- **Device Session Tracking** and revocation

---

## 🔄 Authentication Flows

### Student/Teacher Registration Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Student │────▶│  Backend │────▶│  Admin   │────▶│  Backend │
│  fills   │     │  creates │     │ approves │     │ generates│
│  form    │     │  pending │     │ request  │     │ password │
└──────────┘     │  request │     └──────────┘     └──────────┘
                 └──────────┘                            │
                                                         ▼
                                                  ┌──────────┐
                                                  │  Admin   │
                                                  │  sends   │
                                                  │  via WA  │
                                                  └──────────┘
```

### Parent Linking Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Parent  │────▶│  Backend │────▶│  Student │────▶│  Backend │
│ registers│     │  creates │     │ approves │     │  links   │
│ + NISN   │     │  pending │     │  request │     │  parent  │
└──────────┘     │  link    │     └──────────┘     └──────────┘
                 └──────────┘
```

---

## 📊 Database Schema

### Tables Overview

| Table | Description |
|-------|-------------|
| `users` | Core authentication |
| `students` | Student profiles (NISN) |
| `teachers` | Teacher profiles (NIP) |
| `parents` | Parent profiles |
| `admins` | Admin profiles |
| `registration_requests` | Pending registrations |
| `notifications` | All notifications |
| `device_sessions` | Active sessions |
| `activity_logs` | Activity history |

### ERD Summary

```
users ──┬── students
        ├── teachers
        ├── parents ──── students (1:1 link)
        └── admins

users ──── registration_requests
users ──── notifications
users ──── device_sessions
users ──── activity_logs
```

---

## 🧪 Development

### Scripts

```bash
# Development with hot reload
npm run start:dev

# Build for production
npm run build

# Start production
npm run start:prod

# Linting
npm run lint

# Format code
npm run format
```

### Environment Modes

| Mode | Description |
|------|-------------|
| `development` | Hot reload, verbose logging |
| `production` | Optimized, minimal logging |

---

## 📦 Deployment

### Railway / Render

1. Connect GitHub repository
2. Set environment variables
3. Build command: `npm run build`
4. Start command: `npm run start:prod`

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3001
CMD ["node", "dist/main.js"]
```

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed guidelines.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

---

## 👨‍💻 Author

**SMK MARHAS Development Team**

---

<div align="center">

Made with ❤️ for Indonesian Schools

</div>
