## CI/CD Quality Assurance Workflow

### Primary Commands
- **Full pipeline**: `npm run ci` (runs tests, linting, and build)
- **Individual checks**:
  - Tests: `npm run test`
  - Linting: `npm run lint`
  - Build: `npm run build`

### Optimized Workflow

1. Run the full check: `npm run ci` to establish a baseline.
2. Categorize issues into syntax errors, type errors, lint violations, and warnings.
3. Fix blocking issues first: syntax errors, type errors, and failing tests.
4. Address lint and style issues next: unused imports, variables, formatting.
5. After each fix batch, run `npm run lint` or `npm run build` for quick verification.
6. Finally, run `npm run ci` to confirm all issues are resolved.

### Priority Guidelines
- **Blockers**: Syntax errors, type errors, failing tests — fix immediately.
- **Style**: Unused imports/variables, code formatting — fix after blockers.
- **Warnings**: Performance or documentation suggestions — address as time permits.

## Code Quality Guidelines

### Variables
- Remove unused variable assignments but keep element creation:
  ```typescript
  // Instead of:
  const el = parent.createEl('div');
  // Use:
  parent.createEl('div');
  ```

### Type Safety
- Avoid type assertions; prefer runtime type checks:
  ```typescript
  // Instead of:
  const value = input as ExpectedType;
  // Use:
  const value = input;
  if (value instanceof ExpectedType) {
    // Safe usage here
  }
  ```

### Imports
- Remove unused imports.
- Prefer named imports over default imports.
- Organize imports: external libraries → internal modules → types.

### Defensive Coding
- Always check for null/undefined before property access.
- Use optional chaining (`?.`) for safe access.
- Prefer `const` over `let` when variables are not reassigned.