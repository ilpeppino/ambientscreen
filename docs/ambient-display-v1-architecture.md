# V1 Architecture Blueprint — Ambient Info Display App

## 1. Domain model

### 1.1 Core V1 domain concepts

1. **User**  
   The person who owns the app configuration when using cloud/account mode.

2. **AuthIdentity**  
   A linked authentication method for a user. Examples:
   1. email/password
   2. Google sign-in
   3. Apple sign-in

3. **UserPreference**  
   Stores app-level preferences for a user. Examples:
   1. selected theme
   2. default widget
   3. display behavior

4. **WidgetDefinition**  
   A code-defined widget type. Examples:
   1. clock-date
   2. weather
   3. news
   4. reminders
   5. calendar

5. **WidgetInstance**  
   A user-configured instance of a widget. Example:
   1. widget type = weather
   2. location = Amsterdam
   3. display variant = current + forecast

6. **IntegrationConnection**  
   A connection between a user and an external provider. Examples:
   1. Google Calendar account
   2. RSS source profile
   3. weather provider preference

7. **CachedProviderData**  
   Normalized cached data produced by the backend after talking to an external provider.

8. **ReminderItem**  
   Local/backend reminders for the reminders widget in V1.

9. **LocalDeviceState**  
   This is mainly frontend-side, not necessarily a server entity in V1. It stores:
   1. current active widget
   2. local-only mode flags
   3. last-known data snapshot

### 1.2 Future-ready domain concepts

These should not drive V1 complexity, but the model should leave room for them.

1. **Entitlement**  
   For freemium feature access.

2. **Template**  
   For preset widget setups.

3. **TemplateWidgetPreset**  
   The widget instances/configs attached to a template.

4. **PluginPackage**  
   Future plugin SDK artifact.

5. **Workspace/Household**  
   Not needed in V1, but likely later if you move beyond personal usage.

---

## 2. Database schema design

### 2.1 Design principles

1. Use **PostgreSQL** as the source of truth for cloud mode.
2. Keep configs flexible via **JSONB**, but still validated in code.
3. Separate:
   1. identity/auth concerns
   2. widget config concerns
   3. external connection concerns
   4. cached data concerns
4. Do not over-normalize V1.
5. Leave space for future billing/templates without forcing them now.

### 2.2 Core V1 tables

#### 2.2.1 `users`

Purpose: main user account.

```sql
create table users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  email_verified_at timestamptz,
  password_hash text,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Notes:
1. `email` can be nullable only if you later allow OAuth-only accounts without email, but I recommend keeping email expected where possible.
2. `password_hash` is nullable to support OAuth-only users later.

#### 2.2.2 `auth_identities`

Purpose: linked auth providers for a user.

```sql
create table auth_identities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  provider text not null,
  provider_subject text not null,
  provider_email text,
  access_token_encrypted text,
  refresh_token_encrypted text,
  token_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_subject)
);
```

Examples of `provider`:
1. `password`
2. `google`
3. `apple`

Important:
1. For sign-in identities, token fields may be empty.
2. For integration identities, you may later decide to separate them from login identities. For V1, this table can work if managed carefully, but I prefer keeping provider integrations in a separate table too.

#### 2.2.3 `user_preferences`

Purpose: user-level app preferences.

```sql
create table user_preferences (
  user_id uuid primary key references users(id) on delete cascade,
  theme text,
  display_mode_enabled boolean not null default false,
  default_widget_instance_id uuid,
  preferred_units text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Notes:
1. `default_widget_instance_id` can reference `widget_instances(id)` later after table creation via foreign key if desired.
2. `preferred_units` could store values like `metric` / `imperial`.

#### 2.2.4 `widget_instances`

Purpose: user-created widgets.

```sql
create table widget_instances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  widget_key text not null,
  name text not null,
  config_json jsonb not null,
  status text not null default 'active',
  is_active boolean not null default false,
  sort_order integer not null default 0,
  last_rendered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Recommended constraints:
1. `widget_key` values should be restricted in app code.
2. `status` values:
   1. `active`
   2. `archived`
   3. `disabled`

Notes:
1. `config_json` is the most important extensibility column.
2. `sort_order` is useful even in V1.
3. `is_active` helps with current selected display widget.

#### 2.2.5 `integration_connections`

Purpose: external provider connections.

```sql
create table integration_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  provider text not null,
  status text not null default 'connected',
  account_label text,
  external_account_id text,
  scopes_json jsonb,
  access_token_encrypted text,
  refresh_token_encrypted text,
  token_expires_at timestamptz,
  metadata_json jsonb,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider, external_account_id)
);
```

Examples:
1. Google Calendar connection
2. future Apple Calendar connection

Notes:
1. This table should be the main place for third-party integration state.
2. `metadata_json` can store provider-specific non-sensitive metadata.

#### 2.2.6 `cached_provider_data`

Purpose: backend cache of normalized external data.

```sql
create table cached_provider_data (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  cache_key text not null,
  widget_key text,
  normalized_payload_json jsonb not null,
  freshness_status text not null default 'fresh',
  fetched_at timestamptz not null,
  stale_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, cache_key)
);
```

Notes:
1. `cache_key` should be deterministic.
2. `widget_key` is optional but useful for debugging and analysis.
3. `freshness_status` values:
   1. `fresh`
   2. `stale`
   3. `expired`

#### 2.2.7 `reminder_items`

Purpose: V1 reminders/tasks source.

```sql
create table reminder_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  title text not null,
  notes text,
  due_at timestamptz,
  completed boolean not null default false,
  priority text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Possible `priority` values:
