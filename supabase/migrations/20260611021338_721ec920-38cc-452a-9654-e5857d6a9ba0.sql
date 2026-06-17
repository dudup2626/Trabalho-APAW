
-- Atualiza todas as figurinhas Coca-Cola para selecao = 'Coca-Cola'
UPDATE public.figurinhas_oficiais
SET selecao = 'Coca-Cola'
WHERE codigo LIKE 'CC%';

-- Adiciona a figurinha especial FWC00 que estava faltando
INSERT INTO public.figurinhas_oficiais (codigo, jogador, posicao, selecao)
VALUES ('FWC00', 'Especial FWC #0', 'Especial', 'FIFA')
ON CONFLICT (codigo) DO NOTHING;
