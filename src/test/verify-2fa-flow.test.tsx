import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

const TRUSTED_DEVICE_KEY = "obrasys_trusted_device";

// --- Mocks --------------------------------------------------------------

const invokeMock = vi.fn();
const navigateMock = vi.fn();
const setMfaVerifiedMock = vi.fn();
const signOutMock = vi.fn().mockResolvedValue(undefined);
const toastMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: (...args: unknown[]) => invokeMock(...args) } },
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom",
  );
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "u1", email: "test@obrasys.pt" },
    signOut: signOutMock,
    setMfaVerified: setMfaVerifiedMock,
  }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock("@/assets/logo.png", () => ({ default: "logo.png" }));
vi.mock("@/components/SEO", () => ({ SEO: () => null }));

// userEvent is unreliable against the InputOTP hidden-input + slot rendering
// in jsdom. Replace it with a controlled <input> in tests so we can simulate
// typing the 6 digits deterministically.
vi.mock("@/components/ui/input-otp", () => {
  const React = require("react") as typeof import("react");
  return {
    InputOTP: ({ value, onChange, maxLength, disabled }: any) =>
      React.createElement("input", {
        "data-testid": "otp-input",
        value,
        maxLength,
        disabled,
        onChange: (e: any) => onChange(e.target.value),
      }),
    InputOTPGroup: ({ children }: any) => React.createElement("div", null, children),
    InputOTPSlot: () => null,
  };
});

// --- Import after mocks --------------------------------------------------

import Verify2FA from "@/pages/Verify2FA";

const renderPage = () =>
  render(
    <MemoryRouter>
      <Verify2FA />
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.useFakeTimers();
  invokeMock.mockReset();
  navigateMock.mockReset();
  setMfaVerifiedMock.mockReset();
  toastMock.mockReset();
  localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

const flush = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

describe("Verify2FA E2E flow", () => {
  it("uses trusted-device fast-path when stored token is still valid", async () => {
    localStorage.setItem(TRUSTED_DEVICE_KEY, "valid-token");
    invokeMock.mockResolvedValueOnce({ data: { verified: true }, error: null });

    renderPage();
    await flush();

    expect(invokeMock).toHaveBeenCalledWith("verify-2fa-code", {
      body: { deviceToken: "valid-token" },
    });
    expect(setMfaVerifiedMock).toHaveBeenCalledWith(true);
    expect(navigateMock).toHaveBeenCalledWith("/dashboard", { replace: true });
  });

  it("falls back to sending OTP when trusted-device token is expired/invalid", async () => {
    localStorage.setItem(TRUSTED_DEVICE_KEY, "expired-token");
    // First call: trusted-device check returns verified:false (no 401)
    invokeMock.mockResolvedValueOnce({
      data: { verified: false, trustedDevice: false },
      error: null,
    });
    // Second call: send-2fa-code success
    invokeMock.mockResolvedValueOnce({
      data: { success: true, expires_in: 300 },
      error: null,
    });

    renderPage();
    await flush();
    await flush();

    expect(invokeMock).toHaveBeenNthCalledWith(1, "verify-2fa-code", {
      body: { deviceToken: "expired-token" },
    });
    expect(invokeMock).toHaveBeenNthCalledWith(2, "send-2fa-code");
    expect(localStorage.getItem(TRUSTED_DEVICE_KEY)).toBeNull();
    expect(setMfaVerifiedMock).not.toHaveBeenCalled();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("sends OTP on mount when there is no trusted-device token", async () => {
    invokeMock.mockResolvedValueOnce({ data: { success: true }, error: null });

    renderPage();
    await flush();

    expect(invokeMock).toHaveBeenCalledTimes(1);
    expect(invokeMock).toHaveBeenCalledWith("send-2fa-code");
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Código enviado" }),
    );
  });

  it("rejects invalid OTP code and keeps user on the page", async () => {
    invokeMock.mockResolvedValueOnce({ data: { success: true }, error: null }); // send
    invokeMock.mockResolvedValueOnce({
      data: { error: "Código incorreto", attempts_left: 4 },
      error: null,
    }); // verify

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderPage();
    await flush();

    const otp = screen.getByTestId("otp-input") as HTMLInputElement;
    await act(async () => {
      await user.type(otp, "000000");
    });

    const btn = screen.getByRole("button", { name: /verificar e entrar/i });
    await act(async () => {
      await user.click(btn);
    });
    await flush();

    expect(invokeMock).toHaveBeenLastCalledWith(
      "verify-2fa-code",
      expect.objectContaining({ body: expect.objectContaining({ code: "000000" }) }),
    );
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: "destructive",
        title: "Código inválido",
        description: "Código incorreto",
      }),
    );
    expect(setMfaVerifiedMock).not.toHaveBeenCalled();
    expect(navigateMock).not.toHaveBeenCalled();
    expect(otp.value).toBe(""); // reset after failure
  });

  it("verifies valid OTP, stores trusted-device token, and navigates to dashboard", async () => {
    invokeMock.mockResolvedValueOnce({ data: { success: true }, error: null }); // send
    invokeMock.mockResolvedValueOnce({
      data: { verified: true, deviceToken: "new-device-token" },
      error: null,
    }); // verify

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderPage();
    await flush();

    const otp = screen.getByTestId("otp-input") as HTMLInputElement;
    await act(async () => {
      await user.type(otp, "123456");
      await user.click(screen.getByLabelText(/confiar neste dispositivo/i));
    });

    await act(async () => {
      await user.click(screen.getByRole("button", { name: /verificar e entrar/i }));
    });
    await flush();

    expect(invokeMock).toHaveBeenLastCalledWith(
      "verify-2fa-code",
      expect.objectContaining({
        body: expect.objectContaining({ code: "123456", trustDevice: true }),
      }),
    );
    expect(localStorage.getItem(TRUSTED_DEVICE_KEY)).toBe("new-device-token");
    expect(setMfaVerifiedMock).toHaveBeenCalledWith(true);
    expect(navigateMock).toHaveBeenCalledWith("/dashboard", { replace: true });
  });

  it("signs the user out and redirects to /auth", async () => {
    invokeMock.mockResolvedValueOnce({ data: { success: true }, error: null });

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderPage();
    await flush();

    await act(async () => {
      await user.click(screen.getByRole("button", { name: /sair/i }));
    });
    await flush();

    expect(signOutMock).toHaveBeenCalled();
    expect(navigateMock).toHaveBeenCalledWith("/auth", { replace: true });
  });
});
