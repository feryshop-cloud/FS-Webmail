import { test } from "@e2e-dev/web";
import { expect, credentials } from "e2e";

test.describe("Authentication & Route Protection", () => {
  test("redirects unauthorized users away from inbox page", async ({ app, screen, browser }) => {
    // Attempt direct access to a mailbox without valid auth cookie
    await app.open("/inbox/akun02@feryshop.com");

    // Should redirect to landing page
    await expect(browser).toHaveURL(/\/\?error=unauthorized$/);
    await expect(screen.getByRole("heading", "Cek Email FeryShop")).toBeVisible();
  });

  test("successfully logs in with valid credentials and logs out", async ({
    app,
    screen,
    browser,
  }) => {
    const user = credentials.user("testUser");

    await app.open("/");

    // Fill in email and PIN credentials
    await screen.getByLabel("Alamat Email Virtual").fill(user.username);
    await screen.getByLabel("PIN Akses / Password Mailbox").fill(user.password);
    await screen.getByRole("button", "Buka Inbox & Cek OTP").tap();

    // Verify navigation to inbox
    await expect(browser).toHaveURL(new RegExp(`/inbox/${encodeURIComponent(user.username)}`));

    // Verify inbox header and user email
    await expect(screen.getByText("Inbox Untuk")).toBeVisible();
    await expect(screen.getByRole("heading", user.username)).toBeVisible();

    // Verify presence of Logout and Change PIN action buttons
    const logoutButton = screen.getByRole("button", "Keluar");
    await expect(logoutButton).toBeVisible();

    // Perform Logout
    await logoutButton.tap();

    // Verify redirected back to home landing page
    await expect(browser).toHaveURL("/");
    await expect(screen.getByRole("heading", "Cek Email FeryShop")).toBeVisible();

    // Verify session was revoked by trying to visit inbox again
    await app.open(`/inbox/${encodeURIComponent(user.username)}`);
    await expect(browser).toHaveURL(/\/\?error=unauthorized$/);
  });
});
