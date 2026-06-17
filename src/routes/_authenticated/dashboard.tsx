import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BookOpen, CheckCircle2, AlertCircle, Layers, Repeat, Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const uid = user?.id ?? "";

  const { data: totalFig = 0 } = useQuery({
    queryKey: ["total-fig"],
    queryFn: async () => {
      const { count } = await supabase.from("figurinhas_oficiais").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: inv = [] } = useQuery({
    queryKey: ["inv", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data } = await supabase.from("inventario_usuario").select("*").eq("user_id", uid);
      return data ?? [];
    },
  });

  const { data: trocas = [] } = useQuery({
    queryKey: ["trocas", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data } = await supabase.from("trocas_realizadas").select("*").eq("user_id", uid);
      return data ?? [];
    },
  });

  const possuidas = inv.filter(i => i.quantidade > 0).length;
  const faltam = totalFig - possuidas;
  const pct = totalFig ? (possuidas / totalFig) * 100 : 0;
  const pctLabel = pct.toFixed(2).replace(".", ",");
  const repetidas = inv.reduce((s, i) => s + Math.max(0, i.quantidade - 1), 0);

  // Agrupa trocas pelo troca_grupo_id (uma troca pode envolver várias figurinhas)
  const grupos = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of trocas as Array<{ id: string; troca_grupo_id?: string | null; nome_amigo: string }>) {
      const key = (t.troca_grupo_id ?? t.id) as string;
      if (!map.has(key)) map.set(key, t.nome_amigo);
    }
    return map;
  }, [trocas]);

  const totalTrocas = grupos.size;

  const ranking: Record<string, number> = {};
  for (const nome of grupos.values()) ranking[nome] = (ranking[nome] ?? 0) + 1;
  const rankingList = Object.entries(ranking).sort((a, b) => b[1] - a[1]);

  const stats = [
    { label: "Possuídas", value: `${possuidas} / ${totalFig}`, icon: CheckCircle2, color: "text-primary" },
    { label: "Faltam colar", value: faltam, icon: AlertCircle, color: "text-destructive" },
    { label: "Repetidas", value: repetidas, icon: Layers, color: "text-secondary" },
    { label: "Trocas feitas", value: totalTrocas, icon: Repeat, color: "text-gold-foreground" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Seu progresso no álbum da Copa 2026</p>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-primary" /> Progresso do álbum</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-baseline justify-between">
            <span className="text-4xl font-bold">{pctLabel}%</span>
            <span className="text-sm text-muted-foreground">{possuidas} de {totalFig} figurinhas</span>
          </div>
          <Progress value={pct} className="h-3" />
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(s => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="shadow-card">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{s.label}</p>
                    <p className="text-2xl font-bold">{s.value}</p>
                  </div>
                  <Icon className={`h-8 w-8 ${s.color}`} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-secondary" /> Ranking de trocas com amigos</CardTitle>
        </CardHeader>
        <CardContent>
          {rankingList.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma troca registrada ainda. Comece em “Trocas → Nova”.</p>
          ) : (
            <ul className="space-y-2">
              {rankingList.map(([nome, qtd]) => (
                <li key={nome} className="flex items-center justify-between rounded-md border p-3">
                  <span className="font-medium">{nome}</span>
                  <span className="text-sm text-muted-foreground">{qtd} figurinha{qtd > 1 ? "s" : ""} trocada{qtd > 1 ? "s" : ""}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
