import { render } from "@testing-library/react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useUIStore } from "@/lib/stores/ui-store";

vi.mock("@serwist/turbopack/react", () => ({
  useSerwist: vi.fn(),
}));

import { useSerwist } from "@serwist/turbopack/react";
import { ServiceWorkerUpdateListener } from "./service-worker-update-listener";

beforeEach(() => {
  useUIStore.setState({ toasts: [] });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("ServiceWorkerUpdateListener", () => {
  it("não renderiza nenhum elemento visual", () => {
    vi.mocked(useSerwist).mockReturnValue({ serwist: null } as ReturnType<typeof useSerwist>);

    const { container } = render(<ServiceWorkerUpdateListener />);

    expect(container).toBeEmptyDOMElement();
  });

  it("não adiciona listener quando serwist é null", () => {
    vi.mocked(useSerwist).mockReturnValue({ serwist: null } as ReturnType<typeof useSerwist>);

    expect(() => render(<ServiceWorkerUpdateListener />)).not.toThrow();
  });

  it("adiciona listener 'waiting' quando serwist está disponível", () => {
    const addEventListenerMock = vi.fn();
    const serwist = {
      addEventListener: addEventListenerMock,
      removeEventListener: vi.fn(),
      messageSkipWaiting: vi.fn(),
    };
    vi.mocked(useSerwist).mockReturnValue({ serwist } as unknown as ReturnType<typeof useSerwist>);

    render(<ServiceWorkerUpdateListener />);

    expect(addEventListenerMock).toHaveBeenCalledWith("waiting", expect.any(Function));
  });

  it("remove listener 'waiting' ao desmontar", () => {
    const removeEventListenerMock = vi.fn();
    const serwist = {
      addEventListener: vi.fn(),
      removeEventListener: removeEventListenerMock,
      messageSkipWaiting: vi.fn(),
    };
    vi.mocked(useSerwist).mockReturnValue({ serwist } as unknown as ReturnType<typeof useSerwist>);

    const { unmount } = render(<ServiceWorkerUpdateListener />);
    unmount();

    expect(removeEventListenerMock).toHaveBeenCalledWith("waiting", expect.any(Function));
  });

  it("SPEC-20260525-001 §8.2: empurra toast de 'Nova versão disponível' ao receber evento 'waiting'", () => {
    const listeners: Record<string, ((...args: unknown[]) => void)[]> = {};
    const serwist = {
      addEventListener: vi.fn((event: string, fn: (...args: unknown[]) => void) => {
        listeners[event] = [...(listeners[event] ?? []), fn];
      }),
      removeEventListener: vi.fn(),
      messageSkipWaiting: vi.fn(),
    };
    vi.mocked(useSerwist).mockReturnValue({ serwist } as unknown as ReturnType<typeof useSerwist>);

    render(<ServiceWorkerUpdateListener />);

    act(() => {
      listeners["waiting"]?.[0]?.();
    });

    const toasts = useUIStore.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0]?.title).toBe("Nova versão disponível.");
    expect(toasts[0]?.duration).toBe(0);
    expect(toasts[0]?.action?.label).toBe("Recarregar");
  });

  it("ação 'Recarregar' chama messageSkipWaiting", () => {
    const skipWaitingMock = vi.fn();
    const listeners: Record<string, ((...args: unknown[]) => void)[]> = {};
    const serwist = {
      addEventListener: vi.fn((event: string, fn: (...args: unknown[]) => void) => {
        listeners[event] = [...(listeners[event] ?? []), fn];
      }),
      removeEventListener: vi.fn(),
      messageSkipWaiting: skipWaitingMock,
    };
    vi.mocked(useSerwist).mockReturnValue({ serwist } as unknown as ReturnType<typeof useSerwist>);

    render(<ServiceWorkerUpdateListener />);

    act(() => {
      listeners["waiting"]?.[0]?.();
    });

    const toast = useUIStore.getState().toasts[0];
    act(() => {
      toast?.action?.onClick();
    });

    expect(skipWaitingMock).toHaveBeenCalledTimes(1);
  });
});
