"use client";

import type { ReactNode } from "react";

import "../lib/setupAuth";

type SharedClientBootstrapProps = {
  children: ReactNode;
};

/** Registers shared client providers for apps/site route groups. */
export function SharedClientBootstrap({
  children,
}: SharedClientBootstrapProps) {
  return children;
}
