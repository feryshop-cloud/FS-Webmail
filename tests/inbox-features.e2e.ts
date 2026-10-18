import { test } from "@e2e-dev/web";
import { expect, credentials } from "e2e";

test.describe("Inbox Features & Email Operations", () => {
  test.beforeEach(async ({ app, screen, browser }) => {
    const user = credentials.user("testUser");
    await app.open("/");
    await screen.getByLabel("Alamat Email Virtual").fill(user.username);
    await screen.getByLabel("PIN Akses / Password Mailbox").fill(user.password);
    await screen.getByRole("button", "Buka Inbox & Cek OTP").tap();
    await expect(browser).toHaveURL(new RegExp(`/inbox/${encodeURIComponent(user.username)}`));
  });

  test("displays inbox UI, search input, and filter tabs", async ({ screen }) => {
    // Search input
    await expect(screen.getByPlaceholder("Cari subjek, pengirim, atau OTP...")).toBeVisible();

    // Filter tabs
    await expect(screen.getByRole("button", "Semua")).toBeVisible();
    await expect(screen.getByRole("button", "Berisi OTP")).toBeVisible();
    await expect(screen.getByRole("button", "Belum Dibaca")).toBeVisible();
    await expect(screen.getByRole("button", "Arsip")).toBeVisible();

    // At least one email item or "Buka Pesan" button should be visible for this account
    await expect(screen.getByText("Buka Pesan").first()).toBeVisible();
  });

  test("filters emails using the search bar", async ({ screen }) => {
    const searchInput = screen.getByPlaceholder("Cari subjek, pengirim, atau OTP...");

    // Search for Free Fire emails
    await searchInput.fill("Free Fire");
    await expect(screen.getByText("Buka Pesan").first()).toBeVisible();

    // Search for a keyword that has no matches
    await searchInput.fill("KeywordYangPastiTidakAda12345XYZ");
    await expect(screen.getByText("Tidak ada hasil")).toBeVisible();
    await expect(
      screen.getByText("Coba ubah kata kunci pencarian atau filter yang dipilih."),
    ).toBeVisible();

    // Clear search query
    await searchInput.clear();
    await expect(screen.getByText("Buka Pesan").first()).toBeVisible();
  });

  test("expands an email card to view full message details", async ({ screen }) => {
    const firstExpandTrigger = screen.getByText("Buka Pesan").first();
    await firstExpandTrigger.tap();

    // After expanding, metadata rows should be visible
    await expect(screen.getByText("Pengirim:").first()).toBeVisible();
    await expect(screen.getByText("Penerima:").first()).toBeVisible();
    await expect(screen.getByText("Subjek:").first()).toBeVisible();

    // "Tutup" should now be visible
    const collapseTrigger = screen.getByText("Tutup").first();
    await expect(collapseTrigger).toBeVisible();

    // Collapse it back
    await collapseTrigger.tap();
    await expect(screen.getByText("Buka Pesan").first()).toBeVisible();
  });

  test("opens and closes Opsi Sandi modal", async ({ screen }) => {
    const passwordOptionsBtn = screen.getByRole("button", "Opsi Sandi");
    await expect(passwordOptionsBtn).toBeVisible();
    await passwordOptionsBtn.tap();

    // Verify modal header is visible
    await expect(screen.getByRole("heading", "Opsi Sandi Mailbox")).toBeVisible();
    await expect(screen.getByRole("button", "Ganti PIN")).toBeVisible();
    await expect(screen.getByRole("button", "Nonaktifkan PIN")).toBeVisible();

    // Cancel modal
    const cancelBtn = screen.getByRole("button", "Batal");
    await expect(cancelBtn).toBeVisible();
    await cancelBtn.tap();

    // Modal header should no longer be visible
    await expect(screen.getByRole("heading", "Opsi Sandi Mailbox")).not.toBeVisible();
  });
});
