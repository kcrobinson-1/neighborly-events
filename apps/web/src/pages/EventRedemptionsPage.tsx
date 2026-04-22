import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { SignInForm, type SignInFormCopy } from "../auth/SignInForm";
import type { AuthNextPath, MagicLinkState } from "../auth/types";
import { useAuthSession } from "../auth/useAuthSession";
import { requestMagicLink } from "../lib/authApi";
import {
  authorizeRedemptions,
  type RedemptionsAuthorizationResult,
} from "../redemptions/authorizeRedemptions";
import { filterRedemptions } from "../redemptions/filterRedemptions";
import { parseSearchInput } from "../redemptions/parseSearchInput";
import { RedemptionRow } from "../redemptions/RedemptionRow";
import { RedemptionsFilterBar } from "../redemptions/RedemptionsFilterBar";
import {
  REDEMPTIONS_FETCH_LIMIT,
  useRedemptionsList,
} from "../redemptions/useRedemptionsList";
import { useRedemptionsFilters } from "../redemptions/useRedemptionsFilters";
import { routes } from "../routes";

type EventRedemptionsPageProps = {
  onNavigate: (path: string) => void;
  slug: string;
};

const REDEMPTIONS_SIGN_IN_COPY: SignInFormCopy = {
  eyebrow: "Redemption monitoring",
  emailInputId: "redemptions-signin-email",
  emailLabel: "Email",
  emailPlaceholder: "organizer@example.com",
  heading: "Sign in to review redemptions",
  submitLabelIdle: "Send sign-in link",
  submitLabelPending: "Sending...",
};

function SignedInAs({ email }: { email: string | null }) {
  return (
    <p>
      Signed in as <strong>{email ?? "this account"}</strong>.
    </p>
  );
}

function RedemptionsShell(
  {
    title,
    eyebrow = "Redemption monitoring",
    children,
    onNavigateHome,
  }: {
    children: ReactNode;
    eyebrow?: string;
    onNavigateHome: () => void;
    title: string;
  },
) {
  return (
    <section className="game-layout">
      <nav className="sample-nav">
        <button
          className="text-link"
          onClick={onNavigateHome}
          type="button"
        >
          Back to demo overview
        </button>
      </nav>

      <section className="app-card">
        <header className="topbar">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h1 className="topbar-title-compact">{title}</h1>
          </div>
        </header>
        <section className="panel">
          {children}
        </section>
      </section>
    </section>
  );
}

type RedemptionsAccessState =
  | { status: "idle" }
  | { eventCode: string; eventId: string; status: "authorized" }
  | { status: "role_gate" }
  | { message: string; status: "transient_error" };

type SignedInRedemptionsFlowProps = {
  currentUserId: string | null;
  email: string | null;
  onNavigate: (path: string) => void;
  slug: string;
};

/**
 * Signed-in monitoring experience for `/event/:slug/redemptions`.
 *
 * Rendered only while `sessionState.status === "signed_in"`, so signing out
 * unmounts this component and discards its authorization cache. A fresh
 * sign-in mounts a new instance, which guarantees a new
 * `authorizeRedemptions` probe runs before any list fetch starts — even
 * when the returning session has the same email on the same slug.
 */
