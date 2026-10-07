export function fromDateOnly(value: string | undefined): Date | undefined {
  return value ? new Date(`${value}T00:00:00.000Z`) : undefined;
}

export function todayUtcDateOnly(): Date {
  if (process.env.NODE_ENV === "test" && process.env.ORBIT_TEST_TODAY) {
    return fromDateOnly(process.env.ORBIT_TEST_TODAY) ?? new Date();
  }

  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}
