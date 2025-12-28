# 🏫 Multi-Role Authentication API Documentation

> **Version**: 1.0.0
> **Base URL**: `http://localhost:3001/api`
> **Last Updated**: 2025-12-28

---

## 📚 Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Auth Endpoints](#auth-endpoints)
4. [Admin Endpoints](#admin-endpoints)
5. [Notifications Endpoints](#notifications-endpoints)
6. [Parent-Link Endpoints](#parent-link-endpoints)
7. [Profile Endpoints](#profile-endpoints)
8. [Error Handling](#error-handling)
9. [Examples](#examples)

---

## Overview

Sistem autentikasi multi-role untuk lingkungan sekolah dengan 6 role:

| Role | Description | Login Method |
|------|-------------|--------------|
| `student` | Siswa | NISN + Password |
| `teacher` | Guru | NIP/Email + Password |
| `parent` | Orang Tua | Email + Password |
| `admin` | Admin | Email + Password |
| `super_admin` | Super Admin | Email + Password |
| `oauth_user` | OAuth User | Google/Facebook |

### Response Format

All responses follow this format:

```json
{
  "success": true,
  "message": "Optional message",
  "data": { ... },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

---

## Authentication

All protected endpoints require JWT Bearer token:

```
Authorization: Bearer <access_token>
```

### Token Refresh

Access tokens expire in 15 minutes. Use refresh token to get new access token.

---

## Auth Endpoints

### 🔐 Student Registration

**POST** `/v1/auth/signup/student`

> **Note**: Creates a pending registration request. Admin approval required.

**Request Body**:
```json
{
  "nisn": "1234567890",
  "fullName": "Ahmad Rasyid",
  "email": "ahmad@student.smkmarhas.sch.id",
  "phone": "081234567890",
  "kelas": "XII TKJ-A",
  "jurusan": "Teknik Komputer Jaringan",
  "tahunAjaran": "2024/2025",
  "dateOfBirth": "2006-05-15",
  "address": "Jl. Merdeka No. 123, Jakarta"
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "message": "Pendaftaran berhasil dikirim. Menunggu persetujuan admin.",
  "data": {
    "requestId": "uuid",
    "status": "pending"
  }
}
```

---

### 🔐 Teacher Registration

**POST** `/v1/auth/signup/teacher`

> **Note**: Creates a pending registration request. Admin approval required.

**Request Body**:
```json
{
  "nip": "198501152010011001",
  "fullName": "Pak Budi Santoso",
  "email": "budi@smkmarhas.sch.id",
  "phone": "081234567891",
  "subject": "Pemrograman Web",
  "address": "Jl. Guru No. 45"
}
```

---

### 🔐 Parent Registration (Self-Register)

**POST** `/v1/auth/signup/parent`

> **Note**: Orang tua langsung aktif setelah registrasi. Can link to student.

**Request Body**:
```json
{
  "email": "ayah.ahmad@gmail.com",
  "password": "SecureP@ss123",
  "fullName": "Pak Ahmad",
  "phone": "081234567892",
  "relationship": "ayah",
  "childNisn": "1234567890"
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "message": "Pendaftaran berhasil",
  "data": {
    "user": { ... },
    "tokens": {
      "accessToken": "...",
      "refreshToken": "...",
      "expiresAt": 1703750400000
    },
    "linkStatus": "pending"
  }
}
```

---

### 🔑 Student Login

**POST** `/v1/auth/login/student`

**Request Body**:
```json
{
  "nisn": "1234567890",
  "password": "secret123"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Login berhasil",
  "data": {
    "user": {
      "id": "uuid",
      "email": "ahmad@student.smkmarhas.sch.id",
      "role": "student",
      "mustChangePassword": true
    },
    "profile": {
      "nisn": "1234567890",
      "fullName": "Ahmad Rasyid",
      "kelas": "XII TKJ-A",
      "jurusan": "Teknik Komputer Jaringan"
    },
    "tokens": {
      "accessToken": "...",
      "refreshToken": "..."
    }
  }
}
```

---

### 🔑 Teacher Login

**POST** `/v1/auth/login/teacher`

**Request Body** (by NIP):
```json
{
  "nip": "198501152010011001",
  "password": "secret123"
}
```

**Request Body** (by Email):
```json
{
  "email": "budi@smkmarhas.sch.id",
  "password": "secret123"
}
```

---

### 🔑 Parent Login

**POST** `/v1/auth/login/parent`

**Request Body**:
```json
{
  "email": "ayah.ahmad@gmail.com",
  "password": "SecureP@ss123"
}
```

---

### 🔑 Admin Login

**POST** `/v1/auth/login/admin`

**Request Body**:
```json
{
  "email": "admin@smkmarhas.sch.id",
  "password": "AdminP@ss123"
}
```

---

### 🔒 Change Password

**PATCH** `/v1/auth/change-password`

> **Requires**: Authentication

**Request Body**:
```json
{
  "currentPassword": "oldPassword123",
  "newPassword": "NewP@ssword456"
}
```

---

## Admin Endpoints

> **Requires**: `admin` or `super_admin` role

### 📋 Registration Management

#### Get All Registrations

**GET** `/v1/admin/registrations`

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by: `pending`, `approved`, `rejected` |
| `type` | string | Filter by: `student`, `teacher` |
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 20) |

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "type": "student",
      "form_data": { ... },
      "status": "pending",
      "submitted_at": "2024-12-28T00:00:00Z",
      "users": {
        "email": "ahmad@student.smkmarhas.sch.id"
      }
    }
  ],
  "pagination": { ... }
}
```

#### Get Pending Registrations

**GET** `/v1/admin/registrations/pending`

#### Get Registration Detail

**GET** `/v1/admin/registrations/:id`

#### Approve Registration

**POST** `/v1/admin/registrations/:id/approve`

**Request Body** (optional):
```json
{
  "notes": "Data verified with school database"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Pendaftaran berhasil disetujui",
  "data": {
    "generatedPassword": "xY7@mK9pL2$n",
    "userEmail": "ahmad@student.smkmarhas.sch.id"
  }
}
```

> **Important**: Password harus dikirim ke user via WhatsApp/manual

#### Reject Registration

**POST** `/v1/admin/registrations/:id/reject`

**Request Body**:
```json
{
  "reason": "NISN tidak terdaftar di database sekolah"
}
```

---

### 👥 User Management

#### Get All Users

**GET** `/v1/admin/users`

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `role` | string | Filter by role |
| `status` | string | Filter by: `active`, `pending`, `suspended` |
| `search` | string | Search by email |
| `page` | number | Page number |
| `limit` | number | Items per page |

#### Get User Detail

**GET** `/v1/admin/users/:id`

**Response**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "...",
      "role": "student",
      "status": "active",
      "created_at": "..."
    },
    "profile": {
      "nisn": "1234567890",
      "fullName": "Ahmad Rasyid",
      ...
    }
  }
}
```

#### Suspend User

**PATCH** `/v1/admin/users/:id/suspend`

**Request Body**:
```json
{
  "reason": "Violation of school policy"
}
```

#### Reactivate User

**PATCH** `/v1/admin/users/:id/reactivate`

#### Delete User

**DELETE** `/v1/admin/users/:id`

---

### ➕ Direct User Creation

#### Create Student Directly

**POST** `/v1/admin/students`

> Bypasses registration request - admin creates directly

**Request Body**:
```json
{
  "nisn": "1234567890",
  "fullName": "Ahmad Rasyid",
  "email": "ahmad@student.smkmarhas.sch.id",
  "phone": "081234567890",
  "kelas": "XII TKJ-A",
  "jurusan": "Teknik Komputer Jaringan",
  "tahunAjaran": "2024/2025",
  "waliKelas": "Pak Budi",
  "address": "Jl. Merdeka No. 123"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Siswa berhasil dibuat",
  "data": {
    "student": {
      "id": "uuid",
      "nisn": "1234567890",
      "fullName": "Ahmad Rasyid"
    },
    "generatedPassword": "aB3$kM7nP9@q"
  }
}
```

#### Create Teacher Directly

**POST** `/v1/admin/teachers`

**Request Body**:
```json
{
  "nip": "198501152010011001",
  "fullName": "Pak Budi Santoso",
  "email": "budi@smkmarhas.sch.id",
  "phone": "081234567891",
  "subject": "Pemrograman Web",
  "address": "Jl. Guru No. 45"
}
```

#### Create Admin (Super Admin Only)

**POST** `/v1/admin/admins`

> **Requires**: `super_admin` role

**Request Body**:
```json
{
  "email": "admin2@smkmarhas.sch.id",
  "fullName": "Admin Dua",
  "phone": "081234567893",
  "isSuperAdmin": false
}
```

---

### 📢 Notifications

#### Broadcast to All Users

**POST** `/v1/admin/notifications/broadcast`

**Request Body**:
```json
{
  "title": "Pengumuman Libur Semester",
  "message": "Libur semester dimulai tanggal 20 Desember 2024"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Broadcast berhasil dikirim",
  "data": {
    "recipientCount": 150
  }
}
```

#### Role-Based Broadcast 🆕

**POST** `/v1/admin/notifications/role-broadcast`

> Send to specific roles only

**Request Body** (to students only):
```json
{
  "title": "Selamat Mengerjakan Ujian",
  "message": "Ujian Akhir Semester dimulai besok. Tetap semangat!",
  "targetRoles": ["student"]
}
```

**Request Body** (to parents only):
```json
{
  "title": "Pengambilan Rapot",
  "message": "Silakan ambil rapot anak Anda tanggal 21 Desember 2024",
  "targetRoles": ["parent"]
}
```

**Request Body** (to multiple roles):
```json
{
  "title": "Libur Hari Raya",
  "message": "Sekolah libur 25-26 Desember 2024",
  "targetRoles": ["student", "teacher", "parent"]
}
```

**Response**:
```json
{
  "success": true,
  "message": "Broadcast per role berhasil dikirim",
  "data": {
    "recipientCount": 80,
    "roleCount": {
      "student": 50,
      "parent": 30
    }
  }
}
```

#### Send to Specific User

**POST** `/v1/admin/notifications/send`

**Request Body**:
```json
{
  "recipientId": "user-uuid",
  "title": "Pemanggilan Orang Tua",
  "message": "Mohon hadir ke sekolah tgl 15 Desember"
}
```

---

### 📊 Dashboard

#### Get Dashboard Statistics

**GET** `/v1/admin/dashboard/stats`

**Response**:
```json
{
  "success": true,
  "data": {
    "stats": {
      "totalStudents": 500,
      "totalTeachers": 50,
      "totalParents": 400,
      "totalUsers": 960,
      "pendingRegistrations": 5
    },
    "recentActivity": [
      {
        "id": "uuid",
        "user_id": "uuid",
        "action": "APPROVE_REGISTRATION",
        "description": "Approved registration",
        "created_at": "2024-12-28T12:00:00Z"
      }
    ]
  }
}
```

---

## Notifications Endpoints

> **Requires**: Authentication

### Get My Notifications

**GET** `/v1/notifications`

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | number | Page number |
| `limit` | number | Items per page |
| `unreadOnly` | boolean | Only unread |

### Get Unread Count

**GET** `/v1/notifications/unread-count`

**Response**:
```json
{
  "success": true,
  "data": {
    "count": 3
  }
}
```

### Mark as Read

**PATCH** `/v1/notifications/:id/read`

### Mark All as Read

**PATCH** `/v1/notifications/read-all`

### Delete Notification

**DELETE** `/v1/notifications/:id`

---

## Parent-Link Endpoints

### For Parents

#### Request Link to Student

**POST** `/v1/parent-link/request`

> **Requires**: `parent` role

**Request Body**:
```json
{
  "nisn": "1234567890"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Permintaan tautan berhasil dikirim. Menunggu persetujuan siswa.",
  "data": {
    "studentName": "Ahmad Rasyid"
  }
}
```

#### Get Link Status

**GET** `/v1/parent-link/status`

**Response**:
```json
{
  "success": true,
  "data": {
    "linked": true,
    "status": "approved",
    "student": {
      "nisn": "1234567890",
      "fullName": "Ahmad Rasyid",
      "kelas": "XII TKJ-A"
    }
  }
}
```

### For Students

#### Get Pending Requests

**GET** `/v1/parent-link/pending`

> **Requires**: `student` role

#### Approve Link

**POST** `/v1/parent-link/:id/approve`

#### Reject Link

**POST** `/v1/parent-link/:id/reject`

---

## Profile Endpoints

> **Requires**: Authentication

### Profile

#### Get My Profile

**GET** `/v1/profile`

#### Update Profile

**PATCH** `/v1/profile`

**Request Body**:
```json
{
  "phone": "081234567899",
  "address": "Jl. Baru No. 456"
}
```

### Security - Perangkat Terhubung

#### Get Device Sessions

**GET** `/v1/profile/security/sessions`

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "device_name": "Chrome on Windows",
      "device_type": "desktop",
      "ip_address": "192.168.1.1",
      "is_active": true,
      "last_activity": "2024-12-28T12:00:00Z"
    }
  ]
}
```

#### Revoke Session

**DELETE** `/v1/profile/security/sessions/:id`

#### Logout All Devices

**POST** `/v1/profile/security/sessions/logout-all`

### Security - Riwayat Aktivitas

#### Get Activity Log

**GET** `/v1/profile/security/activity`

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | number | Page number |
| `limit` | number | Items per page |

### Security - Password

#### Change Password

**PATCH** `/v1/profile/security/password`

**Request Body**:
```json
{
  "currentPassword": "oldPassword",
  "newPassword": "newPassword"
}
```

### Account

#### Delete Account (Hapus Akun)

**DELETE** `/v1/profile/account`

**Request Body**:
```json
{
  "password": "yourPassword"
}
```

---

## Error Handling

### Error Response Format

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Error message",
  "error": "Bad Request"
}
```

### Common Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Not authenticated |
| 403 | Forbidden - No permission |
| 404 | Not Found - Resource doesn't exist |
| 409 | Conflict - Duplicate data |
| 429 | Too Many Requests - Rate limited |
| 500 | Internal Server Error |

---

## Examples

### Complete Student Registration → Login Flow

```typescript
// 1. Student registers
const registerResponse = await fetch('/api/v1/auth/signup/student', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    nisn: '1234567890',
    fullName: 'Ahmad Rasyid',
    email: 'ahmad@student.smkmarhas.sch.id',
    phone: '081234567890',
    kelas: 'XII TKJ-A',
    jurusan: 'Teknik Komputer Jaringan',
    tahunAjaran: '2024/2025',
    dateOfBirth: '2006-05-15',
  }),
});
// Status: pending - menunggu admin

