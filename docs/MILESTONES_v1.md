V1 milestone plan

M0. Foundation stabilization

Goal: make the current base reliable before adding more features.

Ticket M0-1 — Fix and stabilize current vertical slice

Goal
	•	Ensure clockDate works end-to-end on web and mobile

Scope
	1.	Verify backend:
	1.	POST /users
	2.	GET /users
	3.	POST /widgets
	4.	GET /widgets
	5.	GET /widget-data/:id
	2.	Verify client:
	1.	loads widgets
	2.	selects first widget
	3.	fetches widget data
	4.	renders clockDate
	5.	refreshes every second
	3.	Fix all type/runtime issues

Acceptance criteria
	1.	app shows live clock on web
	2.	app shows live clock on mobile
	3.	no backend crash on duplicate user or invalid widget create
	4.	no TypeScript errors in client/api

⸻

Ticket M0-2 — Add API global error middleware

Goal
	•	prevent route-level errors from crashing the backend

Scope
	1.	add Express error middleware
	2.	normalize JSON error responses
	3.	keep route handlers simple
	4.	log server errors consistently

Acceptance criteria
	1.	backend stays alive on thrown errors
	2.	all API failures return JSON
	3.	duplicate/validation/internal errors are distinguishable

⸻

Ticket M0-3 — Add basic request logging

Goal
	•	improve debuggability

Scope
	1.	log method
	2.	log path
	3.	log status
	4.	log duration

Acceptance criteria
	1.	every request is logged
	2.	failed requests are easy to trace

⸻

Ticket M0-4 — Clean environment/config setup

Goal
	•	remove fragile local assumptions

Scope
	1.	add .env.example for client/api
	2.	centralize API base URL
	3.	remove hardcoded local-only assumptions where possible
	4.	document local vs LAN API URL for mobile testing

Acceptance criteria
	1.	fresh dev can run with documented env setup
	2.	client API URL is centralized
	3.	repo includes env examples

⸻

M1. V1 admin workflow

Goal: make the app minimally usable without manual curl-driven setup.

Ticket M1-1 — Build admin home screen

Goal
	•	basic control panel for widgets

Scope
	1.	list widgets
	2.	show widget type
	3.	show active widget
	4.	show button to enter display mode

Acceptance criteria
	1.	user can open admin screen
	2.	user sees existing widgets
	3.	user can navigate to display mode

⸻

Ticket M1-2 — Create widget flow

Goal
	•	create widgets from UI

Scope
	1.	add “create widget” action
	2.	initial types:
	1.	clockDate
	2.	weather placeholder
	3.	calendar placeholder
	3.	send POST /widgets
	4.	refresh widget list after creation

Acceptance criteria
	1.	widget can be created from UI
	2.	widget appears in list immediately

⸻

Ticket M1-3 — Active widget selection

Goal
	•	make one widget the display target in V1

Scope
	1.	add API support for marking widget active
	2.	update DB record
	3.	display mode should prefer active widget
	4.	admin UI shows current active widget

Acceptance criteria
	1.	user can select active widget
	2.	display mode uses the selected active widget
	3.	only one active widget at a time

⸻

Ticket M1-4 — Admin to display navigation

Goal
	•	let user switch from admin mode to display mode cleanly

Scope
	1.	add navigation/button
	2.	preserve selected/active widget behavior
	3.	support web and mobile

Acceptance criteria
	1.	user can go from admin to display mode in-app
	2.	display mode shows the expected widget

⸻

M2. Widget framework hardening

Goal: make the widget system consistent before adding more widget types.

Ticket M2-1 — Formalize widget contracts

Goal
	•	make widget addition predictable

Scope
	1.	define widget manifest shape
	2.	define config shape per widget
	3.	define renderer contract
	4.	define widget-data envelope contract
	5.	define refresh policy rules

Acceptance criteria
	1.	all widgets follow same pattern
	2.	adding a widget no longer requires ad hoc code structure

⸻

Ticket M2-2 — Add DisplayFrame polish pass

Goal
	•	consistent rendering shell

Scope
	1.	standard header
	2.	content area
	3.	footer
	4.	loading state
	5.	empty state
	6.	error state

Acceptance criteria
	1.	all display widgets render inside same shell
	2.	UI feels consistent across widget types

⸻

Ticket M2-3 — Add display refresh engine

Goal
	•	standardize widget polling behavior

Scope
	1.	clock = 1s
	2.	weather = slower interval
	3.	calendar = medium interval
	4.	pause/cleanup intervals on unmount
	5.	avoid duplicate polling bugs

Acceptance criteria
	1.	refresh behavior is widget-aware
	2.	no interval leaks
	3.	widget polling is easy to extend

⸻

M3. Weather widget

Goal: add first external-data widget.

Ticket M3-1 — Weather widget backend

Goal
	•	backend resolver for weather data

Scope
	1.	define weather widget config
	2.	create weather provider integration
	3.	normalize weather response
	4.	implement GET /widget-data/:id support for weather

Acceptance criteria
	1.	weather widget returns normalized payload
	2.	payload is stable regardless of provider quirks

⸻

Ticket M3-2 — Weather widget client renderer

Goal
	•	display weather on screen

