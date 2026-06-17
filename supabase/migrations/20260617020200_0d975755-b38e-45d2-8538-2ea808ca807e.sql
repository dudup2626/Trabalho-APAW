ALTER TABLE public.trocas_realizadas ALTER COLUMN figurinha_dada DROP NOT NULL;
ALTER TABLE public.trocas_realizadas ALTER COLUMN figurinha_recebida DROP NOT NULL;
UPDATE public.trocas_realizadas SET figurinha_dada = NULL WHERE figurinha_dada = '';
UPDATE public.trocas_realizadas SET figurinha_recebida = NULL WHERE figurinha_recebida = '';