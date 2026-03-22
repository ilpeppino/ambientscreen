# Widget Plugin Starter Template

Copy-paste template for building a new Ambient Screen widget plugin.

> Read [CREATE_PLUGIN_GUIDE.md](../CREATE_PLUGIN_GUIDE.md) for the full step-by-step tutorial.
> Read [PLUGIN_SDK.md](../PLUGIN_SDK.md) for the complete SDK reference.

---

## Files in this template

```
starter-template/
├── README.md                                           ← you are here
├── shared/
│   ├── types.ts                                        → packages/shared-contracts/src/index.ts
│   └── definition.ts                                   → packages/shared-contracts/src/widgets/plugin-sdk.ts
├── api/
│   └── src/modules/
│       ├── widgetData/resolvers/
│       │   └── myWidget.resolver.ts                    → apps/api/src/modules/widgetData/resolvers/
│       └── widgets/plugins/
│           └── myWidget.plugin.ts                      → apps/api/src/modules/widgets/plugins/
└── client/
    └── src/widgets/
        ├── myWidget/
        │   ├── renderer.tsx                            → apps/client/src/widgets/myWidget/
        │   └── settingsForm.tsx                        → apps/client/src/widgets/myWidget/ (optional)
        └── plugins/
            └── myWidget.plugin.tsx                     → apps/client/src/widgets/plugins/
```

---

## Quick Start

1. **Global search-replace** `myWidget` → your plugin key (e.g. `weather`, `stockPrice`, `calendar`)
2. **Global search-replace** `MyWidget` → your PascalCase name (e.g. `StockPrice`)
3. Copy each file to the destination shown in the tree above
4. Follow the `TODO` comments in each file
5. Register your plugin in both `registerBuiltinWidgetPlugins()` files:

```typescript
// apps/api/src/modules/widgets/registerBuiltinPlugins.ts
import { myWidgetPlugin } from "./plugins/myWidget.plugin";
registerWidgetPlugin(myWidgetPlugin);

// apps/client/src/widgets/registerBuiltinPlugins.ts
import { myWidgetPlugin } from "./plugins/myWidget.plugin";
registerWidgetPlugin(myWidgetPlugin);
```

---

## Checklist

- [ ] `WidgetKey` union includes your key (`packages/shared-contracts/src/index.ts`)
- [ ] `WidgetConfigByKey` and `WidgetDataByKey` maps include your types
- [ ] Builtin definition added to `widgetBuiltinDefinitions`
- [ ] API resolver returns `WidgetDataEnvelope` and handles errors without throwing
- [ ] Client renderer handles `data === null` gracefully
- [ ] Plugin registered in both `registerBuiltinWidgetPlugins()` files
- [ ] Tests written for resolver and registry
- [ ] `npm run typecheck` passes in both `apps/api` and `apps/client`

---

## Rename guide

| Placeholder | Replace with |
|---|---|
| `myWidget` | your camelCase widget key |
| `MyWidget` | your PascalCase widget name |
| `MyWidgetConfig` | `YourKeyConfig` |
| `MyWidgetData` | `YourKeyData` |
| `"my-provider"` | your data source identifier |
| `"custom"` | your category (`"time"`, `"environment"`, `"productivity"`, etc.) |
