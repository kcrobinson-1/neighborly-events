/**
 * Client-side "structurally email-shaped" gate shared by the feedback
 * form and the standalone newsletter signup form (extracted from
 * `FeedbackForm.tsx` when the signup form became its second consumer).
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
