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
4. If the commit fails because of ci
   1. try to fix the issues
   2. run `npm run ci` to check if the issues are fixed
   3. stage the changes
   4. try to commit again