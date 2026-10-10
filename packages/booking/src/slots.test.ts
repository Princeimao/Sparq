import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  breaksForDate,
  fitsPartySize,
  generateSlots,
  isFree,
  localMidnightUtc,
  overlaps,
  withinHours,
} from "./slots.js";
import type { BusyPeriod, ServiceConfig } from "./types.js";

const svc: ServiceConfig = {
  id: "svc",
  duration: 60,
  bufferMinutes: 0,
  minLeadMinutes: 0,
  maxAdvanceDays: null,
  requiresPartySize: false,
  assignmentMode: "AUTO",
  locationMode: "AT_BUSINESS",
};

describe("overlaps", () => {
  it("detects half-open overlap, touching edges do not overlap", () => {
    assert.equal(overlaps(0, 10, 5, 15), true);
    assert.equal(overlaps(0, 10, 10, 20), false);
    assert.equal(overlaps(10, 20, 0, 10), false);
    assert.equal(overlaps(0, 10, 2, 5), true);
  });
});

describe("fitsPartySize", () => {
  it("null capacity is unconstrained, otherwise needs >= party", () => {
    assert.equal(fitsPartySize(null, 8), true);
    assert.equal(fitsPartySize(4, 4), true);
    assert.equal(fitsPartySize(2, 4), false);
    assert.equal(fitsPartySize(2, undefined), true);
  });
});

describe("generateSlots", () => {
  const hours = [
    { ownerId: "biz", dayOfWeek: 1, startTime: "09:00", endTime: "12:00", isActive: true },
  ];
  it("generates 15-min starts fully inside the window", () => {
    const slots = generateSlots(
      {
        service: svc,
        date: "2026-10-12", // a Monday
        dayStart: new Date("2026-10-12T00:00:00Z"),
        dayEnd: new Date("2026-10-12T23:59:59Z"),
        now: new Date("2026-10-01T00:00:00Z"),
      },
      hours,
      [],
      [],
      "UTC",
    );
    // 09:00..11:00 starts (12 slots), last full hour ends at 12:00
    assert.equal(slots.length, 9);
    assert.equal(slots[0]!.start.toISOString(), "2026-10-12T09:00:00.000Z");
    assert.equal(slots[8]!.start.toISOString(), "2026-10-12T11:00:00.000Z");
  });

  it("subtracts busy periods and honors lead time", () => {
    const busy: BusyPeriod[] = [
      {
        ownerId: "x",
        startTime: new Date("2026-10-12T09:30:00Z"),
        endTime: new Date("2026-10-12T10:30:00Z"),
      },
    ];
    const slots = generateSlots(
      {
        service: { ...svc, minLeadMinutes: 24 * 60 },
        date: "2026-10-12",
        dayStart: new Date("2026-10-12T00:00:00Z"),
        dayEnd: new Date("2026-10-12T23:59:59Z"),
        now: new Date("2026-10-11T08:00:00Z"),
      },
      hours,
      [],
      busy,
      "UTC",
    );
    // 09:00 allowed by lead time (24h from Oct 11 08:00); the 60-min block
    // starting 09:00 touches the 09:30 busy period, so it goes too.
    // 09:30,09:45,10:00,10:15 starts overlap busy; remaining: 10:30,10:45,11:00
    assert.deepEqual(
      slots.map((s) => s.start.toISOString()),
      [
        "2026-10-12T10:30:00.000Z",
        "2026-10-12T10:45:00.000Z",
        "2026-10-12T11:00:00.000Z",
      ],
    );
  });

  it("returns nothing on days with no hours", () => {
    const slots = generateSlots(
      {
        service: svc,
        date: "2026-10-13", // Tuesday
        dayStart: new Date("2026-10-13T00:00:00Z"),
        dayEnd: new Date("2026-10-13T23:59:59Z"),
        now: new Date("2026-10-01T00:00:00Z"),
      },
      hours,
      [],
      [],
      "UTC",
    );
    assert.equal(slots.length, 0);
  });
});

describe("localMidnightUtc", () => {
  it("resolves IST midnight (+5:30, no DST)", () => {
    assert.equal(
      localMidnightUtc("2026-10-12", "Asia/Kolkata"),
      Date.parse("2026-10-11T18:30:00Z"),
    );
  });
});

describe("breaksForDate", () => {
  it("expands Monday lunch into a busy period", () => {
    const busy = breaksForDate(
      [{ ownerId: "s1", dayOfWeek: 1, startTime: "13:00", endTime: "14:00" }],
      "2026-10-12",
      "UTC",
    );
    assert.equal(busy.length, 1);
    assert.equal(busy[0]!.startTime.toISOString(), "2026-10-12T13:00:00.000Z");
    assert.equal(busy[0]!.endTime.toISOString(), "2026-10-12T14:00:00.000Z");
    const other = breaksForDate(
      [{ ownerId: "s1", dayOfWeek: 2, startTime: "13:00", endTime: "14:00" }],
      "2026-10-12",
      "UTC",
    );
    assert.equal(other.length, 0);
  });
});

describe("isFree + withinHours", () => {
  it("respects busy, time-off and windows", () => {
    const busy: BusyPeriod[] = [
      { ownerId: "s1", startTime: new Date("2026-10-12T10:00:00Z"), endTime: new Date("2026-10-12T11:00:00Z") },
    ];
    assert.equal(
      isFree("s1", new Date("2026-10-12T09:00:00Z"), new Date("2026-10-12T10:00:00Z"), 0, busy, []),
      true,
    );
    assert.equal(
      isFree("s1", new Date("2026-10-12T10:30:00Z"), new Date("2026-10-12T11:30:00Z"), 0, busy, []),
      false,
    );
    assert.equal(
      withinHours("s1", 1, 540, 600, [
        { ownerId: "s1", dayOfWeek: 1, startTime: "09:00", endTime: "12:00", isActive: true },
      ]),
      true,
    );
    // No rows at all => manual mode => allowed
    assert.equal(withinHours("s9", 1, 540, 600, []), true);
  });
});
