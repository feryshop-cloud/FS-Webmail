import { supabase } from './client';
import { logger } from '../utils/logger';

export async function insertIncomingEmail(emailData: any) {
  const {
    recipient_email,
    sender_email,
    subject,
    message_id,
    otp_code,
    raw_body_snippet,
    category,
    visibility
  } = emailData;

  const snippet = raw_body_snippet ? raw_body_snippet.substring(0, 500) : '';

  try {
    const { error } = await supabase.from('incoming_emails').insert({
      recipient_email,
      sender_email,
      subject,
      message_id,
      otp_code,
      raw_body_snippet: snippet,
      category,
      visibility,
      received_at: new Date().toISOString()
    });

    if (error) {
      if (error.code === '23505' || error.message.includes('uniq_recipient_message') || error.message.includes('duplicate key value')) {
        logger.info('Duplicate ignored', { message_id, recipient_email });
        return;
      }
      throw error;
    }
    
    logger.info('Email inserted successfully', { message_id, recipient_email });
  } catch (err: any) {
    logger.error('Error inserting email to Supabase', { error: err.message, message_id });
    throw err;
  }
}
