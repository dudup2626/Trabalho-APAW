import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { agruparPorGrupoESelecao } from "@/lib/grupos";
import { Popover, PopoverContent, PopoverTrigger, PopoverAnchor } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { X, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/trocas/nova")({
  component: NovaTroca,
});

const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const fuzzyMatch = (s: string, q: string) => {
  if (!q) return true;
  const a = norm(s), b = norm(q);
  let i = 0;
  for (const ch of a) { if (ch === b[i]) i++; if (i === b.length) return true; }
  return i === b.length;
};

function NovaTroca() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [nomeAmigo, setNomeAmigo] = useState("");
  const [amigoOpen, setAmigoOpen] = useState(false);
  const [dadas, setDadas] = useState<string[]>([]);
  const [recebidas, setRecebidas] = useState<string[]>([]);

  const { data: figs = [] } = useQuery({
    queryKey: ["figs"],
    queryFn: async () => (await supabase.from("figurinhas_oficiais").select("*").order("codigo")).data ?? [],
  });
  const { data: inv = [] } = useQuery({
    queryKey: ["inv", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("inventario_usuario").select("*").eq("user_id", user!.id)).data ?? [],
  });
  const { data: trocasPrev = [] } = useQuery({
    queryKey: ["trocas-amigos", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("trocas_realizadas").select("nome_amigo").eq("user_id", user!.id)).data ?? [],
  });

  const amigosUnicos = useMemo(() => {
    const set = new Map<string, string>();
    for (const t of trocasPrev) {
      const k = norm(t.nome_amigo.trim());
      if (k && !set.has(k)) set.set(k, t.nome_amigo.trim());
    }
    return Array.from(set.values()).sort((a, b) => a.localeCompare(b, "pt"));
  }, [trocasPrev]);

  const sugestoesAmigos = useMemo(() => {
    const q = nomeAmigo.trim();
    if (!q) return amigosUnicos.slice(0, 8);
    return amigosUnicos.filter(a => fuzzyMatch(a, q) && norm(a) !== norm(q)).slice(0, 8);
  }, [amigosUnicos, nomeAmigo]);

  const figMap = useMemo(() => new Map(figs.map(f => [f.codigo, f])), [figs]);

  const disponiveisParaDar = useMemo(() => {
    const qMap = new Map(inv.filter(i => i.quantidade > 1).map(i => [i.figurinha_codigo, i.quantidade]));
    return figs.filter(f => qMap.has(f.codigo)).map(f => ({ ...f, quantidade: qMap.get(f.codigo)! }));
  }, [inv, figs]);
  const secoesDar = useMemo(() => agruparPorGrupoESelecao(disponiveisParaDar), [disponiveisParaDar]);
  const secoesReceber = useMemo(() => agruparPorGrupoESelecao(figs), [figs]);

  const countBy = (arr: string[]) => arr.reduce<Record<string, number>>((a, c) => { a[c] = (a[c] ?? 0) + 1; return a; }, {});
  const dadasCount = countBy(dadas);

  const maxDarPorCodigo = (codigo: string) => {
    const q = inv.find(i => i.figurinha_codigo === codigo)?.quantidade ?? 0;
    return Math.max(0, q - 1);
  };

  const adicionarDada = (codigo: string) => {
    const max = maxDarPorCodigo(codigo);
    if ((dadasCount[codigo] ?? 0) + 1 > max) {
      toast.error("Você precisa manter ao menos 1 unidade dessa figurinha no álbum");
      return;
    }
    setDadas(d => [...d, codigo]);
  };
  const adicionarRecebida = (codigo: string) => setRecebidas(r => [...r, codigo]);
  const removerDada = (i: number) => setDadas(dadas.filter((_, idx) => idx !== i));
  const removerRecebida = (i: number) => setRecebidas(recebidas.filter((_, idx) => idx !== i));

  const mut = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Não autenticado");
      if (!nomeAmigo.trim()) throw new Error("Informe o nome do amigo");
      if (dadas.length === 0 || recebidas.length === 0) throw new Error("Adicione ao menos uma figurinha dada e uma recebida");

      for (const [cod, n] of Object.entries(dadasCount)) {
        const item = inv.find(i => i.figurinha_codigo === cod);
        if (!item || item.quantidade - n < 1) throw new Error(`Você precisa manter ao menos 1 unidade de ${cod} no álbum`);
      }

      const grupoId = crypto.randomUUID();
      // Cada lado é gravado em linhas independentes; usamos '' no lado oposto como sentinela
      // (campos NOT NULL exigem valor, mas não-vazio não é exigido). A exibição filtra ''.
      const rowsDadas = dadas.map(c => ({
        user_id: user.id,
        nome_amigo: nomeAmigo.trim(),
        figurinha_dada: c,
        figurinha_recebida: null,
        troca_grupo_id: grupoId,
      }));
      const rowsRecebidas = recebidas.map(c => ({
        user_id: user.id,
        nome_amigo: nomeAmigo.trim(),
        figurinha_dada: null,
        figurinha_recebida: c,
        troca_grupo_id: grupoId,
      }));

      const { error: e1 } = await supabase.from("trocas_realizadas").insert([...rowsDadas, ...rowsRecebidas]);
      if (e1) throw e1;

      const delta = new Map<string, number>();
      dadas.forEach(c => delta.set(c, (delta.get(c) ?? 0) - 1));
      recebidas.forEach(c => delta.set(c, (delta.get(c) ?? 0) + 1));

      for (const [cod, d] of delta.entries()) {
        const existing = inv.find(i => i.figurinha_codigo === cod);
        if (existing) {
          const novaQtd = Math.max(0, existing.quantidade + d);
          const { error } = await supabase
            .from("inventario_usuario")
            .update({ quantidade: novaQtd, updated_at: new Date().toISOString() })
            .eq("id", existing.id);
          if (error) throw error;
        } else if (d > 0) {
          const { error } = await supabase.from("inventario_usuario").insert({
            user_id: user.id, figurinha_codigo: cod, quantidade: d,
          });
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success("Troca registrada!");
      navigate({ to: "/trocas" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const renderBadge = (codigo: string, onRemove: () => void) => {
    const f = figMap.get(codigo);
    return (
      <Badge variant="secondary" className="gap-1 pl-2 pr-1 py-1">
        <span className="font-mono text-xs">{codigo}</span>
        {f && <span className="text-xs">· {f.jogador}</span>}
        <button type="button" onClick={onRemove} className="ml-1 rounded hover:bg-muted-foreground/20 p-0.5">
          <X className="h-3 w-3" />
        </button>
      </Badge>
    );
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Registrar nova troca</CardTitle>
          <CardDescription>Adicione as figurinhas dadas e recebidas. As quantidades não precisam ser iguais.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={e => { e.preventDefault(); mut.mutate(); }} className="space-y-5">
            <div>
              <Label>Com quem você trocou?</Label>
              <Popover open={amigoOpen && sugestoesAmigos.length > 0} onOpenChange={setAmigoOpen}>
                <PopoverAnchor asChild>
                  <Input
                    value={nomeAmigo}
                    onChange={e => { setNomeAmigo(e.target.value); setAmigoOpen(true); }}
                    onFocus={() => setAmigoOpen(true)}
                    onBlur={() => setTimeout(() => setAmigoOpen(false), 150)}
                    placeholder="Nome do amigo"
                    autoComplete="off"
                  />
                </PopoverAnchor>
                <PopoverContent
                  className="p-1 w-(--radix-popover-trigger-width)"
                  align="start"
                  onOpenAutoFocus={e => e.preventDefault()}
                >
                  <div className="text-xs text-muted-foreground px-2 py-1">Trocas anteriores</div>
                  {sugestoesAmigos.map(a => (
                    <button
                      key={a}
                      type="button"
                      className="w-full text-left px-2 py-1.5 text-sm rounded-sm hover:bg-accent"
                      onMouseDown={e => { e.preventDefault(); setNomeAmigo(a); setAmigoOpen(false); }}
                    >
                      {a}
                    </button>
                  ))}
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label>Figurinhas que você deu ({dadas.length})</Label>
              {disponiveisParaDar.length === 0 ? (
                <p className="text-sm text-muted-foreground mt-1">Você ainda não tem figurinhas repetidas (com 2+ unidades) para trocar.</p>
              ) : (
                <FigurinhaCombobox
                  placeholder="Buscar por código, jogador ou seleção…"
                  secoes={secoesDar}
                  getRestante={(cod) => maxDarPorCodigo(cod) - (dadasCount[cod] ?? 0)}
                  onSelect={adicionarDada}
                />
              )}
              {dadas.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {dadas.map((c, i) => <span key={`${c}-${i}`}>{renderBadge(c, () => removerDada(i))}</span>)}
                </div>
              )}
            </div>

            <div>
              <Label>Figurinhas que você recebeu ({recebidas.length})</Label>
              <FigurinhaCombobox
                placeholder="Buscar por código, jogador ou seleção…"
                secoes={secoesReceber}
                onSelect={adicionarRecebida}
              />
              {recebidas.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {recebidas.map((c, i) => <span key={`${c}-${i}`}>{renderBadge(c, () => removerRecebida(i))}</span>)}
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => navigate({ to: "/trocas" })}>Cancelar</Button>
              <Button type="submit" disabled={mut.isPending}>{mut.isPending ? "Salvando…" : "Salvar troca"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

type Secao = ReturnType<typeof agruparPorGrupoESelecao>;

function FigurinhaCombobox({
  secoes, onSelect, placeholder, getRestante,
}: {
  secoes: Secao;
  onSelect: (codigo: string) => void;
  placeholder: string;
  getRestante?: (codigo: string) => number;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" role="combobox" className="w-full justify-between mt-1 font-normal">
          <span className="text-muted-foreground">{placeholder}</span>
          <ChevronsUpDown className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-(--radix-popover-trigger-width)" align="start">
        <Command
          filter={(value, search) => {
            if (!search) return 1;
            const v = norm(value);
            const s = norm(search);
            return v.includes(s) ? 1 : 0;
          }}
        >
          <CommandInput placeholder="Digite código, jogador ou seleção…" />
          <CommandList className="max-h-72">
            <CommandEmpty>Nenhuma figurinha encontrada.</CommandEmpty>
            {secoes.map(({ grupo, selecoes }) => (
              <CommandGroup key={grupo} heading={grupo}>
                {selecoes.flatMap(s => s.figurinhas).map(f => {
                  const restante = getRestante ? getRestante(f.codigo) : undefined;
                  const disabled = restante !== undefined && restante <= 0;
                  return (
                    <CommandItem
                      key={f.codigo}
                      value={`${f.codigo}|${f.jogador}|${f.selecao}`}
                      disabled={disabled}
                      onSelect={() => { if (!disabled) { onSelect(f.codigo); setOpen(false); } }}
                      className={cn(disabled && "opacity-50")}
                    >
                      <span className="font-mono text-xs mr-2">{f.codigo}</span>
                      <span className="flex-1 truncate">{f.jogador} · {f.selecao}</span>
                      {restante !== undefined && (
                        <span className="text-xs text-muted-foreground ml-2">{restante} disp.</span>
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