Scope
	1.	render location
	2.	render current temperature
	3.	render condition
	4.	optionally render forecast preview

Acceptance criteria
	1.	weather widget displays real backend data
	2.	loading/error states are handled cleanly

⸻

Ticket M3-3 — Weather widget admin config

Goal
	•	user can create/configure weather widget

Scope
	1.	choose location
	2.	choose units
	3.	create widget from UI
	4.	validate config

Acceptance criteria
	1.	user can configure a weather widget without code/curl

⸻

M4. Calendar widget

Goal: add a second meaningful data widget.

Ticket M4-1 — Calendar backend integration

Goal
	•	support read-only calendar data for V1

Scope
	1.	define calendar widget config
	2.	choose V1 provider approach
	3.	normalize event list
	4.	implement GET /widget-data/:id support for calendar

Acceptance criteria
	1.	calendar widget returns normalized event list
	2.	all-day and timed events are handled sensibly

⸻

Ticket M4-2 — Calendar renderer

Goal
	•	show upcoming appointments cleanly

Scope
	1.	render title
	2.	render start time
	3.	render date
	4.	render location if available
	5.	show empty state when no events

Acceptance criteria
	1.	calendar widget is readable from display mode
	2.	data is rendered without client-side business transformation

⸻

Ticket M4-3 — Calendar admin config

Goal
	•	create/configure calendar widget from UI

Scope
	1.	choose provider/account
	2.	choose time window
	3.	save config
	4.	refresh widget list/display

Acceptance criteria
	1.	user can configure calendar widget from app

⸻

M5. V1 UX and device behavior

Goal: make the app feel like a real ambient display.

Ticket M5-1 — Keep-awake hardening

Goal
	•	ensure display mode remains active

Scope
	1.	validate keep-awake lifecycle
	2.	avoid keep-awake leaks after leaving display mode
	3.	test web/mobile behavior

Acceptance criteria
	1.	display mode keeps device awake where supported
	2.	exiting display mode releases it correctly

⸻

Ticket M5-2 — Landscape mode hardening

Goal
	•	display mode should behave like a display, not a normal app screen

Scope
	1.	enforce landscape in display mode
	2.	restore orientation on exit
	3.	test mobile/tablet/web

Acceptance criteria
	1.	entering display mode locks landscape where supported
	2.	leaving restores normal behavior

⸻

Ticket M5-3 — Display mode polish

Goal
	•	improve visual quality for V1

Scope
	1.	typography pass
	2.	spacing pass
	3.	black/background system
	4.	center alignment consistency
	5.	loading/error visuals

Acceptance criteria
	1.	display mode looks intentional and polished
	2.	readability is good at a distance

⸻

M6. V1 release readiness

Goal: freeze a clean V1.

Ticket M6-1 — Documentation pack

Goal
	•	align implementation with intended end state

Scope
	1.	PRD
	2.	architecture V1
	3.	roadmap
	4.	client spec
	5.	API spec
	6.	DB spec

Acceptance criteria
	1.	docs describe final V1 state
	2.	agentic AI can work from docs without ambiguity

⸻

Ticket M6-2 — QA matrix

Goal
	•	validate V1 across supported environments

Scope
	1.	web test
	2.	Android Expo Go / dev test
	3.	iOS simulator/device test if available
	4.	verify:
	1.	admin flow
	2.	display flow
	3.	clock
	4.	weather
	5.	calendar

Acceptance criteria
	1.	all critical flows tested
	2.	known issues documented

⸻

Ticket M6-3 — Repo hygiene and handoff

Goal
	•	make repo safe for agentic execution

Scope
	1.	.gitignore
	2.	.env.example
	3.	remove dead files
	4.	fix obvious duplication
	5.	ensure scripts are documented

Acceptance criteria
	1.	repo is clean
	2.	setup steps are reproducible
	3.	agent can operate without hidden state

⸻

Suggested order for agentic AI execution

Phase 1
	1.	M0-1
	2.	M0-2
	3.	M0-3
	4.	M0-4

Phase 2
	1.	M1-1
	2.	M1-2
	3.	M1-3
	4.	M1-4

Phase 3
	1.	M2-1
	2.	M2-2
	3.	M2-3

Phase 4
	1.	M3-1
	2.	M3-2
	3.	M3-3

Phase 5
	1.	M4-1
	2.	M4-2
	3.	M4-3

Phase 6
	1.	M5-1
	2.	M5-2
	3.	M5-3
	4.	M6-1
	5.	M6-2
	6.	M6-3

⸻

Definition of done for V1

V1 is done when:
	1.	user can create widgets from UI
	2.	user can choose one active widget
	3.	display mode shows the active widget
	4.	clockDate, weather, and calendar work end-to-end
	5.	app runs on web and mobile
	6.	display mode supports keep-awake and landscape where supported
	7.	backend does not crash on common errors
	8.	docs accurately describe the intended end state

⸻

Recommended immediate next ticket

The best next ticket is:

M0-1 — Fix and stabilize current vertical slice

because it ensures the base is truly solid before more layers are added.

If you want, I’ll turn this next into a repo-ready markdown checklist document plus an agentic AI execution prompt.