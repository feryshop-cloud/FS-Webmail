import { describe, expect, it } from "vitest";
import { classifyEmail } from "./classifier";

describe("classifyEmail", () => {
  describe("security_alert → admin_only", () => {
    it("detects 'new device'", () => {
      expect(classifyEmail("New device signed in", "Someone signed in from a new device")).toEqual({
        category: "security_alert",
        visibility: "admin_only",
        otp: null,
      });
    });

    it("detects 'suspicious activity'", () => {
      expect(classifyEmail("Alert", "We detected suspicious activity on your account")).toEqual({
        category: "security_alert",
        visibility: "admin_only",
        otp: null,
      });
    });

    it("detects 'unusual login'", () => {
      expect(classifyEmail("Unusual login", "Unusual login detected from Jakarta")).toEqual({
        category: "security_alert",
        visibility: "admin_only",
        otp: null,
      });
    });
  });

  describe("account_change_verification → admin_only", () => {
    it("detects 'confirm email change'", () => {
      expect(classifyEmail("Confirm email change", "Please confirm email change request")).toEqual({
        category: "account_change_verification",
        visibility: "admin_only",
        otp: null,
      });
    });

    it("detects 'verify your new email'", () => {
      expect(classifyEmail("Verify email", "Please verify your new email address")).toEqual({
        category: "account_change_verification",
        visibility: "admin_only",
        otp: null,
      });
    });
  });

  describe("login_otp → buyer", () => {
    it("detects 'verification code' and extracts OTP", () => {
      expect(classifyEmail("Your verification code", "Your verification code is 246810")).toEqual({
        category: "login_otp",
        visibility: "buyer",
        otp: "246810",
      });
    });

    it("detects 'kode verifikasi' (Indonesian)", () => {
      expect(classifyEmail("Kode verifikasi", "Kode verifikasi login anda 135790")).toEqual({
        category: "login_otp",
        visibility: "buyer",
        otp: "135790",
      });
    });

    it("detects 'otp'", () => {
      expect(classifyEmail("OTP akun", "Your OTP is 999888")).toEqual({
        category: "login_otp",
        visibility: "buyer",
        otp: "999888",
      });
    });
  });

  describe("fail-safe default", () => {
    it("body with number but no keyword → login_otp + buyer with OTP", () => {
      expect(classifyEmail("Invoice paid", "Total pembayaran 150000 sudah diterima")).toEqual({
        category: "login_otp",
        visibility: "buyer",
        otp: "150000",
      });
    });

    it("no pattern, no number → login_otp + buyer with null OTP", () => {
      expect(classifyEmail("Welcome", "Thanks for joining us")).toEqual({
        category: "login_otp",
        visibility: "buyer",
        otp: null,
      });
    });
  });

  describe("priority", () => {
    it("security_alert wins over login_otp when both present", () => {
      const result = classifyEmail("Suspicious activity", "Your verification code is 123456");
      expect(result.category).toBe("security_alert");
      expect(result.visibility).toBe("admin_only");
    });
  });
});
