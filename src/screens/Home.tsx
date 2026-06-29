import { useAuth } from "../lib/auth";
import { useNav } from "../lib/nav";
import { useAsync, fetchServices, fetchProducts, fetchSettings } from "../lib/data";
import { supabase } from "../lib/supabase";
import { Card, Button, fmtCFA, useToast } from "../components/ui";
import { Logo } from "../components/Logo";
import {
  ServiceIcon,
  BagIcon,
  ReceiptIcon,
  BotIcon,
  ArrowRightIcon,
  BellIcon,
  CoinsIcon,
  TrendingIcon,
  SparkIcon,
  ChevronRightIcon,
} from "../lib/icons";
import type { Service, Product } from "../lib/types";

export default function Home() {
  const { profile } = useAuth();
  const { go } = useNav();
  const toast = useToast();
  const services = useAsync<Service[]>(fetchServices, []);
  const products = useAsync<Product[]>(fetchProducts, []);
  const settings = useAsync(fetchSettings, []);

  const counts = useAsync(async () => {
    const uid = profile?.id;
    if (!uid) return { svc: 0, prd: 0 };
    const [s, p] = await Promise.all([
      supabase.from("service_orders").select("id", { count: "exact", head: true }).eq("user_id", uid),
      supabase.from("product_orders").select("id", { count: "exact", head: true }).eq("user_id", uid),
    ]);
    return { svc: s.count || 0, prd: p.count || 0 };
  }, [profile?.id]);

  const isAdmin = profile?.role === "admin";

  const actions = [
    { icon: <SparkIcon className="h-5 w-5" />, label: "Services", to: { name: "services" } },
    { icon: <BagIcon className="h-5 w-5" />, label: "Boutique", to: { name: "store" } },
    { icon: <ReceiptIcon className="h-5 w-5" />, label: "Mes commandes", to: { name: "orders" } },
    { icon: <BotIcon className="h-5 w-5" />, label: "ADF IA", to: { name: "ai" } },
  ] as const;

  return (
    <div className="space-y-5 px-4 pb-28 pt-3">
      {/* Header */}
      <header className="flex items-center justify-between">
        <Logo size={36} />
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => toast({ type: "info", msg: "Aucune nouvelle notification." })}
            className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-cyan-200"
          >
            <BellIcon className="h-5 w-5" />
            <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-cyan-400" />
          </button>
          <button
            onClick={() => go({ name: "settings" })}
            className="h-10 rounded-xl gradient-brand px-3 text-xs font-bold text-ink-900"
          >
            {profile?.full_name?.split(" ")[0] || "Profil"}
          </button>
        </div>
      </header>

      {/* Greeting */}
      <div className="animate-fade">
        <p className="text-sm text-cyan-100/50">Bonjour 👋</p>
        <h1 className="text-xl font-bold text-cyan-50">
          {profile?.full_name || "Bienvenue"} 
          {isAdmin && <span className="ml-2 align-middle text-[10px] font-bold uppercase text-cyan-300">Admin</span>}
        </h1>
      </div>

      {/* Announcement */}
      {settings.data?.store_announcement && (
        <div className="glass flex items-start gap-2.5 rounded-2xl p-3.5 animate-fade">
          <SparkIcon className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
          <p className="text-[13px] leading-snug text-cyan-100/80">
            {settings.data.store_announcement}
          </p>
        </div>
      )}

      {/* AI hero */}
      <button
        onClick={() => go({ name: "ai" })}
        className="relative w-full overflow-hidden rounded-3xl p-[1.5px] text-left animate-slide-up"
      >
        <div className="absolute inset-0 gradient-brand opacity-90" />
        <div className="relative flex items-center gap-4 rounded-3xl bg-ink-900/80 p-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl gradient-brand text-ink-900 neon-ring">
            <BotIcon className="h-8 w-8" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-cyan-50">ADF IA</h3>
              <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                En ligne
              </span>
            </div>
            <p className="mt-0.5 text-[13px] text-cyan-100/60">
              Votre assistant intelligent pour commander et explorer ADF.
            </p>
          </div>
          <ArrowRightIcon className="h-5 w-5 shrink-0 text-cyan-300" />
        </div>
      </button>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <div className="flex items-center justify-between">
            <ReceiptIcon className="h-5 w-5 text-cyan-300" />
            <TrendingIcon className="h-4 w-4 text-emerald-300/70" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-cyan-50">{counts.data?.svc ?? "–"}</p>
          <p className="text-xs text-cyan-100/50">Commandes services</p>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <BagIcon className="h-5 w-5 text-cyan-300" />
            <CoinsIcon className="h-4 w-4 text-amber-300/70" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-cyan-50">{counts.data?.prd ?? "–"}</p>
          <p className="text-xs text-cyan-100/50">Commandes boutique</p>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-4 gap-2">
        {actions.map((a) => (
          <button
            key={a.label}
            onClick={() => go(a.to as any)}
            className="flex flex-col items-center gap-2 rounded-2xl bg-white/[0.04] p-3 text-center transition active:scale-95"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
              {a.icon}
            </span>
            <span className="text-[11px] font-medium leading-tight text-cyan-100/70">
              {a.label}
            </span>
          </button>
        ))}
      </div>

      {isAdmin && (
        <Button full variant="outline" onClick={() => go({ name: "admin" })}>
          <SparkIcon className="h-4 w-4" /> Panneau d'administration
        </Button>
      )}

      {/* Services */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-bold text-cyan-50">Nos services</h2>
          <button
            onClick={() => go({ name: "services" })}
            className="flex items-center text-xs text-cyan-300"
          >
            Tout voir <ChevronRightIcon className="h-4 w-4" />
          </button>
        </div>
        <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 no-scrollbar">
          {(services.data || []).slice(0, 6).map((s) => (
            <button
              key={s.id}
              onClick={() => go({ name: "services", params: { select: s.id } })}
              className="w-36 shrink-0 rounded-2xl bg-white/[0.04] p-3 text-left transition active:scale-95"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl gradient-brand text-ink-900">
                <ServiceIcon name={s.icon} className="h-5 w-5" />
              </span>
              <p className="mt-2 text-sm font-semibold leading-tight text-cyan-50">{s.name}</p>
              <p className="mt-1 text-xs text-cyan-300/70">dès {fmtCFA(s.base_price)}</p>
            </button>
          ))}
          {services.data?.length === 0 && (
            <p className="px-1 text-sm text-cyan-100/40">Aucun service publié.</p>
          )}
        </div>
      </section>

      {/* Products */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-bold text-cyan-50">Boutique digitale</h2>
          <button
            onClick={() => go({ name: "store" })}
            className="flex items-center text-xs text-cyan-300"
          >
            Tout voir <ChevronRightIcon className="h-4 w-4" />
          </button>
        </div>
        <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 no-scrollbar">
          {(products.data || []).slice(0, 6).map((p) => (
            <button
              key={p.id}
              onClick={() => go({ name: "store", params: { select: p.id } })}
              className="w-40 shrink-0 overflow-hidden rounded-2xl bg-white/[0.04] text-left transition active:scale-95"
            >
              <div className="aspect-square w-full bg-ink-900/60">
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-cyan-300/30">
                    <BagIcon className="h-8 w-8" />
                  </div>
                )}
              </div>
              <div className="p-2.5">
                <p className="truncate text-sm font-semibold text-cyan-50">{p.name}</p>
                <p className="mt-0.5 text-xs text-cyan-300/80">{fmtCFA(p.price)}</p>
              </div>
            </button>
          ))}
          {products.data?.length === 0 && (
            <p className="px-1 text-sm text-cyan-100/40">Boutique vide pour le moment.</p>
          )}
        </div>
      </section>

      <footer className="pt-4 text-center">
        <p className="text-[11px] text-cyan-100/30">
          © {new Date().getFullYear()} ADF — Arafat Digital Futurist
        </p>
        <p className="text-[11px] text-cyan-100/30">Conçue par le PDG, M. Arafat Garga</p>
      </footer>
    </div>
  );
}
