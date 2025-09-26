### Preparation
1. Run `git status --short` to see what files are staged or unstaged.
2. Run `git diff --cached` to view the actual staged modifications.
3. Use only these outputs to determine the commit type, scope, and description.
4. If there are no staged changes, stage all changes with `git add .` and rerun the commands.

---

Always base the commit message ONLY on staged changes from `git diff --cached`.

Generate a commit message in the commitizen style, and output it in a code block, so that the user can easily copy it.

Analyze the current git status and staged changes to determine the appropriate commit type (feat, fix, refactor, docs, style, test, chore, etc.), affected scope, and provide a clear description of what changed.

#### Commit Type Rules

- **Features:**
  - `feat`: A new feature FOR THE FINAL USER OF THE PLUGIN (not the developer)
  - `feat(ui)`: When the commit is related to the UI (not the core functionality)
  - `perf`: Performance improvements of the plugin FOR THE FINAL USER OF THE PLUGIN (not the developer)

- **Bugfix:**
  - `fix`: A bug fix

- **Code maintenance:**
  - `refactor`: Code changes that neither fix bugs nor add features
  - `chore`: Changes to the build process or auxiliary tools
  - `style`: Code style changes (formatting, missing semicolons, etc.)

- **Documentation & tests:**
  - `docs`: Documentation changes
  - `test`: Adding or updating tests

---

**Note:** If multiple change types exist, prioritize user-facing types (`feat`, `fix`, `perf`) over internal ones.