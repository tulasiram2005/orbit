import { DateTime } from "luxon";

export function fromDateOnly(value: string | undefined): Date | undefined {
  return value ? new Date(`${value}T00:00:00.000Z`) : undefined;
}

export function testableNow(): Date {
  if (process.env.NODE_ENV === "test" && process.env.ORBIT_TEST_NOW) {
    return new Date(process.env.ORBIT_TEST_NOW);
  }

  return new Date();
}

export function todayDateOnlyInTimeZone(timezone: string, now = testableNow()): Date {
  const localToday = DateTime.fromJSDate(now, { zone: timezone });
  const utcDateOnly = DateTime.utc(localToday.year, localToday.month, localToday.day);
  return utcDateOnly.toJSDate();
}
