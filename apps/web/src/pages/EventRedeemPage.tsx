import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useEffectEvent,
  useState,
} from "react";
import { SignInForm, type SignInFormCopy } from "../auth/SignInForm";
import type { MagicLinkState } from "../auth/types";
import { useAuthSession } from "../auth/useAuthSession";
import { requestMagicLink } from "../lib/authApi";
import {
  authorizeRedeem,
  type RedeemAuthorizationResult,
} from "../redeem/authorizeRedeem";
import { RedeemKeypad } from "../redeem/RedeemKeypad";
import { RedeemResultCard } from "../redeem/RedeemResultCard";
import { useRedeemSubmit } from "../redeem/useRedeemSubmit";
import { useRedeemKeypadState } from "../redeem/useRedeemKeypadState";
import { routes, type AuthNextPath } from "../../../../shared/urls";

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
  | { eventCode: string; eventId: string; status: "authorized" }
  | { status: "role_gate" }
  | { message: string; status: "transient_error" };

type SignedInRedeemFlowProps = {
  email: string | null;
  onNavigate: (path: string) => void;
  slug: string;
};

/**
 * Signed-in redemption experience for `/event/:slug/redeem`.
 *
 * Rendered only while `sessionState.status === "signed_in"`, so signing out
 * unmounts this component and discards its authorization cache. A fresh
 * sign-in mounts a new instance, which guarantees a new `authorizeRedeem`
 * probe runs before any keypad input is accepted — even when the returning
 * session has the same email on the same slug.
 */
function SignedInRedeemFlow({
  email,
  onNavigate,
  slug,
}: SignedInRedeemFlowProps) {
  const [accessState, setAccessState] = useState<RedeemAccessState>({
    status: "idle",
  });
  const [reloadToken, setReloadToken] = useState(0);
  const [resolvedAccessKey, setResolvedAccessKey] = useState("");
  const currentAccessKey = `${slug}:${email ?? ""}:${reloadToken}`;
  const redeemSubmit = useRedeemSubmit(
    accessState.status === "authorized" ? accessState.eventId : null,
  );
  const keypadState = useRedeemKeypadState({
    onStartEntry: () => {
      redeemSubmit.resetResult();
    },
  });

  useEffect(() => {
    let isCancelled = false;

    void authorizeRedeem(slug)
      .then((result: RedeemAuthorizationResult) => {
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

  const handleSubmit = async () => {
    if (!keypadState.isSubmitEnabled || redeemSubmit.isSubmitting) {
      return;
    }

    const submissionResult = await redeemSubmit.submitCode(keypadState.codeSuffix);

    if (submissionResult.status === "success") {
      keypadState.reset();
    }
  };

  const handleRetryLastSubmission = async () => {
    const submissionResult = await redeemSubmit.retryLastSubmission();

    if (submissionResult?.status === "success") {
      keypadState.reset();
    }
  };

  const isKeypadVisible =
    accessState.status === "authorized" && resolvedAccessKey === currentAccessKey;

  const handleAuthorizedKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (redeemSubmit.isSubmitting) {
      return;
    }

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
      void handleSubmit();
    }
  });

  useEffect(() => {
    if (!isKeypadVisible) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      handleAuthorizedKeyDown(event);
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isKeypadVisible]);

  if (resolvedAccessKey !== currentAccessKey || accessState.status === "idle") {
    return (
      <RedeemShell
        onNavigateHome={() => onNavigate(routes.home)}
        title="Loading redeem access"
      >
        <div className="signin-stack">
          <SignedInAs email={email} />
          <button className="secondary-button" disabled type="button">
            Checking event access...
          </button>
        </div>
      </RedeemShell>
    );
  }

  if (accessState.status === "role_gate") {
    return (
      <RedeemShell
        onNavigateHome={() => onNavigate(routes.home)}
        title="Redeem event codes"
      >
        <div className="signin-stack">
          <SignedInAs email={email} />
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

  if (accessState.status === "transient_error") {
    return (
      <RedeemShell
        onNavigateHome={() => onNavigate(routes.home)}
        title="Redeem event codes"
      >
        <div className="signin-stack">
          <SignedInAs email={email} />
          <div className="section-heading">
            <h2>We couldn&apos;t verify redeem access right now.</h2>
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
      </RedeemShell>
    );
  }

  const authorizedAccessState = accessState;

  return (
    <RedeemShell
      onNavigateHome={() => onNavigate(routes.home)}
      title="Redeem event codes"
    >
      <div className="redeem-layout">
        <div className="redeem-card-stack">
          <SignedInAs email={email} />
          <span className="redeem-event-badge">{authorizedAccessState.eventCode}</span>
          <div className="redeem-status-card">
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
          </div>
          <RedeemResultCard
            isSubmitting={redeemSubmit.isSubmitting}
            onClear={() => {
              keypadState.clearDigits();
              redeemSubmit.resetResult();
            }}
            onRedeemNextCode={() => {
              keypadState.reset();
              redeemSubmit.resetResult();
            }}
            onRetry={() => {
              void handleRetryLastSubmission();
            }}
            state={redeemSubmit.resultState}
          />
        </div>
        <RedeemKeypad
          isSubmitEnabled={keypadState.isSubmitEnabled}
          isSubmitting={redeemSubmit.isSubmitting}
          onBackspace={keypadState.backspaceDigit}
          onClear={keypadState.clearDigits}
          onDigit={keypadState.enterDigit}
          onSubmit={() => {
            void handleSubmit();
          }}
        />
        <p className="sr-only">Resolved event {authorizedAccessState.eventId}</p>
      </div>
    </RedeemShell>
  );
}

/** Event-scoped redemption route shell that gates `/event/:slug/redeem` on sign-in. */
export function EventRedeemPage({ onNavigate, slug }: EventRedeemPageProps) {
  const sessionState = useAuthSession();
  const [emailInput, setEmailInput] = useState("");
  const [magicLinkState, setMagicLinkState] = useState<MagicLinkState>({
    message: null,
    status: "idle",
  });

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

  return (
    <SignedInRedeemFlow
      email={sessionState.email}
      onNavigate={onNavigate}
      slug={slug}
    />
  );
}
