## Commit Workflow for Current Discussion

Follow these steps to safely commit your changes:

### 1. Verify CI
- Run:
  ```bash
  npm run ci
  ```
- This checks **lint**, **build**, and **tests** in one command.

### 2. Fix Issues if CI Fails
- **Lint errors**  
  - Follow the instructions in the file: `.cursor/commands/fix-ci.md`  
  - Recheck with:
    ```bash
    npm run lint
    ```
- **Build errors**  
  - Run:
    ```bash
    npm run build
    ```
- **Test errors**  
  - Run:
    ```bash
    npm run test
    ```

Repeat `npm run ci` until it passes.

### 3. Commit the Changes
1. Stage your changes:
   ```bash
   git add <modified-files>
   ```
   (only the files relevant to this feature/fix)
2. Generate a commit message using instructions in the file:
   `.cursor/commands/get-commitizen-msg.md`
3. Create the commit:
   ```bash
   git commit
   ```

### 4. If Commit Fails
- If the commit is blocked due to lint/build/test issues:  
  → Go back to **Step 2** (Fix Issues) and try again.