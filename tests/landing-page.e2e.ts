import { test } from "@e2e-dev/web";
import { expect } from "e2e";

test.describe("Landing Page & Form Validation", () => {
  test("displays landing page with required elements", async ({ app, screen }) => {
    await app.open("/");

    // Check heading and intro description
    await expect(screen.getByRole("heading", "Cek Email FeryShop")).toBeVisible();
    await expect(
      screen.getByText(
        "Masukkan alamat email virtual dan PIN Akses untuk membaca pesan & OTP secara real-time.",
      ),
    ).toBeVisible();

    // Check input fields and submit button
    await expect(screen.getByLabel("Alamat Email Virtual")).toBeVisible();
    await expect(screen.getByLabel("PIN Akses / Password Mailbox")).toBeVisible();
    await expect(screen.getByRole("button", "Buka Inbox & Cek OTP")).toBeVisible();
  });

  test("toggles PIN visibility between password and text", async ({ app, screen }) => {
    await app.open("/");

    const pinInput = screen.getByLabel("PIN Akses / Password Mailbox");
    await pinInput.fill("123456");

    // Initially toggle button shows "Tampilkan kata sandi"
    const toggleButton = screen.getByLabel("Tampilkan kata sandi");
    await expect(toggleButton).toBeVisible();
    await toggleButton.tap();

    // After click, button switches to "Sembunyikan kata sandi"
    const hideButton = screen.getByLabel("Sembunyikan kata sandi");
    await expect(hideButton).toBeVisible();

    // Toggle back
    await hideButton.tap();
    await expect(screen.getByLabel("Tampilkan kata sandi")).toBeVisible();
  });

  test("shows error when email does not exist", async ({ app, screen }) => {
    await app.open("/");

    await screen.getByLabel("Alamat Email Virtual").fill("unknown-random-user-999@feryshop.com");
    await screen.getByLabel("PIN Akses / Password Mailbox").fill("123456");
    await screen.getByRole("button", "Buka Inbox & Cek OTP").tap();

    // Check for non-existent account error
    await expect(
      screen.getByText(
        "Email atau PIN Akses tidak valid. Pastikan alamat email yang Anda masukkan benar.",
        {
          exact: false,
        },
      ),
    ).toBeVisible();
  });

  test("shows error when required PIN is missing for protected account", async ({
    app,
    screen,
  }) => {
    await app.open("/");

    // akun02@feryshop.com requires PIN
    await screen.getByLabel("Alamat Email Virtual").fill("akun02@feryshop.com");
    await screen.getByRole("button", "Buka Inbox & Cek OTP").tap();

    await expect(
      screen.getByText(
        "Alamat email ini membutuhkan PIN Akses. Silakan masukkan PIN transaksi Anda.",
        {
          exact: false,
        },
      ),
    ).toBeVisible();
  });

  test("shows error when PIN is incorrect", async ({ app, screen }) => {
    await app.open("/");

    await screen.getByLabel("Alamat Email Virtual").fill("akun02@feryshop.com");
    await screen.getByLabel("PIN Akses / Password Mailbox").fill("WRONG_PIN");
    await screen.getByRole("button", "Buka Inbox & Cek OTP").tap();

    await expect(
      screen.getByText("PIN Akses / Password Mailbox salah. Harap periksa nota transaksi Anda.", {
        exact: false,
      }),
    ).toBeVisible();
  });
});
