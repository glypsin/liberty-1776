## Git Workflow

NEVER commit directly to main. Always:
1. Create a feature branch: `git checkout -b feat/description`
2. Make changes and commit to the branch
3. Push the branch and create a PR via `gh pr create`
4. CI must pass before merging
5. Merge via `gh pr merge --squash`

Main branch is protected: requires PR + CI passing.

## Testing

Run tests: `node tests/test_game.js`
Tests must pass before creating a PR.

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
- Save progress, checkpoint, resume → invoke checkpoint
- Code quality, health check → invoke health