// 2. Admin approves (returns generated password)
const approveResponse = await fetch('/api/v1/admin/registrations/{id}/approve', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${adminToken}`,
  },
});
// Returns: { generatedPassword: "xY7@mK9pL2$n" }

// 3. Admin sends password to student via WhatsApp

// 4. Student logs in with NISN + password
const loginResponse = await fetch('/api/v1/auth/login/student', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    nisn: '1234567890',
    password: 'xY7@mK9pL2$n',
  }),
});

// 5. Check if mustChangePassword is true, force password change
if (loginResponse.data.user.mustChangePassword) {
  await fetch('/api/v1/auth/change-password', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${loginResponse.data.tokens.accessToken}`,
    },
    body: JSON.stringify({
      currentPassword: 'xY7@mK9pL2$n',
      newPassword: 'MyNewSecureP@ss123',
    }),
  });
}
```

### Parent Linking Flow

```typescript
// 1. Parent registers with child's NISN
const registerParent = await fetch('/api/v1/auth/signup/parent', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'ayah.ahmad@gmail.com',
    password: 'SecureP@ss123',
    fullName: 'Pak Ahmad',
    phone: '081234567892',
    relationship: 'ayah',
    childNisn: '1234567890',
  }),
});
// Link status: pending

// 2. Student receives notification
// Student checks pending requests
const pending = await fetch('/api/v1/parent-link/pending', {
  headers: { Authorization: `Bearer ${studentToken}` },
});

