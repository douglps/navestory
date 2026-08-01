import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/layout/header", () => ({
  Header: () => <header data-testid="header" />,
}));
vi.mock("@/components/layout/sidebar", () => ({
  Sidebar: () => <nav data-testid="sidebar" />,
}));
vi.mock("@/components/layout/financial-subheader", () => ({
  FinancialSubheader: () => <div data-testid="financial-subheader" />,
}));
vi.mock("@/components/layout/vehicle-activator", () => ({
  VehicleActivator: () => null,
}));
vi.mock("@/components/layout/timezone-detector", () => ({
  TimezoneDetector: () => null,
}));
vi.mock("@/components/layout/fleet-aside", () => ({
  FleetAside: () => null,
}));
vi.mock("@/components/pwa/install-prompt-banner", () => ({
  InstallPromptBanner: () => null,
}));
vi.mock("@/components/pwa/ios-install-banner", () => ({
  IosInstallBanner: () => null,
}));

import AppLayout from "./layout";

describe("AppLayout", () => {
  it("renderiza o header fixo", () => {
    render(<AppLayout><div>conteúdo</div></AppLayout>);

    expect(screen.getByTestId("header")).toBeInTheDocument();
  });

  it("renderiza a sidebar", () => {
    render(<AppLayout><div>conteúdo</div></AppLayout>);

    expect(screen.getByTestId("sidebar")).toBeInTheDocument();
  });

  it("renderiza o conteúdo filho passado", () => {
    render(<AppLayout><div data-testid="page-content">conteúdo</div></AppLayout>);

    expect(screen.getByTestId("page-content")).toBeInTheDocument();
  });

  it("SPEC-20260722-004 RF-03: inclui o FinancialSubheader no layout", () => {
    render(<AppLayout><div>página</div></AppLayout>);

    expect(screen.getByTestId("financial-subheader")).toBeInTheDocument();
  });
});
