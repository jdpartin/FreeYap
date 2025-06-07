# Feature Branch Workflow Guide

This document outlines the complete process for creating, developing, and merging feature branches in the FreeYap project.

## Overview

Feature branching is a Git workflow where each new feature, bug fix, or improvement is developed in its own dedicated branch. This keeps the main development branch stable and allows for parallel development.

## Branch Structure

```
main (production-ready code)
├── production (deployed code)
├── development (integration branch)
│   ├── feature/css-consolidation
│   ├── feature/webrtc-embeddings
│   ├── bugfix/matchmaking-timeout
│   └── hotfix/security-patch
```

## Naming Conventions

Use descriptive names with prefixes:

- `feature/` - New features or enhancements
- `bugfix/` - Bug fixes
- `hotfix/` - Critical fixes that need immediate deployment
- `chore/` - Maintenance tasks (dependency updates, refactoring)
- `docs/` - Documentation updates

### Examples:
```
feature/video-chat-improvements
feature/user-authentication
bugfix/matchmaking-timeout-issue
hotfix/security-vulnerability
chore/update-dependencies
docs/api-documentation
```

## Step-by-Step Workflow

### 1. Starting a New Feature

```powershell
# Ensure you're on development branch and up to date
git checkout development
git pull origin development

# Create and switch to new feature branch
git checkout -b feature/your-feature-name

# Or use the alias (if set up)
git new-feature your-feature-name
```

### 2. Development Process

```powershell
# Make your changes
# Edit files, add features, fix bugs

# Stage changes
git add .

# Commit with descriptive message
git commit -m "feat: Add video chat connection improvements"

# Push to remote (creates the branch on GitHub)
git push -u origin feature/your-feature-name

# For subsequent pushes
git push
```

### 3. Keeping Feature Branch Updated

```powershell
# Regularly sync with development to avoid conflicts
git checkout development
git pull origin development
git checkout feature/your-feature-name
git merge development

# Or use rebase for cleaner history
git rebase development
```

### 4. Completing the Feature

```powershell
# Final commit and push
git add .
git commit -m "feat: Complete video chat improvements"
git push

# Switch to development
git checkout development

# Merge the feature (fast-forward if possible)
git merge feature/your-feature-name

# Push to development
git push origin development

# Clean up: Delete the feature branch
git branch -d feature/your-feature-name
git push origin --delete feature/your-feature-name
```

### 5. Deploying to Main/Production

```powershell
# Use the safe deployment aliases
git deploy-main      # Deploys development to main
git deploy-prod      # Deploys development to production
```

## Example: Working on CSS Consolidation Issue

Based on your `issues.txt`, here's a complete example:

```powershell
# 1. Start the feature
git checkout development
git pull origin development
git checkout -b feature/css-consolidation

# 2. Work on the issue
# - Consolidate CSS files in public/css/
# - Create reusable classes
# - Update components to use new classes

# 3. Commit progress
git add public/css/
git commit -m "feat: Create base utility classes for common styles"

git add views/components/
git commit -m "feat: Update components to use consolidated CSS classes"

# 4. Push to remote
git push -u origin feature/css-consolidation

# 5. Keep updated with development
git checkout development
git pull origin development
git checkout feature/css-consolidation
git merge development

# 6. Final testing and completion
npm run build
npm start
# Test the application thoroughly

# 7. Complete the feature
git add .
git commit -m "feat: Complete CSS consolidation with reusable classes"
git push

# 8. Merge to development
git checkout development
git merge feature/css-consolidation
git push origin development

# 9. Clean up
git branch -d feature/css-consolidation
git push origin --delete feature/css-consolidation

# 10. Deploy when ready
git deploy-main
```

## Best Practices

### Commit Messages
Use conventional commit format:
- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes
- `refactor:` - Code refactoring
- `test:` - Adding tests
- `chore:` - Maintenance tasks

### Branch Management
- Keep feature branches focused on a single issue/feature
- Regularly sync with development branch
- Write descriptive branch names
- Delete merged branches to keep repository clean
- Test thoroughly before merging

### Code Quality
- Build and test before pushing: `npm run build`
- Run the application locally: `npm start`
- Check for TypeScript errors
- Ensure all functionality works as expected

## Common Commands Quick Reference

```powershell
# Create feature branch
git checkout -b feature/branch-name

# Switch branches
git checkout branch-name

# See all branches
git branch -a

# Merge branch (from target branch)
git merge source-branch

# Delete local branch
git branch -d branch-name

# Delete remote branch
git push origin --delete branch-name

# Push new branch to remote
git push -u origin branch-name

# See branch history
git log --oneline --graph --all
```

## Troubleshooting

### Merge Conflicts
```powershell
# When conflicts occur during merge
git status                    # See conflicted files
# Edit files to resolve conflicts
git add .                     # Stage resolved files
git commit                    # Complete the merge
```

### Accidentally Committing to Wrong Branch
```powershell
# Move last commit to correct branch
git log --oneline -n 5        # Find commit hash
git reset --hard HEAD~1       # Remove from current branch
git checkout correct-branch    # Switch to correct branch
git cherry-pick commit-hash    # Apply commit to correct branch
```

### Forgot to Create Feature Branch
```powershell
# Create branch from current state
git checkout -b feature/forgot-branch
git push -u origin feature/forgot-branch
# Now you're on the correct branch
```

## Integration with FreeYap Issues

For each issue in `issues.txt`, create a corresponding feature branch:

1. **CSS Consolidation**: `feature/css-consolidation`
2. **WebRTC Embeddings**: `feature/webrtc-embeddings`
3. **Matchmaking Verification**: `feature/matchmaking-verification`
4. **Vector DB Cleanup**: `feature/vector-db-cleanup`

This approach ensures each issue is tracked, developed, and tested independently while maintaining a clean development workflow.
