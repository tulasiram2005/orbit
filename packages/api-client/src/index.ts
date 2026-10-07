import type { HealthResponse } from "@orbit/shared";

export async function getHealth(baseUrl: string): Promise<HealthResponse> {
  const response = await fetch(`${baseUrl}/health`);

  if (!response.ok) {
    throw new Error(`Health check failed with ${response.status}`);
  }

  return (await response.json()) as HealthResponse;
}
