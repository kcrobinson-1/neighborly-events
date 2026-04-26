import { configureSharedAuth } from "../../../../shared/auth";
import {
  getBrowserSupabaseClient,
  getMissingSupabaseConfigMessage,
  getSupabaseConfig,
} from "./supabaseBrowser";

/**
 * apps/web's per-app `shared/auth/` setup. Imported for side-effect by
 * `apps/web/src/main.tsx` exactly once at startup, before any
 * `shared/auth/` symbol is consumed. Every authenticated apps/web
 * surface relies on these providers being registered before its
 * components mount.
 *
 * Tests do not import this module: every component test that exercises
 * an apps/web auth surface mocks the relevant `shared/auth/` symbol
 * directly, and the real-shared/auth tests in `tests/shared/auth/`
 * call `configureSharedAuth` explicitly with mock providers.
 */

configureSharedAuth({
  getClient: getBrowserSupabaseClient,
  getConfigStatus: () => {
    const config = getSupabaseConfig();
    if (config.enabled) {
      return { enabled: true };
    }
    return {
      enabled: false,
      message: getMissingSupabaseConfigMessage(),
    };
  },
});
