import type { ReactNode } from "react";

import { SharedClientBootstrap } from "../../components/SharedClientBootstrap";

export default function AuthenticatedLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return <SharedClientBootstrap>{children}</SharedClientBootstrap>;
}
