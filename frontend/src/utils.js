/**
 * Format a phone number to (xxx) xxx-xxxx
 * Handles 10-digit numbers with or without formatting
 */
export function formatPhone(value) {
  // Strip everything except digits
  const digits = value.replace(/\D/g, "");
  if (digits.length === 0) return "";
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0,3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6,10)}`;
}

/**
 * Phone input handler — formats as user types
 */
export function phoneInputHandler(setter, formSetter, form, field) {
  return (e) => {
    const formatted = formatPhone(e.target.value);
    formSetter({ ...form, [field]: formatted });
  };
}
