# Git Alias Setup Script

This PowerShell script recreates all the Git aliases and configurations for the FreeYap project branch protection system.

## Quick Setup

Run this script to restore all git aliases and configurations:

```powershell
# Navigate to project root
cd "c:\Users\jdpar\OneDrive\Desktop\FreeYap\Node"

# Run the setup script
.\setup-git-aliases.ps1
```

## Manual Setup Commands

If you prefer to run commands individually or need to troubleshoot:

### Core Git Aliases

```powershell
# Safe push to development branch
git config --local alias.safe-push "push origin development"

# Safe deployment to main
git config --local alias.deploy-main "!git checkout main && git merge development && git push origin main && git checkout development"

# Safe deployment to production  
git config --local alias.deploy-prod "!git checkout production && git merge development && git push origin production && git checkout development"

# Create new feature branch
git config --local alias.new-feature "!f() { git checkout development && git pull origin development && git checkout -b feature/$1; }; f"

# Create new bugfix branch
git config --local alias.new-bugfix "!f() { git checkout development && git pull origin development && git checkout -b bugfix/$1; }; f"

# Create new hotfix branch
git config --local alias.new-hotfix "!f() { git checkout development && git pull origin development && git checkout -b hotfix/$1; }; f"
```

### Utility Aliases

```powershell
# Quick status with branch info
git config --local alias.st "status -sb"

# Pretty log with graph
git config --local alias.lg "log --oneline --graph --decorate --all"

# Show last 10 commits
git config --local alias.last "log -10 --oneline"

# Show current branch
git config --local alias.current-branch "rev-parse --abbrev-ref HEAD"

# List all local branches
git config --local alias.branches "branch -a"

# Clean up merged branches (except main, production, development)
git config --local alias.cleanup "!git branch --merged | grep -E '^\\s*(feature|bugfix|hotfix)/' | xargs -r git branch -d"
```

### Advanced Aliases

```powershell
# Sync current branch with development
git config --local alias.sync-dev "!git fetch origin && git merge origin/development"

# Push current branch and set upstream
git config --local alias.publish "!git push -u origin $(git rev-parse --abbrev-ref HEAD)"

# Undo last commit (keep changes)
git config --local alias.undo "reset --soft HEAD~1"

# Show files changed in last commit
git config --local alias.changed "diff-tree --no-commit-id --name-only -r HEAD"

# Interactive rebase for last n commits
git config --local alias.rebase-interactive "!f() { git rebase -i HEAD~$1; }; f"
```

## Pre-Push Hook Setup

Ensure the pre-push hook is properly configured:

```powershell
# Create pre-push hook content
$hookContent = @"
#!/bin/sh

# Pre-push hook to prevent direct pushes to main and production branches
protected_branches="main production"
current_branch=`$(git symbolic-ref HEAD | sed -e 's,.*/\(.*\),\1,')

for branch in `$protected_branches; do
    if [ "`$current_branch" = "`$branch" ]; then
        echo "ERROR: Direct push to `$branch branch is not allowed!"
        echo "Please create a pull request or merge from development branch instead."
        echo "To override this protection, use: git push --no-verify"
        exit 1
    fi
done

exit 0
"@

# Write hook to file
$hookContent | Out-File -FilePath ".git\hooks\pre-push" -Encoding UTF8

# Make hook executable
icacls ".git\hooks\pre-push" /grant Everyone:F
```

## Verification Commands

After setup, verify everything is working:

```powershell
# Check all aliases are configured
git config --local --get-regexp alias

# Test the pre-push hook (should show protection message)
git checkout main
echo "test" > test-file.txt
git add test-file.txt
git commit -m "Test commit"
git push origin main  # Should be blocked
git reset --hard HEAD~1  # Clean up test
git checkout development

# Test aliases
git current-branch  # Should show: development
git branches        # Should list all branches
git st              # Should show status
```

## Usage Examples

### Starting New Work

```powershell
# Create feature branch
git new-feature css-consolidation

# Create bugfix branch  
git new-bugfix matchmaking-timeout

# Create hotfix branch
git new-hotfix security-patch
```

### Daily Development

```powershell
# Check status
git st

# Sync with development
git sync-dev

# Publish feature branch
git publish

# Safe push to development
git safe-push
```

### Deployment

```powershell
# Deploy to main
git deploy-main

