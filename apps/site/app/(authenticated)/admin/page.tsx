"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

import {
  SignInForm,
  requestMagicLink,
  signOut,
  useAuthSession,
  type MagicLinkState,
  type SignInFormCopy,
} from "../../../../../shared/auth";
import {
  createDuplicatedDraftContent,
  createStarterDraftContent,
  getGameAdminStatus,
  listDraftEventSummaries,
  loadDraftEvent,
  saveDraftEvent,
  type DraftEventSummary,
} from "../../../../../shared/events";
import { routes } from "../../../../../shared/urls";

const ADMIN_SIGN_IN_COPY: SignInFormCopy = {
  emailInputId: "admin-email",
  emailLabel: "Admin email",
  emailPlaceholder: "admin@example.com",
  eyebrow: "Magic-link sign-in",
  heading: "Send a sign-in link to an admin email.",
  submitLabelIdle: "Email sign-in link",
  submitLabelPending: "Sending sign-in link...",
};

const OPEN_LIVE_GAME_NOT_LIVE_REASON = "Publish this event to open the live game.";
const OPEN_LIVE_GAME_BUSY_REASON = "Working...";

type DashboardState =
  | { status: "idle" }
  | { email: string | null; status: "loading" }
  | { email: string | null; message: string; status: "error" }
  | { email: string | null; status: "unauthorized" }
  | { drafts: DraftEventSummary[]; email: string | null; status: "ready" };

type DraftMutationState =
  | { message: null; status: "idle" }
  | { message: string; status: "creating" }
  | { eventId: string; message: string; status: "duplicating" }
  | { message: string; status: "error" };

function getStatusLabel(draft: DraftEventSummary) {
  if (draft.status === "draft_only") {
    return "Draft only";
  }

  if (draft.status === "live_with_draft_changes") {
    return "Draft changes not published";
  }

  return `Live v${draft.lastPublishedVersionNumber}`;
}

function getEventCounts(drafts: DraftEventSummary[]) {
  const liveCount = drafts.filter((draft) => draft.status !== "draft_only").length;

  return {
    draftOnlyCount: drafts.length - liveCount,
    liveCount,
    totalCount: drafts.length,
  };
}

function formatCount(count: number, singularLabel: string, pluralLabel = `${singularLabel}s`) {
  const label = count === 1 ? singularLabel : pluralLabel;

  return `${count} ${label}`;
}

function getErrorMessage(error: unknown, fallbackMessage: string) {
  return error instanceof Error ? error.message : fallbackMessage;
}

type OpenLiveGameState = {
  disabled: boolean;
  reason: string | null;
  reasonId: string | null;
};

function getOpenLiveGameState(
  draft: DraftEventSummary,
  isWorkspaceBusy: boolean,
  reasonId: string,
): OpenLiveGameState {
  if (isWorkspaceBusy) {
    return { disabled: true, reason: OPEN_LIVE_GAME_BUSY_REASON, reasonId };
  }

  if (draft.status === "draft_only") {
    return { disabled: true, reason: OPEN_LIVE_GAME_NOT_LIVE_REASON, reasonId };
  }

  return { disabled: false, reason: null, reasonId: null };
}

function SignedInAs({ email }: { email: string | null }) {
  return (
    <p className="admin-signed-in-as">
      Signed in as <strong>{email ?? "unknown email"}</strong>
    </p>
  );
}

/**
 * apps/site root-admin platform page. Mirrors the structural ARIA / copy
 * contract of apps/web's `AdminDashboardContent` so the e2e fixtures that
 * 2.4.2 retargets continue to find their locators. Deep-editing already
 * moved to apps/web's `/event/:slug/admin` in M2 phase 2.2; this page only
 * handles the list view, sign-in, and create/duplicate actions.
 */
