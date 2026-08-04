import {cleanup, fireEvent, render, screen, waitFor} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import SettingsPage from "./SettingsPage";

const updateDisplayName = vi.fn();

vi.mock("../../auth/AuthProvider", () => ({
  useAuth: () => ({profile: {display_name: "Carlos"}, updateDisplayName}),
}));

describe("SettingsPage profile name", () => {
  afterEach(cleanup);

  beforeEach(() => {
    updateDisplayName.mockReset();
    updateDisplayName.mockResolvedValue({data: "Aidan Williams", error: null});
  });

  it("saves a normalized display name for the active user", async () => {
    render(<SettingsPage theme="light" onThemeChange={vi.fn()}/>);

    fireEvent.change(screen.getByLabelText("Nombre visible"), {target: {value: "  Aidan   Williams  "}});
    fireEvent.click(screen.getByRole("button", {name: "Guardar nombre"}));

    await waitFor(() => expect(updateDisplayName).toHaveBeenCalledWith("Aidan Williams"));
    expect(await screen.findByText("Nombre actualizado")).toBeInTheDocument();
  });
});
