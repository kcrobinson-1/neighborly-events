import {
  type FormEvent,
  type ReactNode,
  useState,
} from "react";
import {
  SignInForm,
  useAuthSession,
  useOrganizerForEvent,
  type AuthSessionState,
  type MagicLinkState,
  type SignInFormCopy,
} from "../auth";
import { requestMagicLink, signOut as signOutAuth } from "../lib/authApi";
import { EventAdminWorkspace } from "../admin/EventAdminWorkspace";
import { useEventAdminWorkspace } from "../admin/useEventAdminWorkspace";
import { routes, type AuthNextPath } from "../../../../shared/urls";

type EventAdminPageProps = {
  onNavigate: (path: string) => void;
  slug: string;
};

const EVENT_ADMIN_SIGN_IN_COPY: SignInFormCopy = {
  eyebrow: "Event authoring",
  emailInputId: "event-admin-signin-email",
  emailLabel: "Email",
  emailPlaceholder: "organizer@example.com",
  heading: "Sign in to manage this event",
  submitLabelIdle: "Send sign-in link",
  submitLabelPending: "Sending...",
};

function SignedInAs({ email }: { email: string | null }) {
  return (
    <p className="admin-signed-in-as">
      Signed in as <strong>{email ?? "this account"}</strong>
    </p>
  );
}

type EventAdminShellProps = {
  children: ReactNode;
  isSignedIn: boolean;
  isSigningOut: boolean;
  onNavigateHome: () => void;
  onSignOut: () => void;
  signOutError: string | null;
  title: string;
};

/**
 * Page-level layout for `/event/:slug/admin`. Provides the navigation
 * affordance back to demo overview, the sign-out button (signed-in
 * only), and the panel chrome shared across every state branch — so
 * the in-place auth states render inside the same shell as the
 * authorized workspace.
 */
function EventAdminShell({
  children,
  isSignedIn,
  isSigningOut,
  onNavigateHome,
  onSignOut,
  signOutError,
  title,
}: EventAdminShellProps) {
  return (
    <section className="admin-layout">
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
            <p className="eyebrow">Event authoring</p>
            <h1>{title}</h1>
          </div>
          {isSignedIn ? (
            <button
              className="secondary-button admin-signout-button"
              disabled={isSigningOut}
              onClick={onSignOut}
              type="button"
            >
              {isSigningOut ? "Signing out..." : "Sign out"}
            </button>
          ) : null}
        </header>

        <section className="panel admin-panel">
          {signOutError ? (
            <p className="admin-message admin-message-error">{signOutError}</p>
          ) : null}
          {children}
        </section>
      </section>
    </section>
  );
}

type SignedInEventAdminFlowProps = {
  email: string | null;
  onNavigate: (path: string) => void;
  sessionState: Extract<AuthSessionState, { status: "signed_in" }>;
  slug: string;
};

/**
 * Signed-in authoring experience for `/event/:slug/admin`.
 *
 * Rendered only while `sessionState.status === "signed_in"`, so signing
 * out unmounts this component and discards its authorization cache.
 * A fresh sign-in mounts a new instance, which guarantees a new
 * `useOrganizerForEvent` probe runs before any authoring action is
 * available — even when the returning session has the same email on
 * the same slug.
 */
