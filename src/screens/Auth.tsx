import { useState } from "react";
import { useAuth } from "../lib/auth";
import { Button, Input, Field, useToast } from "../components/ui";
import { LogoMark } from "../components/Logo";
import {
  MailIcon,
  LockIcon,
  UserIcon,
  PhoneIcon,
  EyeIcon,
  EyeOffIcon,
  ShieldIcon,
  SparkIcon,
} from "../lib/icons";

export default function Auth() {
  const { signIn, signUp } = useAuth();
  const toast = useToast();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    if (mode === "login") {
      const { error } = await signIn(email.trim(), password);
      if (error) setErr(error);
      else toast({ type: "success", msg: "Connexion réussie. Bienvenue !" });
    } else {
      if (!name.trim()) {
        setErr("Veuillez entrer votre nom complet.");
        setLoading(false);
        return;
      }
      const { error, needsConfirm } = await signUp(
        email.trim(),
        password,
        name.trim(),
        phone.trim()
      );
      if (needsConfirm)
        setErr(
          "Compte créé. Veuillez confirmer votre e-mail via le lien reçu, puis connectez-vous."
        );
      else if (error) setErr(error);
      else toast({ type: "success", msg: "Compte créé. Bienvenue chez ADF !" });
    }
    setLoading(false);
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* glow blobs */}
      <div className="pointer-events-none absolute -top-24 -left-16 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />
      <div className="pointer-events-none absolute top-40 -right-20 h-72 w-72 rounded-full bg-blue-600/20 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen max-w-md flex-col px-6 pb-10 pt-14 safe-top">
        <div className="flex flex-col items-center text-center animate-slide-up">
          <LogoMark size={64} />
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-cyan-50">
            ADF — <span className="text-gradient">Arafat Digital Futurist</span>
          </h1>
          <p className="mt-2 max-w-xs text-sm text-cyan-100/60">
            Services créatifs sur mesure, boutique digitale et assistant IA —
            réunis dans une seule application.
          </p>
        </div>

        <div className="glass mt-8 rounded-3xl p-5 animate-slide-up">
          <div className="mb-5 grid grid-cols-2 gap-1 rounded-2xl bg-ink-900/50 p-1">
            {(["login", "register"] as const).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  setErr("");
                }}
                className={`h-10 rounded-xl text-sm font-semibold transition ${
                  mode === m
                    ? "gradient-brand text-ink-900 shadow"
                    : "text-cyan-100/60"
                }`}
              >
                {m === "login" ? "Connexion" : "Créer un compte"}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-3.5">
            {mode === "register" && (
              <>
                <Field label="Nom complet">
                  <div className="relative">
                    <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-300/50" />
                    <Input
                      className="pl-9"
                      placeholder="Ex. Arafat Garga"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                </Field>
                <Field label="Téléphone">
                  <div className="relative">
                    <PhoneIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-300/50" />
                    <Input
                      className="pl-9"
                      placeholder="+229 ..."
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </Field>
              </>
            )}
            <Field label="Adresse e-mail">
              <div className="relative">
                <MailIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-300/50" />
                <Input
                  type="email"
                  required
                  className="pl-9"
                  placeholder="vous@exemple.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </Field>
            <Field label="Mot de passe">
              <div className="relative">
                <LockIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-300/50" />
                <Input
                  type={show ? "text" : "password"}
                  required
                  minLength={6}
                  className="pl-9 pr-10"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-cyan-300/60"
                >
                  {show ? (
                    <EyeOffIcon className="h-4 w-4" />
                  ) : (
                    <EyeIcon className="h-4 w-4" />
                  )}
                </button>
              </div>
            </Field>

            {err && (
              <p className="rounded-xl bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                {err}
              </p>
            )}

            <Button type="submit" full size="lg" loading={loading}>
              {mode === "login" ? "Se connecter" : "Créer mon compte"}
            </Button>
          </form>

          <div className="mt-4 flex items-center gap-2 rounded-2xl bg-cyan-400/5 px-3 py-2.5 text-[11px] text-cyan-100/50">
            <ShieldIcon className="h-4 w-4 shrink-0 text-cyan-300/70" />
            <span>
              Le tout premier compte créé devient automatiquement{" "}
              <strong className="text-cyan-200">administrateur</strong>.
            </span>
          </div>
        </div>

        <div className="mt-auto pt-8 text-center">
          <div className="mb-2 inline-flex items-center gap-1.5 text-[11px] text-cyan-300/40">
            <SparkIcon className="h-3.5 w-3.5" /> Conçue par le PDG d'ADF
          </div>
          <p className="text-xs font-medium text-cyan-100/40">
            M. Arafat Garga — Arafat Digital Futurist
          </p>
        </div>
      </div>
    </div>
  );
}
