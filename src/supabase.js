import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ptnwegifmtnupoxpyakb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_69lMCZOdX4FaNgnJZ2Nx4w_yvZ7oCKH';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
