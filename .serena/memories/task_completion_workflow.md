# YARN Scheduler UI - Task Completion Workflow

## Standard Workflow After Completing Code Changes

### 1. Code Quality Checks

Always run these commands after making changes:

```bash
# Fix any ESLint issues
npm run lint:fix

# Format code with Prettier
npm run format

# Verify no linting errors remain
npm run lint
```

### 2. Testing

Ensure tests pass after changes:

```bash
# Run all tests
npm test

# For UI verification, use test UI if needed
npm test:ui
```

### 3. Build Verification

Verify the build works correctly:

```bash
# Test production build
npm run build

# Preview the build locally (optional)
npm run preview
```

## Development Best Practices

### Code Review Checklist

- [ ] ESLint passes without warnings
- [ ] Code is properly formatted with Prettier
- [ ] TypeScript compilation succeeds
- [ ] All tests pass
- [ ] No console.log statements in production code (except in mocks)
- [ ] Component props have proper TypeScript interfaces
- [ ] Error boundaries are properly implemented

### Testing Guidelines

- Write unit tests for critical paths after each task
- Focus on business logic and user interactions
- Use the testing utilities in `src/test/testUtils.tsx`
- Mock external dependencies appropriately
- Aim for meaningful tests, not 100% coverage

### Version Control

- Make surgical, focused commits
- Write clear commit messages describing the change
- Test locally before pushing changes
- Follow the collaborative development process

## Performance Considerations

- Verify component re-renders are optimized
- Check bundle size if adding new dependencies
- Ensure proper memoization where needed
- Test with large datasets when working on queue visualization

## Documentation Updates

- Update relevant comments if changing complex logic
- Update TypeScript interfaces if changing data structures
- Consider updating CLAUDE.md if architectural changes are made

## Error Handling

- Ensure proper error boundaries are in place
- Verify error states are handled gracefully
- Test error scenarios manually
- Log appropriate error information for debugging
