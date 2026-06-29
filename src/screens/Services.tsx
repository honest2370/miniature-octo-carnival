import { useEffect, useState } from "react";
import { useNav } from "../lib/nav";
import { useAuth } from "../lib/auth";
import { useAsync, fetchServices } from "../lib/data";
import { supabase, uploadFile } from "../lib/supabase";
import {
  Card,
  Button,
  Input,
  Textarea,
  Field,
  Sheet,
  Badge,
  fmtCFA,
  EmptyState,
  Spinner,
  useToast,
  cn,
} from "../components/ui";
import {
  ServiceIcon,
  ClockIcon,
  PlusIcon,
  BagIcon,
  ChevronLeftIcon,
  CheckCircleIcon,
} from "../lib/icons";
import type { Service } from "../lib/types";

const STYLES = ["Moderne", "Minimaliste", "Luxe", "Coloré", "Corporate", "Créatif"];

export default function Services() {
  const { profile } = useAuth();
  const toast = useToast();
  const { go, back, route } = useNav();
  const { data, loading } = useAsync<Service[]>(fetchServices, []);
  const [active, setActive] = useState<Service | null>(null);
  const [cat, setCat] = useState("Tous");

  // Ouvrir directement le formulaire si sélection depuis l'accueil
  useEffect(() => {
    const sel = route.params?.select;
    if (sel && data) {
      const s = data.find((x) => x.id === sel);
      if (s) setActive(s);
    }
  }, [route.params?.select, data]);

  const cats = ["Tous", ...Array.from(new Set((data || []).map((s) => s.category)))];
  const list = (data || []).filter((s) => cat === "Tous" || s.category === cat);

  return (
    <div className="min-h-full">
      <Header back={back} title="Services" subtitle="Commandez une prestation sur mesure" />

      <div className="px-4 pb-28 pt-2">
        <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 no-scrollbar">
          {cats.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={cn(
                "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition",
                cat === c
                  ? "gradient-brand border-transparent text-ink-900"
                  : "border-white/10 text-cyan-100/60"
              )}
            >
              {c}
            </button>
          ))}
        </div>

        {loading && (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        )}

        {!loading && list.length === 0 && (
          <EmptyState
            icon={<BagIcon className="h-7 w-7" />}
            title="Aucun service"
            desc="Les services apparaîtront ici une fois publiés par l'administrateur."
          />
        )}

        <div className="space-y-3">
          {list.map((s) => (
            <Card key={s.id} className="flex gap-3.5">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl gradient-brand text-ink-900">
                <ServiceIcon name={s.icon} className="h-6 w-6" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-cyan-50">{s.name}</h3>
                  <Badge tone="cyan">{s.category}</Badge>
                </div>
                <p className="mt-1 line-clamp-2 text-[13px] text-cyan-100/55">{s.description}</p>
                <div className="mt-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-cyan-100/60">
                    <span className="font-semibold text-cyan-200">{fmtCFA(s.base_price)}</span>
                    <span className="flex items-center gap-1">
                      <ClockIcon className="h-3.5 w-3.5" /> ~{s.delivery_days}j
                    </span>
                  </div>
                  <Button size="sm" onClick={() => setActive(s)}>
                    <PlusIcon className="h-4 w-4" /> Commander
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {active && (
        <OrderSheet
          service={active}
          onClose={() => setActive(null)}
          onCreated={(id) => {
            setActive(null);
            toast({ type: "success", msg: "Commande envoyée ! Suivi en cours." });
            go({ name: "order-detail", params: { id } });
          }}
          userId={profile?.id || ""}
        />
      )}
    </div>
  );
}

function OrderSheet({
  service,
  onClose,
  onCreated,
  userId,
}: {
  service: Service;
  onClose: () => void;
  onCreated: (id: string) => void;
  userId: string;
}) {
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [brief, setBrief] = useState("");
  const [budget, setBudget] = useState(String(service.base_price));
  const [deadline, setDeadline] = useState("");
  const [colors, setColors] = useState("");
  const [styles, setStyles] = useState<string[]>([]);
  const [refFile, setRefFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const toggleStyle = (s: string) =>
    setStyles((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]));

  const submit = async () => {
    if (!brief.trim()) {
      toast({ type: "error", msg: "Décrivez votre projet." });
      return;
    }
    setSaving(true);
    let refUrl: string | null = null;
    if (refFile) {
      const up = await uploadFile(userId, refFile, "references");
      refUrl = up?.url ?? null;
    }
    const details: Record<string, any> = {
      style: styles,
      colors: colors.trim(),
      deadline: deadline.trim(),
      reference: refUrl,
    };
    const { data, error } = await supabase
      .from("service_orders")
      .insert({
        user_id: userId,
        service_id: service.id,
        title: title.trim() || service.name,
        brief: brief.trim(),
        details,
        budget: Number(budget) || service.base_price,
        status: "pending",
      })
      .select("id")
      .single();
    setSaving(false);
    if (error || !data) {
      toast({ type: "error", msg: "Impossible d'envoyer la commande." });
      return;
    }
    // message système initial
    await supabase.from("order_messages").insert({
      order_id: data.id,
      sender_role: "system",
      kind: "text",
      content: `Commande « ${title.trim() || service.name} » reçue. Notre équipe examine votre demande et vous répondra avec une facture.`,
    });
    onCreated(data.id);
  };

  return (
    <Sheet open onClose={onClose} title={`Commander — ${service.name}`}>
      <div className="space-y-3.5">
        <div className="flex items-center gap-3 rounded-2xl bg-cyan-400/5 p-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl gradient-brand text-ink-900">
            <ServiceIcon name={service.icon} className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-cyan-50">{service.name}</p>
            <p className="text-xs text-cyan-300/70">Tarif indicatif : {fmtCFA(service.base_price)}</p>
          </div>
        </div>

        <Field label="Titre du projet">
          <Input
            placeholder={`Ex. Logo pour ma marque`}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </Field>

        <Field label="Décrivez votre besoin en détail *">
          <Textarea
            placeholder="Objectif, public cible, idées, exemples à suivre..."
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
          />
        </Field>

        <Field label="Style recherché">
          <div className="flex flex-wrap gap-2">
            {STYLES.map((s) => (
              <button
                key={s}
                onClick={() => toggleStyle(s)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs transition",
                  styles.includes(s)
                    ? "gradient-brand border-transparent text-ink-900"
                    : "border-white/10 text-cyan-100/60"
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Budget (FCFA)">
            <Input
              type="number"
              inputMode="numeric"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
            />
          </Field>
          <Field label="Délai souhaité">
            <Input
              placeholder="Ex. 5 jours"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </Field>
        </div>

        <Field label="Couleurs / références textuelles">
          <Input
            placeholder="Ex. bleu néon & blanc"
            value={colors}
            onChange={(e) => setColors(e.target.value)}
          />
        </Field>

        <FilePicker label="Image de référence (optionnel)" file={refFile} onPick={setRefFile} />

        <div className="flex items-start gap-2 rounded-2xl bg-white/[0.03] p-3 text-[11px] text-cyan-100/50">
          <CheckCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300/80" />
          <span>
            Après envoi, l'administrateur examine votre demande, fixe une facture et échange avec
            vous dans la messagerie de la commande.
          </span>
        </div>

        <Button full size="lg" loading={saving} onClick={submit}>
          Envoyer la commande
        </Button>
      </div>
    </Sheet>
  );
}

export function FilePicker({
  label,
  file,
  onPick,
  accept = "image/*",
}: {
  label: string;
  file: File | null;
  onPick: (f: File | null) => void;
  accept?: string;
}) {
  return (
    <Field label={label}>
      <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-white/15 bg-ink-900/40 p-3 transition hover:border-cyan-400/40">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
          <PlusIcon className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm text-cyan-100/80">
            {file ? file.name : "Téléverser un fichier"}
          </span>
          <span className="block text-[11px] text-cyan-100/40">
            {file ? `${(file.size / 1024).toFixed(0)} Ko` : "Cliquez pour choisir"}
          </span>
        </span>
        <input
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => onPick(e.target.files?.[0] || null)}
        />
      </label>
    </Field>
  );
}

export function Header({
  title,
  subtitle,
  back,
  right,
}: {
  title: string;
  subtitle?: string;
  back: () => void;
  right?: React.ReactNode;
}) {
  return (
    <div className="sticky top-0 z-30 glass-strong px-4 pb-3 pt-3 safe-top">
      <div className="flex items-center gap-2">
        <button
          onClick={back}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-cyan-100 active:scale-90"
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold text-cyan-50">{title}</h1>
          {subtitle && <p className="truncate text-xs text-cyan-100/50">{subtitle}</p>}
        </div>
        {right}
      </div>
    </div>
  );
}
