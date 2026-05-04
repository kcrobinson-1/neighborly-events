import { Component, type ReactNode } from "react";
import { RouteStateShell } from "./RouteStateShell";

type LazyRouteErrorBoundaryProps = {
  body: string;
  children: ReactNode;
  chip: string;
  onNavigateHome: () => void;
  title: string;
};

type LazyRouteErrorBoundaryState = { hasError: boolean };

/**
 * Catches throws from `React.lazy()` chunk-fetch failures so a transient
 * network drop or a stale-HTML-after-deploy hashed-asset 404 surfaces a
 * retryable shell instead of a blank route. The reload button refetches the
 * HTML (and therefore the current asset hashes) which fixes the
 * stale-HTML case deterministically; transient network failures recover
 * on the next reload too.
 */
export class LazyRouteErrorBoundary
  extends Component<LazyRouteErrorBoundaryProps, LazyRouteErrorBoundaryState>
{
  state: LazyRouteErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): LazyRouteErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <RouteStateShell
        actions={
          <button
            className="primary-button"
            onClick={() => window.location.reload()}
            type="button"
          >
            Reload to retry
          </button>
        }
        body={this.props.body}
        chip={this.props.chip}
        onNavigateHome={this.props.onNavigateHome}
        title={this.props.title}
      />
    );
  }
}