export default function AdminPage() {
  const sessionState = useAuthSession();
  const [emailInput, setEmailInput] = useState("");
  const [magicLinkState, setMagicLinkState] = useState<MagicLinkState>({
    message: null,
    status: "idle",
  });
  const [dashboardState, setDashboardState] = useState<DashboardState>({ status: "idle" });
  const [reloadToken, setReloadToken] = useState(0);
  const [draftMutationState, setDraftMutationState] = useState<DraftMutationState>({
    message: null,
    status: "idle",
  });
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    if (sessionState.status !== "signed_in") {
      setDashboardState({ status: "idle" });
      setDraftMutationState({ message: null, status: "idle" });
      return;
    }

    let isCancelled = false;
    const email = sessionState.email;

    setDraftMutationState({ message: null, status: "idle" });
    setDashboardState({ email, status: "loading" });

    void getGameAdminStatus()
      .then(async (isAdmin) => {
        if (isCancelled) {
          return;
        }

        if (!isAdmin) {
          setDashboardState({ email, status: "unauthorized" });
          return;
        }

        const drafts = await listDraftEventSummaries();

        if (!isCancelled) {
          setDashboardState({ drafts, email, status: "ready" });
        }
      })
      .catch((error: unknown) => {
        if (!isCancelled) {
          setDashboardState({
            email,
            message: getErrorMessage(
              error,
              "We couldn't load the admin dashboard right now.",
            ),
            status: "error",
          });
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [reloadToken, sessionState]);

  const handleSubmitMagicLink = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!emailInput.trim()) {
        setMagicLinkState({
          message: "Enter the email address that should receive the sign-in link.",
          status: "error",
        });
        return;
      }

      setMagicLinkState({ message: null, status: "pending" });

      try {
        await requestMagicLink(emailInput, { next: routes.admin });
        setMagicLinkState({
          message: "Check your email for the admin sign-in link.",
          status: "success",
        });
      } catch (error: unknown) {
        setMagicLinkState({
          message: getErrorMessage(error, "We couldn't send the admin sign-in link."),
          status: "error",
        });
      }
    },
    [emailInput],
  );

  const handleRetry = useCallback(() => {
    setReloadToken((value) => value + 1);
  }, []);

  const handleSignOut = useCallback(async () => {
    setSignOutError(null);
    setIsSigningOut(true);

    try {
      await signOut();
    } catch (error: unknown) {
      setSignOutError(getErrorMessage(error, "We couldn't sign out right now."));
    } finally {
      setIsSigningOut(false);
    }
  }, []);

  const isMutationPending =
    draftMutationState.status === "creating" ||
    draftMutationState.status === "duplicating";

  const handleCreateDraft = useCallback(async () => {
    if (dashboardState.status !== "ready") {
      return;
    }

    setDraftMutationState({ message: "Creating draft...", status: "creating" });

    try {
      const content = createStarterDraftContent(dashboardState.drafts);
      const savedDraft = await saveDraftEvent(content);
      window.location.assign(routes.eventAdmin(savedDraft.slug));
    } catch (error: unknown) {
      setDraftMutationState({
        message: getErrorMessage(error, "We couldn't create the draft right now."),
        status: "error",
      });
    }
  }, [dashboardState]);

  const handleDuplicateDraft = useCallback(
    async (eventId: string) => {
      if (dashboardState.status !== "ready") {
        return;
      }

      setDraftMutationState({
        eventId,
        message: "Duplicating draft...",
        status: "duplicating",
      });

      try {
        const sourceDraft = await loadDraftEvent(eventId);

        if (!sourceDraft) {
          throw new Error("We couldn't find that draft to duplicate.");
        }

        const content = createDuplicatedDraftContent(sourceDraft, dashboardState.drafts);
        const savedDraft = await saveDraftEvent(content);
        window.location.assign(routes.eventAdmin(savedDraft.slug));
      } catch (error: unknown) {
        setDraftMutationState({
          message: getErrorMessage(error, "We couldn't duplicate the draft right now."),
          status: "error",
        });
      }
    },
    [dashboardState],
  );

  return (
    <main className="admin-shell">
      <section className="admin-card">
        <header className="admin-topbar">
          <div>
            <p className="eyebrow">Admin authoring</p>
            <h1>Game draft access</h1>
          </div>
          {sessionState.status === "signed_in" ? (
            <button
              className="secondary-button"
              disabled={isSigningOut}
              onClick={() => void handleSignOut()}
              type="button"
            >
              {isSigningOut ? "Signing out..." : "Sign out"}
            </button>
          ) : null}
        </header>

        {signOutError ? (
          <p className="admin-message admin-message-error">{signOutError}</p>
        ) : null}

        <AdminBody
          dashboardState={dashboardState}
          draftMutationState={draftMutationState}
          emailInput={emailInput}
          isMutationPending={isMutationPending}
          magicLinkState={magicLinkState}
          onCreateDraft={() => void handleCreateDraft()}
          onDuplicateDraft={(eventId) => void handleDuplicateDraft(eventId)}
          onEmailInputChange={setEmailInput}
          onRetry={handleRetry}
          onSubmitMagicLink={(event) => void handleSubmitMagicLink(event)}
          sessionState={sessionState}
        />
      </section>
    </main>
  );
}

