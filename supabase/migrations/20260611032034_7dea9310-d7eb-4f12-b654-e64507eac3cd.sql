ALTER TABLE public.trocas_realizadas ADD COLUMN IF NOT EXISTS troca_grupo_id uuid;
UPDATE public.trocas_realizadas SET troca_grupo_id = id WHERE troca_grupo_id IS NULL;
ALTER TABLE public.trocas_realizadas ALTER COLUMN troca_grupo_id SET NOT NULL;
ALTER TABLE public.trocas_realizadas ALTER COLUMN troca_grupo_id SET DEFAULT gen_random_uuid();
CREATE INDEX IF NOT EXISTS trocas_realizadas_grupo_idx ON public.trocas_realizadas(troca_grupo_id);