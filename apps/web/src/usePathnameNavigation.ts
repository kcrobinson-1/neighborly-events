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

  const navigate = (path: string) => {
    const nextPath = normalizePathname(path);

    if (typeof window === "undefined") {
      setPathname(nextPath);
      return;
    }

    if (nextPath !== pathname) {
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