type AdminBodyProps = {
  dashboardState: DashboardState;
  draftMutationState: DraftMutationState;
  emailInput: string;
  isMutationPending: boolean;
  magicLinkState: MagicLinkState;
  onCreateDraft: () => void;
  onDuplicateDraft: (eventId: string) => void;
  onEmailInputChange: (value: string) => void;
  onRetry: () => void;
  onSubmitMagicLink: (event: FormEvent<HTMLFormElement>) => void;
  sessionState: ReturnType<typeof useAuthSession>;
};

function AdminBody({
  dashboardState,
  draftMutationState,
  emailInput,
  isMutationPending,
  magicLinkState,
  onCreateDraft,
  onDuplicateDraft,
  onEmailInputChange,
  onRetry,
  onSubmitMagicLink,
  sessionState,
}: AdminBodyProps) {
  if (sessionState.status === "missing_config") {
    return (
      <div className="admin-state-stack">
        <h2>Admin auth needs Supabase configuration.</h2>
        <p>{sessionState.message}</p>
      </div>
    );
  }

  if (sessionState.status === "loading") {
    return (
      <div className="admin-state-stack">
        <h2>Restoring admin session</h2>
        <button className="secondary-button" disabled type="button">
          Checking session...
        </button>
      </div>
    );
  }

  if (sessionState.status === "signed_out") {
    return (
      <SignInForm
        copy={ADMIN_SIGN_IN_COPY}
        emailInput={emailInput}
        magicLinkState={magicLinkState}
        onEmailInputChange={onEmailInputChange}
        onSubmit={onSubmitMagicLink}
      />
    );
  }

  if (dashboardState.status === "loading") {
    return (
      <div className="admin-state-stack">
        <h2>Loading admin access</h2>
        <SignedInAs email={dashboardState.email} />
        <button className="secondary-button" disabled type="button">
          Loading drafts...
        </button>
      </div>
    );
  }

  if (dashboardState.status === "unauthorized") {
    return (
      <div className="admin-state-stack">
        <h2>This account is not allowlisted for game authoring.</h2>
        <SignedInAs email={dashboardState.email} />
        <p>
          The auth link worked, but this email does not currently have admin
          access to private game drafts.
        </p>
      </div>
    );
  }

  if (dashboardState.status === "error") {
    return (
      <div className="admin-state-stack">
        <h2>Admin access couldn&apos;t load right now.</h2>
        <SignedInAs email={dashboardState.email} />
        <p>{dashboardState.message}</p>
        <button className="secondary-button" onClick={onRetry} type="button">
          Retry loading drafts
        </button>
      </div>
    );
  }

  if (dashboardState.status === "ready") {
    return (
      <AdminEventList
        draftMutationState={draftMutationState}
        drafts={dashboardState.drafts}
        email={dashboardState.email}
        isMutationPending={isMutationPending}
        onCreateDraft={onCreateDraft}
        onDuplicateDraft={onDuplicateDraft}
        onRefresh={onRetry}
      />
    );
  }

  return null;
}

