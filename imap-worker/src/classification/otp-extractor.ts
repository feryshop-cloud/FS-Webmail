export function extractOTP(textBody: string): string | null {
  if (!textBody) return null;
  const regex = /(?:code|otp|verification|pin|kode).{0,30}?\b(\d{4,8})\b/i;
  const match = textBody.match(regex);
  if (match) {
    return match[1];
  }
  
  const fallbackRegex = /\b\d{4,8}\b/;
  const fallbackMatch = textBody.match(fallbackRegex);
  return fallbackMatch ? fallbackMatch[0] : null;
}
