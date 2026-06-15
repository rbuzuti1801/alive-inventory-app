export function errorResponse(error: unknown, status = 400) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null && "message" in error
        ? String((error as { message: unknown }).message)
        : String(error);
  return Response.json({ error: message }, { status });
}

export function parseBool(value: FormDataEntryValue | null) {
  return value === "true" || value === "on";
}

export function formToObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}
