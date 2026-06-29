import { useState } from "react";
import { useAuth } from "../lib/auth";
import { useNav } from "../lib/nav";
import { uploadFile } from "../lib/supabase";
import {
  Button,
  Input,
  Field,
  Avatar,
  useToast,
  fmtDate,
} from "../components/ui";
import { Header } from "./Services";
import { LogoMark } from "../components/Logo";
import {
  UserIcon,
  PhoneIcon,
  MailIcon,
  LogoutIcon,
  BotIcon,
  DownloadIcon,
  ShieldIcon,
  SparkIcon,
  CheckCircleIcon,
} from "../lib/icons";

export default function Settings() {
  const { profile, signOut, updateMyProfile } = useAuth();
  const { back, go } = useNav();
  const toast = useToast();
  const [name, setName] = useState(profile?.full_name || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [avatar, setAvatar] = useState<string | null>(profile?.avatar_url || null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    await updateMyProfile({ full_name: name, phone, avatar_url: avatar });
    setSaving(false);
    toast({ type: "success", msg: "Profil mis à jour." });
  };

  const pickAvatar = async (f: File) => {
    if (!profile) return;
    const up = await uploadFile(profile.id, f, "avatars");
    if (up) {
      setAvatar(up.url);
      toast({ type: "success", msg: "Photo chargée. Enregistrez." });
    }
  };

  const install = async () => {
    const prompt = (window as any).__adfInstallPrompt;
    if (prompt) {
      prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === "accepted") toast({ type: "success", msg: "Installation lancée." });
    } else {
      toast({
        type: "info",
        msg: "Menu du navigateur → « Ajouter à l'écran d'accueil » / « Installer l'app ».",
      });
    }
  };

  return (
    <div className="min-h-full">
      <Header back={back} title="Profil & réglages" />
      <div className="px-4 pb-28 pt-2">
        {/* profile head */}
        <div className="glass mb-4 flex items-center gap-4 rounded-3xl p-4">
          <label className="relative cursor-pointer">
            <Avatar name={profile?.full_name} url={avatar} size={64} />
            <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full gradient-brand text-ink-900">
              <DownloadIcon className="h-3.5 w-3.5 rotate-180" />
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && pickAvatar(e.target.files[0])}
            />
          </label>
          <div className="min-w-0">
            <p className="truncate text-lg font-bold text-cyan-50">{profile?.full_name || "Utilisateur"}</p>
            <p className="truncate text-sm text-cyan-100/50">{profile?.email}</p>
            {profile?.role === "admin" && (
              <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-cyan-400/15 px-2 py-0.5 text-[10px] font-bold text-cyan-200">
                <ShieldIcon className="h-3 w-3" /> Administrateur
              </span>
            )}
          </div>
        </div>

        {/* AI usage */}
        <div className="glass mb-4 rounded-3xl p-4">
          <div className="mb-2 flex items-center gap-2">
            <BotIcon className="h-4 w-4 text-cyan-300" />
            <p className="text-sm font-semibold text-cyan-50">ADF IA — utilisation</p>
          </div>
          <div className="mb-2 flex items-center justify-between text-xs text-cyan-100/60">
            <span>Messages utilisés</span>
            <span className="font-semibold text-cyan-200">
              {profile?.ai_message_count} / {profile?.ai_message_limit}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/8">
            <div
              className="h-full gradient-brand"
              style={{
                width: `${
                  profile?.ai_message_limit
                    ? Math.min(100, ((profile?.ai_message_count || 0) / profile.ai_message_limit) * 100)
                    : 0
                }%`,
              }}
            />
          </div>
          <p className="mt-2 text-[11px] text-cyan-100/40">
            Membre depuis le {fmtDate(profile?.created_at)}
          </p>
        </div>

        {/* edit form */}
        <div className="glass space-y-3.5 rounded-3xl p-4">
          <Field label="Nom complet">
            <div className="relative">
              <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-300/50" />
              <Input className="pl-9" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          </Field>
          <Field label="Téléphone">
            <div className="relative">
              <PhoneIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-300/50" />
              <Input className="pl-9" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </Field>
          <Field label="E-mail (non modifiable)">
            <div className="relative">
              <MailIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-300/50" />
              <Input className="pl-9 opacity-60" value={profile?.email || ""} disabled />
            </div>
          </Field>
          <Button full loading={saving} onClick={save}>
            <CheckCircleIcon className="h-4 w-4" /> Enregistrer
          </Button>
        </div>

        {/* install */}
        <button
          onClick={install}
          className="glass mt-4 flex w-full items-center gap-3 rounded-3xl p-4 text-left active:scale-[.99]"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl gradient-brand text-ink-900">
            <DownloadIcon className="h-5 w-5" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-cyan-50">Installer l'application</p>
            <p className="text-xs text-cyan-100/50">Ajouter ADF à l'écran d'accueil</p>
          </div>
        </button>

        {profile?.role === "admin" && (
          <Button full variant="outline" className="mt-3" onClick={() => go({ name: "admin" })}>
            <SparkIcon className="h-4 w-4" /> Panneau d'administration
          </Button>
        )}

        <Button full variant="danger" className="mt-3" onClick={signOut}>
          <LogoutIcon className="h-4 w-4" /> Se déconnecter
        </Button>

        <div className="mt-6 flex flex-col items-center text-center">
          <LogoMark size={36} />
          <p className="mt-2 text-[11px] text-cyan-100/30">
            ADF — Arafat Digital Futurist · v1.0
          </p>
          <p className="text-[11px] text-cyan-100/30">Conçue par le PDG, M. Arafat Garga</p>
        </div>
      </div>
    </div>
  );
}
