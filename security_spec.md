# Security Specification for Miam Planner

## 1. Data Invariants
1. **Strict Multi-Tenant Isolation**: Every recipe, schedule day plan, and grocery item lives under `/users/{userId}/...` and carries an immutable `ownerId` matching both `{userId}` and `request.auth.uid`.
2. **Verified Identity**: All Firestore reads and writes require `request.auth != null && request.auth.token.email_verified == true`.
3. **Schema & Bounds Integrity**: Every string, number, enum, list, and document ID is strictly bounded and type-checked on create and update; no ghost/shadow fields are permitted (`hasAll` + `hasOnly` on create, `affectedKeys().hasOnly(...)` on update).
4. **Temporal Integrity**: `createdAt` and `updatedAt` must equal `request.time`; `createdAt`, `id`, and `ownerId` are immutable after creation.
5. **Query Security**: `allow list` rules explicitly enforce `resource.data.ownerId == request.auth.uid` without relying on client-side filtering or `get()`/`exists()` calls.
6. **SSRF & API Proxy Hardening**: `/api/extract-recipe` only reads `GEMINI_API_KEY` from server `process.env`, rejects non-HTTP(S) URLs, private/loopback/link-local IPs (including via DNS lookup), restricts payload size and fetch timeouts, and rate-limits requests.

## 2. The "Dirty Dozen" Adversarial Payloads (Must Return PERMISSION_DENIED)
1. **Cross-Tenant Read/Write**: User B attempts `get`/`create`/`update` on `/users/{userA}/recipes/{id}` -> DENIED (`request.auth.uid != userId`).
2. **Unverified Email Spoof**: Signed-in user with `email_verified: false` writes to `/users/{uid}/recipes/{id}` -> DENIED (`email_verified == true` required).
3. **OwnerId Spoofing on Create**: User A creates `/users/{userA}/recipes/r1` with `ownerId: "userB"` -> DENIED (`ownerId == request.auth.uid`).
4. **Shadow/Ghost Field Injection**: User A creates recipe with extra field `isAdmin: true` or `ghost: 1` -> DENIED (`keys().hasOnly(...)` rejects).
5. **Value Poisoning / Type Mismatch**: User A updates `servings: "four"` or `servings: 999` -> DENIED (`isValidRecipe` enforces number `1..50`).
6. **Denial-of-Wallet Oversized String**: User A creates recipe with `title` of 5,000 chars or `steps[0]` of 10,000 chars -> DENIED (`.size() <= 200` / `<= 2000`).
7. **ID Poisoning**: User A creates document with `recipeId = "../../etc/passwd"` or 500-char ID -> DENIED (`isValidId` regex `^[a-zA-Z0-9_-]+$`, `<= 128`).
8. **Immutable Field Tampering**: User A updates `ownerId`, `id`, or `createdAt` on an existing recipe -> DENIED (`affectedKeys().hasOnly(...)` + equality checks).
9. **Client Timestamp Spoofing**: User A creates recipe with client-forged `createdAt` != `request.time` -> DENIED (`createdAt == request.time`).
10. **Invalid Enum Injection**: User A creates recipe with `category: "dessert_hack"` or `cuisineType: "unknown"` -> DENIED (enum check rejects).
11. **Unbounded Array Injection**: User A submits recipe with 100 ingredients or 50 tags -> DENIED (`ingredients.size() <= 50`, `tags.size() <= 15`).
12. **Blanket List Query Scraping**: User B queries `/recipes` root or `/users/{userA}/recipes` without owning -> DENIED (default-deny catch-all + `resource.data.ownerId == request.auth.uid`).
