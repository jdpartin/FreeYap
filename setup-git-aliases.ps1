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

# Ensure hooks directory exists
if (!(Test-Path ".git\hooks")) {
    New-Item -ItemType Directory -Path ".git\hooks" -Force
}

$hookContent | Out-File -FilePath ".git\hooks\pre-push" -Encoding UTF8
icacls ".git\hooks\pre-push" /grant Everyone:F

Write-Host "Pre-push hook configured successfully!" -ForegroundColor Green

# Verification
Write-Host "`nVerifying setup..." -ForegroundColor Yellow
$aliasCount = (git config --local --get-regexp alias | Measure-Object).Count
Write-Host "Configured $aliasCount aliases" -ForegroundColor Cyan

if (Test-Path ".git\hooks\pre-push") {
    Write-Host "Pre-push hook installed" -ForegroundColor Cyan
} else {
    Write-Host "Warning: Pre-push hook not found" -ForegroundColor Red
}

Write-Host "`nSetup complete! Try 'git st' or 'git branches' to test." -ForegroundColor Green
Write-Host "`nAvailable aliases:" -ForegroundColor Yellow
Write-Host "  git safe-push       - Push to development branch" -ForegroundColor Cyan
Write-Host "  git deploy-main     - Deploy development to main" -ForegroundColor Cyan  
Write-Host "  git deploy-prod     - Deploy development to production" -ForegroundColor Cyan
Write-Host "  git new-feature     - Create new feature branch" -ForegroundColor Cyan
Write-Host "  git st              - Status with branch info" -ForegroundColor Cyan
Write-Host "  git lg              - Pretty log with graph" -ForegroundColor Cyan
Write-Host "  git branches        - List all branches" -ForegroundColor Cyan
