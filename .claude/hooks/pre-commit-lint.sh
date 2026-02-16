#!/bin/bash

# Claude Code PreToolUse hook: lint frontend before git commits
# Reads hook input from stdin, checks if command is a git commit,
# and runs ESLint. Exit 2 blocks the commit if lint fails.

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command')

if echo "$COMMAND" | grep -q "git commit"; then
  cd "$CLAUDE_PROJECT_DIR/frontend" || exit 0
  if ! npm run lint 2>&1; then
    echo "Frontend lint failed. Fix errors before committing." >&2
    exit 2
  fi
fi

exit 0
