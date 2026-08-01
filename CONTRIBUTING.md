# Contributing to Tiv Songs

## Principles

Preserve culture, user data, existing routes and backward compatibility. Prefer small reviewed changes over rewrites.

## Workflow

1. Create a focused branch.
2. Add or update characterization tests.
3. Validate all untrusted input with Zod.
4. Keep route/controller logic thin; place new rules in a feature service and Prisma access in a repository.
5. Record administrator mutations in the audit log.
6. Update OpenAPI and documentation.
7. Run:

```cmd
npm run lint
npm test
npm run build
```

## Database changes

Change both production and local schemas, generate a reviewed migration, preserve existing rows and provide a rollback/data-recovery plan. Never rewrite an applied migration or use `db push` in production.

## API compatibility

Do not change an existing HTTP method/path or remove response fields. Use additive fields or a versioned route. Authentication and error semantics are part of the contract.

## Pull-request checklist

- Scope and risk explained
- Tests cover success, validation, authorization and failure
- No secrets or private user data
- Accessibility and responsive behavior checked
- Security and performance impact considered
- Documentation and changelog updated