function SignedInEventAdminFlow({
  email,
  onNavigate,
  sessionState,
  slug,
}: SignedInEventAdminFlowProps) {
  const accessState = useOrganizerForEvent(slug);

  if (accessState.status === "loading") {
    return (
      <div className="admin-state-stack">
        <SignedInAs email={email} />
        <button className="secondary-button" disabled type="button">
          Checking event access...
        </button>
      </div>
    );
  }

  if (accessState.status === "role_gate") {
    return (
      <div className="admin-state-stack">
        <SignedInAs email={email} />
        <div className="section-heading">
          <h2>Not available for this event.</h2>
        </div>
        <p>
          Your account is not set up to manage this event. If you think this is
          a mistake, check with the event organizer.
        </p>
      </div>
    );
  }

  if (accessState.status === "transient_error") {
    return (
      <div className="admin-state-stack">
        <SignedInAs email={email} />
        <div className="section-heading">
          <h2>We couldn&apos;t verify event access right now.</h2>
        </div>
        <p>{accessState.message}</p>
        <button
          className="primary-button"
          onClick={accessState.retry}
          type="button"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <AuthorizedEventAdminFlow
      email={email}
      eventId={accessState.eventId}
      onNavigate={onNavigate}
      sessionState={sessionState}
    />
  );
}

type AuthorizedEventAdminFlowProps = {
  email: string | null;
  eventId: string;
  onNavigate: (path: string) => void;
  sessionState: Extract<AuthSessionState, { status: "signed_in" }>;
};

function AuthorizedEventAdminFlow({
  email,
  eventId,
  onNavigate,
  sessionState,
}: AuthorizedEventAdminFlowProps) {
  const workspace = useEventAdminWorkspace({ eventId, sessionState });

  if (workspace.seedState.status === "loading") {
    return (
      <div className="admin-state-stack">
        <SignedInAs email={email} />
        <button className="secondary-button" disabled type="button">
          Loading event workspace...
        </button>
      </div>
    );
  }

  if (workspace.seedState.status === "missing") {
    return (
      <div className="admin-state-stack">
        <SignedInAs email={email} />
        <div className="section-heading">
          <h2>This event isn&apos;t available right now.</h2>
        </div>
        <p>
          We couldn&apos;t find an authoring record for this event. If you
          recently created or renamed it, try again in a moment.
        </p>
        <button
          className="secondary-button"
          onClick={workspace.reloadSeed}
          type="button"
        >
          Retry
        </button>
      </div>
    );
  }

  if (workspace.seedState.status === "error") {
    return (
      <div className="admin-state-stack">
        <SignedInAs email={email} />
        <div className="section-heading">
          <h2>We couldn&apos;t load this event right now.</h2>
        </div>
        <p>{workspace.seedState.message}</p>
        <button
          className="primary-button"
          onClick={workspace.reloadSeed}
          type="button"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="admin-state-stack">
      <div className="section-heading">
        <p className="eyebrow">Authenticated organizer</p>
        <h2>Event workspace</h2>
      </div>
      <SignedInAs email={email} />
      <EventAdminWorkspace
        focusedQuestionId={workspace.focusedQuestionId}
        hasDraftChanges={workspace.hasDraftChanges}
        onCancelUnpublish={workspace.cancelUnpublish}
        onConfirmUnpublish={workspace.confirmUnpublish}
        onFocusQuestion={workspace.setFocusedQuestionId}
        onNavigate={onNavigate}
        onPublish={workspace.publishEvent}
        onSaveSelectedEventDetails={workspace.saveSelectedEventDetails}
        onSaveSelectedQuestionContent={workspace.saveSelectedQuestionContent}
        onUnpublish={workspace.startUnpublish}
        publishState={workspace.publishState}
        questionSaveState={workspace.questionSaveState}
        selectedDraftState={workspace.selectedDraftState}
        summary={workspace.seedState.summary}
        unpublishState={workspace.unpublishState}
      />
    </div>
  );
}

/** Event-scoped authoring route shell that gates `/event/:slug/admin` on sign-in plus organizer-or-admin role. */
export function EventAdminPage({ onNavigate, slug }: EventAdminPageProps) {
  const sessionState = useAuthSession();
  const [emailInput, setEmailInput] = useState("");
  const [magicLinkState, setMagicLinkState] = useState<MagicLinkState>({
    message: null,
    status: "idle",
  });
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const requestEventAdminMagicLink = async (
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
      const nextPath = routes.eventAdmin(slug) as AuthNextPath;

      await requestMagicLink(emailInput, {
        next: nextPath,
      });
      setMagicLinkState({
        message: "Check your email for the sign-in link.",
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

  const handleSignOut = async () => {
    setSignOutError(null);
    setIsSigningOut(true);

    try {
      await signOutAuth();
    } catch (error: unknown) {
      setSignOutError(
        error instanceof Error
          ? error.message
          : "We couldn't sign out right now.",
      );
    } finally {
      setIsSigningOut(false);
    }
  };

  const isSignedIn = sessionState.status === "signed_in";
  const onNavigateHome = () => onNavigate(routes.home);

  if (sessionState.status === "missing_config") {
    return (
      <EventAdminShell
        isSignedIn={false}
        isSigningOut={false}
        onNavigateHome={onNavigateHome}
        onSignOut={handleSignOut}
        signOutError={null}
        title="This event admin isn't available right now."
      >
        <div className="admin-state-stack">
          <p>{sessionState.message}</p>
        </div>
      </EventAdminShell>
    );
  }

  if (sessionState.status === "loading") {
    return (
      <EventAdminShell
        isSignedIn={false}
        isSigningOut={false}
        onNavigateHome={onNavigateHome}
        onSignOut={handleSignOut}
        signOutError={null}
        title="Loading event authoring"
      >
        <div className="admin-state-stack">
          <button className="secondary-button" disabled type="button">
            Restoring session...
          </button>
        </div>
      </EventAdminShell>
    );
  }

  if (sessionState.status === "signed_out") {
    return (
      <EventAdminShell
        isSignedIn={false}
        isSigningOut={false}
        onNavigateHome={onNavigateHome}
        onSignOut={handleSignOut}
        signOutError={null}
        title="Manage this event"
      >
        <SignInForm
          copy={EVENT_ADMIN_SIGN_IN_COPY}
          emailInput={emailInput}
          magicLinkState={magicLinkState}
          onEmailInputChange={setEmailInput}
          onSubmit={requestEventAdminMagicLink}
        />
      </EventAdminShell>
    );
  }

  return (
    <EventAdminShell
      isSignedIn={isSignedIn}
      isSigningOut={isSigningOut}
      onNavigateHome={onNavigateHome}
      onSignOut={handleSignOut}
      signOutError={signOutError}
      title="Manage this event"
    >
      <SignedInEventAdminFlow
        email={sessionState.email}
        onNavigate={onNavigate}
        sessionState={sessionState}
        slug={slug}
      />
    </EventAdminShell>
  );
}
