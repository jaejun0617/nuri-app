import { supabase } from '../../supabase/client';
import { createWalkProgressionRepository } from './progressionRepository';

// This separate read adapter never changes the frozen Native finish receipt.
export const walkProgressionRepository = createWalkProgressionRepository(
  (name, parameters) => supabase.rpc(name, parameters),
);
