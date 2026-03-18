#!/bin/bash
set -e

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== outlook-cli-skill installer ==="
echo ""

# 1. Build and link CLI
echo "Installing outlook-auth CLI..."
cd "$REPO_DIR/cli" && npm install && npm run build && npm link
echo "✓ outlook-auth command available"
echo ""

# 2. Detect AI tools and install skills
install_skills() {
  local target="$1"
  mkdir -p "$target"
  for f in "$REPO_DIR"/skills/*.md; do
    local base
    base="$(basename "$f")"
    ln -sf "$f" "$target/$base"
  done
  echo "✓ Skills installed to $target (symlink)"
}

INSTALLED=0

if [ -d "$HOME/.shared-ai-skills" ]; then
  install_skills "$HOME/.shared-ai-skills"
  INSTALLED=1
elif [ -d "$HOME/.claude" ]; then
  install_skills "$HOME/.claude/skills"
  INSTALLED=1
fi

if [ -d "$HOME/.cursor" ]; then
  install_skills "$HOME/.cursor/skills"
  INSTALLED=1
fi

if [ -d "$HOME/.codex" ]; then
  install_skills "$HOME/.codex/skills"
  INSTALLED=1
fi

if [ "$INSTALLED" -eq 0 ]; then
  echo "⚠ No AI tool config directories detected."
  echo "  Manually symlink skills/*.md to your AI tool's skills directory."
fi

echo ""
echo "=== Next steps ==="
echo "1. Set up Azure App (see README.md Step 1) if you haven't already"
echo "2. outlook-auth config set clientId <your-id> tenantId <your-id>"
echo "3. outlook-auth login"
echo "4. outlook-auth status"
