import { supabase } from "./supabase";
import type { Service, Product } from "./types";

export interface AiMsg {
  role: "user" | "assistant";
  content: string;
}

export interface AiConfigResp {
  provider: string;
  api_key: string;
  base_url: string;
  model: string;
  system_prompt: string;
  temperature: number;
  ai_enabled: boolean;
}

export interface AiContext {
  services: Service[];
  products: Product[];
}

/** Récupère la configuration IA active (clé + prompt système). */
export async function fetchAiConfig(): Promise<AiConfigResp | null> {
  const { data, error } = await supabase.rpc("get_active_ai_config");
  if (error || !data || (data as any[]).length === 0) return null;
  return (data as any[])[0] as AiConfigResp;
}

const DEFAULT_BASE: Record<string, string> = {
  openai: "https://api.openai.com",
  grok: "https://api.x.ai",
  claude: "https://api.anthropic.com",
  gemini: "https://generativelanguage.googleapis.com",
};

/** Appelle le provider IA configuré par l'administrateur. */
async function callProvider(
  history: AiMsg[],
  cfg: AiConfigResp
): Promise<string> {
  const sys = cfg.system_prompt || "Tu es ADF IA, assistant de l'agence digitale ADF.";
  const temp = Number(cfg.temperature ?? 0.7);
  const recent = history.slice(-12);

  // ---------- Gemini ----------
  if (cfg.provider === "gemini") {
    const model = cfg.model || "gemini-1.5-flash";
    const base = cfg.base_url || DEFAULT_BASE.gemini;
    const url = `${base.replace(/\/$/, "")}/v1beta/models/${model}:generateContent?key=${cfg.api_key}`;
    const body = {
      systemInstruction: { parts: [{ text: sys }] },
      contents: recent.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
      generationConfig: { temperature: temp },
    };
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Gemini ${res.status}`);
    const json = await res.json();
    const text =
      json?.candidates?.[0]?.content?.parts
        ?.map((p: any) => p.text)
        .join("") ?? "";
    if (!text) throw new Error("Gemini vide");
    return text.trim();
  }

  // ---------- Anthropic Claude ----------
  if (cfg.provider === "claude") {
    const model = cfg.model || "claude-3-5-sonnet-latest";
    const base = cfg.base_url || DEFAULT_BASE.claude;
    const url = `${base.replace(/\/$/, "")}/v1/messages`;
    const body = {
      model,
      max_tokens: 1024,
      temperature: temp,
      system: sys,
      messages: recent
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({ role: m.role, content: m.content })),
    };
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": cfg.api_key,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Claude ${res.status}`);
    const json = await res.json();
    const text = json?.content?.map((c: any) => c.text).join("") ?? "";
    if (!text) throw new Error("Claude vide");
    return text.trim();
  }

  // ---------- OpenAI / Grok / compatibles ----------
  {
    const base = cfg.base_url || DEFAULT_BASE[cfg.provider] || DEFAULT_BASE.openai;
    const model = cfg.model || (cfg.provider === "grok" ? "grok-beta" : "gpt-4o-mini");
    const url = `${base.replace(/\/$/, "")}/v1/chat/completions`;
    const body = {
      model,
      temperature: temp,
      messages: [
        { role: "system", content: sys },
        ...recent.map((m) => ({ role: m.role, content: m.content })),
      ],
    };
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.api_key}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`${cfg.provider} ${res.status}`);
    const json = await res.json();
    const text = json?.choices?.[0]?.message?.content ?? "";
    if (!text) throw new Error(`${cfg.provider} vide`);
    return text.trim();
  }
}

/**
 * Génère une réponse.
 * - En ligne si un provider actif + clé valide est configuré.
 * - Hors-ligne (locale) sinon : base de connaissances ADF par mots-clés.
 */
