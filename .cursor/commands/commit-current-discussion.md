## Steps to follow
1. Run "npm run ci" to see if tests, build and lint are successful
2. If the "ci" command is not successful, fix the issues before trying to commit again
    1. lint issues : run the .cursor/commands/fix-lint.md, and run "npm run lint" to see if the issues are fixed
    2. build issues : run "npm run build" to see if the build is successful
    3. test issues : run "npm run test" to see if the tests are successful
3. If the "ci" command is successful, commit the changes with the following steps:
    1. Add the files you modified (with git add) for the feature / fix that was done in the current discussion.
    2. Then create a commit message based on instructions in the .cursor/commands/get-commitizen-msg.md file
    3. If the commit can't go through because of lint / build errors, go back to step 3 and fix the issues