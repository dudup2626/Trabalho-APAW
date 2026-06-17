import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/trocas/")({
  component: TrocasList,
});

type Grupo = {
  grupoId: string;
  nome: string;
  data: string;
  dadas: Record<string, number>;
  recebidas: Record<string, number>;
};

const fmt = (counts: Record<string, number>) =>
  Object.entries(counts).map(([c, n]) => (n > 1 ? `${c} ×${n}` : c)).join(", ");

function TrocasList() {
  const { user } = useAuth();
  const { data: trocas = [] } = useQuery({
    queryKey: ["trocas", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("trocas_realizadas").select("*").eq("user_id", user!.id).order("data", { ascending: false })).data ?? [],
  });

  const grupos = useMemo<Grupo[]>(() => {
    // Para registros novos (multi-linha com mesmo troca_grupo_id), cada linha == 1 par dado/recebido.
    // Para preservar duplicatas exibimos contagens por código.
    const map = new Map<string, Grupo>();
    // Conta quantas linhas existem por grupo p/ saber se é multi-linha
    const linhasPorGrupo = new Map<string, number>();
    for (const t of trocas) {
      const key = t.troca_grupo_id ?? t.id;
      linhasPorGrupo.set(key, (linhasPorGrupo.get(key) ?? 0) + 1);
    }
    // Para contar sem duplicar quando o lado curto foi "preenchido" repetindo o último item,
    // limitamos cada lado ao número distinto de posições. Aqui assumimos contagem direta por linha.
    for (const t of trocas) {
      const key = t.troca_grupo_id ?? t.id;
      let g = map.get(key);
      if (!g) {
        g = { grupoId: key, nome: t.nome_amigo, data: t.data, dadas: {}, recebidas: {} };
        map.set(key, g);
      }
      if (t.figurinha_dada) g.dadas[t.figurinha_dada] = (g.dadas[t.figurinha_dada] ?? 0) + 1;
      if (t.figurinha_recebida) g.recebidas[t.figurinha_recebida] = (g.recebidas[t.figurinha_recebida] ?? 0) + 1;
      if (new Date(t.data) > new Date(g.data)) g.data = t.data;
    }
    // Remove sentinelas vazias (formato novo) e linhas pareadas duplicadas (formato antigo).
    for (const g of map.values()) {
      delete g.dadas[""];
      delete g.recebidas[""];
    }
    return Array.from(map.values()).sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  }, [trocas]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Trocas realizadas</h1>
          <p className="text-muted-foreground">Histórico das suas trocas com amigos</p>
        </div>
        <Button asChild><Link to="/trocas/nova"><Plus className="h-4 w-4 mr-1" /> Nova troca</Link></Button>
      </div>

      <Card className="shadow-card">
        <CardHeader><CardTitle>{grupos.length} registro{grupos.length !== 1 ? "s" : ""}</CardTitle></CardHeader>
        <CardContent>
          {grupos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma troca registrada ainda.</p>
          ) : (
            <ul className="divide-y">
              {grupos.map(g => (
                <li key={g.grupoId}>
                  <Link to="/trocas/$id" params={{ id: g.grupoId }} className="flex items-center justify-between gap-3 py-3 hover:bg-accent/50 rounded-md px-2 -mx-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{g.nome}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1 font-mono flex-wrap">
                        <span>{fmt(g.dadas)}</span>
                        <ArrowRight className="h-3 w-3" />
                        <span>{fmt(g.recebidas)}</span>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">{new Date(g.data).toLocaleDateString("pt-BR")}</div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
