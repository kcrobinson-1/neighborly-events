import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

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
