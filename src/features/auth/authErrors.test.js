import { describe, expect, it } from "vitest";
import { getPasswordResetErrorMessage } from "./authErrors";

describe("getPasswordResetErrorMessage", () => {
  it("explains the hosted mailer recipient restriction", () => {
    expect(getPasswordResetErrorMessage({ code: "email_address_not_authorized" })).toContain("no está autorizado");
  });

  it("explains the hosted mailer rate limit", () => {
    expect(getPasswordResetErrorMessage({ code: "over_email_send_rate_limit" })).toContain("límite temporal");
  });

  it("does not expose unknown provider details", () => {
    expect(getPasswordResetErrorMessage({ code: "unexpected_failure", message: "sensitive provider response" })).not.toContain("sensitive");
  });
});
