import { useCallback, useEffect, useRef, useState } from "react";
import { useNav } from "../lib/nav";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";
import {
  fetchAiConfig,
  generateReply,
  AI_SUGGESTIONS,
  type AiConfigResp,
  type AiContext,
  type AiMsg,
} from "../lib/ai";
import { fetchServices, fetchProducts } from "../lib/data";
import {
  Button,
  IconButton,
  Sheet,
  EmptyState,
  useToast,
  cn,
} from "../components/ui";
import { LogoMark } from "../components/Logo";
import {
  SendIcon,
  PlusIcon,
  ChevronLeftIcon,
  BotIcon,
  TrashIcon,
  MenuIcon,
  CheckCircleIcon,
  SparkIcon,
} from "../lib/icons";
import type { AiSession, AiMessage, Service, Product } from "../lib/types";

export default function AIChat() {
  const { route, go, back } = useNav();
  const { profile, refreshProfile } = useAuth();
  const toast = useToast();

  const sessionId = route.params?.session as string | undefined;

  const [sessions, setSessions] = useState<AiSession[]>([]);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [config, setConfig] = useState<AiConfigResp | null>(null);
  const [source, setSource] = useState<"online" | "local" | null>(null);
  const [ctx, setCtx] = useState<AiContext>({ services: [], products: [] });
  const [drawer, setDrawer] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadSessions = useCallback(async () => {
    if (!profile?.id) return;
    const { data } = await supabase
      .from("ai_sessions")
      .select("*")
      .eq("user_id", profile.id)
      .order("updated_at", { ascending: false });
    setSessions((data as AiSession[]) || []);
  }, [profile?.id]);

  const loadMessages = useCallback(async (sid: string) => {
    const { data } = await supabase
      .from("ai_messages")
      .select("*")
      .eq("session_id", sid)
      .order("created_at", { ascending: true });
    setMessages((data as AiMessage[]) || []);
  }, []);

  useEffect(() => {
    loadSessions();
    fetchAiConfig().then(setConfig);
    Promise.all([fetchServices(), fetchProducts()]).then(([s, p]) =>
      setCtx({ services: s as Service[], products: p as Product[] })
    );
  }, [loadSessions]);

  useEffect(() => {
    if (sessionId) loadMessages(sessionId);
    else setMessages([]);
  }, [sessionId, loadMessages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  const startChat = async (text: string) => {
    if (!profile) return;
    const { data, error } = await supabase
      .from("ai_sessions")
      .insert({ user_id: profile.id, title: text.slice(0, 40) || "Nouvelle conversation" })
      .select()
      .single();
    if (error || !data) {
      toast({ type: "error", msg: "Impossible de créer la conversation." });
      return;
    }
    await send(data.id, text);
    go({ name: "ai", params: { session: data.id } });
    loadSessions();
  };

  const send = async (sid: string, text: string) => {
    if (!profile || !text.trim()) return;
    if (profile.ai_message_count >= profile.ai_message_limit) {
      toast({
        type: "error",
        msg: `Limite atteinte (${profile.ai_message_limit} messages). Contactez l'administrateur.`,
      });
      return;
    }
    const history: AiMsg[] = [
      ...messages.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: text },
    ];
    await supabase.from("ai_messages").insert({ session_id: sid, role: "user", content: text });
    await loadMessages(sid);
    setInput("");
    setBusy(true);
    try {
      const { text: reply, source: src } = await generateReply(history, config, ctx);
      setSource(src);
      await supabase.from("ai_messages").insert({ session_id: sid, role: "assistant", content: reply });
    } catch {
      await supabase
        .from("ai_messages")
        .insert({ session_id: sid, role: "assistant", content: "Désolé, une erreur est survenue. Réessayez." });
    }
    setBusy(false);
    await loadMessages(sid);
    refreshProfile();
    loadSessions();
  };

  const del = async (id: string) => {
    await supabase.from("ai_sessions").delete().eq("id", id);
    if (sessionId === id) go({ name: "ai" });
    loadSessions();
  };

  const limit = profile?.ai_message_limit || 0;
  const used = profile?.ai_message_count || 0;

  return (
    <div className="flex h-full flex-col">
      {/* header */}
      <div className="glass-strong safe-top z-30 flex items-center gap-2 px-3 pb-2.5 pt-3">
        <button
          onClick={back}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-cyan-100 active:scale-90"
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </button>
        <button onClick={() => setDrawer(true)} className="flex min-w-0 flex-1 items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl gradient-brand text-ink-900">
            <BotIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0 text-left">
            <p className="truncate text-sm font-bold text-cyan-50">ADF IA</p>
            <p className="flex items-center gap-1 text-[10px] text-cyan-100/50">
              {config?.ai_enabled && config?.api_key ? (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> En ligne · {config.provider}
                </>
              ) : (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> Mode local
                </>
              )}
            </p>
          </div>
        </button>
        <IconButton onClick={() => go({ name: "ai" })} aria-label="Nouvelle conversation">
          <PlusIcon className="h-5 w-5" />
        </IconButton>
        <IconButton onClick={() => setDrawer(true)} aria-label="Conversations">
          <MenuIcon className="h-5 w-5" />
        </IconButton>
      </div>

      {/* messages / home */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 no-scrollbar">
        {!sessionId ? (
          <AIHome sessions={sessions} onPick={(id) => go({ name: "ai", params: { session: id } })} onNew={startChat} />
        ) : messages.length === 0 && !busy ? (
          <EmptyState icon={<BotIcon className="h-7 w-7" />} title="Démarrez la conversation" />
        ) : (
          <div className="space-y-4">
            {messages.map((m) => (
              <MsgBubble key={m.id} role={m.role} content={m.content} />
            ))}
            {busy && <Typing />}
          </div>
        )}
      </div>

      {/* limit bar */}
      <div className="px-4">
        <div className="mb-1 flex items-center justify-between text-[10px] text-cyan-100/40">
          <span>Messages : {used}/{limit}</span>
          {source && (
            <span className="flex items-center gap-1">
              <CheckCircleIcon className="h-3 w-3" />
              {source === "online" ? "Réponse IA en ligne" : "Mode hors-ligne"}
            </span>
          )}
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-white/8">
          <div
            className="h-full gradient-brand transition-all"
            style={{ width: `${limit ? Math.min(100, (used / limit) * 100) : 0}%` }}
          />
        </div>
      </div>

      {/* composer */}
      <div className="safe-bottom px-3 pb-2.5 pt-2">
        <div className="flex items-end gap-2">
          <textarea
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (sessionId) send(sessionId, input);
                else if (input.trim()) startChat(input);
              }
            }}
            placeholder="Écrivez à ADF IA..."
            className="max-h-28 min-h-[44px] flex-1 resize-none rounded-2xl border border-white/10 bg-ink-900/60 px-4 py-2.5 text-[15px] text-cyan-50 placeholder:text-cyan-100/30 outline-none focus:border-cyan-400/60"
          />
          <button
            onClick={() => {
              if (sessionId) send(sessionId, input);
              else if (input.trim()) startChat(input);
            }}
            disabled={busy || !input.trim()}
            className="flex h-11 w-11 items-center justify-center rounded-2xl gradient-brand text-ink-900 active:scale-90 disabled:opacity-40"
          >
            <SendIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* sessions drawer */}
      <Sheet open={drawer} onClose={() => setDrawer(false)} title="Conversations">
        <Button
          full
          className="mb-3"
          onClick={() => {
            setDrawer(false);
            go({ name: "ai" });
          }}
        >
          <PlusIcon className="h-4 w-4" /> Nouvelle conversation
        </Button>
        {sessions.length === 0 ? (
          <p className="py-6 text-center text-sm text-cyan-100/40">Aucune conversation sauvegardée.</p>
        ) : (
          <div className="space-y-2">
            {sessions.map((s) => (
              <div
                key={s.id}
                className={cn(
                  "flex items-center gap-2 rounded-2xl p-3",
                  s.id === sessionId ? "bg-cyan-400/10" : "bg-white/[0.04]"
                )}
              >
                <button
                  className="min-w-0 flex-1 text-left"
                  onClick={() => {
                    setDrawer(false);
                    go({ name: "ai", params: { session: s.id } });
                  }}
                >
                  <p className="truncate text-sm font-medium text-cyan-50">{s.title}</p>
                  <p className="text-[10px] text-cyan-100/40">
                    {new Date(s.updated_at).toLocaleDateString("fr-FR")}
                  </p>
                </button>
                <button onClick={() => del(s.id)} className="p-2 text-rose-300/70">
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Sheet>
    </div>
  );
}

function AIHome({
  sessions,
  onPick,
  onNew,
}: {
  sessions: AiSession[];
  onPick: (id: string) => void;
  onNew: (text: string) => void;
}) {
  return (
    <div className="animate-fade">
      <div className="flex flex-col items-center py-6 text-center">
        <LogoMark size={56} />
        <h2 className="mt-3 text-lg font-bold text-cyan-50">Bonjour, je suis ADF IA</h2>
        <p className="mt-1 max-w-xs text-sm text-cyan-100/55">
          Votre assistant pour découvrir nos services, commander et explorer la boutique.
        </p>
      </div>

      <div className="space-y-2">
        {AI_SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => onNew(s)}
            className="flex w-full items-center gap-3 rounded-2xl bg-white/[0.04] p-3 text-left transition active:scale-[.98]"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
              <SparkIcon className="h-4 w-4" />
            </span>
            <span className="flex-1 text-sm text-cyan-100/80">{s}</span>
          </button>
        ))}
      </div>

      {sessions.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 text-xs font-semibold text-cyan-100/50">Récentes</p>
          <div className="space-y-2">
            {sessions.slice(0, 4).map((s) => (
              <button
                key={s.id}
                onClick={() => onPick(s.id)}
                className="flex w-full items-center gap-2 rounded-xl bg-white/[0.03] p-2.5 text-left"
              >
                <BotIcon className="h-4 w-4 shrink-0 text-cyan-300/60" />
                <span className="truncate text-sm text-cyan-100/70">{s.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MsgBubble({ role, content }: { role: "user" | "assistant"; content: string }) {
  const mine = role === "user";
  return (
    <div className={cn("flex gap-2.5", mine ? "flex-row-reverse" : "flex-row")}>
      {!mine && (
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl gradient-brand text-ink-900">
          <BotIcon className="h-4 w-4" />
        </span>
      )}
      <div
        className={cn(
          "max-w-[78%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
          mine ? "gradient-brand text-ink-900" : "glass text-cyan-50"
        )}
      >
        {content}
      </div>
    </div>
  );
}

function Typing() {
  return (
    <div className="flex gap-2.5">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl gradient-brand text-ink-900">
        <BotIcon className="h-4 w-4" />
      </span>
      <div className="glass flex items-center gap-1 rounded-2xl px-4 py-3">
        <span className="dot h-1.5 w-1.5 rounded-full bg-cyan-300" />
        <span className="dot mx-1 h-1.5 w-1.5 rounded-full bg-cyan-300" />
        <span className="dot h-1.5 w-1.5 rounded-full bg-cyan-300" />
      </div>
    </div>
  );
}
