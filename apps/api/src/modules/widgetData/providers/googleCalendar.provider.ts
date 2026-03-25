interface GoogleEventRaw {
  id: string;
  summary?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  location?: string;
}

interface GoogleCalendarListResponse {
  items?: GoogleEventRaw[];
}

export interface GoogleCalendarEvent {
  id: string;
  title: string;
  startIso: string;
  endIso: string | null;
  allDay: boolean;
  location: string | null;
}

export interface GoogleCalendarResult {
  events: GoogleCalendarEvent[];
  fetchedAtIso: string;
}

function normalizeEvent(event: GoogleEventRaw): GoogleCalendarEvent {
  const allDay = Boolean(event.start.date && !event.start.dateTime);

  let startIso: string;
  if (event.start.dateTime) {
    startIso = new Date(event.start.dateTime).toISOString();
  } else if (event.start.date) {
    startIso = new Date(`${event.start.date}T00:00:00.000Z`).toISOString();
  } else {
    startIso = new Date().toISOString();
  }

  let endIso: string | null = null;
  if (event.end.dateTime) {
    endIso = new Date(event.end.dateTime).toISOString();
  } else if (event.end.date && !allDay) {
    endIso = new Date(`${event.end.date}T00:00:00.000Z`).toISOString();
  }

  return {
    id: event.id,
    title: event.summary ?? "(No title)",
    startIso,
    endIso,
    allDay,
    location: event.location ?? null,
  };
}

export async function fetchGoogleCalendarEvents(input: {
  accessToken: string;
  calendarId: string;
  timeMin: string;
  timeMax: string;
  maxResults: number;
  fetchImpl?: (url: string, init: RequestInit) => Promise<Response>;
}): Promise<GoogleCalendarResult> {
  const { accessToken, calendarId, timeMin, timeMax, maxResults } = input;
  const doFetch = input.fetchImpl ?? ((url, init) => fetch(url, init));

  const params = new URLSearchParams({
    timeMin,
    timeMax,
    maxResults: String(maxResults),
    singleEvents: "true",
    orderBy: "startTime",
  });

  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`;

  const response = await doFetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Google Calendar API error: ${response.status} ${body}`);
  }

  const data = (await response.json()) as GoogleCalendarListResponse;
  const events = (data.items ?? []).map(normalizeEvent);

  return {
    events,
    fetchedAtIso: new Date().toISOString(),
  };
}
