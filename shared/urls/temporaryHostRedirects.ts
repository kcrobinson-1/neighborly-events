/**
 * Temporary whole-host redirects that must override the normal site and
 * organizer routing. Keep this list small, dated, and easy to remove.
 *
 * `reviewOn` is an operational reminder, not an automatic expiration date.
 * The redirect remains active until this entry is removed and deployed.
 */
export type TemporaryHostRedirect = {
  hostname: string;
  destination: string;
  reason: string;
  reviewOn: string;
};

export const temporaryHostRedirects: readonly TemporaryHostRedirect[] = [
  {
    hostname: "music.madrona.us",
    destination:
      "https://www.zeffy.com/en-US/donation-form/winter-tree-lights--2026",
    reason: "The October 2026 neighborhood newsletter printed the wrong QR code.",
    reviewOn: "2026-11-17",
  },
];
