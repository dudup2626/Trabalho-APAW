import { supabase } from "@/integrations/supabase/client";

export type Figurinha = {
  codigo: string;
  jogador: string;
  posicao: string;
  selecao: string;
};

export type InventarioItem = {
  id: string;
  user_id: string;
  figurinha_codigo: string;
  quantidade: number;
  updated_at: string;
};

export type Troca = {
  id: string;
  user_id: string;
  nome_amigo: string;
  figurinha_dada: string;
  figurinha_recebida: string;
  data: string;
};

export { supabase };
