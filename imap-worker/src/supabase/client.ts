import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import ws from 'ws';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Transport 'ws' WAJIB ada walau worker ini tidak pernah subscribe ke channel apa pun:
// createClient() selalu mengonstruksi RealtimeClient, dan di Node 20 (tanpa WebSocket
// native, baru ada di Node 22) konstruksi itu melempar "Node.js 20 detected without
// native WebSocket support" sebelum satu baris logika worker pun jalan.
// Pasangannya @types/ws harus ikut terpasang, kalau tidak ts-node gagal kompilasi (TS7016).
export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  realtime: {
    transport: ws as unknown as typeof WebSocket,
  },
});
