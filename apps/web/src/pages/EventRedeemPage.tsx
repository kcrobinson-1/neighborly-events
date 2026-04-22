import { type FormEvent, type ReactNode, useEffect, useState } from "react";
import { SignInForm, type SignInFormCopy } from "../auth/SignInForm";
import type { AuthNextPath, MagicLinkState } from "../auth/types";
import { useAuthSession } from "../auth/useAuthSession";
import { requestMagicLink } from "../lib/authApi";
import {
  authorizeRedeem,
  type RedeemAuthorizationResult,
} from "../redeem/authorizeRedeem";
import { RedeemKeypad } from "../redeem/RedeemKeypad";
import { useRedeemKeypadState } from "../redeem/useRedeemKeypadState";
import { routes } from "../routes";

type EventRedeemPageProps = {
  onNavigate: (path: string) => void;
  slug: string;
};

const REDEEM_SIGN_IN_COPY: SignInFormCopy = {
  eyebrow: "Redemption",
  emailInputId: "redeem-signin-email",
  emailLabel: "Email",
  emailPlaceholder: "agent@example.com",
  heading: "Sign in to redeem codes",
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

function RedeemShell(
  {
    title,
    eyebrow = "Redemption",
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

type RedeemAccessState =
  | { status: "idle" }
  | { email: string | null; eventCode: string; eventId: string; status: "authorized" }
  | { email: string | null; status: "role_gate" }
  | { email: string | null; message: string; status: "transient_error" };

/** Signed-out redemption sign-in gate and placeholder route shell for `/event/:slug/redeem`. */
export function EventRedeemPage({ onNavigate, slug }: EventRedeemPageProps) {
  const sessionState = useAuthSession();
  const [emailInput, setEmailInput] = useState("");
  const [magicLinkState, setMagicLinkState] = useState<MagicLinkState>({
    message: null,
    status: "idle",
  });
  const [accessState, setAccessState] = useState<RedeemAccessState>({
    status: "idle",
  });
  const [reloadToken, setReloadToken] = useState(0);
  const [resolvedAccessKey, setResolvedAccessKey] = useState("");
  const currentAccessKey =
    sessionState.status === "signed_in"
      ? `${slug}:${sessionState.email ?? ""}:${reloadToken}`
      : "";
  const keypadState = useRedeemKeypadState();
  const activeAccessState =
    sessionState.status === "signed_in"
      ? accessState
      : ({ status: "idle" } as RedeemAccessState);

  useEffect(() => {
    if (sessionState.status !== "signed_in") {
      return;
    }

    let isCancelled = false;

    void authorizeRedeem(slug)
      .then((result: RedeemAuthorizationResult) => {
        if (isCancelled) {
          return;
        }

        if (result.status === "authorized") {
          setAccessState({
            email: sessionState.email,
            eventCode: result.eventCode,
            eventId: result.eventId,
            status: "authorized",
          });
          setResolvedAccessKey(currentAccessKey);
          return;
        }

        if (result.status === "role_gate") {
          setAccessState({
            email: sessionState.email,
            status: "role_gate",
          });
          setResolvedAccessKey(currentAccessKey);
          return;
        }

        setAccessState({
          email: sessionState.email,
          message: result.message,
          status: "transient_error",
        });
        setResolvedAccessKey(currentAccessKey);
      })
      .catch((error: unknown) => {
        if (!isCancelled) {
          setAccessState({
            email: sessionState.email,
            message:
              error instanceof Error
                ? error.message
                : "We couldn't verify redeem access right now.",
            status: "transient_error",
          });
          setResolvedAccessKey(currentAccessKey);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [currentAccessKey, reloadToken, sessionState, slug]);

  useEffect(() => {
    if (activeAccessState.status !== "authorized") {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (/^\d$/.test(event.key)) {
        event.preventDefault();
        keypadState.enterDigit(event.key);
        return;
      }

      if (event.key === "Backspace") {
        event.preventDefault();
        keypadState.backspaceDigit();
        return;
      }

      if (event.key === "Enter" && keypadState.isSubmitEnabled) {
        event.preventDefault();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeAccessState.status, keypadState]);

  const requestRedeemMagicLink = async (event: FormEvent<HTMLFormElement>) => {
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
      const nextPath = routes.eventRedeem(slug) as AuthNextPath;

      await requestMagicLink(emailInput, {
        next: nextPath,
      });
      setMagicLinkState({
        message: "Check your email for the redemption sign-in link.",
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
      <RedeemShell
        onNavigateHome={() => onNavigate(routes.home)}
        title="This game isn't available right now."
      >
        <div className="signin-stack">
          <p>{sessionState.message}</p>
        </div>
      </RedeemShell>
    );
  }

  if (sessionState.status === "loading") {
    return (
      <RedeemShell
        onNavigateHome={() => onNavigate(routes.home)}
        title="Loading redeem access"
      >
        <div className="signin-stack">
          <button className="secondary-button" disabled type="button">
            Restoring session...
          </button>
        </div>
      </RedeemShell>
    );
  }

  if (sessionState.status === "signed_out") {
    return (
      <RedeemShell
        onNavigateHome={() => onNavigate(routes.home)}
        title="Redeem event codes"
      >
        <SignInForm
          copy={REDEEM_SIGN_IN_COPY}
          emailInput={emailInput}
          magicLinkState={magicLinkState}
          onEmailInputChange={setEmailInput}
          onSubmit={requestRedeemMagicLink}
        />
      </RedeemShell>
    );
  }

  if (resolvedAccessKey !== currentAccessKey || activeAccessState.status === "idle") {
    return (
      <RedeemShell
        onNavigateHome={() => onNavigate(routes.home)}
        title="Loading redeem access"
      >
        <div className="signin-stack">
          <SignedInAs email={sessionState.email} />
          <button className="secondary-button" disabled type="button">
            Checking event access...
          </button>
        </div>
      </RedeemShell>
    );
  }

  if (activeAccessState.status === "role_gate") {
    return (
      <RedeemShell
        onNavigateHome={() => onNavigate(routes.home)}
        title="Redeem event codes"
      >
        <div className="signin-stack">
          <SignedInAs email={activeAccessState.email} />
          <div className="section-heading">
            <h2>Not available for this event.</h2>
          </div>
          <p>
            Your account is not set up to redeem codes here. If you think this
            is a mistake, check with the event organizer.
          </p>
        </div>
      </RedeemShell>
    );
  }

  if (activeAccessState.status === "transient_error") {
    return (
      <RedeemShell
        onNavigateHome={() => onNavigate(routes.home)}
        title="Redeem event codes"
      >
        <div className="signin-stack">
          <SignedInAs email={activeAccessState.email} />
          <div className="section-heading">
            <h2>We couldn&apos;t verify redeem access right now.</h2>
          </div>
          <p>{activeAccessState.message}</p>
          <button
            className="primary-button"
            onClick={() => setReloadToken((value) => value + 1)}
            type="button"
          >
            Retry
          </button>
        </div>
      </RedeemShell>
    );
  }

  const authorizedAccessState = activeAccessState;

  return (
    <RedeemShell
      onNavigateHome={() => onNavigate(routes.home)}
      title="Preparing redeem access"
    >
      <div className="redeem-layout">
        <div className="redeem-card-stack">
          <SignedInAs email={authorizedAccessState.email} />
          <span className="redeem-event-badge">{authorizedAccessState.eventCode}</span>
          <div className="redeem-status-card">
            <p className="redeem-code-preview-label">Enter the 4-digit code suffix.</p>
            <p
              aria-label="Code preview"
              className="redeem-code-preview"
            >
              <span className="redeem-code-preview-prefix">
                {authorizedAccessState.eventCode}
              </span>
              <strong className="redeem-code-preview-suffix">
                {keypadState.displayCodeSuffix}
              </strong>
            </p>
            <h2>Enter a 4-digit code</h2>
            <p>The keypad stays on-screen so the next attendee is fast to process.</p>
          </div>
        </div>
        <RedeemKeypad
          isSubmitEnabled={keypadState.isSubmitEnabled}
          onBackspace={keypadState.backspaceDigit}
          onClear={keypadState.clearDigits}
          onDigit={keypadState.enterDigit}
          onSubmit={() => {}}
        />
        <p className="sr-only">Resolved event {authorizedAccessState.eventId}</p>
      </div>
    </RedeemShell>
  );
}