1. `low`
2. `medium`
3. `high`

#### 2.2.8 `refresh_jobs` (optional but useful)

Purpose: track backend refresh attempts/jobs in a simple way.

```sql
create table refresh_jobs (
  id uuid primary key default gen_random_uuid(),
  job_type text not null,
  provider text,
  cache_key text,
  status text not null default 'pending',
  run_at timestamptz not null,
  started_at timestamptz,
  finished_at timestamptz,
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

This is optional in V1, but useful if you want durable job visibility.

---

## 3. Future-ready tables

### 3.1 `entitlements`

```sql
create table entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  entitlement_key text not null,
  entitlement_value jsonb,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, entitlement_key)
);
```

### 3.2 `templates`

```sql
create table templates (
  id uuid primary key default gen_random_uuid(),
  template_key text unique not null,
  name text not null,
  description text,
  is_premium boolean not null default false,
  metadata_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### 3.3 `template_widget_presets`

```sql
create table template_widget_presets (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references templates(id) on delete cascade,
  widget_key text not null,
  name text not null,
  config_json jsonb not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

---

## 4. Suggested indexes

These matter for performance and future growth.

```sql
create index idx_widget_instances_user_id on widget_instances(user_id);
create index idx_widget_instances_widget_key on widget_instances(widget_key);
create index idx_integration_connections_user_id on integration_connections(user_id);
create index idx_integration_connections_provider on integration_connections(provider);
create index idx_cached_provider_data_provider on cached_provider_data(provider);
create index idx_cached_provider_data_expires_at on cached_provider_data(expires_at);
create index idx_reminder_items_user_id on reminder_items(user_id);
create index idx_reminder_items_due_at on reminder_items(due_at);
create index idx_refresh_jobs_run_at on refresh_jobs(run_at);
```

---

## 5. Backend TypeScript domain contracts

### 5.1 Shared base types

```ts
export type UUID = string;

export type ISODateString = string;

export type WidgetKey =
  | "clockDate"
  | "weather"
  | "news"
  | "reminders"
  | "calendar";

export type FreshnessStatus = "fresh" | "stale" | "expired";

export type WidgetPresentationState =
  | "loading"
  | "ready"
  | "stale"
  | "empty"
  | "error";
```

### 5.2 Core entities

```ts
export interface User {
  id: UUID;
  email: string | null;
  emailVerifiedAt: ISODateString | null;
  displayName: string | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface AuthIdentity {
  id: UUID;
  userId: UUID;
  provider: "password" | "google" | "apple";
  providerSubject: string;
  providerEmail: string | null;
  tokenExpiresAt: ISODateString | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface UserPreferences {
  userId: UUID;
  theme: string | null;
  displayModeEnabled: boolean;
  defaultWidgetInstanceId: UUID | null;
  preferredUnits: "metric" | "imperial" | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}
```

### 5.3 Widget definitions and instances

```ts
export interface WidgetDefinition {
  key: WidgetKey;
  name: string;
  description: string;
  category: "utility" | "information" | "planning";
  version: number;
  featureFlag?: string;
  premium?: boolean;
  defaultRefresh: {
    intervalSeconds: number;
    staleAfterSeconds: number;
  };
}

export interface WidgetInstance<TConfig = unknown> {
  id: UUID;
  userId: UUID;
  widgetKey: WidgetKey;
  name: string;
  config: TConfig;
  status: "active" | "archived" | "disabled";
  isActive: boolean;
  sortOrder: number;
  lastRenderedAt: ISODateString | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}
```

### 5.4 Integration connections and cache

```ts
export interface IntegrationConnection {
  id: UUID;
  userId: UUID;
  provider:
    | "googleCalendar"
    | "appleCalendar"
    | "appleMail"
    | "rss"
    | "weather";
  status: "connected" | "disconnected" | "error" | "expired";
  accountLabel: string | null;
  externalAccountId: string | null;
  scopes: string[] | null;
  tokenExpiresAt: ISODateString | null;
  metadata: Record<string, unknown> | null;
  lastSyncedAt: ISODateString | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface CachedProviderData<TPayload = unknown> {
  id: UUID;
  provider: string;
  cacheKey: string;
  widgetKey: WidgetKey | null;
  normalizedPayload: TPayload;
  freshnessStatus: FreshnessStatus;
  fetchedAt: ISODateString;
  staleAt: ISODateString | null;
  expiresAt: ISODateString | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}
```

### 5.5 Reminders

```ts
export interface ReminderItem {
  id: UUID;
  userId: UUID;
  title: string;
  notes: string | null;
  dueAt: ISODateString | null;
  completed: boolean;
  priority: "low" | "medium" | "high" | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}
```

---

## 6. Widget config contracts

### 6.1 Clock/Date config

```ts
export interface ClockDateWidgetConfig {
  locale?: string;
  use24Hour?: boolean;
  showSeconds?: boolean;
  showDate?: boolean;
  showWeekday?: boolean;
}
```

### 6.2 Weather config

```ts
export interface WeatherWidgetConfig {
  locationType: "city" | "coords";
  cityName?: string;
  latitude?: number;
  longitude?: number;
  units: "metric" | "imperial";
  variant: "current" | "current+forecast";
}
```

### 6.3 News config

```ts
export interface NewsWidgetConfig {
  sourceType: "rss";
  feedUrl: string;
  maxItems: number;
  showSourceName?: boolean;
  showPublishedAt?: boolean;
}
```

### 6.4 Reminders config

```ts
export interface RemindersWidgetConfig {
  showCompleted?: boolean;
  maxItems: number;
  sortBy: "dueAt" | "createdAt" | "priority";
}
```

### 6.5 Calendar config

```ts
export interface CalendarWidgetConfig {
  provider: "googleCalendar";
  integrationConnectionId: UUID;
  calendarIds: string[];
  timeWindow: "today" | "next24h" | "next7d";
  includeAllDay: boolean;
  maxItems: number;
}
```

---

## 7. Normalized widget data contracts

### 7.1 Clock/Date payload

```ts
export interface ClockDateWidgetData {
  nowIso: ISODateString;
  formattedTime: string;
  formattedDate: string | null;
  weekdayLabel: string | null;
}
```

### 7.2 Weather payload

```ts
export interface WeatherWidgetData {
  locationLabel: string;
  currentTemp: number;
  conditionLabel: string;
  iconCode: string | null;
  highTemp: number | null;
  lowTemp: number | null;
  forecast: Array<{
    label: string;
    highTemp: number | null;
    lowTemp: number | null;
    conditionLabel: string;
    iconCode: string | null;
  }>;
}
```

### 7.3 News payload

```ts
export interface NewsWidgetData {
  sourceLabel: string;
  items: Array<{
    id: string;
    title: string;
    summary: string | null;
    publishedAt: ISODateString | null;
    url: string | null;
  }>;
}
```

### 7.4 Reminders payload

```ts
export interface RemindersWidgetData {
  items: Array<{
    id: UUID;
    title: string;
    dueAt: ISODateString | null;
    completed: boolean;
    priority: "low" | "medium" | "high" | null;
  }>;
}
```

### 7.5 Calendar payload

```ts
export interface CalendarWidgetData {
  accountLabel: string | null;
  calendarLabel: string | null;
  events: Array<{
    id: string;
    title: string;
    startsAt: ISODateString;
    endsAt: ISODateString | null;
    allDay: boolean;
    location: string | null;
  }>;
}
```

---

## 8. Widget response envelope

Use one universal envelope.

```ts
export interface WidgetDataEnvelope<TData> {
  widgetInstanceId: UUID;
  widgetKey: WidgetKey;
  state: "ready" | "stale" | "empty" | "error";
  data: TData | null;
  meta: {
    fetchedAt?: ISODateString;
    staleAt?: ISODateString;
    source?: string;
    fromCache?: boolean;
    errorCode?: string;
    message?: string;
  };
}
```

---

## 9. Widget module contracts for frontend

### 9.1 Core widget module interface

```ts
export interface WidgetSettingsProps<TConfig> {
  value: TConfig;
  onChange: (next: TConfig) => void;
  disabled?: boolean;
}

export interface WidgetPreviewProps<TConfig> {
  config: TConfig;
}

export interface WidgetRendererProps<TData, TConfig> {
  data: TData | null;
  config: TConfig;
  state: WidgetPresentationState;
  meta?: WidgetDataEnvelope<TData>["meta"];
}

export interface WidgetDataContext<TConfig> {
  widgetInstanceId: UUID;
  config: TConfig;
  enabled?: boolean;
}

export interface WidgetDataResult<TData> {
  envelope: WidgetDataEnvelope<TData> | null;
  isLoading: boolean;
  isFetching: boolean;
  refetch: () => Promise<unknown>;
}

export interface WidgetManifest {
  key: WidgetKey;
  name: string;
  description: string;
  category: string;
  version: number;
  premium?: boolean;
  featureFlag?: string;
  defaultRefresh: {
    intervalSeconds: number;
    staleAfterSeconds: number;
  };
}

export interface WidgetModule<TConfig, TData> {
  manifest: WidgetManifest;
  getDefaultConfig: () => TConfig;
  SettingsForm: React.ComponentType<WidgetSettingsProps<TConfig>>;
  Preview: React.ComponentType<WidgetPreviewProps<TConfig>>;
  Renderer: React.ComponentType<WidgetRendererProps<TData, TConfig>>;
  useWidgetData: (ctx: WidgetDataContext<TConfig>) => WidgetDataResult<TData>;
}
```

---

## 10. Provider adapter interfaces

### 10.1 Base provider adapter

```ts
export interface ProviderAdapter<TInput, TRaw, TNormalized> {
  providerKey: string;
  fetch(input: TInput): Promise<TRaw>;
  normalize(raw: TRaw, input: TInput): TNormalized;
  getCacheKey(input: TInput): string;
  getTtlSeconds(input: TInput): number;
}
```

### 10.2 OAuth-capable provider adapter

```ts
export interface OAuthProviderAdapter<TInput, TRaw, TNormalized>
  extends ProviderAdapter<TInput, TRaw, TNormalized> {
  requiresConnection: true;
  validateConnection: (connection: IntegrationConnection) => Promise<void>;
  refreshConnectionIfNeeded?: (
    connection: IntegrationConnection,
  ) => Promise<IntegrationConnection>;
}
```

### 10.3 Provider input contracts

#### Weather provider input
```ts
export interface WeatherProviderInput {
  cityName?: string;
  latitude?: number;
  longitude?: number;
  units: "metric" | "imperial";
}
```

#### RSS provider input
```ts
export interface RssProviderInput {
  feedUrl: string;
  maxItems: number;
}
```

#### Google Calendar provider input
```ts
export interface GoogleCalendarProviderInput {
  connection: IntegrationConnection;
  calendarIds: string[];
  timeMin: ISODateString;
  timeMax: ISODateString;
  includeAllDay: boolean;
  maxItems: number;
}
```

---

## 11. Service layer interfaces

### 11.1 Widget service

```ts
export interface CreateWidgetInstanceInput<TConfig> {
  userId: UUID;
  widgetKey: WidgetKey;
  name: string;
  config: TConfig;
}

export interface UpdateWidgetInstanceInput<TConfig> {
  id: UUID;
  userId: UUID;
  name?: string;
  config?: TConfig;
  isActive?: boolean;
}

export interface WidgetService {
  listDefinitions(): Promise<WidgetDefinition[]>;
  listInstances(userId: UUID): Promise<WidgetInstance[]>;
  createInstance<TConfig>(
    input: CreateWidgetInstanceInput<TConfig>,
  ): Promise<WidgetInstance<TConfig>>;
  updateInstance<TConfig>(
    input: UpdateWidgetInstanceInput<TConfig>,
  ): Promise<WidgetInstance<TConfig>>;
  deleteInstance(userId: UUID, widgetInstanceId: UUID): Promise<void>;
  activateInstance(userId: UUID, widgetInstanceId: UUID): Promise<void>;
}
```

### 11.2 Widget data service

```ts
export interface WidgetDataService {
  getWidgetData(
    userId: UUID,
    widgetInstanceId: UUID,
    options?: { forceRefresh?: boolean },
  ): Promise<WidgetDataEnvelope<unknown>>;
}
```

### 11.3 Integration service

```ts
export interface IntegrationService {
  listConnections(userId: UUID): Promise<IntegrationConnection[]>;
  getConnection(
    userId: UUID,
    provider: IntegrationConnection["provider"],
  ): Promise<IntegrationConnection | null>;
  disconnectConnection(userId: UUID, connectionId: UUID): Promise<void>;
}
```

---

## 12. API request/response contracts

### 12.1 Create widget request

```ts
export interface CreateWidgetRequest<TConfig> {
  widgetKey: WidgetKey;
  name: string;
  config: TConfig;
}
```

### 12.2 Update widget request

```ts
export interface UpdateWidgetRequest<TConfig> {
  name?: string;
  config?: TConfig;
  isActive?: boolean;
}
```

### 12.3 Standard API response envelope

```ts
export interface ApiResponse<T> {
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}
```

---

## 13. Exact folder structure

### 13.1 Monorepo layout

```text
repo/
  apps/
    client/
    api/

  packages/
    shared-contracts/
    shared-ui/
    shared-config/

  infra/
    docker/
    scripts/
    db/

  docs/
    architecture/
    adr/
    api/
```

### 13.2 Frontend exact structure

```text
apps/client/
  app/
    _layout.tsx
    index.tsx
    auth/
      login.tsx
      register.tsx
      forgot-password.tsx
      reset-password.tsx
      oauth-callback.tsx
    admin/
      index.tsx
      widgets/
        index.tsx
        create.tsx
        [id].tsx
      integrations/
        index.tsx
      settings/
        index.tsx
    display/
      index.tsx
    settings/
      index.tsx

  src/
    core/
      constants/
      errors/
      featureFlags/
      env/
      types/

    shared/
      ui/
        components/
          Button.tsx
          Input.tsx
          Card.tsx
          EmptyState.tsx
          ErrorState.tsx
          StaleBadge.tsx
        layout/
          Screen.tsx
          DisplayFrame.tsx
        theme/
        typography/
      hooks/
      utils/
      storage/
        secureStorage.ts
        persistentStorage.ts
      network/
        httpClient.ts
        queryClient.ts

    features/
      auth/
        api/
        hooks/
        state/
        components/
      admin/
        api/
        hooks/
        components/
      display/
        hooks/
        components/
        services/
          keepAwake.ts
          orientation.ts
          refreshEngine.ts
      integrations/
        api/
        hooks/
        components/
      settings/
        api/
        hooks/
        components/
      widgetManagement/
        api/
        hooks/
        components/

    runtime/
      widgetRegistry/
        index.ts
      widgetData/
        useWidgetEnvelope.ts
      staleState/
        deriveWidgetState.ts
      entitlements/
      guards/

    widgets/
      clockDate/
        manifest.ts
        defaults.ts
        config.ts
        settings-form.tsx
        preview.tsx
        renderer.tsx
        useWidgetData.ts
      weather/
        manifest.ts
        defaults.ts
        config.ts
        settings-form.tsx
        preview.tsx
        renderer.tsx
        useWidgetData.ts
      news/
      reminders/
      calendar/

    services/
      api/
        authApi.ts
        widgetsApi.ts
        widgetDataApi.ts
        integrationsApi.ts
        remindersApi.ts
      telemetry/
      cache/
```

### 13.3 Backend exact structure

```text
apps/api/
  src/
    main.ts
    app.ts

    core/
      config/
      env/
      errors/
      logger/
      middleware/
      http/
      db/
        prisma/
        migrations/

    modules/
      auth/
        auth.controller.ts
        auth.service.ts
        auth.repository.ts
        auth.routes.ts
        auth.types.ts

      users/
        users.controller.ts
        users.service.ts
        users.repository.ts
        users.routes.ts
        users.types.ts

      widgets/
        widgets.controller.ts
        widgets.service.ts
        widgets.repository.ts
        widgets.routes.ts
        widgets.types.ts
        widget-definition.registry.ts

      widgetData/
        widget-data.controller.ts
        widget-data.service.ts
        widget-data.routes.ts
        widget-data.types.ts

      integrations/
        integrations.controller.ts
        integrations.service.ts
        integrations.repository.ts
        integrations.routes.ts
        integrations.types.ts

      reminders/
        reminders.controller.ts
        reminders.service.ts
        reminders.repository.ts
        reminders.routes.ts
        reminders.types.ts

      cache/
        cache.service.ts
        cache.repository.ts
        cache.types.ts

      jobs/
        jobs.service.ts
        jobs.runner.ts
        jobs.types.ts

      billing/
        billing.types.ts

      templates/
        templates.types.ts

    providers/
      weather/
        weather.adapter.ts
        weather.mapper.ts
        weather.types.ts
      rss/
        rss.adapter.ts
        rss.mapper.ts
        rss.types.ts
      googleCalendar/
        google-calendar.adapter.ts
        google-calendar.oauth.ts
        google-calendar.mapper.ts
        google-calendar.types.ts

    shared/
      contracts/
      validation/
      utils/
      security/
        encryption.ts
        password.ts
        tokens.ts
```

### 13.4 Shared contracts package structure

```text
packages/shared-contracts/
  src/
    common/
      types.ts
      dates.ts
      api.ts
      freshness.ts
      errors.ts

    widgets/
      widget-keys.ts
      widget-definition.ts
      widget-envelope.ts

      clockDate/
        config.ts
        data.ts
      weather/
        config.ts
        data.ts
      news/
        config.ts
        data.ts
      reminders/
        config.ts
        data.ts
      calendar/
        config.ts
        data.ts

    integrations/
      connection.ts
      provider.ts

    users/
      user.ts
      preferences.ts

    reminders/
      reminder-item.ts

    index.ts
```

---

## 14. Recommended Prisma model version

Since you like concrete implementation, here is a Prisma-style starter model.

```prisma
model User {
  id               String              @id @default(uuid())
  email            String?             @unique
  emailVerifiedAt  DateTime?
  passwordHash     String?
  displayName      String?
  createdAt        DateTime            @default(now())
  updatedAt        DateTime            @updatedAt

  authIdentities   AuthIdentity[]
  widgetInstances  WidgetInstance[]
  integrations     IntegrationConnection[]
  reminders        ReminderItem[]
  preferences      UserPreference?
  entitlements     Entitlement[]
}

model AuthIdentity {
  id                    String    @id @default(uuid())
  userId                String
  provider              String
  providerSubject       String
  providerEmail         String?
  accessTokenEncrypted  String?
  refreshTokenEncrypted String?
  tokenExpiresAt        DateTime?
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerSubject])
}

model UserPreference {
  userId                  String   @id
  theme                   String?
  displayModeEnabled      Boolean  @default(false)
  defaultWidgetInstanceId String?
  preferredUnits          String?
  createdAt               DateTime @default(now())
  updatedAt               DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model WidgetInstance {
  id             String   @id @default(uuid())
  userId         String
  widgetKey      String
  name           String
  configJson     Json
  status         String   @default("active")
  isActive       Boolean  @default(false)
  sortOrder      Int      @default(0)
  lastRenderedAt DateTime?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([widgetKey])
}

model IntegrationConnection {
  id                    String    @id @default(uuid())
  userId                String
  provider              String
  status                String    @default("connected")
  accountLabel          String?
  externalAccountId     String?
  scopesJson            Json?
  accessTokenEncrypted  String?
  refreshTokenEncrypted String?
  tokenExpiresAt        DateTime?
  metadataJson          Json?
  lastSyncedAt          DateTime?
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([provider])
  @@unique([userId, provider, externalAccountId])
}

model CachedProviderData {
  id                    String    @id @default(uuid())
  provider              String
  cacheKey              String
  widgetKey             String?
  normalizedPayloadJson Json
  freshnessStatus       String    @default("fresh")
  fetchedAt             DateTime
  staleAt               DateTime?
  expiresAt             DateTime?
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  @@unique([provider, cacheKey])
  @@index([provider])
  @@index([expiresAt])
}

model ReminderItem {
  id        String    @id @default(uuid())
  userId    String
  title     String
  notes     String?
  dueAt     DateTime?
  completed Boolean   @default(false)
  priority  String?
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([dueAt])
}

model Entitlement {
  id               String   @id @default(uuid())
  userId           String
  entitlementKey   String
  entitlementValue Json?
  status           String   @default("active")
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, entitlementKey])
}
```

---

## 15. Validation strategy

To keep the system modular, each widget should own its schema.

### 15.1 Example with Zod

#### Weather config schema
```ts
import { z } from "zod";

export const weatherWidgetConfigSchema = z.object({
  locationType: z.enum(["city", "coords"]),
  cityName: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  units: z.enum(["metric", "imperial"]),
  variant: z.enum(["current", "current+forecast"]),
});
```

#### Calendar config schema
```ts
export const calendarWidgetConfigSchema = z.object({
  provider: z.literal("googleCalendar"),
  integrationConnectionId: z.string().uuid(),
  calendarIds: z.array(z.string()).min(1),
  timeWindow: z.enum(["today", "next24h", "next7d"]),
  includeAllDay: z.boolean(),
  maxItems: z.number().int().min(1).max(20),
});
```

Why this matters:
1. frontend validates before saving
2. backend validates again before persisting
3. shared contracts reduce drift

---

## 16. Implementation roadmap

### 16.1 Milestone M0 — repo and contracts foundation

1. Create monorepo structure.
2. Add `apps/client`, `apps/api`, `packages/shared-contracts`.
3. Add base TypeScript config.
4. Add lint/format setup.
5. Add shared basic types.
6. Add widget key enums and common envelopes.

Deliverable:
1. repository skeleton
2. shared contracts compiling in both app and API

### 16.2 Milestone M1 — database and backend foundation

1. Add PostgreSQL + Prisma.
2. Create core models:
   1. users
   2. auth_identities
   3. user_preferences
   4. widget_instances
   5. integration_connections
   6. cached_provider_data
   7. reminder_items
3. Add migration scripts.
4. Add auth module scaffold.
5. Add widgets module scaffold.
6. Add reminders module scaffold.

Deliverable:
1. running API with DB connection
2. CRUD foundation

### 16.3 Milestone M2 — frontend app shell

1. Create Expo app shell.
2. Add routing.
3. Add portrait admin and landscape display entry points.
4. Add design system primitives.
5. Add local storage services.
6. Add API client.
7. Add auth state shell.

Deliverable:
1. app opens on mobile/web
2. admin and display routes exist

### 16.4 Milestone M3 — widget runtime foundation

1. Create `WidgetModule` interface.
2. Create central widget registry.
3. Create `DisplayFrame`.
4. Create widget creation/edit flows.
5. Create widget settings dispatch mechanism.
6. Create shared `WidgetDataEnvelope` handling.

Deliverable:
1. plugin-style internal widget system ready

### 16.5 Milestone M4 — first working widgets

1. Implement Clock/Date widget fully.
2. Implement Reminders widget with local/backend data.
3. Implement Weather widget with provider adapter.
4. Implement News widget with RSS adapter.
5. Implement Calendar widget with Google integration.

Deliverable:
1. all V1 widgets working end to end

### 16.6 Milestone M5 — integrations and caching

1. Add weather provider adapter.
2. Add RSS provider adapter.
3. Add Google Calendar OAuth flow.
4. Add cache service.
5. Add stale marker logic.
6. Add force-refresh support for testing/admin.

Deliverable:
1. integration-backed widgets are stable and normalized

### 16.7 Milestone M6 — display mode polish

1. Keep-awake integration.
2. Landscape display polish.
3. Loading/error/stale UI consistency.
4. Refresh engine per widget.
5. AppState-aware refresh throttling.
6. Web fullscreen behavior alignment.

Deliverable:
1. strong passive display V1 experience

### 16.8 Milestone M7 — V1 release hardening

1. local-only mode pass
2. error handling pass
3. config validation pass
4. entitlement scaffolding pass
5. template scaffolding pass
6. basic analytics/logging pass
7. deployment documentation

Deliverable:
1. V1 release candidate

---

## 17. Immediate next artifact recommendation

The best next step is:

1. generate the actual Prisma schema file
2. generate the shared TypeScript contract files
3. generate the widget contract starter code
4. generate the folder-by-folder implementation scaffold

That would turn this architecture into something directly usable in your repo.
