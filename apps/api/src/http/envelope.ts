import type { ErrorCode, ErrorEnvelope, SuccessEnvelope } from "@orbit/shared";

export function ok<TData, TMeta = undefined>(
  data: TData,
  meta?: TMeta
): SuccessEnvelope<TData, TMeta> {
  if (meta === undefined) {
    return { success: true, data } as SuccessEnvelope<TData, TMeta>;
  }

  return { success: true, data, meta } as SuccessEnvelope<TData, TMeta>;
}

export function fail(
  code: ErrorCode,
  message: string,
  requestId: string,
  fields?: Record<string, string[]>
): ErrorEnvelope {
  if (fields === undefined) {
    return {
      success: false,
      error: { code, message, requestId },
    };
  }

  return {
    success: false,
    error: { code, message, fields, requestId },
  };
}
