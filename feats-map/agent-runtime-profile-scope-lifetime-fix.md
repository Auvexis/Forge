# Agent Runtime Profile Scope Lifetime Fix

## Goal

Keep profile database connections open for asynchronous Dev Session jobs and approval resumes, independent of trigger type.

## Tasks

- [x] Add profile scope ownership to Dev Session lifecycle and queued jobs.
- [x] Use profile-scoped plugin callback URLs during Dev Session setup.
- [x] Run approval resumes inside a fresh profile scope.
- [x] Add regression tests for async profile scope lifetime.
- [x] Run focused tests, builds, and commit.
