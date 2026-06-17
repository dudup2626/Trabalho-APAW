import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trash2, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/trocas/$id")({
  component: EditTroca,
});

function EditTroca() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [nomeAmigo, setNomeAmigo] = useState("");

  // id é o troca_grupo_id (compatível com registros antigos onde grupo == id da linha)
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["troca-grupo", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("trocas_realizadas")
        .select("*")
        .or(`troca_grupo_id.eq.${id},id.eq.${id}`);
      return data ?? [];
    },
  });

  const troca = rows[0];
  const { dadasCount, recebidasCount, dadasList, recebidasList, data } = useMemo(() => {
    const dadasCount: Record<string, number> = {};
    const recebidasCount: Record<string, number> = {};
    for (const r of rows) {
      if (r.figurinha_dada) dadasCount[r.figurinha_dada] = (dadasCount[r.figurinha_dada] ?? 0) + 1;
      if (r.figurinha_recebida) recebidasCount[r.figurinha_recebida] = (recebidasCount[r.figurinha_recebida] ?? 0) + 1;
    }
    const data = rows.reduce<string | null>((acc, r) => (!acc || new Date(r.data) > new Date(acc) ? r.data : acc), null);
    const dadasList = Object.keys(dadasCount);
    const recebidasList = Object.keys(recebidasCount);
    return { dadasCount, recebidasCount, dadasList, recebidasList, data };
  }, [rows]);
  const totalDadas = Object.values(dadasCount).reduce((a, b) => a + b, 0);
  const totalRecebidas = Object.values(recebidasCount).reduce((a, b) => a + b, 0);

  useEffect(() => { if (troca) setNomeAmigo(troca.nome_amigo); }, [troca]);

  const updateName = useMutation({
    mutationFn: async () => {
      if (!nomeAmigo.trim()) throw new Error("Nome obrigatório");
      const ids = rows.map(r => r.id);
      const { error } = await supabase.from("trocas_realizadas").update({ nome_amigo: nomeAmigo.trim() }).in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries(); toast.success("Atualizado"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async () => {
      if (!user || rows.length === 0) throw new Error("Não encontrado");

      // Reverte estoque: +1 para cada figurinha dada distinta, -1 para cada recebida distinta
      const { data: inv } = await supabase
        .from("inventario_usuario")
        .select("*")
        .eq("user_id", user.id)
        .in("figurinha_codigo", [...dadasList, ...recebidasList]);

      for (const [cod, n] of Object.entries(dadasCount)) {
        const it = inv?.find(i => i.figurinha_codigo === cod);
        if (it) {
          await supabase.from("inventario_usuario").update({ quantidade: it.quantidade + n, updated_at: new Date().toISOString() }).eq("id", it.id);
        } else {
          await supabase.from("inventario_usuario").insert({ user_id: user.id, figurinha_codigo: cod, quantidade: n });
        }
      }
      for (const [cod, n] of Object.entries(recebidasCount)) {
        const it = inv?.find(i => i.figurinha_codigo === cod);
        if (it && it.quantidade > 0) {
          await supabase.from("inventario_usuario").update({ quantidade: Math.max(0, it.quantidade - n), updated_at: new Date().toISOString() }).eq("id", it.id);
        }
      }
      const ids = rows.map(r => r.id);
      const { error } = await supabase.from("trocas_realizadas").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries(); toast.success("Troca excluída e estoque revertido"); navigate({ to: "/trocas" }); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <p>Carregando…</p>;
  if (!troca) return <p>Troca não encontrada.</p>;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Detalhes da troca</CardTitle>
          <CardDescription>Data: {data ? new Date(data).toLocaleString("pt-BR") : "—"}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground mb-2">Você deu ({totalDadas})</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(dadasCount).map(([c, n]) => (
                  <Badge key={c} variant="secondary" className="font-mono">{c}{n > 1 ? ` ×${n}` : ""}</Badge>
                ))}
              </div>
            </div>
            <div className="flex justify-center"><ArrowRight className="h-4 w-4 text-muted-foreground" /></div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground mb-2">Você recebeu ({totalRecebidas})</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(recebidasCount).map(([c, n]) => (
                  <Badge key={c} variant="secondary" className="font-mono">{c}{n > 1 ? ` ×${n}` : ""}</Badge>
                ))}
              </div>
            </div>
          </div>
          <div>
            <Label>Nome do amigo</Label>
            <Input value={nomeAmigo} onChange={e => setNomeAmigo(e.target.value)} />
          </div>
          <div className="flex justify-between">
            <Button variant="destructive" onClick={() => { if (confirm("Excluir a troca e reverter o estoque?")) del.mutate(); }} disabled={del.isPending}>
              <Trash2 className="h-4 w-4 mr-1" /> Excluir
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate({ to: "/trocas" })}>Voltar</Button>
              <Button onClick={() => updateName.mutate()} disabled={updateName.isPending}>Salvar</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
