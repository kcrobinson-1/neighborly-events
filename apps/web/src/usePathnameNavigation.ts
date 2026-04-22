import { useEffect, useState } from "react";
import { normalizePathname } from "./routes";

/** Reads the browser pathname while staying safe in non-browser environments. */
function getCurrentPathname() {
  if (typeof window === "undefined") {
    return normalizePathname("/");
  }

  return normalizePathname(window.location.pathname);
}

/** Minimal pathname-based navigation hook for the single-page prototype. */
export function usePathnameNavigation() {
  const [pathname, setPathname] = useState(getCurrentPathname);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const handlePopState = () => {
      setPathname(getCurrentPathname());
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  const navigate = (path: string, options?: { replace?: boolean }) => {
    const nextPath = normalizePathname(path);

    if (typeof window === "undefined") {
      setPathname(nextPath);
      return;
    }

    const useReplace = options?.replace === true;

    if (useReplace) {
      // replaceState intentionally writes regardless of whether the pathname
      // changed — callers use { replace: true } to collapse a transport-only
      // URL (like /auth/callback?next=…) into its destination, and we want
      // the query string gone even when nextPath equals the current pathname.
      window.history.replaceState({}, "", nextPath);
      if (nextPath !== pathname) {
        setPathname(nextPath);
      }
    } else if (nextPath !== pathname) {
      window.history.pushState({}, "", nextPath);
      setPathname(nextPath);
    }

    window.scrollTo({ top: 0, behavior: "auto" });
  };

  return {
    pathname,
    navigate,
  };
}
