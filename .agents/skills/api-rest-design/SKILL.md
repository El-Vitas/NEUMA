---
name: api-rest-design
description: Design, evaluate, and improve REST APIs following architectural constraints, resource-oriented modeling, HTTP semantics, security, versioning, pagination, error handling, and observability best practices. Use when creating new APIs or refactoring existing endpoints.
metadata:
  version: '1.0'
  scope: [general]
  auto_invoke: 'Creating or reviewing REST API endpoints'
---

# REST API Design Skill

## When to use this skill

Use this skill when:

- Designing a new REST API.
- Refactoring RPC-style endpoints into resource-oriented REST.
- Reviewing API consistency and best practices.
- Defining contracts (OpenAPI).
- Improving scalability, security, or observability of an API.

---

# 1. REST Foundations

## 1.1 Architectural Constraints

Ensure the API respects REST principles:

1. **Client–Server Separation**  
   UI and backend evolve independently.

2. **Statelessness**  
   Each request contains all required information.  
   No server-side sessions.

3. **Uniform Interface**
   - Resources identified by URIs.
   - Standard HTTP methods.
   - Consistent representations (JSON).

4. **Cacheability**  
   Use proper HTTP caching headers where applicable.

5. **Layered System**  
   Allow proxies, gateways, load balancers.

6. **Code on Demand (Optional)**  
   Rarely used in modern APIs.

---

# 2. Resource-Oriented Modeling

## 2.1 Core Rule

An endpoint represents a **collection of resources**.

- `/users` → collection
- `/users/{id}` → specific resource

Never design endpoints as verbs.

❌ `/createUser`  
❌ `/executeWorkflow`

✔ `/users` (POST)  
✔ `/workflows/{id}/executions`

---

## 2.2 Sub-Resources for Business Actions

When an action produces traceable state, model it as a resource.

Examples:

- Approve → `/orders/{id}/approvals`
- Execute → `/workflows/{id}/executions`
- Cancel → `/orders/{id}/cancellations`
- Publish → `/articles/{id}/publications`

Rule: **Substantivize the verb.**

---

## 2.3 URI Conventions

- Use plural nouns: `/products`
- Lowercase only
- Use hyphens for readability: `/payment-methods`
- Maximum 2 levels of nesting:
  - ✔ `/users/{id}/orders`
  - ❌ `/users/{id}/orders/{orderId}/items/{itemId}/details`

Flatten if necessary:

- `/order-items/{id}`

---

# 3. HTTP Method Semantics

| Method | Usage          | Idempotent | Notes                  |
| ------ | -------------- | ---------- | ---------------------- |
| GET    | Retrieve       | Yes        | No side effects        |
| POST   | Create         | No         | Server assigns ID      |
| PUT    | Replace        | Yes        | Full replacement       |
| PATCH  | Partial update | No         | Modify specific fields |
| DELETE | Remove         | Yes        | Remove resource        |

## 3.1 Status Codes

### Success (2xx)

- 200 OK
- 201 Created (include Location header)
- 202 Accepted (async processing)
- 204 No Content

### Client Errors (4xx)

- 400 Bad Request
- 401 Unauthorized
- 403 Forbidden
- 404 Not Found
- 409 Conflict
- 422 Unprocessable Entity
- 429 Too Many Requests

### Server Errors (5xx)

- 500 Internal Server Error
- 503 Service Unavailable

Never return 200 for errors.

---

# 4. Data Handling Best Practices

## 4.1 Pagination

Required for large collections.

Two common strategies:

### Offset Pagination

`GET /products?page=1&limit=20`

### Cursor Pagination (preferred for dynamic datasets)

`GET /products?cursor=abc123&limit=20`

---

## 4.2 Filtering & Sorting

Use query parameters:

`GET /orders?status=paid&sort=createdAt:desc`

---

## 4.3 Field Selection

Allow partial responses:

`GET /users/123?fields=name,email`

---

## 4.4 Relationship Inclusion

Avoid UI-oriented endpoints.

❌ `/workshops/detailed/with-sections`

✔ `/workshops?include=sections`

Prevent over-fetching and under-fetching using `include`.

---

# 5. Async & Long-Running Processes

If an operation takes time:

1. Create resource.
2. Return `202 Accepted`.
3. Provide `Location` header.

Example:

POST `/workflows/scraper/executions`

Response:

- 202 Accepted
- Location: `/executions/123`

Client polls:

GET `/executions/123`

---

# 6. Idempotency

For critical POST operations (payments, transfers):

Require `Idempotency-Key` header.

If duplicate key received:

- Return original response.
- Do not duplicate processing.

---

# 7. Error Standardization

All errors must follow the same structure:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": "Optional contextual info"
  }
}
```

Do not return raw stack traces.

---

# 8. Security

## 8.1 Transport Security

- HTTPS mandatory.

## 8.2 Authentication

- OAuth 2.0 or JWT Bearer tokens.

## 8.3 Authorization

- Role-based or policy-based access control.
- Principle of least privilege.

## 8.4 Rate Limiting

- Protect against abuse.
- Return 429 when exceeded.

---

# 9. Versioning

Never introduce breaking changes without versioning.

Preferred:

`/v1/users`

Alternative:

- Header-based versioning.

Safe changes:

- Adding optional fields.

Breaking changes:

- Removing fields
- Changing types
- Renaming properties

---

# 10. Observability

## 10.1 Request ID

Include:

`X-Request-ID`

## 10.2 Structured Logging

Log:

- Method
- Path
- Status
- Duration
- Correlation ID

---

# 11. OpenAPI Contract

Every API must:

- Provide OpenAPI 3 specification.
- Document:
  - Endpoints
  - Schemas
  - Error responses
  - Authentication

Contract-first approach recommended.

---

## References & Links

- See [references/api-rest-links.md](references/api-rest-links.md) for curated external links and notes.

Agents may fetch the URLs listed in that file to read detailed guidance on REST API best practices.

---

# 12. Anti-Patterns to Avoid

- RPC-style endpoints
- UI-specific routes
- Inconsistent error structures
- Returning 200 for everything
- No pagination
- Deeply nested routes
- Exposing internal DB models directly
- Storing session state in REST

---

# Final Checklist

Before shipping an API:

- [ ] Resources modeled as nouns
- [ ] Correct HTTP methods used
- [ ] Proper status codes
- [ ] Pagination implemented
- [ ] Filtering and sorting available
- [ ] Errors standardized
- [ ] HTTPS enforced
- [ ] Authentication required
- [ ] Version defined
- [ ] OpenAPI documented
- [ ] Idempotency handled where needed
- [ ] Async processes modeled as resources