# Deploy to production
git deploy-prod

# Check deployment status
git lg
```

### Maintenance

```powershell
# See recent activity
git last

# Clean up old branches
git cleanup

# View all branches
git branches
```

## Troubleshooting

### If Aliases Don't Work

```powershell
# Check git configuration
git config --local --list

# Check if you're in the right directory
git status

# Re-run alias setup commands
```

### If Hook Doesn't Work

```powershell
# Check hook exists
Get-ChildItem ".git\hooks\pre-push"

# Check hook permissions
icacls ".git\hooks\pre-push"

# Recreate hook with proper content
```

### If Commands Fail

```powershell
# Ensure you're on development branch
git checkout development

# Pull latest changes
git pull origin development

# Check for uncommitted changes
git status
```

## Complete Setup Script

Save as `setup-git-aliases.ps1`:

```powershell
#!/usr/bin/env pwsh

Write-Host "Setting up Git aliases for FreeYap project..." -ForegroundColor Green

# Core aliases
git config --local alias.safe-push "push origin development"
git config --local alias.deploy-main "!git checkout main && git merge development && git push origin main && git checkout development"
git config --local alias.deploy-prod "!git checkout production && git merge development && git push origin production && git checkout development"

# Branch creation aliases
git config --local alias.new-feature "!f() { git checkout development && git pull origin development && git checkout -b feature/`$1; }; f"
git config --local alias.new-bugfix "!f() { git checkout development && git pull origin development && git checkout -b bugfix/`$1; }; f"
git config --local alias.new-hotfix "!f() { git checkout development && git pull origin development && git checkout -b hotfix/`$1; }; f"

# Utility aliases
git config --local alias.st "status -sb"
git config --local alias.lg "log --oneline --graph --decorate --all"
git config --local alias.last "log -10 --oneline"
git config --local alias.current-branch "rev-parse --abbrev-ref HEAD"
git config --local alias.branches "branch -a"
git config --local alias.sync-dev "!git fetch origin && git merge origin/development"
git config --local alias.publish "!git push -u origin `$(git rev-parse --abbrev-ref HEAD)"
git config --local alias.undo "reset --soft HEAD~1"
git config --local alias.changed "diff-tree --no-commit-id --name-only -r HEAD"

Write-Host "Git aliases configured successfully!" -ForegroundColor Green

# Setup pre-push hook
$hookContent = @"
#!/bin/sh

# Pre-push hook to prevent direct pushes to main and production branches
protected_branches="main production"
current_branch=`$(git symbolic-ref HEAD | sed -e 's,.*/\(.*\),\1,')

for branch in `$protected_branches; do
    if [ "`$current_branch" = "`$branch" ]; then
        echo "ERROR: Direct push to `$branch branch is not allowed!"
        echo "Please create a pull request or merge from development branch instead."
        echo "To override this protection, use: git push --no-verify"
        exit 1
    fi
done

exit 0
"@

$hookContent | Out-File -FilePath ".git\hooks\pre-push" -Encoding UTF8
icacls ".git\hooks\pre-push" /grant Everyone:F

Write-Host "Pre-push hook configured successfully!" -ForegroundColor Green

# Verification
Write-Host "`nVerifying setup..." -ForegroundColor Yellow
git config --local --get-regexp alias | Measure-Object | ForEach-Object { Write-Host "Configured $($_.Count) aliases" -ForegroundColor Cyan }

if (Test-Path ".git\hooks\pre-push") {
    Write-Host "Pre-push hook installed" -ForegroundColor Cyan
} else {
    Write-Host "Warning: Pre-push hook not found" -ForegroundColor Red
}

Write-Host "`nSetup complete! Try 'git st' or 'git branches' to test." -ForegroundColor Green
```

## Integration with VS Code

Add these tasks to `.vscode/tasks.json` for GUI access:

```json
{
    "label": "Git: Deploy to Main",
    "type": "shell", 
    "command": "git",
    "args": ["deploy-main"],
    "group": "build"
},
{
    "label": "Git: Deploy to Production",
    "type": "shell",
    "command": "git", 
    "args": ["deploy-prod"],
    "group": "build"
},
{
    "label": "Git: Safe Push",
    "type": "shell",
    "command": "git",
    "args": ["safe-push"], 
    "group": "build"
}
```
