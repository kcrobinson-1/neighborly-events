import React from "react";
import ReactDOM from "react-dom/client";
// Side-effect import: registers apps/web's `shared/auth/` providers
// (configureSharedAuth) once at startup, before any component that
// consumes a shared/auth symbol mounts. See ./lib/setupAuth.ts.
import "./lib/setupAuth";
// Side-effect import: registers apps/web's `shared/events/` providers
// (configureSharedEvents) once at startup, before any shared event API
// is consumed. See ./lib/setupEvents.ts.
import "./lib/setupEvents";
import App from "./App";
import "./styles.scss";

/** Root DOM node that hosts the React application. */
const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Missing root element for Neighborly web app.");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
