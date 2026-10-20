import { supabase } from '../../supabase/client';
import { createWalkRecordRepository } from './recordRepository';

// D server transaction only; this does not change the Native finish receipt or
// perform best-effort manual activity calls. E/F owns explicit UI integration.
export const walkRecordRepository = createWalkRecordRepository(
  (name, parameters) => supabase.rpc(name, parameters),
);
