# API module extraction strategy

The public contract is the existing `/api` router. Do not rename or remount routes while extracting modules.

## Target module shape

```text
modules/<feature>/
├── controller.ts   # HTTP translation only
├── service.ts      # business rules and transactions
├── repository.ts   # Prisma queries
├── validation.ts   # Zod request/response schemas
├── dto.ts          # stable transport types
├── types.ts        # internal domain types
├── routes.ts       # existing paths and middleware
└── index.ts        # public exports
```

Planned modules: `auth`, `users`, `artists`, `songs`, `videos`, `comments`, `community`, `heritage`, `tor-tiv`, `governors`, `admin`, `cms`, `analytics`, `search`, `notifications`, `uploads`, and `media`.

## Migration rule

Extract one feature per pull request:

1. Add characterization tests for current behavior.
2. Move Zod schemas.
3. Move Prisma queries into a repository.
4. Move rules/transactions into a service.
5. Move Express handlers into a controller.
6. Mount the module router at the exact existing path.
7. Compare OpenAPI and regression-test results.

The legacy router is an adapter during this process, not a second implementation. Shared authentication, error handling, logging, storage, queues and events belong under `src/platform`.
