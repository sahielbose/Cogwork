import { z } from "zod";
import { defineAction, type Connector } from "../core/types";
import listEventsFixture from "./fixtures/gcal.list_events.json";

/** Google Calendar connector — fixture-backed (Phase 0–2). Google OAuth2. */

const EventSchema = z.object({
  id: z.string(),
  summary: z.string(),
  start: z.string(),
  end: z.string(),
  attendees: z.array(z.string()).optional(),
  location: z.string().optional(),
});

export const gcalListEvents = defineAction({
  name: "gcal.list_events",
  description: "List Google Calendar events in a time window.",
  inputSchema: z.object({
    timeMin: z.string().optional(),
    timeMax: z.string().optional(),
    max: z.number().int().min(1).max(100).optional(),
  }),
  outputSchema: z.object({ events: z.array(EventSchema) }),
  sideEffect: false,
  fixture: (input) => {
    const all = listEventsFixture.events;
    return { events: input.max ? all.slice(0, input.max) : all };
  },
});

export const gcalCreateEvent = defineAction({
  name: "gcal.create_event",
  description: "Create a Google Calendar event. Side-effecting → approval-gated.",
  inputSchema: z.object({
    summary: z.string(),
    start: z.string(),
    end: z.string(),
    attendees: z.array(z.string()).optional(),
    location: z.string().optional(),
  }),
  outputSchema: z.object({ eventId: z.string(), htmlLink: z.string() }),
  sideEffect: true,
  fixture: (input) => {
    const eventId = `evt_${Buffer.from(input.summary + input.start).toString("hex").slice(0, 10)}`;
    return { eventId, htmlLink: `https://calendar.google.com/event?eid=${eventId}` };
  },
});

export const gcalConnector: Connector = {
  provider: "google",
  authType: "oauth2",
  oauth: {
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scopes: ["https://www.googleapis.com/auth/calendar.events"],
    refresh: async () => {
      throw new Error("Live Google Calendar OAuth refresh is wired at go-live (Phase 3).");
    },
  },
  actions: [gcalListEvents, gcalCreateEvent],
};
