// Agrupamento das seleções da Copa do Mundo 2026 + grupos especiais (FIFA/Coca-Cola).
// Ordem oficial dos grupos: Especiais FWC → Coca-Cola → Grupos A..L.

export const GRUPOS_COPA: Record<string, string[]> = {
  "Grupo A": ["México", "África do Sul", "Coreia do Sul", "República Tcheca"],
  "Grupo B": ["Canadá", "Bósnia", "Catar", "Suíça"],
  "Grupo C": ["Brasil", "Marrocos", "Haiti", "Escócia"],
  "Grupo D": ["Estados Unidos", "Paraguai", "Austrália", "Turquia"],
  "Grupo E": ["Alemanha", "Curaçao", "Costa do Marfim", "Equador"],
  "Grupo F": ["Holanda", "Japão", "Suécia", "Tunísia"],
  "Grupo G": ["Bélgica", "Egito", "Irã", "Nova Zelândia"],
  "Grupo H": ["Arábia Saudita", "Cabo Verde", "Espanha", "Uruguai"],
  "Grupo I": ["França", "Iraque", "Noruega", "Senegal"],
  "Grupo J": ["Argélia", "Argentina", "Áustria", "Jordânia"],
  "Grupo K": ["Colômbia", "Portugal", "R.D. Congo", "Uzbequistão"],
  "Grupo L": ["Croácia", "Gana", "Inglaterra", "Panamá"],
};

export const ORDEM_GRUPOS = [
  "Especiais FWC",
  "Coca-Cola",
  ...Object.keys(GRUPOS_COPA),
];

export function grupoDaSelecao(selecao: string): string {
  if (selecao === "FIFA") return "Especiais FWC";
  if (selecao === "Coca-Cola") return "Coca-Cola";
  for (const [g, sels] of Object.entries(GRUPOS_COPA)) {
    if (sels.includes(selecao)) return g;
  }
  return "Outros";
}

// Ordenação canônica de figurinhas: FWC00..FWC19, CC1..CC14, depois por seleção+código.
export function ordenarFigurinhas<T extends { codigo: string; selecao: string }>(figs: T[]): T[] {
  const rank = (f: T) => {
    if (f.codigo.startsWith("FWC")) return [0, parseInt(f.codigo.slice(3), 10) || 0, f.codigo] as const;
    if (f.codigo.startsWith("CC")) return [1, parseInt(f.codigo.slice(2), 10) || 0, f.codigo] as const;
    const grupo = grupoDaSelecao(f.selecao);
    const gi = ORDEM_GRUPOS.indexOf(grupo);
    return [2 + (gi >= 0 ? gi : 99), 0, f.codigo] as const;
  };
  return [...figs].sort((a, b) => {
    const ra = rank(a), rb = rank(b);
    if (ra[0] !== rb[0]) return ra[0] - rb[0];
    if (ra[1] !== rb[1]) return ra[1] - rb[1];
    return ra[2].localeCompare(rb[2]);
  });
}

export type Secao = {
  grupo: string;
  // Para Especiais e Coca-Cola, há uma única "seleção" virtual de mesmo nome.
  selecoes: { selecao: string; figurinhas: { codigo: string; jogador: string; posicao: string; selecao: string }[] }[];
};

export function agruparPorGrupoESelecao<T extends { codigo: string; jogador: string; posicao: string; selecao: string }>(
  figs: T[],
): Secao[] {
  const porGrupo = new Map<string, Map<string, T[]>>();
  for (const f of figs) {
    const g = grupoDaSelecao(f.selecao);
    // Etiqueta visual: em vez do nome do país nos especiais, usamos o próprio grupo.
    const sel = g === "Especiais FWC" ? "FWC" : g === "Coca-Cola" ? "Coca-Cola" : f.selecao;
    if (!porGrupo.has(g)) porGrupo.set(g, new Map());
    const m = porGrupo.get(g)!;
    if (!m.has(sel)) m.set(sel, []);
    m.get(sel)!.push(f);
  }
  return ORDEM_GRUPOS.filter(g => porGrupo.has(g)).map(grupo => {
    const m = porGrupo.get(grupo)!;
    const selecoes = Array.from(m.entries())
      .sort(([a], [b]) => a.localeCompare(b, "pt-BR"))
      .map(([selecao, figurinhas]) => ({
        selecao,
        figurinhas: ordenarFigurinhas(figurinhas) as unknown as { codigo: string; jogador: string; posicao: string; selecao: string }[],
      }));
    return { grupo, selecoes };
  });
}