export async function generateReply(
  history: AiMsg[],
  config: AiConfigResp | null,
  ctx: AiContext
): Promise<{ text: string; source: "online" | "local" }> {
  if (config && config.ai_enabled && config.api_key && config.provider) {
    try {
      const text = await callProvider(history, config);
      return { text, source: "online" };
    } catch (e) {
      // on retombe sur le mode local
    }
  }
  return { text: localReply(history, ctx), source: "local" };
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Assistant local (hors-ligne) : réponses contextuelles sur l'app ADF. */
export function localReply(history: AiMsg[], ctx: AiContext): string {
  const last = (history[history.length - 1]?.content || "").toLowerCase();
  const has = (...k: string[]) => k.some((w) => last.includes(w));

  const serviceNames = ctx.services.map((s) => `• ${s.name}`).join("\n");
  const productNames = ctx.products
    .slice(0, 6)
    .map((p) => `• ${p.name}`)
    .join("\n");

  if (has("bonjour", "salut", "bonsoir", "hello", "coucou", "cc")) {
    return pick([
      "Bonjour 👋 Je suis ADF IA, l'assistant d'ADF — Arafat Digital Futurist. Comment puis-je vous aider ? Vous pouvez me demander nos services, passer une commande ou explorer la boutique.",
      "Salut ! Bienvenue chez ADF. Je peux vous présenter nos services créatifs, vous aider à commander ou à acheter dans notre boutique digitale. Que souhaitez-vous faire ?",
    ]);
  }
  if (has("service", "prestation", "proposez", "offrez", "faite")) {
    return `Voici nos services créatifs :\n${serviceNames}\n\nPour commander, ouvrez l'onglet « Services », choisissez une prestation puis remplissez le formulaire. Notre équipe examine votre demande puis vous envoie une facture.`;
  }
  if (has("logo")) {
    return "Nous créons des logos professionnels uniques (formats PNG, SVG, PDF). Tarif indicatif dès 15 000 FCFA, livraison en ~3 jours. Touchez « Services » puis « Création de logo » pour commander.";
  }
  if (has("carte", "visite")) {
    return "Cartes de visite élégantes recto/verso, prêtes à l'impression — dès 8 000 FCFA. Disponibles dans l'onglet « Services ».";
  }
  if (has("command", "commander", "passer", "demander")) {
    return "Pour commander un service : 1) Onglet « Services » 2) Choisissez la prestation 3) Décrivez votre besoin et votre budget 4) Envoyez. L'admin examine, fixe une facture et échange avec vous dans la messagerie de la commande. Vous payez, envoyez la preuve, puis recevez votre livrable.";
  }
  if (has("boutique", "produit", "acheter", "magasin", "shop")) {
    return ctx.products.length
      ? `Dans notre boutique digitale vous trouverez notamment :\n${productNames}\n\nLe paiement se fait manuellement (Mobile Money, Orange Money…). Après paiement, téléversez la preuve ; l'admin valide et vous recevez votre produit.`
      : "Notre boutique digitale vous permettra d'acheter des produits numériques. Le paiement est manuel : après avoir payé, téléversez la preuve et l'admin validera votre commande.";
  }
  if (has("paye", "paiement", "payer", "mobile money", "orange", "mtn", "wave")) {
    return "Le paiement est manuel et sécurisé. L'administrateur ajoute les méthodes (Mobile Money, Orange Money, Wave, PayPal, carte…). Payez au numéro indiqué, puis téléversez la capture dans la messagerie de votre commande. L'admin approuve et vous livre.";
  }
  if (has("facture", "prix", "tarif", "coûte", "combien", "cher")) {
    return "Chaque projet est devisé selon votre besoin. Après envoi de votre demande, l'admin fixe le montant de la facture, visible dans votre tableau de bord « Mes commandes ». Les prix de la boutique sont affichés directement sur chaque produit.";
  }
  if (has("merci", "gracias", "thanks")) {
    return pick([
      "Avec plaisir 🙏 N'hésitez pas si vous avez d'autres questions.",
      "Je vous en prie ! Passez une bonne journée et bienvenue chez ADF.",
    ]);
  }
  if (has("qui", "adf", "arafat", "pdg")) {
    return "ADF — Arafat Digital Futurist est une agence digitale dirigée par son PDG, M. Arafat Garga. Nous accompagnons marques et entrepreneurs : branding, design, contenus et solutions web.";
  }
  if (has("ia", "intelligence", "robot", "tu es")) {
    return "Je suis ADF IA, votre assistant intégré. Je fonctionne en ligne (Gemini, Grok, Claude…) quand l'administrateur a configuré une clé API, et en mode local intelligent sinon. Toutes nos conversations sont sauvegardées.";
  }
  return pick([
    "Je peux vous aider à explorer nos services, passer une commande ou acheter dans la boutique. Que souhaitez-vous faire exactement ?",
    "Bonne question ! Pour aller plus vite, ouvrez l'onglet « Services » pour commander, ou « Boutique » pour acheter. Souhaitez-vous que je détaille une prestation ?",
    "Je reste à votre disposition. Décrivez votre projet (logo, carte de visite, site web…) et je vous oriente vers la bonne commande.",
  ]);
}

/** Suggestions rapides affichées dans l'espace ADF IA. */
export const AI_SUGGESTIONS = [
  "Quels services proposez-vous ?",
  "Comment passer une commande ?",
  "Comment fonctionne le paiement ?",
  "Présentez la boutique",
];
