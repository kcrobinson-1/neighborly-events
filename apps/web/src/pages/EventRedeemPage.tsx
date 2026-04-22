import { type FormEvent, useState } from "react";
import { SignInForm, type SignInFormCopy } from "../auth/SignInForm";
import type { AuthNextPath, MagicLinkState } from "../auth/types";
import { useAuthSession } from "../auth/useAuthSession";
import { requestMagicLink } from "../lib/authApi";
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
    children: React.ReactNode;
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

/** Signed-out redemption sign-in gate and placeholder route shell for `/event/:slug/redeem`. */
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
    <RedeemShell
      onNavigateHome={() => onNavigate(routes.home)}
      title="Preparing redeem access"
    >
      <div className="signin-stack">
        <SignedInAs email={sessionState.email} />
        <button className="secondary-button" disabled type="button">
          Loading redemption tools...
        </button>
      </div>
    </RedeemShell>
  );
}
