import type { ReactNode } from "react";

// Layout sem sidebar para a página de impressão
export default function ImprimirLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
