1. Run `git status --short` to see what files are staged or unstaged.
2. Run `git diff --cached` to view the actual staged modifications.
3. Use only these outputs to determine the commit type, scope, and description.
4. If there are no staged changes, stage all changes with `git add .` and rerun the commands.
5. Generate a commit message using instructions from `.cursor/commands/get-commitizen-msg.md`, and use it for the commit message
