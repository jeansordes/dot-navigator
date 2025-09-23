# Refactor Code

Refactor the provided file to improve readability, maintainability, and structure while preserving existing functionality. The agent should modify the file directly and not return the refactored code separately.

## Arguments
- `<file>`: Path to the file that should be refactored.

## Instructions
1. Refactor the code while preserving external behavior.
2. Apply the following improvements:
    - Simplify nested logic and conditionals.
    - Rename variables, functions, or classes for clarity and consistency.
    - Remove unused imports, variables, or dead code.
    - Ensure consistent formatting and indentation.
    - Break down large functions:
        - Functions longer than ~40 lines should be split into smaller, single-responsibility functions.
        - Place helper functions near where they are used or in a separate utility file if they are reusable.
    - If the file is longer than 300–400 lines:
        - Extract logically related sections into separate files (e.g., `utils/`, `components/`, `services/`, `models/`, depending on the project).
        - Update imports and exports accordingly.
    - Consolidate duplicate or similar code into shared helpers.
    - Add or improve docstrings and inline comments for clarity where needed.
3. Do not introduce new external dependencies.
4. Save the changes directly to the file and any new files created.
5. Use `npm run ci` to make sure you didn't break anything
