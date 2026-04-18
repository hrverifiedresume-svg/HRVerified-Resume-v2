# Setup Instructions for HRVerified Resume v2

## Prerequisites
- Node.js 18+
- Git
- GitHub account
- Supabase account
- Gmail OAuth credentials
- LinkedIn OAuth credentials (optional)

## Local Development Setup

### 1. Clone Repository
```bash
git clone https://github.com/YOUR_USERNAME/HRVerified-Resume-v2.git
cd HRVerified-Resume-v2
```

### 2. Set Up Frontend
```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```
Frontend runs on: http://localhost:3000

### 3. Set Up Backend
```bash
cd backend
cp .env.example .env.local
npm install
npm run dev
```
Backend runs on: http://localhost:3001

### 4. Configure Environment Variables
Fill in .env.local files with:
- Supabase credentials
- OAuth credentials (Gmail, LinkedIn)
- JWT secret
- Email service credentials
- SMS service credentials
- AI service API keys

### 5. Database Setup
- Create Supabase project
- Run migrations (Prompt 2)
- Seed initial templates

## Development Workflow
- Work on `development` branch
- Create feature branches: `feature/feature-name`
- Test locally before pushing
- Submit PR for review
- Merge to `main` when approved

## Common Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Check code quality
- `npm test` - Run tests

## Troubleshooting
See specific service documentation for issues.
