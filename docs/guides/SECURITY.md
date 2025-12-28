# Security Policy

Dokumen ini menjelaskan security practices dan considerations untuk Marhas Backend API.

## 🔒 Security Features

### 1. Authentication

#### JWT (JSON Web Tokens)
- Access tokens dengan expiration pendek (default: 15 menit)
- Refresh tokens dengan expiration panjang (default: 7 hari)
- Token refresh rotation untuk mencegah token reuse
- Tokens di-hash dengan bcrypt sebelum disimpan di database

#### Password Requirements
- Minimum 8 karakter
- Harus mengandung:
  - Huruf besar (A-Z)
  - Huruf kecil (a-z)
  - Angka (0-9)
  - Karakter spesial (@$!%*?&)

### 2. HTTP Security Headers (Helmet)

| Header | Fungsi |
|--------|--------|
| `X-Content-Type-Options` | Mencegah MIME type sniffing |
| `X-Frame-Options` | Mencegah clickjacking |
| `X-XSS-Protection` | XSS filtering |
| `Strict-Transport-Security` | Enforce HTTPS |
| `Content-Security-Policy` | Kontrol resource loading |

### 3. Rate Limiting

| Tier | Limit | Window |
|------|-------|--------|
| Short | 3 requests | 1 detik |
| Medium | 20 requests | 10 detik |
| Long | 100 requests | 1 menit |

### 4. Input Validation

- Semua input divalidasi dengan `class-validator`
- Whitelist mode: hanya properties yang didefinisikan di DTO yang diterima
- Properties asing akan di-reject dengan error

### 5. Database Security (Supabase)

#### Row Level Security (RLS)
- Semua tables memiliki RLS policies
- Users hanya bisa akses data mereka sendiri
- Service role key hanya digunakan untuk operasi server-side

---

## 🛡️ Security Best Practices

### Environment Variables

```bash
# ❌ Jangan commit file .env
# ✅ Gunakan .env.example sebagai template

# ❌ Jangan hardcode credentials
const secret = "my-secret-key";

# ✅ Gunakan environment variables
const secret = process.env.JWT_SECRET;
```

### JWT Secret

```bash
# Generate secure JWT secret (minimum 32 characters)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### CORS Configuration

```typescript
// Development
CORS_ORIGIN=http://localhost:3000

// Production - spesifik domain
CORS_ORIGIN=https://yourdomain.com

// Multiple origins
CORS_ORIGIN=https://app.domain.com,https://admin.domain.com
```

---

## 🚨 Security Considerations

### Tokens

1. **Jangan simpan access token di localStorage** - Gunakan httpOnly cookies atau memory
2. **Refresh token harus di-rotate** - Setelah digunakan, generate token baru
3. **Implement token blacklisting** - Revoke tokens saat logout

### API Keys

1. **SUPABASE_SERVICE_ROLE_KEY** - Jangan expose ke frontend
2. **JWT_SECRET** - Unique untuk setiap environment

### Error Handling

```typescript
// ❌ Jangan expose internal errors
throw new Error("Database connection failed: postgres://user:pass@host");

// ✅ Return generic error messages
throw new InternalServerErrorException("Service temporarily unavailable");
```

---

## 📧 Reporting Security Issues

Jika Anda menemukan security vulnerability:

1. **Jangan buat public issue**
2. Email ke: [security@yourdomain.com]
3. Jelaskan vulnerability secara detail
4. Sertakan steps to reproduce

---

## 🔄 Security Updates

| Date | Update |
|------|--------|
| 2024-12-28 | Initial security implementation |

---

## 📚 References

- [OWASP Security Guidelines](https://owasp.org/www-project-web-security-testing-guide/)
- [NestJS Security Best Practices](https://docs.nestjs.com/security)
- [Supabase Security](https://supabase.com/docs/guides/auth)
