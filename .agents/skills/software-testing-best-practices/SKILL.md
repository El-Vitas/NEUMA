---
name: software-testing-best-practices
description: Comprehensive best practices for writing, naming, organizing, and evaluating unit, integration and other automated tests to ensure quality, maintainability, and reliability in software development.
metadata:
  version: '1.0'
  scope: [tests]
  auto_invoke: 'Writing or reviewing automated tests, improving test quality'
---

# Software Testing Best Practices Skill

## When to use this skill

Use this skill when:

- Designing or reviewing automated tests (unit, integration, functional).
- Defining naming conventions for tests.
- Ensuring test suites are maintainable, reliable, and version-controlled.
- Improving test coverage that reflects meaningful verification.
- Implementing testing strategies in CI/CD pipelines.

---

# 1. Testing Foundations

## 1.1 What are Tests?

Automated tests are code that verifies other code behaves as expected. At a high level:

- **Unit tests:** Test the smallest units of code in isolation.
- **Integration tests:** Test interactions between components.
- **End-to-end tests:** Test complete user workflows from UI to backend.

Tests help detect regressions early, document intended behavior, and enable confident refactoring.

---

# 2. Naming Tests

## 2.1 Why Naming Matters

Test names are documentation. When a test fails, its name should immediately clarify **what broke** and **why** without reading the test body.

## 2.2 Naming Conventions

### A. Unit Tests

Pattern:

```
[MethodUnderTest]_When[Condition]_Should[ExpectedOutcome]

```

Example:

```
CalculateTotal_WhenItemsEmpty_ShouldReturnZero

```

This pattern clarifies:

1. **What** is being tested.
2. **Under what condition**.
3. **What outcome** is expected.

Good names are **specific** and **consistent across the suite**.

### B. Integration Tests

Pattern:

```
[Module1]_[Module2]_When[Scenario]_Should[Result]

```

Example:

```
OrderService_PaymentGateway_WhenPaymentFails_ShouldRollbackOrder

```

This names both the interacting components and the expected result.

## 2.3 Recommended Naming Style

- Prefer readability over brevity.
- Avoid cryptic abbreviations.
- Use natural language when possible.
- Adopt team-wide conventions (e.g., Given/When/Then or AAA-based naming).

---

# 3. Test Structure & Style

## 3.1 Arrange–Act–Assert (AAA)

Structure every test with clear phases:

1. **Arrange:** Set up data/state.
2. **Act:** Invoke behavior under test.
3. **Assert:** Verify expected result.

This pattern improves clarity and consistency.

## 3.2 Keep Tests Focused

- Each test should validate only **one behavior** or rule.
- Avoid combining multiple assertions relating to different behaviors in one test.
- If multiple outcomes need testing, write separate tests.

## 3.3 Avoid Logic in Tests

Don’t put complex logic (loops, ifs) in tests — it increases brittleness and hides intent. Tests should be as predictable and linear as possible.

## 3.4 Independent and Isolated Tests

Tests must not depend on:

- Execution order.
- Shared global state.
- External services (use mocks/stubs).

Independence ensures deterministic outcomes.

---

# 4. What to Test

## 4.1 Happy Paths

Test expected behavior with valid input:

- Normal cases that should work.
- Typical scenarios users encounter.

## 4.2 Edge Cases

Cover:

- Boundary conditions (min/max values).
- Null or invalid input.
- Unexpected states.

Edge cases expose hidden bugs not evident in happy paths.

## 4.3 Error Handling

Tests should verify how code behaves under failures:

- Throws correct exceptions.
- Returns meaningful error objects.
- Cleans up state after failure.

---

# 5. Test Quality

## 5.1 Readability

Tests must be understandable by future maintainers. Favor **clear variable names**, **structured assertions**, and **descriptive names**.

## 5.2 Maintainability

As code evolves:

- Tests should remain meaningful.
- Avoid testing implementation details — focus on **behavior**.

Behavior-driven development (BDD) approaches help align tests with user/feature expectations.

## 5.3 Deterministic Tests

Tests must have consistent outcomes every run. Flaky tests (random results) undermine trust and must be resolved immediately.

---

# 6. Organizing Tests

## 6.1 Directory Structure

Keep test code separate from production code. Typical layouts:

```
src/
  main/
    java/
  test/
    java/
      com/
        project/

```

Match test package structure with production code for easier navigation.

## 6.2 Test Suites

Group related tests logically:

- By module or feature.
- By type (unit/integration).
- Use frameworks’ tags or categories.

---

# 7. Test Automation

## 7.1 CI/CD Integration

Run tests automatically on each commit or pull request to catch regressions early. Automated test execution is a core practice for modern teams.

## 7.2 Code Coverage Tools

Use tools to measure coverage, but **don’t chase arbitrary numbers**. Prioritize meaningful tests over achieving a specific percentage.

---

# 8. Continuous Improvement

- Review tests during code review.
- Refactor tests when production code changes.
- Add tests for bugs when they are fixed (prevention-through-documentation).

---

# 9. Common Anti-Patterns

- Tests that depend on order.
- Tests with multiple logical branches.
- Vague or generic names.
- Testing implementation instead of behavior.
- Ignoring edge cases or error handling.

---

# Final Checklist

Before merging a test suite:

- [ ] Tests are named clearly and consistently.
- [ ] Each test covers one behavior.
- [ ] Tests are isolated and deterministic.
- [ ] Edge cases and error paths are included.
- [ ] Tests follow AAA structure.
- [ ] Tests run automatically in CI.
