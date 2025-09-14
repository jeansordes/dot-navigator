Generate a commit message in the commitizen style, and output it in a code block, so that the user can easily copy it.

Analyze the current git status and staged changes to determine the appropriate commit type (feat, fix, refactor, docs, style, test, chore, etc.), affected scope, and provide a clear description of what changed.

For the commit type, use the following rules:
- feat: A new feature FOR THE FINAL USER OF THE PLUGIN (not the developer)
- feat(ui): When the commit is related to the UI (not the core functionality)
- fix: A bug fix
- refactor: Code changes that neither fix bugs nor add features
- docs: Documentation changes
- perf: Performance improvements of the plugin FOR THE FINAL USER OF THE PLUGIN (not the developer)
- test: Adding or updating tests
- chore: Changes to the build process or auxiliary tools