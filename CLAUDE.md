## Safety Rules
- Always ask for confirmation before running any file write or delete command (e.g., `rm`, modifying files).
- If unsure, ask me explicitly before proceeding.
- Exception: pnpm commands are always allowed, even if they contain rm/delete operations

## Allowed Commands  
- its always okay to run any pnpm commands in the saga-sm context (including clean commands)

## Permanent Tool Permissions
### Always allowed Bash commands:
- cd /home/skelly/dev/saga-sm/** (any directory navigation in saga-sm)
- pnpm build (in any project directory)
- pnpm generate (in any project directory) 
- pnpm typecheck (in any project directory)
- pnpm exec tsx:** (any tsx execution)
- tsup (TypeScript bundler)
- find /home/skelly/dev/saga-sm/** (file searching)
- ls /home/skelly/dev/saga-sm/** (directory listing)
- ./scripts/setup-local-dev.sh (saga-sm setup script)

### Always allowed file operations:
- Read: /home/skelly/dev/saga-sm/**
- Edit: /home/skelly/dev/saga-sm/**
- Write: /home/skelly/dev/saga-sm/**

## Coding Preferences
- Use 4-space indentation only.
- Write tests for every new feature.
- All packages in this mono-repo MUST use pnpm commands only, never npm commands in package.json scripts or anywhere else.

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.