# Branch Protection & Git Security Setup

This document outlines the branch protection mechanisms and security measures implemented to prevent accidental commits to critical branches (`main` and `production`).

## Overview

The FreeYap project uses a multi-layered approach to protect critical branches:

1. **Pre-push Git Hooks** - Local protection that blocks direct pushes
2. **Git Aliases** - Safe deployment commands
3. **Workflow Guidelines** - Best practices for safe development

## Branch Protection Setup

### Pre-Push Hook Protection

**Location**: `.git/hooks/pre-push`

The pre-push hook automatically prevents direct pushes to protected branches:

```bash
#!/bin/sh

# Pre-push hook to prevent direct pushes to main and production branches
protected_branches="main production"
current_branch=$(git symbolic-ref HEAD | sed -e 's,.*/\(.*\),\1,')

for branch in $protected_branches; do
    if [ "$current_branch" = "$branch" ]; then
        echo "ERROR: Direct push to $branch branch is not allowed!"
        echo "Please create a pull request or merge from development branch instead."
        echo "To override this protection, use: git push --no-verify"
        exit 1
    fi
done

exit 0
```

**How it works:**
- Automatically runs before every `git push`
- Checks if you're trying to push to `main` or `production`
- Blocks the push and shows an error message
- Provides override option with `--no-verify` flag

### Testing the Protection

You can test that the protection is working:

```powershell
# Switch to protected branch
git checkout main

# Try to push (will be blocked)
git push origin main
# Output: ERROR: Direct push to main branch is not allowed!
```

## Git Aliases for Safe Operations

### Available Aliases

#### 1. Safe Push to Development
```powershell
git safe-push
```
**Purpose**: Always pushes to the development branch regardless of current branch
**Equivalent to**: `git push origin development`

#### 2. Deploy to Main
```powershell
git deploy-main
```
**Purpose**: Safely deploys development branch to main
**Steps performed**:
1. Switches to main branch
2. Merges development branch
3. Pushes to origin/main
4. Switches back to development

#### 3. Deploy to Production
```powershell
git deploy-prod
```
**Purpose**: Safely deploys development branch to production
**Steps performed**:
1. Switches to production branch
2. Merges development branch
3. Pushes to origin/production
4. Switches back to development

### Alias Configuration

The aliases are stored in your local git configuration:

```powershell
# View current aliases
git config --local --get-regexp alias

# Output:
# alias.safe-push push origin development
# alias.deploy-main !git checkout main && git merge development && git push origin main && git checkout development
# alias.deploy-prod !git checkout production && git merge development && git push origin production && git checkout development
```

## Daily Workflow with Protection

### Safe Development Workflow

```powershell
# 1. Start development (always on development branch)
git checkout development
git pull origin development

# 2. Create feature branch
git checkout -b feature/new-feature

# 3. Work on feature
# ... make changes ...

# 4. Push feature branch
git push -u origin feature/new-feature

# 5. Merge to development
git checkout development
git merge feature/new-feature
git safe-push  # Safe push to development

# 6. Deploy when ready
git deploy-main  # Deploy to main
git deploy-prod  # Deploy to production
```

### Emergency Override

**Only use in emergencies:**

```powershell
# Override protection (NOT RECOMMENDED)
git push --no-verify origin main
```

**When to use:**
- Critical security fixes
- Emergency rollbacks
- Production hotfixes that can't wait

## Protection Levels

### 🔒 **Fully Protected Branches**
- `main` - Production-ready code
- `production` - Deployed code

**Protection**: Pre-push hook blocks all direct pushes

### 🔓 **Development Branches**
- `development` - Integration branch
- `feature/*` - Feature branches
- `bugfix/*` - Bug fix branches

**Protection**: No restrictions, normal development flow

## GitHub Repository Settings

### Free Private Repository Limitations

**❌ Not Available (Requires GitHub Pro):**
- Branch protection rules
- Required pull request reviews
- Status checks
- Dismiss stale reviews

**✅ Available (Free Plan):**
- Local git hooks (implemented)
- Git aliases (implemented)
- Manual code review process
- Issue tracking and project management

### Recommended GitHub Workflow

Even without branch protection rules, follow these practices:

1. **Never push directly to main/production**
2. **Always work in feature branches**
3. **Use pull requests for code review** (manual process)
4. **Test thoroughly before merging**
5. **Use descriptive commit messages**

## Security Best Practices

### Environment Protection

**Never commit sensitive data:**
- API keys (use .env files)
- Database credentials
- Authentication tokens
- Personal information

**Current .env protection:**
- `.env` file is gitignored
- Sensitive keys are stored locally only
- Use environment variables in production

### Code Review Process

**Manual review checklist:**
- [ ] Code follows project conventions
- [ ] No sensitive data in commits
- [ ] TypeScript builds without errors
- [ ] Application runs correctly
- [ ] No breaking changes
- [ ] Tests pass (if applicable)

## Troubleshooting

### Hook Not Working

If the pre-push hook doesn't execute:

```powershell
# Check if hook file exists
ls .git/hooks/pre-push

# Make hook executable (Windows)
icacls ".git\hooks\pre-push" /grant Everyone:F

# Verify hook content
cat .git/hooks/pre-push
```

### Alias Not Found

If git aliases don't work:

```powershell
# Check if aliases are configured
git config --local --list | grep alias

# Re-add aliases if missing (see setup script)
```

### Accidental Commit to Protected Branch

If you accidentally commit to main/production:

```powershell
# Move commits to correct branch
git log --oneline -n 3  # Find commit hash
git reset --hard HEAD~1  # Remove from current branch
git checkout development  # Switch to development
git cherry-pick commit-hash  # Apply commit to development
```

## Maintenance

### Regular Tasks

**Weekly:**
- Verify hooks are still active
- Clean up merged feature branches
- Update development branch from remote

**Monthly:**
- Review branch structure
- Clean up old feature branches
- Update documentation if workflow changes

### Backup Strategy

**Important files to backup:**
- `.git/hooks/pre-push` - Hook configuration
- Git configuration with aliases
- Documentation files

## Implementation History

**Setup completed:**
- ✅ Pre-push hook installed and tested
- ✅ Git aliases configured
- ✅ Protection verified on main and production
- ✅ Documentation created
- ✅ Workflow guidelines established

**Next steps:**
- Monitor protection effectiveness
- Train team members on workflow
- Consider upgrading to GitHub Pro for additional features
