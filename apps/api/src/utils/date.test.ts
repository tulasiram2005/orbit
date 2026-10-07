import { describe, expect, it } from "vitest";

import { todayDateOnlyInTimeZone } from "./date.js";

function isoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

describe("timezone-aware date helpers", () => {
  it("computes the local calendar day from a fixed instant", () => {
    const now = new Date("2026-10-07T20:30:00.000Z");

    expect(isoDate(todayDateOnlyInTimeZone("Asia/Kolkata", now))).toBe("2026-10-08");
    expect(isoDate(todayDateOnlyInTimeZone("UTC", now))).toBe("2026-10-07");
    expect(isoDate(todayDateOnlyInTimeZone("Etc/GMT+8", now))).toBe("2026-10-07");
  });
});
