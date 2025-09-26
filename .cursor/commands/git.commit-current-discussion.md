How to commit the current discussion:
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