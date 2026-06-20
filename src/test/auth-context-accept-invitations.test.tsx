/**
 * Verifies AuthContext invokes the accept_my_pending_invitations RPC
 * exactly once when the user signs in (so pending invitations move to
 * "Accepted" the moment the invited user actually authenticates).
 *
 * Uses react-dom/client directly to avoid pulling in @testing-library/dom.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";

type AuthCallback = (event: string, session: any) => void;

const captured: { cb?: AuthCallback } = {};
const rpcMock = vi.fn().mockResolvedValue({ data: 0, error: null });
const fromMock = vi.fn(() => ({
  select: () => ({
    eq: () => ({
      maybeSingle: async () => ({ data: null, error: null }),
    }),
    in: async () => ({ data: [], error: null }),
  }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      onAuthStateChange: (cb: AuthCallback) => {
        captured.cb = cb;
        return { data: { subscription: { unsubscribe: () => {} } } };
      },
      getSession: async () => ({ data: { session: null } }),
    },
    rpc: rpcMock,
    from: fromMock,
  },
}));

import { AuthProvider } from "@/contexts/AuthContext";

async function mountAuthProvider(): Promise<{ root: Root; container: HTMLDivElement }> {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(
      React.createElement(AuthProvider, null, React.createElement("div", null, "child")),
    );
  });
  return { root, container };
}

async function flushTimers(ms = 30) {
  await act(async () => {
    await new Promise((r) => setTimeout(r, ms));
  });
}

describe("AuthContext sign-in side effects", () => {
  beforeEach(() => {
    rpcMock.mockClear();
    captured.cb = undefined;
  });

  it("calls accept_my_pending_invitations once when a user signs in", async () => {
    const { root, container } = await mountAuthProvider();
    try {
      expect(typeof captured.cb).toBe("function");

      await act(async () => {
        captured.cb!("SIGNED_IN", {
          user: { id: "user-test-1", email: "invited@example.com" },
        });
      });
      await flushTimers();

      const calls = rpcMock.mock.calls.filter(
        (c) => c[0] === "accept_my_pending_invitations",
      );
      expect(calls.length).toBe(1);
    } finally {
      await act(async () => {
        root.unmount();
      });
      container.remove();
    }
  });

  it("does not call the RPC when there is no user", async () => {
    const { root, container } = await mountAuthProvider();
    try {
      await act(async () => {
        captured.cb!("SIGNED_OUT", null);
      });
      await flushTimers();

      const calls = rpcMock.mock.calls.filter(
        (c) => c[0] === "accept_my_pending_invitations",
      );
      expect(calls.length).toBe(0);
    } finally {
      await act(async () => {
        root.unmount();
      });
      container.remove();
    }
  });
});
