/**
 * Splits a full name into first and last parts for two-line hero typography.
 * "AMAN BEDILU" → { firstName: "AMAN", lastName: "BEDILU" }
 */
export function splitName(name: string): {
  firstName: string;
  lastName: string;
} {
  const trimmed = name.trim();
  const spaceIndex = trimmed.indexOf(" ");

  if (spaceIndex === -1) {
    return { firstName: trimmed, lastName: "" };
  }

  return {
    firstName: trimmed.slice(0, spaceIndex),
    lastName: trimmed.slice(spaceIndex + 1).trim(),
  };
}
