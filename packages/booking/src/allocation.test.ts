import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { AllocationError, allocate, resolveCandidates } from "./allocation.js";
import type { Allocatable, ServiceConfig } from "./types.js";

const tableSvc: ServiceConfig = {
  id: "dinner",
  duration: 120,
  bufferMinutes: 0,
  minLeadMinutes: 0,
  maxAdvanceDays: null,
  requiresPartySize: true,
  assignmentMode: "AUTO",
  locationMode: "AT_BUSINESS",
};

const tables: Allocatable[] = [
  { id: "t2", kind: "RESOURCE", capacity: 2, isActive: true },
  { id: "t4", kind: "RESOURCE", capacity: 4, isActive: true },
  { id: "t6off", kind: "RESOURCE", capacity: 6, isActive: false },
];

const mondayHours = [
  { ownerId: "t2", dayOfWeek: 1, startTime: "18:00", endTime: "23:00", isActive: true },
  { ownerId: "t4", dayOfWeek: 1, startTime: "18:00", endTime: "23:00", isActive: true },
  { ownerId: "t6off", dayOfWeek: 1, startTime: "18:00", endTime: "23:00", isActive: true },
];

const start = new Date("2026-10-12T19:00:00Z"); // Monday
const end = new Date("2026-10-12T21:00:00Z");

describe("resolveCandidates", () => {
  const staff = { id: "s1", kind: "STAFF" as const, capacity: null, isActive: true };
  const table = { id: "t1", kind: "RESOURCE" as const, capacity: 4, isActive: true };
  it("merges links and falls back to tables only when no resources linked", () => {
    const merged = resolveCandidates({
      mode: "AUTO",
      linkedStaff: [staff],
      linkedResources: [table],
      allTables: [table, { ...table, id: "t2" }],
      requiresPartySize: true,
    });
    assert.deepEqual(merged.map((c) => c.id), ["s1", "t1"]);
    const fallback = resolveCandidates({
      mode: "AUTO",
      linkedStaff: [],
      linkedResources: [],
      allTables: [table],
      requiresPartySize: true,
    });
    assert.deepEqual(fallback.map((c) => c.id), ["t1"]);
    const none = resolveCandidates({
      mode: "AUTO",
      linkedStaff: [staff],
      linkedResources: [],
      allTables: [table],
      requiresPartySize: false,
    });
    assert.deepEqual(none.map((c) => c.id), ["s1"]);
  });
});

describe("allocate", () => {
  it("auto-picks the least-loaded free table (ties by id)", () => {
    const r = allocate({
      service: tableSvc,
      start,
      end,
      partySize: 2,
      candidates: tables,
      hours: mondayHours,
      timeOffs: [],
      busy: [],
      timeZone: "UTC",
    });
    assert.deepEqual(r, { staffIds: [], resourceIds: ["t2"] });
  });

  it("rejects when nobody fits the party", () => {
    assert.throws(
      () =>
        allocate({
          service: tableSvc,
          start,
          end,
          partySize: 9,
          candidates: tables,
          hours: mondayHours,
          timeOffs: [],
          busy: [],
          timeZone: "UTC",
        }),
      (e: unknown) => e instanceof AllocationError && e.code === "NO_ELIGIBLE",
    );
  });

  it("skips busy tables and balances toward the least-loaded", () => {
    const r = allocate({
      service: tableSvc,
      start,
      end,
      partySize: 2,
      candidates: tables,
      hours: mondayHours,
      timeOffs: [],
      busy: [
        { ownerId: "t2", startTime: new Date("2026-10-12T19:30:00Z"), endTime: new Date("2026-10-12T20:30:00Z") },
        { ownerId: "t4", startTime: new Date("2026-10-12T08:00:00Z"), endTime: new Date("2026-10-12T09:00:00Z") },
      ],
      timeZone: "UTC",
    });
    // t2 busy at 19:00; t4 free (earlier load doesn't block) -> t4
    assert.deepEqual(r, { staffIds: [], resourceIds: ["t4"] });
  });

  it("customer choice must be eligible and free", () => {
    const ok = allocate({
      service: { ...tableSvc, assignmentMode: "CUSTOMER_CHOICE" },
      start,
      end,
      partySize: 2,
      choiceId: "t2",
      candidates: tables,
      hours: mondayHours,
      timeOffs: [],
      busy: [],
      timeZone: "UTC",
    });
    assert.deepEqual(ok, { staffIds: [], resourceIds: ["t2"] });

    assert.throws(
      () =>
        allocate({
          service: { ...tableSvc, assignmentMode: "CUSTOMER_CHOICE" },
          start,
          end,
          partySize: 2,
          choiceId: "t6off",
          candidates: tables,
          hours: mondayHours,
          timeOffs: [],
          busy: [],
          timeZone: "UTC",
        }),
      (e: unknown) => e instanceof AllocationError && e.code === "CHOICE_INVALID",
    );

    assert.throws(
      () =>
        allocate({
          service: { ...tableSvc, assignmentMode: "CUSTOMER_CHOICE" },
          start,
          end,
          partySize: 2,
          choiceId: "t2",
          candidates: tables,
          hours: mondayHours,
          timeOffs: [],
          busy: [
            { ownerId: "t2", startTime: start, endTime: end },
          ],
          timeZone: "UTC",
        }),
      (e: unknown) => e instanceof AllocationError && e.code === "CHOICE_BUSY",
    );
  });

  it("single mode uses the linked provider without a choice", () => {
    const staff = [{ id: "dr-rao", kind: "STAFF" as const, capacity: null, isActive: true }];
    const r = allocate({
      service: { ...tableSvc, assignmentMode: "SINGLE", requiresPartySize: false },
      start,
      end,
      candidates: staff,
      hours: [],
      timeOffs: [],
      busy: [],
      timeZone: "UTC",
    });
    assert.deepEqual(r, { staffIds: ["dr-rao"], resourceIds: [] });
  });

  it("respects time off", () => {
    assert.throws(
      () =>
        allocate({
          service: tableSvc,
          start,
          end,
          partySize: 2,
          candidates: [{ id: "t2", kind: "RESOURCE", capacity: 2, isActive: true }],
          hours: mondayHours,
          timeOffs: [
            { ownerId: "t2", startDate: new Date("2026-10-12T00:00:00Z"), endDate: new Date("2026-10-13T00:00:00Z") },
          ],
          busy: [],
          timeZone: "UTC",
        }),
      (e: unknown) => e instanceof AllocationError && e.code === "NONE_FREE",
    );
  });
});
