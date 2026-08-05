export interface Email {
  id?: string;
  recipient_email: string;
  sender_email: string;
  subject: string;
  message_id: string;
  otp_code?: string | null;
  raw_body_snippet?: string | null;
  category?: "otp" | "billing" | "general" | string;
  visibility?: "buyer" | "admin_only" | string;
  received_at: string;
}
