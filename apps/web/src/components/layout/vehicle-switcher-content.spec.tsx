/**
 * @spec SPEC-20260603-001 RF-07, RF-09, RF-11, RF-14, RF-18, RF-19, RNF-05
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/context/use-vehicle-context", () => ({
  useVehicleContext: vi.fn(),
  VEHICLE_TYPE_ICONS: {},
}));

vi.mock("@/lib/hooks/use-online-status", () => ({
  useOnlineStatus: vi.fn().mockReturnValue(true),
}));

import { useVehicleContext } from "@/lib/context/use-vehicle-context";
import { useOnlineStatus } from "@/lib/hooks/use-online-status";
import { VehicleSwitcherContent } from "./vehicle-switcher-content";

function makeContext(overrides = {}) {
  return {
    vehicles: [],
    groups: [],
    setActiveVehicle: vi.fn(),
    setActiveGroup: vi.fn(),
    vehiclesQuery: {
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    },
    groupsQuery: {
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    },
    ...overrides,
  };
}

beforeEach(() => {
  vi.mocked(useOnlineStatus).mockReturnValue(true);
  vi.mocked(useVehicleContext).mockReturnValue(makeContext() as unknown as ReturnType<typeof useVehicleContext>);
});

describe("VehicleSwitcherContent", () => {
  it("SPEC-20260603-001 RF-07: exibe campo de busca", () => {
    render(
      <VehicleSwitcherContent onClose={vi.fn()} /> as ReactNode,
    );

    expect(screen.getByRole("textbox", { name: "Buscar veículo ou grupo" })).toBeInTheDocument();
  });

  it("SPEC-20260603-001 RF-11: exibe Skeleton durante carregamento", () => {
    vi.mocked(useVehicleContext).mockReturnValue(
      makeContext({
        vehiclesQuery: { isLoading: true, isError: false, refetch: vi.fn() },
        groupsQuery: { isLoading: false, isError: false, refetch: vi.fn() },
      }) as unknown as ReturnType<typeof useVehicleContext>,
    );

    const { container } = render(
      <VehicleSwitcherContent onClose={vi.fn()} /> as ReactNode,
    );

    // O componente exibe 3 Skeletons durante o carregamento
    const skeletons = container.querySelectorAll("[aria-hidden]");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("SPEC-20260603-001 RF-09: exibe alerta de erro quando a query falha", () => {
    vi.mocked(useVehicleContext).mockReturnValue(
      makeContext({
        vehiclesQuery: { isLoading: false, isError: true, refetch: vi.fn() },
        groupsQuery: { isLoading: false, isError: false, refetch: vi.fn() },
      }) as unknown as ReturnType<typeof useVehicleContext>,
    );

    render(
      <VehicleSwitcherContent onClose={vi.fn()} /> as ReactNode,
    );

    expect(screen.getByText(/Não foi possível carregar veículos e grupos/)).toBeInTheDocument();
  });

  it("exibe lista de veículos quando carregados", () => {
    vi.mocked(useVehicleContext).mockReturnValue(
      makeContext({
        vehicles: [
          { id: "v1", plate: "ABC-1234", make: "Honda", model: "Civic", vehicle_type: "car" },
        ],
      }) as unknown as ReturnType<typeof useVehicleContext>,
    );

    render(
      <VehicleSwitcherContent onClose={vi.fn()} /> as ReactNode,
    );

    expect(screen.getByText(/ABC-1234/)).toBeInTheDocument();
  });

  it("SPEC-20260603-001 RF-19: clicar em veículo chama setActiveVehicle e onClose", async () => {
    const user = userEvent.setup();
    const setActiveVehicle = vi.fn();
    const onClose = vi.fn();

    vi.mocked(useVehicleContext).mockReturnValue(
      makeContext({
        vehicles: [
          { id: "v1", plate: "ABC-1234", make: "Honda", model: "Civic", vehicle_type: "car" },
        ],
        setActiveVehicle,
      }) as unknown as ReturnType<typeof useVehicleContext>,
    );

    render(
      <VehicleSwitcherContent onClose={onClose} /> as ReactNode,
    );

    await user.click(screen.getByText(/ABC-1234/));

    expect(setActiveVehicle).toHaveBeenCalledWith("v1");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("exibe lista de grupos quando carregados", () => {
    vi.mocked(useVehicleContext).mockReturnValue(
      makeContext({
        groups: [{ id: "g1", name: "Frota Sul", member_count: 3 }],
      }) as unknown as ReturnType<typeof useVehicleContext>,
    );

    render(
      <VehicleSwitcherContent onClose={vi.fn()} /> as ReactNode,
    );

    expect(screen.getByText(/Frota Sul/)).toBeInTheDocument();
    expect(screen.getByText(/3 membros/)).toBeInTheDocument();
  });

  it("SPEC-20260603-001 RF-18: clicar em grupo chama setActiveGroup e onClose", async () => {
    const user = userEvent.setup();
    const setActiveGroup = vi.fn();
    const onClose = vi.fn();

    vi.mocked(useVehicleContext).mockReturnValue(
      makeContext({
        groups: [{ id: "g1", name: "Frota Sul", member_count: 3 }],
        setActiveGroup,
      }) as unknown as ReturnType<typeof useVehicleContext>,
    );

    render(
      <VehicleSwitcherContent onClose={onClose} /> as ReactNode,
    );

    await user.click(screen.getByText(/Frota Sul/));

    expect(setActiveGroup).toHaveBeenCalledWith("g1");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("SPEC-20260603-001 RNF-05: filtra veículos pela busca (sem diacríticos, sem hífen)", async () => {
    const user = userEvent.setup();

    vi.mocked(useVehicleContext).mockReturnValue(
      makeContext({
        vehicles: [
          { id: "v1", plate: "ABC-1234", make: "Honda", model: "Civic", vehicle_type: "car" },
          { id: "v2", plate: "XYZ-5678", make: "Toyota", model: "Corolla", vehicle_type: "car" },
        ],
      }) as unknown as ReturnType<typeof useVehicleContext>,
    );

    render(
      <VehicleSwitcherContent onClose={vi.fn()} /> as ReactNode,
    );

    const input = screen.getByRole("textbox", { name: "Buscar veículo ou grupo" });
    await user.type(input, "civic");

    await waitFor(() => {
      expect(screen.getByText(/ABC-1234/)).toBeInTheDocument();
      expect(screen.queryByText(/XYZ-5678/)).not.toBeInTheDocument();
    });
  });

  it("SPEC-20260603-001 RNF-05: busca por placa sem hífen encontra veículo", async () => {
    const user = userEvent.setup();

    vi.mocked(useVehicleContext).mockReturnValue(
      makeContext({
        vehicles: [
          { id: "v1", plate: "ABC-1234", make: "Honda", model: "Civic", vehicle_type: "car" },
        ],
      }) as unknown as ReturnType<typeof useVehicleContext>,
    );

    render(
      <VehicleSwitcherContent onClose={vi.fn()} /> as ReactNode,
    );

    const input = screen.getByRole("textbox", { name: "Buscar veículo ou grupo" });
    await user.type(input, "abc1234");

    await waitFor(() => {
      expect(screen.getByText(/ABC-1234/)).toBeInTheDocument();
    });
  });

  it("exibe 'Nenhum veículo encontrado' quando filtro não encontra nenhum", async () => {
    const user = userEvent.setup();

    vi.mocked(useVehicleContext).mockReturnValue(
      makeContext({
        vehicles: [
          { id: "v1", plate: "ABC-1234", make: "Honda", model: "Civic", vehicle_type: "car" },
        ],
      }) as unknown as ReturnType<typeof useVehicleContext>,
    );

    render(
      <VehicleSwitcherContent onClose={vi.fn()} /> as ReactNode,
    );

    const input = screen.getByRole("textbox", { name: "Buscar veículo ou grupo" });
    await user.type(input, "zzznaoexiste");

    await waitFor(() => {
      expect(screen.getByText("Nenhum veículo encontrado")).toBeInTheDocument();
    });
  });

  it("exibe 'Nenhum grupo encontrado' quando filtro não encontra nenhum grupo", async () => {
    const user = userEvent.setup();

    vi.mocked(useVehicleContext).mockReturnValue(
      makeContext({
        groups: [{ id: "g1", name: "Frota Sul", member_count: 3 }],
      }) as unknown as ReturnType<typeof useVehicleContext>,
    );

    render(
      <VehicleSwitcherContent onClose={vi.fn()} /> as ReactNode,
    );

    const input = screen.getByRole("textbox", { name: "Buscar veículo ou grupo" });
    await user.type(input, "zzznaoexiste");

    await waitFor(() => {
      expect(screen.getByText("Nenhum grupo encontrado")).toBeInTheDocument();
    });
  });

  it("exibe aviso de offline quando isOnline é false", () => {
    vi.mocked(useOnlineStatus).mockReturnValue(false);

    render(
      <VehicleSwitcherContent onClose={vi.fn()} /> as ReactNode,
    );

    expect(screen.getByText(/Sem conexão/)).toBeInTheDocument();
  });
});
