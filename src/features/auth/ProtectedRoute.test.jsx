import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import ProtectedRoute from "./ProtectedRoute";

const state = vi.hoisted(() => ({ current: null }));

afterEach(cleanup);

vi.mock("./AuthProvider", () => ({
  useAuth: () => state.current,
}));

function renderProtectedRoute() {
  return render(
    <MemoryRouter initialEntries={["/app"]}>
      <Routes>
        <Route path="/login" element={<div>Login screen</div>} />
        <Route path="/setup" element={<div>Setup screen</div>} />
        <Route path="/mfa" element={<div>MFA screen</div>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/app" element={<div>Private application</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("ProtectedRoute", () => {
  it("redirects a signed-out visitor to login", () => {
    state.current = { configured: true, loading: false, session: null, profile: null, needsMfa: false };
    renderProtectedRoute();
    expect(screen.getByText("Login screen")).toBeInTheDocument();
  });

  it("renders the application for a Local user verified at AAL2", () => {
    state.current = { configured: true, loading: false, session: { user: { id: "user-1" } }, profile: { role: "local" }, needsMfa: false };
    renderProtectedRoute();
    expect(screen.getByText("Private application")).toBeInTheDocument();
  });

  it("redirects an Admin without AAL2 to MFA", () => {
    state.current = { configured: true, loading: false, session: { user: { id: "admin-1" } }, profile: { role: "admin" }, needsMfa: true };
    renderProtectedRoute();
    expect(screen.getByText("MFA screen")).toBeInTheDocument();
  });

  it("redirects a Local user without AAL2 to MFA", () => {
    state.current = { configured: true, loading: false, session: { user: { id: "user-1" } }, profile: { role: "local" }, needsMfa: true };
    renderProtectedRoute();
    expect(screen.getByText("MFA screen")).toBeInTheDocument();
  });
});
