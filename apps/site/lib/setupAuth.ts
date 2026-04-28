import { configureSharedAuth } from "../../../shared/auth";
import {
  getBrowserSupabaseClient,
  getMissingSupabaseConfigMessage,
  getSupabaseConfig,
} from "./supabaseBrowser";

/**
 * apps/site's per-app `shared/auth/` setup. Imported for side-effect by
 * SharedClientBootstrap before any shared auth consumer renders.
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
