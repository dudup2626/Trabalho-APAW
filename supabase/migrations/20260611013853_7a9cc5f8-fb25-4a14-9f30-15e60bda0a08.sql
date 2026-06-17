
-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles readable by owner" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Profiles insert own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Profiles update own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- FIGURINHAS OFICIAIS
CREATE TABLE public.figurinhas_oficiais (
  codigo TEXT PRIMARY KEY,
  jogador TEXT NOT NULL,
  posicao TEXT NOT NULL,
  selecao TEXT NOT NULL
);
GRANT SELECT ON public.figurinhas_oficiais TO authenticated, anon;
GRANT ALL ON public.figurinhas_oficiais TO service_role;
ALTER TABLE public.figurinhas_oficiais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Catalog public read" ON public.figurinhas_oficiais FOR SELECT TO authenticated, anon USING (true);

-- INVENTARIO
CREATE TABLE public.inventario_usuario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  figurinha_codigo TEXT NOT NULL REFERENCES public.figurinhas_oficiais(codigo) ON DELETE CASCADE,
  quantidade INT NOT NULL DEFAULT 0 CHECK (quantidade >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, figurinha_codigo)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventario_usuario TO authenticated;
GRANT ALL ON public.inventario_usuario TO service_role;
ALTER TABLE public.inventario_usuario ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Inventory own select" ON public.inventario_usuario FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Inventory own insert" ON public.inventario_usuario FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Inventory own update" ON public.inventario_usuario FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Inventory own delete" ON public.inventario_usuario FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- TROCAS
CREATE TABLE public.trocas_realizadas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome_amigo TEXT NOT NULL,
  figurinha_dada TEXT NOT NULL REFERENCES public.figurinhas_oficiais(codigo),
  figurinha_recebida TEXT NOT NULL REFERENCES public.figurinhas_oficiais(codigo),
  data TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trocas_realizadas TO authenticated;
GRANT ALL ON public.trocas_realizadas TO service_role;
ALTER TABLE public.trocas_realizadas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Trocas own select" ON public.trocas_realizadas FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Trocas own insert" ON public.trocas_realizadas FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Trocas own update" ON public.trocas_realizadas FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Trocas own delete" ON public.trocas_realizadas FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- SEED: regular selections 01..20
DO $$
DECLARE
  prefixos TEXT[] := ARRAY['RSA','GER','KSA','ALG','ARG','AUS','AUT','BEL','BIH','BRA','CPV','CAN','QAT','COL','KOR','CIV','CRO','CUW','EGY','ECU','SCO','ESP','USA','FRA','GHA','HAI','NED','ENG','IRN','IRQ','JPN','JOR','MAR','MEX','NOR','NZL','PAN','PAR','POR','CZE','COD','SEN','SWE','SUI','TUN','TUR','URU','UZB'];
  nomes_selecoes JSONB := '{
    "RSA":"África do Sul","GER":"Alemanha","KSA":"Arábia Saudita","ALG":"Argélia","ARG":"Argentina","AUS":"Austrália","AUT":"Áustria","BEL":"Bélgica","BIH":"Bósnia","BRA":"Brasil","CPV":"Cabo Verde","CAN":"Canadá","QAT":"Catar","COL":"Colômbia","KOR":"Coreia do Sul","CIV":"Costa do Marfim","CRO":"Croácia","CUW":"Curaçao","EGY":"Egito","ECU":"Equador","SCO":"Escócia","ESP":"Espanha","USA":"Estados Unidos","FRA":"França","GHA":"Gana","HAI":"Haiti","NED":"Holanda","ENG":"Inglaterra","IRN":"Irã","IRQ":"Iraque","JPN":"Japão","JOR":"Jordânia","MAR":"Marrocos","MEX":"México","NOR":"Noruega","NZL":"Nova Zelândia","PAN":"Panamá","PAR":"Paraguai","POR":"Portugal","CZE":"República Tcheca","COD":"R.D. Congo","SEN":"Senegal","SWE":"Suécia","SUI":"Suíça","TUN":"Tunísia","TUR":"Turquia","URU":"Uruguai","UZB":"Uzbequistão"
  }'::jsonb;
  p TEXT;
  i INT;
  pos TEXT;
BEGIN
  FOREACH p IN ARRAY prefixos LOOP
    FOR i IN 1..20 LOOP
      pos := CASE
        WHEN i = 1 THEN 'Goleiro'
        WHEN i BETWEEN 2 AND 7 THEN 'Defensor'
        WHEN i BETWEEN 8 AND 14 THEN 'Meio-campo'
        ELSE 'Atacante'
      END;
      INSERT INTO public.figurinhas_oficiais (codigo, jogador, posicao, selecao)
      VALUES (
        p || lpad(i::text, 2, '0'),
        'Jogador ' || p || ' #' || i,
        pos,
        nomes_selecoes->>p
      );
    END LOOP;
  END LOOP;
END$$;

-- SEED FWC01..FWC19
DO $$
DECLARE i INT;
BEGIN
  FOR i IN 1..19 LOOP
    INSERT INTO public.figurinhas_oficiais (codigo, jogador, posicao, selecao)
    VALUES ('FWC' || lpad(i::text,2,'0'), 'Especial FWC #' || i, 'Especial', 'FIFA');
  END LOOP;
END$$;

-- SEED Coca-Cola
INSERT INTO public.figurinhas_oficiais (codigo, jogador, posicao, selecao) VALUES
  ('CC1','Lamine Yamal','Atacante','Espanha'),
  ('CC2','Joshua Kimmich','Meio-campo','Alemanha'),
  ('CC3','Harry Kane','Atacante','Inglaterra'),
  ('CC4','Santiago Giménez','Atacante','México'),
  ('CC5','Joško Gvardiol','Defensor','Croácia'),
  ('CC6','Federico Valverde','Meio-campo','Uruguai'),
  ('CC7','Jefferson Lerma','Meio-campo','Colômbia'),
  ('CC8','Enner Valencia','Atacante','Equador'),
  ('CC9','Gabriel Magalhães','Defensor','Brasil'),
  ('CC10','Virgil van Dijk','Defensor','Holanda'),
  ('CC11','Alphonso Davies','Defensor','Canadá'),
  ('CC12','Emiliano Martínez','Goleiro','Argentina'),
  ('CC13','Raúl Jiménez','Atacante','México'),
  ('CC14','Lautaro Martínez','Atacante','Argentina');
