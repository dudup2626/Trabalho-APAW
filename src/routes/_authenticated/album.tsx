import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { agruparPorGrupoESelecao } from "@/lib/grupos";
import { Plus, Minus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/album")({
  component: Album,
});

function Album() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState("");

  const { data: figs = [] } = useQuery({
    queryKey: ["figs"],
    queryFn: async () => {
      const { data } = await supabase.from("figurinhas_oficiais").select("*").order("codigo");
      return data ?? [];
    },
  });

  const { data: inv = [] } = useQuery({
    queryKey: ["inv", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("inventario_usuario").select("*").eq("user_id", user!.id);
      return data ?? [];
    },
  });

  const invMap = useMemo(() => {
    const m = new Map<string, number>();
    inv.forEach(i => m.set(i.figurinha_codigo, i.quantidade));
    return m;
  }, [inv]);

  const setQty = useMutation({
    mutationFn: async ({ codigo, qtd }: { codigo: string; qtd: number }) => {
      if (!user) throw new Error("Não autenticado");
      if (qtd < 0) throw new Error("Quantidade inválida");
      const { error } = await supabase
        .from("inventario_usuario")
        .upsert(
          { user_id: user.id, figurinha_codigo: codigo, quantidade: qtd, updated_at: new Date().toISOString() },
          { onConflict: "user_id,figurinha_codigo" }
        );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inv", user?.id] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const secoes = useMemo(() => {
    const filtered = figs.filter(f =>
      !q ||
      f.codigo.toLowerCase().includes(q.toLowerCase()) ||
      f.jogador.toLowerCase().includes(q.toLowerCase()) ||
      f.selecao.toLowerCase().includes(q.toLowerCase())
    );
    return agruparPorGrupoESelecao(filtered);
  }, [figs, q]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Álbum</h1>
          <p className="text-muted-foreground">Passe o mouse sobre uma figurinha para adicionar ou remover unidades</p>
        </div>
        <Input placeholder="Buscar por código, jogador ou seleção…" value={q} onChange={e => setQ(e.target.value)} className="sm:max-w-xs" />
      </div>

      {secoes.map(({ grupo, selecoes }) => {
        const total = selecoes.reduce((s, x) => s + x.figurinhas.length, 0);
        const possui = selecoes.reduce(
          (s, x) => s + x.figurinhas.filter(f => (invMap.get(f.codigo) ?? 0) > 0).length,
          0
        );
        return (
          <Card key={grupo} className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-lg">
                <span>{grupo}</span>
                <span className="text-sm font-normal text-muted-foreground">{possui}/{total}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="multiple" className="w-full">
                {selecoes.map(({ selecao, figurinhas }) => {
                  const tem = figurinhas.filter(f => (invMap.get(f.codigo) ?? 0) > 0).length;
                  return (
                    <AccordionItem key={selecao} value={selecao}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex flex-1 items-center justify-between pr-2">
                          <span className="font-medium">{selecao}</span>
                          <Badge variant="secondary">{tem}/{figurinhas.length}</Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-10">
                          {figurinhas.map(f => {
                            const qtd = invMap.get(f.codigo) ?? 0;
                            const owned = qtd > 0;
                            return (
                              <div
                                key={f.codigo}
                                title={`${f.codigo} · ${f.jogador} · ${f.posicao}`}
                                className={`relative aspect-[3/4] rounded-md border flex flex-col items-center justify-between p-1.5 text-center transition ${owned ? "bg-hero text-primary-foreground shadow-card border-transparent" : "bg-muted/40 text-muted-foreground border-dashed"}`}
                              >
                                {qtd > 1 && (
                                  <Badge className="absolute -right-1 -top-1 bg-gold text-gold-foreground border-0">×{qtd - 1}</Badge>
                                )}

                                <div className="flex-1 flex items-center justify-center">
                                  <span className={`font-mono text-xs font-semibold ${owned ? "" : "opacity-70"}`}>{f.codigo}</span>
                                </div>

                                <div className="flex items-center justify-between w-full gap-1">
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant={owned ? "secondary" : "outline"}
                                    className="h-6 w-6 shrink-0"
                                    disabled={qtd <= 0 || setQty.isPending}
                                    onClick={() => setQty.mutate({ codigo: f.codigo, qtd: Math.max(0, qtd - 1) })}
                                    aria-label="Diminuir"
                                  >
                                    <Minus className="h-3 w-3" />
                                  </Button>
                                  <span className={`text-xs font-bold tabular-nums ${owned ? "" : "text-foreground/60"}`}>{qtd}</span>
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="default"
                                    className="h-6 w-6 shrink-0"
                                    disabled={setQty.isPending}
                                    onClick={() => setQty.mutate({ codigo: f.codigo, qtd: qtd + 1 })}
                                    aria-label="Adicionar"
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
