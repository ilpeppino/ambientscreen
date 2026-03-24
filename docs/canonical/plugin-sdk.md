Here is the third canonical document, completing the foundation of your plugin platform.



Plugin SDK (Canonical)

Status: Source of truth
Last updated: 2026-03-24


---

1. Purpose

Define the official contract for building plugins.

This document ensures:

consistent plugin structure

predictable runtime behavior

compatibility across versions

a scalable developer ecosystem



---

2. Core Concept

A plugin is a self-contained unit that:

defines configuration

resolves data

renders UI


Plugins are executed by the platform and must conform to strict contracts.


---

3. Plugin Structure

Every plugin consists of:

manifest

config schema

default config

resolver

renderer


Optional:

settings UI

preview renderer



---

4. Manifest

The manifest defines identity and capabilities.


---

4.1 Required Fields

id

name

version

description

author

widgetType



---

4.2 Optional Fields

icon

category

tags

capabilities

requiredPermissions



---

4.3 Rules

id must be globally unique

version must follow semantic versioning

widgetType must match registered renderer



---

5. Config Schema

Defines the allowed configuration for a plugin.


---

5.1 Requirements

must be JSON-serializable

must include validation rules

must define required vs optional fields



---

5.2 Example Fields

provider

integrationConnectionId

display options

resource identifiers



---

5.3 Validation

validated at runtime before execution

invalid config must prevent execution



---

6. Default Config

Defines initial configuration values.

Rules:

must satisfy config schema

must allow plugin to render without errors



---

7. Resolver (API Layer)

Responsible for producing data.


---

7.1 Responsibilities

read config

validate inputs

fetch data (via adapters if needed)

transform data

return normalized result



---

7.2 Rules

must be deterministic

must not mutate external state

must not access external APIs directly (must use adapters)

must not expose secrets



---

7.3 Output

Resolver must return a data envelope with:

status

data

optional error

optional metadata



---

8. Renderer (Client Layer)

Responsible for UI rendering.


---

8.1 Responsibilities

render data

handle loading and error states

apply visual formatting



---

8.2 Rules

must be pure (no side effects)

must not call external APIs

must not access tokens

must handle missing or partial data gracefully



---

9. Data Envelope

Standard response format between backend and client.


---

9.1 Fields

status: ok, error, or loading

data: payload

error: optional message

meta: optional metadata



---

9.2 Rules

all plugins must use the same structure

errors must be normalized

no raw provider responses allowed



---

10. Plugin Types

10.1 Static Plugins

no external data

purely visual



---

10.2 Public Data Plugins

use public APIs

no authentication



---

10.3 Authenticated Plugins

require integrationConnectionId

must use provider adapters



---

11. Integration Usage

Plugins must use integrations via:

provider

integrationConnectionId


Rules:

never access tokens

never implement OAuth

always use provider adapters



---

12. Capabilities (Planned)

Plugins may declare capabilities such as:

publicData

authenticatedData

deviceControl

premiumFeatures


Note: capability enforcement is planned and not fully implemented.


---

13. Settings UI (Optional)

Allows users to configure plugin.


---

13.1 Responsibilities

collect user input

validate config

support integration selection



---

13.2 Rules

must not store secrets

must align with config schema



---

14. Preview Renderer (Optional)

Used to preview plugin before saving.

Rules:

must use mock or safe data

must not trigger real external calls



---

15. Versioning

Plugins follow semantic versioning.


---

15.1 Major Version

Required for:

config schema changes

manifest structure changes

data envelope changes



---

15.2 Minor Version

new features

backward-compatible changes



---

15.3 Patch Version

bug fixes

performance improvements



---

16. Lifecycle

16.1 Development

developer creates plugin

tests locally



---

16.2 Submission

plugin version submitted

metadata provided



---

16.3 Review

platform validates

moderation performed



---

16.4 Publication

plugin becomes available in marketplace



---

16.5 Installation

user installs plugin

config initialized



---

16.6 Execution

plugin runs in runtime plane



---

17. Error Handling

Plugins must:

return normalized errors

never throw raw exceptions

handle partial failures gracefully



---

18. Performance Guidelines

minimize external calls

use caching via adapters

keep resolver lightweight

avoid heavy client rendering



---

19. Security Rules

no token access

no direct provider calls

no secret storage in config

no execution of untrusted code



---

20. Anti-Patterns (Must Avoid)

embedding API keys in plugin

calling providers from frontend

duplicating adapter logic

custom authentication flows

inconsistent data formats



---

21. Summary

This SDK ensures:

consistent plugin development

safe integration with external services

compatibility across versions

scalability for marketplace ecosystem



---

✅ Where you are now (important)

You now have a complete canonical foundation:

1. plugin-platform-architecture.md


2. integration-platform.md


3. plugin-sdk.md



This is enough to:

build plugins internally

open to external developers

scale integrations without chaos
