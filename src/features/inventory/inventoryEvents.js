export const ACTIVITY_NOTIFICATION_EVENT = "forno:activity-notification";

export function announceActivityNotification() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(ACTIVITY_NOTIFICATION_EVENT));
  }
}
