# Git Workflow for HRVerified Resume v2

## Branch Strategy
- **main**: Production-ready code, stable
- **development**: Integration branch for features
- **feature/**: Individual feature branches

## Making Changes

### 1. Pull Latest Development
```bash
git checkout development
git pull origin development
```

### 2. Create Feature Branch
```bash
git checkout -b feature/feature-name
```

### 3. Make Changes & Commit
```bash
git add .
git commit -m "feat: brief description of changes"
```

## Commit Message Format
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `style:` - Code style (no logic changes)
- `refactor:` - Code refactoring
- `test:` - Tests
- `chore:` - Build, dependencies, etc.

## Push & Create PR
```bash
git push origin feature/feature-name
# Create PR on GitHub from feature branch to development
```

## Merging
- Code review required
- Automated tests must pass
- Merge to development first
- Test thoroughly
- Merge development to main for release
