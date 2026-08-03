import { extractOTP } from './otp-extractor';

/**
 * Classifier email sesuai PRD Bab 6.
 * Hanya 3 kategori valid: login_otp, security_alert, account_change_verification.
 * Fail-safe: email ambigu yang mengandung angka OTP → login_otp + buyer,
 * karena OTP time-sensitive dan lebih baik tampil ke buyer daripada tersembunyi.
 */
export function classifyEmail(subject: string, body: string) {
  const content = `${subject} ${body}`.toLowerCase();

  // Cabang 1: security_alert → admin_only
  // Pattern: new device, suspicious activity, sign-in attempt, recovery email removed, unusual login
  if (
    content.includes('new device') ||
    content.includes('suspicious activity') ||
    content.includes('sign-in attempt') ||
    content.includes('recovery email removed') ||
    content.includes('unusual login')
  ) {
    return { category: 'security_alert', visibility: 'admin_only', otp: null };
  }

  // Cabang 2: account_change_verification → admin_only
  // Pattern: confirm email change, change email, link google, add recovery, verify your new email
  if (
    content.includes('confirm email change') ||
    content.includes('change email') ||
    content.includes('link google') ||
    content.includes('add recovery') ||
    content.includes('verify your new email')
  ) {
    return { category: 'account_change_verification', visibility: 'admin_only', otp: null };
  }

  // Cabang 3: login_otp → buyer
  // Pattern: verification code, login code, otp, kode verifikasi, kode login,
  // auth code, authentication code, security code, one-time password, verification pin, login verification
  if (
    content.includes('verification code') ||
    content.includes('login code') ||
    content.includes('otp') ||
    content.includes('kode verifikasi') ||
    content.includes('kode login') ||
    content.includes('auth code') ||
    content.includes('authentication code') ||
    content.includes('security code') ||
    content.includes('one-time password') ||
    content.includes('verification pin') ||
    content.includes('login verification')
  ) {
    return {
      category: 'login_otp',
      visibility: 'buyer',
      otp: extractOTP(content)
    };
  }

  // Fail-safe: Jika ambigu tapi ada angka OTP, default ke login_otp + buyer
  // PRD Bab 6 default/fallback: login_otp / buyer (fail-safe ke arah tetap tampil)
  const possibleOtp = extractOTP(content);
  if (possibleOtp) {
    return {
      category: 'login_otp',
      visibility: 'buyer',
      otp: possibleOtp
    };
  }

  // Fallback final: tidak ada pattern dan tidak ada OTP → tetap login_otp + buyer
  // Per PRD Bab 6 row "default/fallback": login_otp / buyer (fail-safe ke arah tetap tampil)
  return {
    category: 'login_otp',
    visibility: 'buyer',
    otp: null
  };
}
