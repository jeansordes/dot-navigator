## Steps to follow
1. Run "npm run build" to see if the build is successful
2. Run "npm run lint" to see if the lint is successful
3. If the build or lint is not successful, fix the issues before trying to commit again
    1. lint issues : run the .cursor/commands/fix-lint.md, and run "npm run lint" to see if the issues are fixed
    2. build issues : run "npm run build" to see if the build is successful
4. If the build and lint are successful, commit the changes
    1. Add the files you modified (with git add) for the feature / fix that was done in the current discussion.
    2. Then create a commit message based on instructions in the .cursor/commands/get-commitizen-msg.md file
    3. If the commit can't go through because of lint / build errors, go back to step 3 and fix the issues