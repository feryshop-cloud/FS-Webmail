import { describe, expect, it } from "vitest";
import { extractOTP } from "./otp-extractor";

describe("extractOTP", () => {
  it("returns null for empty body", () => {
    expect(extractOTP("")).toBeNull();
  });

  it("returns null for body without numbers", () => {
    expect(extractOTP("Your account is safe")).toBeNull();
  });

  it("extracts OTP after 'code' keyword", () => {
    expect(extractOTP("Your verification code is 123456. Do not share.")).toBe("123456");
  });

  it("extracts OTP after 'otp' keyword", () => {
    expect(extractOTP("Your OTP is 987654")).toBe("987654");
  });

  it("extracts OTP after 'kode' keyword (Indonesian)", () => {
    expect(extractOTP("Kode verifikasi anda: 482913")).toBe("482913");
  });

  it("extracts OTP after 'pin' keyword", () => {
    expect(extractOTP("Your PIN adalah 135790")).toBe("135790");
  });

  it("extracts 4-digit OTP", () => {
    expect(extractOTP("Your code is 1234")).toBe("1234");
  });

  it("extracts 8-digit OTP", () => {
    expect(extractOTP("Your code is 12345678")).toBe("12345678");
  });

  it("does not extract 3-digit or 9-digit numbers", () => {
    expect(extractOTP("Your code is 123")).toBeNull();
    expect(extractOTP("Your code is 123456789")).toBeNull();
  });

  it("keyword matches case-insensitively", () => {
    expect(extractOTP("YOUR VERIFICATION CODE IS 555666")).toBe("555666");
  });

  it("falls back to any 4-8 digit number when no keyword", () => {
    expect(extractOTP("Total tagihan Rp 250000 dibayar sebelum 2025")).toBe("250000");
  });

  it("prefers number near keyword over unrelated numbers", () => {
    expect(extractOTP("Invoice no 88231. Your code: 123456.")).toBe("123456");
  });

  it("handles keyword with up to 30 chars gap", () => {
    expect(extractOTP("verification code for your account is 777888")).toBe("777888");
  });
});
