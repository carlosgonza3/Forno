import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import AppHeader from "./AppHeader";

describe("AppHeader user greeting", () => {
  afterEach(cleanup);

  it("greets the signed-in user by the first part of their saved display name", () => {
    render(<AppHeader page="dashboard" userName="Aidan Williams" onOpenMenu={vi.fn()}
      onUpload={vi.fn()} showUpload={false}/>);

    expect(screen.getByRole("heading", {name: "Buenos días, Aidan"})).toBeInTheDocument();
  });

  it("keeps regular page titles outside the dashboard", () => {
    render(<AppHeader page="inventory" userName="Carlos González" onOpenMenu={vi.fn()}
      onUpload={vi.fn()} showUpload={false}/>);

    expect(screen.getByRole("heading", {name: "Inventario"})).toBeInTheDocument();
  });

  it("shows grouped operational events in the top-right notifications", async () => {
    const onNotificationsViewed = vi.fn();
    render(<AppHeader page="dashboard" userName="Carlos González" onOpenMenu={vi.fn()}
      unreadNotificationCount={2} onNotificationsViewed={onNotificationsViewed}
      activityNotifications={[
        {id: "1", event_type: "ingredients_updated", item_count: 2,
          actor_name: "Carlos", metadata: {}, created_at: "2026-08-04T13:00:00.000Z"},
        {id: "2", event_type: "purchase_status_changed", item_count: 4,
          actor_name: "Aidan", metadata: {status: "received"},
          created_at: "2026-08-04T12:00:00.000Z"},
      ]}/>);

    expect(document.querySelector(".notification-count")).toHaveTextContent("2");
    fireEvent.click(screen.getByRole("button", {name: "Notificaciones, 2 sin leer"}));

    expect(await screen.findByRole("heading", {name: "Notificaciones recientes"})).toBeInTheDocument();
    expect(onNotificationsViewed).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Inventario actualizado")).toBeInTheDocument();
    expect(screen.getByText("Orden completada")).toBeInTheDocument();
    expect(screen.getByText("2 ingredientes · Carlos")).toBeInTheDocument();
    expect(screen.getByText("4 productos · Aidan")).toBeInTheDocument();
  });

  it("does not show a badge when every notification has been viewed", () => {
    render(<AppHeader page="dashboard" userName="Carlos" onOpenMenu={vi.fn()}
      unreadNotificationCount={0}/>);

    expect(screen.getByRole("button", {name: "Notificaciones, ninguna sin leer"})).toBeInTheDocument();
    expect(document.querySelector(".notification-count")).not.toBeInTheDocument();
  });
});
