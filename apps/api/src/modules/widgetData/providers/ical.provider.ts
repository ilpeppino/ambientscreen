export interface IcsCalendarEvent {
  id: string;
  title: string;
  startIso: string;
  endIso: string | null;
  allDay: boolean;
  location: string | null;
}

export interface IcsCalendarResult {
  events: IcsCalendarEvent[];
  fetchedAtIso: string;
}

interface ParsedIcsEvent {
  uid: string | null;
  summary: string | null;
  location: string | null;
  dtStart: string | null;
  dtStartMeta: string;
  dtEnd: string | null;
  dtEndMeta: string;
}

function unfoldIcsLines(icsText: string): string[] {
  const rawLines = icsText.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const unfolded: string[] = [];

  for (const line of rawLines) {
    if ((line.startsWith(" ") || line.startsWith("\t")) && unfolded.length > 0) {
      unfolded[unfolded.length - 1] += line.trimStart();
      continue;
    }

    unfolded.push(line);
  }

  return unfolded;
}

function decodeIcsText(value: string): string {
  return value
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\")
    .trim();
}

function parseProperty(line: string): { name: string; meta: string; value: string } {
  const separatorIndex = line.indexOf(":");
  if (separatorIndex === -1) {
    return { name: line.trim().toUpperCase(), meta: "", value: "" };
  }

  const rawProperty = line.slice(0, separatorIndex).trim();
  const value = line.slice(separatorIndex + 1);
  const [name, ...metaParts] = rawProperty.split(";");

  return {
    name: name.toUpperCase(),
    meta: metaParts.join(";").toUpperCase(),
    value,
  };
}

function parseIcsDateValue(value: string, meta: string): { iso: string; allDay: boolean } | null {
  const trimmed = value.trim();
  const isDateOnly = meta.includes("VALUE=DATE") || /^\d{8}$/.test(trimmed);

  if (isDateOnly) {
    const match = trimmed.match(/^(\d{4})(\d{2})(\d{2})$/);
    if (!match) {
      return null;
    }

    const year = Number(match[1]);
    const monthIndex = Number(match[2]) - 1;
    const day = Number(match[3]);
    const iso = new Date(Date.UTC(year, monthIndex, day, 0, 0, 0, 0)).toISOString();

    return { iso, allDay: true };
  }

  if (/^\d{8}T\d{6}Z$/.test(trimmed)) {
    const year = Number(trimmed.slice(0, 4));
    const monthIndex = Number(trimmed.slice(4, 6)) - 1;
    const day = Number(trimmed.slice(6, 8));
    const hour = Number(trimmed.slice(9, 11));
    const minute = Number(trimmed.slice(11, 13));
    const second = Number(trimmed.slice(13, 15));
    const iso = new Date(Date.UTC(year, monthIndex, day, hour, minute, second, 0)).toISOString();

    return { iso, allDay: false };
  }

  if (/^\d{8}T\d{6}$/.test(trimmed)) {
    const year = Number(trimmed.slice(0, 4));
    const monthIndex = Number(trimmed.slice(4, 6)) - 1;
    const day = Number(trimmed.slice(6, 8));
    const hour = Number(trimmed.slice(9, 11));
    const minute = Number(trimmed.slice(11, 13));
    const second = Number(trimmed.slice(13, 15));
    const iso = new Date(Date.UTC(year, monthIndex, day, hour, minute, second, 0)).toISOString();

    return { iso, allDay: false };
  }

  const fallbackDate = new Date(trimmed);
  if (Number.isNaN(fallbackDate.getTime())) {
    return null;
  }

  return {
    iso: fallbackDate.toISOString(),
    allDay: false,
  };
}

function parseIcsEvents(icsText: string): ParsedIcsEvent[] {
  const lines = unfoldIcsLines(icsText);
  const events: ParsedIcsEvent[] = [];

  let current: ParsedIcsEvent | null = null;

  for (const line of lines) {
    const normalized = line.trim();

    if (normalized === "BEGIN:VEVENT") {
      current = {
        uid: null,
        summary: null,
        location: null,
        dtStart: null,
        dtStartMeta: "",
        dtEnd: null,
        dtEndMeta: "",
      };
      continue;
    }

    if (normalized === "END:VEVENT") {
      if (current) {
        events.push(current);
      }
      current = null;
      continue;
    }

    if (!current) {
      continue;
    }

    const property = parseProperty(normalized);

    if (property.name === "UID") {
      current.uid = decodeIcsText(property.value);
      continue;
    }

    if (property.name === "SUMMARY") {
      current.summary = decodeIcsText(property.value);
      continue;
    }

    if (property.name === "LOCATION") {
      current.location = decodeIcsText(property.value);
      continue;
    }

    if (property.name === "DTSTART") {
      current.dtStart = property.value;
      current.dtStartMeta = property.meta;
      continue;
    }

    if (property.name === "DTEND") {
      current.dtEnd = property.value;
      current.dtEndMeta = property.meta;
    }
  }

  return events;
}

function isInWindow(input: {
  startIso: string;
  windowStartIso: string;
  windowEndIso: string;
}): boolean {
  const startTime = new Date(input.startIso).getTime();
  const windowStart = new Date(input.windowStartIso).getTime();
  const windowEnd = new Date(input.windowEndIso).getTime();

  return Number.isFinite(startTime) && startTime >= windowStart && startTime <= windowEnd;
}

export async function fetchIcsCalendarEvents(input: {
  feedUrl: string;
  windowStartIso: string;
  windowEndIso: string;
  includeAllDay: boolean;
  maxEvents: number;
  fetchImpl?: typeof fetch;
}): Promise<IcsCalendarResult> {
  const fetchImpl = input.fetchImpl ?? globalThis.fetch;
  const response = await fetchImpl(input.feedUrl);

  if (!response.ok) {
    throw new Error(`Calendar provider request failed with status ${response.status}`);
  }

  const icsText = await response.text();
  const parsedEvents = parseIcsEvents(icsText);

  const normalizedEvents: IcsCalendarEvent[] = [];
  for (const parsedEvent of parsedEvents) {
    if (!parsedEvent.dtStart) {
      continue;
    }

    const start = parseIcsDateValue(parsedEvent.dtStart, parsedEvent.dtStartMeta);
    if (!start) {
      continue;
    }

    if (start.allDay && !input.includeAllDay) {
      continue;
    }

    const end = parsedEvent.dtEnd
      ? parseIcsDateValue(parsedEvent.dtEnd, parsedEvent.dtEndMeta)
      : null;

    if (
      !isInWindow({
        startIso: start.iso,
        windowStartIso: input.windowStartIso,
        windowEndIso: input.windowEndIso,
      })
    ) {
      continue;
    }

    normalizedEvents.push({
      id: parsedEvent.uid ?? `${start.iso}-${parsedEvent.summary ?? "event"}`,
      title: parsedEvent.summary || "Untitled event",
      startIso: start.iso,
      endIso: end?.iso ?? null,
      allDay: start.allDay,
      location: parsedEvent.location,
    });
  }

  normalizedEvents.sort((a, b) => {
    return new Date(a.startIso).getTime() - new Date(b.startIso).getTime();
  });

  return {
    events: normalizedEvents.slice(0, input.maxEvents),
    fetchedAtIso: new Date().toISOString(),
  };
}