type AdminEventListProps = {
  draftMutationState: DraftMutationState;
  drafts: DraftEventSummary[];
  email: string | null;
  isMutationPending: boolean;
  onCreateDraft: () => void;
  onDuplicateDraft: (eventId: string) => void;
  onRefresh: () => void;
};

function AdminEventList({
  draftMutationState,
  drafts,
  email,
  isMutationPending,
  onCreateDraft,
  onDuplicateDraft,
  onRefresh,
}: AdminEventListProps) {
  const counts = getEventCounts(drafts);
  const isWorkspaceBusy = isMutationPending;

  return (
    <div className="admin-state-stack">
      <SignedInAs email={email} />
      <div className="admin-summary-region" aria-label="Event workspace summary">
        <div className="admin-summary-item">{formatCount(counts.totalCount, "event")}</div>
        <div className="admin-summary-item">
          {formatCount(counts.liveCount, "live", "live")}
        </div>
        <div className="admin-summary-item">
          {formatCount(counts.draftOnlyCount, "draft only", "draft only")}
        </div>
      </div>
      <div className="admin-toolbar">
        <button
          className="primary-button"
          disabled={isWorkspaceBusy}
          onClick={onCreateDraft}
          type="button"
        >
          {draftMutationState.status === "creating" ? "Creating draft..." : "Create draft"}
        </button>
        <button
          className="secondary-button"
          disabled={isWorkspaceBusy}
          onClick={onRefresh}
          type="button"
        >
          Refresh events
        </button>
      </div>
      {draftMutationState.status === "error" ? (
        <p className="admin-message admin-message-error">{draftMutationState.message}</p>
      ) : draftMutationState.message ? (
        <p className="admin-message admin-message-info">{draftMutationState.message}</p>
      ) : null}
      <div className="admin-event-grid">
        {drafts.length ? (
          drafts.map((draft) => {
            const liveGameState = getOpenLiveGameState(
              draft,
              isWorkspaceBusy,
              `open-live-game-reason-${draft.id}`,
            );
            const isDuplicatingThis =
              draftMutationState.status === "duplicating" &&
              draftMutationState.eventId === draft.id;

            return (
              <article
                aria-label={`${draft.name} event`}
                className="event-card"
                key={draft.id}
              >
                <div className="event-card-copy">
                  <h3>{draft.name}</h3>
                  <p className="event-card-status">{getStatusLabel(draft)}</p>
                  <p className="event-card-meta">Slug: {draft.slug}</p>
                </div>
                <div className="event-card-buttons">
                  <button
                    className="secondary-button"
                    onClick={() => {
                      window.location.assign(routes.eventAdmin(draft.slug));
                    }}
                    type="button"
                  >
                    Open workspace
                  </button>
                  <button
                    aria-describedby={liveGameState.reasonId ?? undefined}
                    aria-disabled={liveGameState.disabled ? "true" : undefined}
                    className="secondary-button"
                    onClick={() => {
                      if (liveGameState.disabled) {
                        return;
                      }

                      window.location.assign(routes.game(draft.slug));
                    }}
                    type="button"
                  >
                    Open live game
                  </button>
                  <button
                    className="secondary-button"
                    disabled={isWorkspaceBusy}
                    onClick={() => onDuplicateDraft(draft.id)}
                    type="button"
                  >
                    {isDuplicatingThis ? "Duplicating..." : "Duplicate draft"}
                  </button>
                </div>
                {liveGameState.reason ? (
                  <span
                    className="admin-action-reason"
                    id={liveGameState.reasonId ?? undefined}
                  >
                    {liveGameState.reason}
                  </span>
                ) : null}
              </article>
            );
          })
        ) : (
          <p className="event-card-meta">No draft events are visible yet.</p>
        )}
      </div>
    </div>
  );
}
