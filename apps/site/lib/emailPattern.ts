/**
 * Client-side "structurally email-shaped" gate for the feedback
 * form's optional email field. It lives in its own module because it
 * once had a second consumer — the standalone signup form, since
 * removed with its route — and because its DB-level counterpart is
 * shared by every writer to the opt-in log, so the two shapes are
 * easier to keep in step named than inlined.
 *
 * Decision 6 of the feedback epic: presence of `@`, at least one
 * non-whitespace non-`@` character on each side, and at least one `.`
 * in the domain segment with at least one non-whitespace non-`@`
 * character on each side. Intentionally minimal — not RFC 5322
 * conformance. The DB-level counterpart is the
 * `newsletter_opt_ins_email_shape` CHECK constraint, which encodes the
 * same shape in POSIX form at the storage layer.
 */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
