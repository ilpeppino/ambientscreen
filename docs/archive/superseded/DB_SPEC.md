> Status: Non-canonical
> Type: Archive
> Authority: Not the primary source of truth when a canonical doc exists

# Database Specification (Current)

Source of truth: `apps/api/prisma/schema.prisma`

## Engine

- PostgreSQL
- Prisma ORM

## Models

### User

Fields:
- `id` (UUID PK)
- `email` (unique)
- `passwordHash`
- `activeProfileId` (nullable FK -> Profile)
- `createdAt`

Relations:
- profiles
- orchestrationRules
- devices
- sharedSessions

### Device

Fields:
- `id` (UUID PK)
- `userId` (FK -> User)
- `name`
- `platform` (`ios | android | web` in app contracts)
- `deviceType` (`phone | tablet | display | web` in app contracts)
- `lastSeenAt`
- `createdAt`
- `updatedAt`

### Profile

Fields:
- `id` (UUID PK)
- `userId` (FK -> User)
- `name`
- `isDefault`
- `createdAt`

### WidgetInstance

Fields:
- `id` (UUID PK)
- `profileId` (FK -> Profile)
- `type` (`clockDate | weather | calendar` in contracts)
- `config` (JSON)
- `layoutX`, `layoutY`, `layoutW`, `layoutH`
- `isActive`
- `createdAt`, `updatedAt`

### OrchestrationRule

Fields:
- `id` (UUID PK)
- `userId` (FK -> User)
- `type` (`interval | rotation`)
- `intervalSec`
- `isActive`
- `rotationProfileIds` (string array)
- `currentIndex`
- `createdAt`

### SharedScreenSession

Fields:
- `id` (UUID PK)
- `userId` (FK -> User)
- `name`
- `isActive`
- `activeProfileId` (nullable)
- `slideshowEnabled`
- `slideshowIntervalSec`
- `rotationProfileIds` (string array)
- `currentIndex`
- `lastAdvancedAt` (nullable)
- `createdAt`, `updatedAt`

### SharedScreenParticipant

Fields:
- `id` (UUID PK)
- `sessionId` (FK -> SharedScreenSession)
- `deviceId`
- `displayName` (nullable)
- `lastSeenAt`
- `createdAt`

Constraints:
- unique: `(sessionId, deviceId)`

## Notes

- Widget configuration is schema-validated in API via Zod/widget contracts before persistence.
- Ownership boundaries are enforced in services/routes (user-scoped reads/writes).
- Realtime connection state is in-memory (not persisted); device heartbeat persists `lastSeenAt`.