// 3. Student approves
await fetch(`/api/v1/parent-link/${pending.data[0].id}/approve`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${studentToken}` },
});

// 4. Parent now has access to child's data
```

### Role-Based Notification

```typescript
// Send exam notification to all students
await fetch('/api/v1/admin/notifications/role-broadcast', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${adminToken}`,
  },
  body: JSON.stringify({
    title: 'Jadwal Ujian Akhir Semester',
    message: 'UAS dimulai tanggal 16-20 Desember 2024. Tetap semangat!',
    targetRoles: ['student'],
  }),
});

// Send report card pickup to all parents
await fetch('/api/v1/admin/notifications/role-broadcast', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${adminToken}`,
  },
  body: JSON.stringify({
    title: 'Pengambilan Rapot',
    message: 'Silakan ambil rapot anak Anda pada tanggal 21 Desember 2024 pukul 08:00-12:00',
    targetRoles: ['parent'],
  }),
});

// Broadcast holiday notice to everyone
await fetch('/api/v1/admin/notifications/broadcast', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${adminToken}`,
  },
  body: JSON.stringify({
    title: 'Libur Akhir Tahun',
    message: 'Sekolah libur tanggal 25 Desember 2024 - 1 Januari 2025',
  }),
});
```

---

## Rate Limiting

| Limit | Duration | Max Requests |
|-------|----------|--------------|
| Short | 1 second | 3 |
| Medium | 10 seconds | 20 |
| Long | 1 minute | 100 |

---

## Database Schema

Run SQL di Supabase: `database/multi_role_auth_schema.sql`

Tables:
- `users` - Core authentication
- `students` - Student profiles
- `teachers` - Teacher profiles
- `parents` - Parent profiles
- `admins` - Admin profiles
- `registration_requests` - Pending registrations
- `notifications` - All notifications
- `device_sessions` - Active sessions
- `activity_logs` - Activity history

---

## First Admin Setup

```bash
# Run the seeding script
npx ts-node scripts/seed-admin.ts admin@smkmarhas.sch.id YourPassword123! "Admin Utama"
```

Or interactively:
```bash
npx ts-node scripts/seed-admin.ts
```