function SignedInRedemptionsFlow({
  currentUserId,
  email,
  onNavigate,
  slug,
}: SignedInRedemptionsFlowProps) {
  const [accessState, setAccessState] = useState<RedemptionsAccessState>({
    status: "idle",
  });
  const [reloadToken, setReloadToken] = useState(0);
  const [resolvedAccessKey, setResolvedAccessKey] = useState("");
  const currentAccessKey = `${slug}:${email ?? ""}:${reloadToken}`;

  useEffect(() => {
    let isCancelled = false;

    void authorizeRedemptions(slug)
      .then((result: RedemptionsAuthorizationResult) => {
        if (isCancelled) {
          return;
        }

        if (result.status === "authorized") {
          setAccessState({
            eventCode: result.eventCode,
            eventId: result.eventId,
            status: "authorized",
          });
          setResolvedAccessKey(currentAccessKey);
          return;
        }

        if (result.status === "role_gate") {
          setAccessState({
            status: "role_gate",
          });
          setResolvedAccessKey(currentAccessKey);
          return;
        }

        setAccessState({
          message: result.message,
          status: "transient_error",
        });
        setResolvedAccessKey(currentAccessKey);
      })
      .catch((error: unknown) => {
        if (!isCancelled) {
          setAccessState({
            message:
              error instanceof Error
                ? error.message
                : "Please retry once your connection is stable.",
            status: "transient_error",
          });
          setResolvedAccessKey(currentAccessKey);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [currentAccessKey, reloadToken, slug]);

  if (resolvedAccessKey !== currentAccessKey || accessState.status === "idle") {
    return (
      <RedemptionsShell
        onNavigateHome={() => onNavigate(routes.home)}
        title="Loading redemption monitoring"
      >
        <div className="signin-stack">
          <SignedInAs email={email} />
          <button className="secondary-button" disabled type="button">
            Checking event access...
          </button>
        </div>
      </RedemptionsShell>
    );
  }

  if (accessState.status === "role_gate") {
    return (
      <RedemptionsShell
        onNavigateHome={() => onNavigate(routes.home)}
        title="Review redemptions"
      >
        <div className="signin-stack">
          <SignedInAs email={email} />
          <div className="section-heading">
            <h2>Not available for this event.</h2>
          </div>
          <p>
            Your account is not set up to review redemptions here. If you think
            this is a mistake, check with the event organizer.
          </p>
        </div>
      </RedemptionsShell>
    );
  }

  if (accessState.status === "transient_error") {
    return (
      <RedemptionsShell
        onNavigateHome={() => onNavigate(routes.home)}
        title="Review redemptions"
      >
        <div className="signin-stack">
          <SignedInAs email={email} />
          <div className="section-heading">
            <h2>We couldn&apos;t verify monitoring access right now.</h2>
          </div>
          <p>{accessState.message}</p>
          <button
            className="primary-button"
            onClick={() => setReloadToken((value) => value + 1)}
            type="button"
          >
            Retry
          </button>
        </div>
      </RedemptionsShell>
    );
  }

  return (
    <AuthorizedRedemptionsView
      currentUserId={currentUserId}
      email={email}
      eventCode={accessState.eventCode}
      eventId={accessState.eventId}
      onNavigateHome={() => onNavigate(routes.home)}
    />
  );
}

type AuthorizedRedemptionsViewProps = {
  currentUserId: string | null;
  email: string | null;
  eventCode: string;
  eventId: string;
  onNavigateHome: () => void;
};

function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}

function formatLastUpdated(fetchedAt: Date) {
  try {
    return fetchedAt.toLocaleTimeString();
  } catch {
    return fetchedAt.toISOString();
  }
}

function AuthorizedRedemptionsView({
  currentUserId,
  email,
  eventCode,
  eventId,
  onNavigateHome,
}: AuthorizedRedemptionsViewProps) {
  const { refresh, state: listState } = useRedemptionsList({ eventId });
  const { chips, nowMs, refreshNowMs, searchInput, setSearchInput, toggleChip } =
    useRedemptionsFilters();
  const isOnline = useOnlineStatus();
  const wasOfflineRef = useRef(!isOnline);

  useEffect(() => {
    if (!isOnline) {
      wasOfflineRef.current = true;
      return;
    }
    if (wasOfflineRef.current) {
      wasOfflineRef.current = false;
      refresh();
    }
  }, [isOnline, refresh]);

  const handleRefresh = () => {
    refreshNowMs();
    refresh();
  };

  const searchResult = parseSearchInput(searchInput, eventCode);
  const filteredRows =
    listState.status === "success"
      ? filterRedemptions({
          chips,
          currentUserId,
          nowMs,
          rows: listState.rows,
          searchResult,
        })
      : [];

  return (
    <RedemptionsShell
      onNavigateHome={onNavigateHome}
      title="Review redemptions"
    >
      <div className="redemptions-layout">
        <div className="redemptions-header">
          <SignedInAs email={email} />
          <span className="redemptions-event-badge">{eventCode}</span>
        </div>
        <div className="redemptions-toolbar">
          {listState.status === "success" ? (
            <p className="redemptions-updated">
              Last updated {formatLastUpdated(listState.fetchedAt)}
            </p>
          ) : null}
          <button
            className="secondary-button"
            disabled={!isOnline || listState.status === "loading"}
            onClick={handleRefresh}
            type="button"
          >
            {isOnline ? "Refresh" : "You are offline"}
          </button>
        </div>
        {listState.status === "loading" ? (
          <p className="redemptions-placeholder">Loading redemptions...</p>
        ) : null}
        {listState.status === "error" ? (
          <div className="redemptions-error" role="alert">
            <p>{listState.message}</p>
            <button
              className="primary-button"
              onClick={handleRefresh}
              type="button"
            >
              Retry
            </button>
          </div>
        ) : null}
        {listState.status === "success" ? (
          <>
            <RedemptionsFilterBar
              chips={chips}
              onChipToggle={toggleChip}
              onSearchInputChange={setSearchInput}
              searchInput={searchInput}
            />
            {listState.rows.length === REDEMPTIONS_FETCH_LIMIT ? (
              <p className="redemptions-cap-banner">
                Showing the most recent {REDEMPTIONS_FETCH_LIMIT} redemption
                events. Older records are not shown. Narrow the filters or
                scroll to the top of the list for the latest activity.
              </p>
            ) : null}
            {listState.rows.length === 0 ? (
              <p className="redemptions-placeholder">
                No redemption activity yet for this event.
              </p>
            ) : filteredRows.length === 0 ? (
              <p className="redemptions-placeholder">
                No redemptions match the current filters or search.
              </p>
            ) : (
              <ul className="redemptions-list">
                {filteredRows.map((row) => (
                  <RedemptionRow
                    key={row.id}
                    currentUserId={currentUserId}
                    eventCode={eventCode}
                    onView={() => {
                      // Detail sheet wires into this handler in Commit 6.
                    }}
                    row={row}
                  />
                ))}
              </ul>
            )}
          </>
        ) : null}
        <p className="sr-only">Resolved event {eventId}</p>
      </div>
    </RedemptionsShell>
  );
}

/** Event-scoped monitoring route shell that gates `/event/:slug/redemptions` on sign-in. */
export function EventRedemptionsPage(
  { onNavigate, slug }: EventRedemptionsPageProps,
) {
  const sessionState = useAuthSession();
  const [emailInput, setEmailInput] = useState("");
  const [magicLinkState, setMagicLinkState] = useState<MagicLinkState>({
    message: null,
    status: "idle",
  });

  const requestRedemptionsMagicLink = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!emailInput.trim()) {
      setMagicLinkState({
        message: "Enter the email address that should receive the sign-in link.",
        status: "error",
      });
      return;
    }

    setMagicLinkState({
      message: null,
      status: "pending",
    });

    try {
      const nextPath = routes.eventRedemptions(slug) as AuthNextPath;

      await requestMagicLink(emailInput, {
        next: nextPath,
      });
      setMagicLinkState({
        message: "Check your email for the monitoring sign-in link.",
        status: "success",
      });
    } catch (error: unknown) {
      setMagicLinkState({
        message:
          error instanceof Error
            ? error.message
            : "We couldn't send the sign-in link.",
        status: "error",
      });
    }
  };

  if (sessionState.status === "missing_config") {
    return (
      <RedemptionsShell
        onNavigateHome={() => onNavigate(routes.home)}
        title="This game isn't available right now."
      >
        <div className="signin-stack">
          <p>{sessionState.message}</p>
        </div>
      </RedemptionsShell>
    );
  }

  if (sessionState.status === "loading") {
    return (
      <RedemptionsShell
        onNavigateHome={() => onNavigate(routes.home)}
        title="Loading redemption monitoring"
      >
        <div className="signin-stack">
          <button className="secondary-button" disabled type="button">
            Restoring session...
          </button>
        </div>
      </RedemptionsShell>
    );
  }

  if (sessionState.status === "signed_out") {
    return (
      <RedemptionsShell
        onNavigateHome={() => onNavigate(routes.home)}
        title="Review redemptions"
      >
        <SignInForm
          copy={REDEMPTIONS_SIGN_IN_COPY}
          emailInput={emailInput}
          magicLinkState={magicLinkState}
          onEmailInputChange={setEmailInput}
          onSubmit={requestRedemptionsMagicLink}
        />
      </RedemptionsShell>
    );
  }

  return (
    <SignedInRedemptionsFlow
      currentUserId={sessionState.session.user.id ?? null}
      email={sessionState.email}
      onNavigate={onNavigate}
      slug={slug}
    />
  );
}
