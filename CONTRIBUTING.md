# Contributing to Marhas Backend

Terima kasih telah tertarik untuk berkontribusi! Dokumen ini menjelaskan panduan untuk berkontribusi ke project ini.

## 📋 Table of Contents

- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Style](#code-style)
- [Commit Messages](#commit-messages)
- [Pull Requests](#pull-requests)

---

## Getting Started

### Prerequisites

- Node.js >= 18.x
- npm >= 9.x
- Git

### Setup Development Environment

```bash
# Clone repository
git clone <repository-url>
cd nest.js_backend

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env dengan credentials development Anda

# Run development server
npm run start:dev
```

---

## Development Workflow

### 1. Buat Branch Baru

```bash
git checkout -b feature/nama-feature
# atau
git checkout -b fix/nama-bugfix
```

### 2. Develop & Test

```bash
# Run development server
npm run start:dev

# Run tests
npm run test

# Check linting
npm run lint
```

### 3. Commit Changes

Ikuti [Conventional Commits](https://www.conventionalcommits.org/):

```bash
git commit -m "feat: add new endpoint for user preferences"
git commit -m "fix: resolve token refresh issue"
git commit -m "docs: update API documentation"
```

### 4. Push & Create PR

```bash
git push origin feature/nama-feature
```

---

## Code Style

### ESLint & Prettier

Project ini menggunakan ESLint dan Prettier untuk code formatting:

```bash
# Check linting
npm run lint

# Format code
npm run format
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Files | kebab-case | `auth.service.ts` |
| Classes | PascalCase | `AuthService` |
| Methods | camelCase | `validateUser` |
| Variables | camelCase | `accessToken` |
| Constants | UPPER_SNAKE_CASE | `MAX_LOGIN_ATTEMPTS` |
| Interfaces | PascalCase + prefix I (optional) | `AuthUser` atau `IAuthUser` |

### File Structure

Untuk setiap module:

```
module/
├── module.module.ts      # Module definition
├── module.controller.ts  # HTTP handlers
├── module.service.ts     # Business logic
├── dto/                  # Data Transfer Objects
│   ├── create-module.dto.ts
│   └── index.ts
└── entities/             # Database entities (jika ada)
```

---

## Commit Messages

Gunakan format [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

| Type | Deskripsi |
|------|-----------|
| `feat` | Fitur baru |
| `fix` | Bug fix |
| `docs` | Dokumentasi |
| `style` | Formatting, tidak ada perubahan logic |
| `refactor` | Refactoring code |
| `test` | Menambah/memperbaiki tests |
| `chore` | Maintenance tasks |

### Examples

```
feat(auth): add refresh token rotation
fix(users): resolve profile update validation
docs: update API documentation for OAuth
refactor(common): extract JWT utilities
test(auth): add unit tests for login flow
```

---

## Pull Requests

### Checklist sebelum PR

- [ ] Code builds tanpa error: `npm run build`
- [ ] Semua tests pass: `npm run test`
- [ ] Tidak ada linting errors: `npm run lint`
- [ ] Dokumentasi sudah diupdate (jika perlu)
- [ ] Commit messages mengikuti conventional commits

### PR Template

```markdown
## Description
[Jelaskan perubahan yang dilakukan]

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Refactoring

## Testing
[Jelaskan bagaimana Anda test perubahan ini]

## Checklist
- [ ] My code follows the style guidelines
- [ ] I have performed a self-review
- [ ] I have added tests if applicable
- [ ] Documentation has been updated
```

---

## Questions?

Jika ada pertanyaan, silakan buat Issue di repository.
