# 📚 API Documentation

Complete API documentation untuk Marhas Backend.

## Base URL

```
http://localhost:3001/api
```

## Authentication

API menggunakan JWT Bearer token authentication:

```bash
Authorization: Bearer <access_token>
```

---

## Endpoints

### Health Check

#### GET `/api`
Health check dasar.

**Response:**
```json
{
  "status": "ok",
  "message": "Marhas Backend API is running",
  "timestamp": "2024-12-28T01:00:00.000Z"
}
```

#### GET `/api/health`
Detailed health check.

**Response:**
```json
{
  "status": "healthy",
  "uptime": 12345.67,
  "timestamp": "2024-12-28T01:00:00.000Z",
  "environment": "development"
}
```

---

### Authentication

#### POST `/api/v1/auth/signup`
Register user baru.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "fullName": "John Doe"
}
```

**Password Requirements:**
- Minimum 8 karakter
- Minimum 1 huruf besar
- Minimum 1 huruf kecil
- Minimum 1 angka
- Minimum 1 karakter spesial (@$!%*?&)

**Response (201):**
```json
{
  "success": true,
  "message": "Account created successfully",
  "data": {
    "accessToken": "eyJhbG...",
    "refreshToken": "abc123...",
    "expiresAt": 1703728800000,
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "fullName": "John Doe",
      "createdAt": "2024-12-28T01:00:00.000Z",
      "updatedAt": "2024-12-28T01:00:00.000Z"
    }
  }
}
```

**Errors:**
- `400` - Invalid input / Password requirements not met
- `409` - Email already registered

---

#### POST `/api/v1/auth/login`
Login dengan email dan password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbG...",
    "refreshToken": "abc123...",
    "expiresAt": 1703728800000,
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "fullName": "John Doe"
    }
  }
}
```

**Errors:**
- `401` - Invalid email or password

---

#### POST `/api/v1/auth/logout`
Logout dan revoke refresh token.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body (optional):**
```json
{
  "refreshToken": "abc123..."
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

#### POST `/api/v1/auth/refresh`
Refresh access token.

**Request Body:**
```json
{
  "refreshToken": "abc123..."
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "eyJhbG...",
    "refreshToken": "def456...",
    "expiresAt": 1703728800000,
    "user": {
      "id": "uuid",
      "email": "user@example.com"
    }
  }
}
```

**Errors:**
- `401` - Invalid or expired refresh token

---

#### GET `/api/v1/auth/me`
Get current authenticated user.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "fullName": "John Doe",
      "avatarUrl": "https://...",
      "provider": "email",
      "createdAt": "2024-12-28T01:00:00.000Z",
      "updatedAt": "2024-12-28T01:00:00.000Z"
    }
  }
}
```

---

#### GET `/api/v1/auth/oauth?provider=google`
Redirect ke OAuth provider.

**Query Parameters:**
- `provider` (required): `google` atau `facebook`
- `redirectUrl` (optional): Custom redirect URL

**Response:**
Redirect ke OAuth provider login page.

---

#### POST `/api/v1/auth/oauth/callback`
Handle OAuth callback (programmatic).

**Request Body:**
```json
{
  "provider": "google",
  "code": "oauth_authorization_code"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "google login successful",
  "data": {
    "accessToken": "eyJhbG...",
    "refreshToken": "abc123...",
    "expiresAt": 1703728800000,
    "user": {
      "id": "uuid",
      "email": "user@gmail.com",
      "fullName": "John Doe",
      "avatarUrl": "https://..."
    }
  }
}
```

---

### User Management

#### GET `/api/v1/users/profile`
Get current user's profile.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "profile": {
      "id": "uuid",
      "full_name": "John Doe",
      "avatar_url": "https://...",
      "phone": "+62812345678",
      "bio": "Software Developer",
      "date_of_birth": "1990-01-15",
      "location": "Jakarta, Indonesia",
      "website": "https://johndoe.com",
      "created_at": "2024-12-28T01:00:00.000Z",
      "updated_at": "2024-12-28T01:00:00.000Z"
    }
  }
}
```

---

#### PATCH `/api/v1/users/profile`
Update current user's profile.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "fullName": "John Updated",
  "bio": "Senior Software Developer",
  "phone": "+62812345678",
  "location": "Bandung, Indonesia",
  "website": "https://johndoe.dev"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "profile": {
      "id": "uuid",
      "full_name": "John Updated",
      "bio": "Senior Software Developer"
    }
  }
}
```

---

#### DELETE `/api/v1/users/account`
Delete current user's account.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Account deleted successfully"
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "statusCode": 400,
  "message": "Error message",
  "error": "Bad Request",
  "timestamp": "2024-12-28T01:00:00.000Z",
  "path": "/api/v1/auth/signup"
}
```

### Common Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Missing/invalid token |
| 403 | Forbidden - Access denied |
| 404 | Not Found |
| 409 | Conflict - Resource already exists |
| 429 | Too Many Requests - Rate limited |
| 500 | Internal Server Error |

---

## Rate Limiting

API di-rate limit dengan tiers berikut:

| Tier | Limit | Window |
|------|-------|--------|
| Short | 3 requests | 1 second |
| Medium | 20 requests | 10 seconds |
| Long | 100 requests | 1 minute |

Ketika rate limit exceeded, response:

```json
{
  "statusCode": 429,
  "message": "ThrottlerException: Too Many Requests"
}
```
