-- Seed Data for WebMail Testing
-- Inserts dummy emails into incoming_emails table

INSERT INTO public.incoming_emails (
    recipient_email,
    sender_email,
    subject,
    message_id,
    otp_code,
    raw_body_snippet,
    category,
    visibility,
    received_at
) VALUES 
(
    'test@feryshop.com',
    'noreply@moonton.com',
    'Mobile Legends Verification Code',
    'msg-001-moonton',
    '849201',
    'Kode verifikasi Anda adalah 849201. Jangan berikan kode ini kepada siapapun.',
    'otp',
    'buyer',
    NOW() - INTERVAL '5 minutes'
),
(
    'test@feryshop.com',
    'security@riotgames.com',
    'Valorant Login Verification',
    'msg-002-valorant',
    '930128',
    'Use verification code 930128 to log into your Valorant account.',
    'otp',
    'buyer',
    NOW() - INTERVAL '2 minutes'
),
(
    'test@feryshop.com',
    'account-security-noreply@account.garena.com',
    'Garena Authenticator Code',
    'msg-003-garena',
    '152433',
    'Kode keamanan Garena Anda adalah 152433.',
    'otp',
    'buyer',
    NOW()
),
(
    'test@feryshop.com',
    'billing@hetzner.com',
    'Invoice #904124 Payment Receipt',
    'msg-004-hetzner',
    NULL,
    'Dear Admin, payment for invoice #904124 has been processed successfully.',
    'billing',
    'admin_only',
    NOW() - INTERVAL '10 minutes'
)
ON CONFLICT (recipient_email, message_id) DO NOTHING;
