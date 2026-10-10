import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  appointmentAddressRequirement,
  orderAddressRequirement,
  reservationAddressRequirement,
  validateCollectedAddress,
} from "./address-policy.js";

describe("address policy", () => {
  it("orders always require a shipping address", () => {
    assert.deepEqual(orderAddressRequirement(), {
      required: true,
      kind: "SHIPPING",
    });
  });

  it("in-business appointments never require an address", () => {
    assert.deepEqual(appointmentAddressRequirement("AT_BUSINESS"), {
      required: false,
    });
    // Even if a choice is somehow present, AT_BUSINESS wins.
    assert.deepEqual(
      appointmentAddressRequirement("AT_BUSINESS", "AT_CUSTOMER"),
      { required: false },
    );
  });

  it("home-service appointments always require a visit address", () => {
    assert.deepEqual(appointmentAddressRequirement("AT_CUSTOMER"), {
      required: true,
      kind: "VISIT",
    });
  });

  it("BOTH-mode services require an address only for home visits", () => {
    assert.deepEqual(appointmentAddressRequirement("BOTH", "AT_CUSTOMER"), {
      required: true,
      kind: "VISIT",
    });
    assert.deepEqual(appointmentAddressRequirement("BOTH", "AT_BUSINESS"), {
      required: false,
    });
    assert.deepEqual(appointmentAddressRequirement("BOTH"), {
      required: false,
    });
  });

  it("reservations never require an address", () => {
    assert.deepEqual(reservationAddressRequirement(), { required: false });
  });

  it("validates collected addresses", () => {
    assert.deepEqual(
      validateCollectedAddress({
        line1: "12 MG Road",
        city: "Mumbai",
        pincode: "400001",
      }),
      [],
    );
    const errors = validateCollectedAddress({
      line1: "abc",
      city: "M",
      pincode: "123",
    });
    assert.equal(errors.length, 3);
  });
});
