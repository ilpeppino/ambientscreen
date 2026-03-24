Plugin Examples (Canonical)

Status: Reference implementation
Last updated: 2026-03-24


---

1. Purpose

Provide concrete reference implementations of plugins.

These examples demonstrate:

correct use of the Plugin SDK

correct use of the Integration Platform

end-to-end data flow


These examples must be treated as the gold standard for all future plugins.


---

2. Example 1: Weather Widget (OpenWeather)

2.1 Type

Public Data Plugin

No authentication required.


---

2.2 Manifest

id: weather.openweather

name: Weather

version: 1.0.0

description: Displays current weather and forecast

author: platform

widgetType: weather



---

2.3 Config Schema

Fields:

city (string, required)

countryCode (string, optional)

units (string, optional, default metric, values: metric | imperial | standard)

forecastSlots (number, optional, default 3, range 1–10)



---

2.4 Default Config

city: Amsterdam

units: metric

forecastSlots: 3



---

2.5 Resolver Behavior

Steps:

1. Read config (city, countryCode, units, forecastSlots)


2. Call OpenWeather API via adapter


3. Extract relevant fields:

temperature

condition

humidity

forecast



4. Normalize data




---

2.6 Adapter (OpenWeather)

Responsibilities:

call OpenWeather endpoint

handle API key securely in backend

normalize response


Normalization output:

temperature

condition

icon

forecast array



---

2.7 Data Envelope

status: ok

data:

temperature

condition

forecast


error: optional



---

2.8 Renderer

Displays:

current temperature

weather icon

short forecast


Rules:

no API calls

handles loading and error states



---

2.9 Key Takeaways

simple plugin structure

no integration connection

adapter still used for consistency



---

3. Example 2: Google Calendar Widget

3.1 Type

Authenticated Plugin

Requires IntegrationConnection.


---

3.2 Manifest

id: calendar.google

name: Google Calendar

version: 1.0.0

description: Displays upcoming events

author: platform

widgetType: calendar

capabilities: authenticatedData



---

3.3 Config Schema

Fields:

provider (fixed: google)

integrationConnectionId (required)

calendarId (optional, default primary)

maxEvents (optional, default 5)



---

3.4 Default Config

provider: google

calendarId: primary

maxEvents: 5



---

3.5 Resolver Behavior

Steps:

1. Read config


2. Load IntegrationConnection


3. Validate ownership


4. Call Google Calendar adapter


5. Fetch upcoming events


6. Normalize events




---

3.6 Adapter (Google Calendar)

Responsibilities:

refresh token if needed

call Google Calendar API

normalize response


Normalized event fields:

id

title

startTime

endTime

location



---

3.7 Data Envelope

status: ok

data:

events array


error: optional



---

3.8 Renderer

Displays:

list of upcoming events

time and title

optional location


Rules:

no external calls

handles empty state



---

3.9 Integration Flow

1. User connects Google account


2. IntegrationConnection is created


3. Plugin stores integrationConnectionId


4. Resolver uses adapter to fetch data




---

3.10 Key Takeaways

strict separation of concerns

no token exposure

reusable adapter logic

consistent config pattern



---

4. Comparison

Weather Plugin:

no authentication

uses public API

simple config


Google Calendar Plugin:

requires IntegrationConnection

uses provider adapter

more complex config



---

5. Design Rules Demonstrated

Both examples enforce:

no direct API calls from client

no token access in plugins

normalized data envelope

adapter-based integration

strict config validation



---

6. Anti-Patterns Avoided

These examples intentionally avoid:

embedding API keys in plugins

plugin-level OAuth flows

direct provider calls from frontend

inconsistent data formats



---

7. How to Use These Examples

Developers must:

use these as starting templates

follow the same structure

not deviate from integration model



---

8. Future Extensions

These examples can be extended with:

caching strategies

pagination

real-time updates

multiple connections



---

9. Summary

These examples provide:

a complete reference for plugin development

a validated integration pattern

a foundation for marketplace-ready plugins


