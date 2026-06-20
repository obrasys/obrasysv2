/**
 * Verifies AuthContext invokes the accept_my_pending_invitations RPC
 * exactly once when the user signs in (so pending invitations move to
 * "Accepted" the moment the invited user actually authenticates).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, waitFor } from "@testing-library/react";

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

describe("AuthContext sign-in side effects", () => {
  beforeEach(() => {
    rpcMock.mockClear();
    captured.cb = undefined;
  });

  it("calls accept_my_pending_invitations once when a user signs in", async () => {
    render(
      React.createElement(AuthProvider, null, React.createElement("div", null, "child")),
    );

    expect(typeof captured.cb).toBe("function");

    captured.cb!("SIGNED_IN", {
      user: { id: "user-test-1", email: "invited@example.com" },
    });

    await waitFor(() => {
      const calls = rpcMock.mock.calls.filter(
        (c) => c[0] === "accept_my_pending_invitations",
      );
      expect(calls.length).toBe(1);
    });
  });

  it("does not call the RPC when there is no user", async () => {
    render(
      React.createElement(AuthProvider, null, React.createElement("div", null, "child")),
    );

    captured.cb!("SIGNED_OUT", null);

    // give the deferred setTimeout(0) a chance to run
    await new Promise((r) => setTimeout(r, 10));

    const calls = rpcMock.mock.calls.filter(
      (c) => c[0] === "accept_my_pending_invitations",
    );
    expect(calls.length).toBe(0);
  });
});
