import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  defaultModulesFor,
  missingFields,
  normalizeModules,
  onboardingDraftSchema,
  requiredFieldsFor,
} from "./onboarding.validation.js";

describe("onboarding validation", () => {
  it("suggests modules per business type", () => {
    assert.deepEqual(defaultModulesFor("RETAIL"), ["products"]);
    assert.deepEqual(defaultModulesFor("SALON"), ["bookings"]);
    assert.deepEqual(defaultModulesFor("RESTAURANT"), ["bookings"]);
    assert.deepEqual(defaultModulesFor("HOTEL"), ["bookings"]);
    assert.deepEqual(defaultModulesFor(undefined), []);
    assert.deepEqual(defaultModulesFor("OTHER"), []);
  });

  it("remaps legacy module ids", () => {
    assert.deepEqual(normalizeModules(["orders", "appointments", "reservations"]), [
      "products",
      "bookings",
    ]);
    assert.deepEqual(normalizeModules(["bookings", "nonsense"]), ["bookings"]);
    assert.deepEqual(normalizeModules(undefined), []);
  });

  it("requires only identity fields with no modules", () => {
    assert.deepEqual(requiredFieldsFor({}), ["businessName", "businessType"]);
  });

  it("salon (in-business) needs premises + hours, not service area", () => {
    const required = requiredFieldsFor({
      businessType: "SALON",
      enabledModules: ["bookings"],
      locationMode: "AT_BUSINESS",
    });
    for (const f of [
      "businessName",
      "businessType",
      "locationMode",
      "addressLine1",
      "city",
      "pincode",
      "operatingHours",
    ]) {
      assert.ok(required.includes(f), `expected ${f}`);
    }
    assert.ok(!required.includes("serviceArea"));
  });

  it("home-services need service area, not a business address", () => {
    const required = requiredFieldsFor({
      businessType: "HOME_SERVICES",
      enabledModules: ["bookings"],
      locationMode: "AT_CUSTOMER",
    });
    assert.ok(required.includes("serviceArea"));
    assert.ok(!required.includes("addressLine1"));
  });

  it("retailers skip scheduling fields", () => {
    const required = requiredFieldsFor({
      businessType: "RETAIL",
      enabledModules: ["products"],
    });
    assert.ok(required.includes("addressLine1"));
    assert.ok(!required.includes("operatingHours"));
    assert.ok(!required.includes("locationMode"));
  });

  it("reports missing fields for completion", () => {
    const missing = missingFields({
      businessName: "Glow",
      businessType: "SALON",
      enabledModules: ["bookings"],
      locationMode: "AT_BUSINESS",
    });
    assert.ok(missing.includes("addressLine1"));
    assert.ok(missing.includes("operatingHours"));
    assert.ok(!missing.includes("businessName"));
  });

  it("draft schema accepts partial saves and rejects bad pincodes", () => {
    const partial = onboardingDraftSchema.safeParse({
      businessName: "Glow",
      step: 1,
    });
    assert.equal(partial.success, true);
    const bad = onboardingDraftSchema.safeParse({ pincode: "123" });
    assert.equal(bad.success, false);
  });
});
