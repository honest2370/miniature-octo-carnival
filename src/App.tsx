import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "./lib/auth";
import { NavProvider, useNav } from "./lib/nav";
import { ToastProvider } from "./components/ui";
import { LogoMark } from "./components/Logo";
import { fetchSettings } from "./lib/data";
import { cn } from "./components/ui";
import {
  HomeIcon,
  SparkIcon,
  BagIcon,
  ReceiptIcon,
  BotIcon,
} from "./lib/icons";

import Auth from "./screens/Auth";
import Home from "./screens/Home";
import Services from "./screens/Services";
import Store from "./screens/Store";
import Orders from "./screens/Orders";
import OrderDetail from "./screens/OrderDetail";
import AIChat from "./screens/AIChat";
import Settings from "./screens/Settings";
import Admin from "./screens/Admin";

function hideBoot() {
  const b = document.getElementById("boot");
  if (b) {
    b.style.opacity = "0";
    setTimeout(() => b.remove(), 400);
  }
}

function Shell() {
  const { session, profile, loading } = useAuth();
  const { route } = useNav();
  const [maint, setMaint] = useState(false);

  useEffect(() => {
    hideBoot();
  }, []);

  // capture PWA install prompt
  useEffect(() => {
    const onBIP = (e: any) => {
      e.preventDefault();
      (window as any).__adfInstallPrompt = e;
    };
    window.addEventListener("beforeinstallprompt", onBIP);
    return () => window.removeEventListener("beforeinstallprompt", onBIP);
  }, []);

  // register service worker
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  // maintenance check
  useEffect(() => {
    if (session && profile?.role !== "admin") {
      fetchSettings().then((s) => setMaint(!!s?.maintenance)).catch(() => {});
    } else {
      setMaint(false);
    }
  }, [session, profile?.role]);

  if (loading) {
    return (
      <div className="flex h-[100dvh] items-center justify-center">
        <LogoMark size={56} />
      </div>
    );
  }

  if (!session) {
    return <Auth />;
  }

  // Session valide mais profil pas encore disponible (trigger en cours ou
  // schéma incomplet). On affiche un état clair avec rechargement plutôt que
  // de revenir sur l'écran de connexion.
  if (!profile) {
    return (
      <div className="flex h-[100dvh] flex-col items-center justify-center px-8 text-center">
        <LogoMark size={56} />
        <p className="mt-4 text-lg font-bold text-cyan-50">Finalisation…</p>
        <p className="mt-1 text-sm text-cyan-100/50">
          Préparation de votre espace. Si rien ne se passe, vérifiez que la base
          de données est initialisée puis rechargez.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 rounded-2xl gradient-brand px-5 py-2.5 text-sm font-semibold text-ink-900"
        >
          Recharger
        </button>
      </div>
    );
  }

  if (profile.banned) {
    return (
      <div className="flex h-[100dvh] flex-col items-center justify-center px-8 text-center">
        <LogoMark size={48} />
        <p className="mt-4 text-lg font-bold text-cyan-50">Compte suspendu</p>
        <p className="mt-1 text-sm text-cyan-100/50">
          Votre compte a été suspendu. Contactez l'administrateur.
        </p>
      </div>
    );
  }

  if (maint) {
    return (
      <div className="flex h-[100dvh] flex-col items-center justify-center px-8 text-center">
        <LogoMark size={56} />
        <p className="mt-4 text-lg font-bold text-cyan-50">Maintenance en cours</p>
        <p className="mt-1 text-sm text-cyan-100/50">
          ADF revient très bientôt. Merci de votre patience.
        </p>
      </div>
    );
  }

  const isMainTab = ["home", "services", "ai", "store", "orders"].includes(route.name);
  const isAdminRoute = route.name === "admin";

  let screen: React.ReactNode;
  switch (route.name) {
    case "services": screen = <Services />; break;
    case "store": screen = <Store />; break;
    case "orders": screen = <Orders />; break;
    case "order-detail": screen = <OrderDetail />; break;
    case "ai": screen = <AIChat />; break;
    case "settings": screen = <Settings />; break;
    case "admin":
      screen = profile.role === "admin" ? <Admin /> : <Home />;
      break;
    default: screen = <Home />;
  }

  return (
    <div className="mx-auto flex h-[100dvh] max-w-md flex-col overflow-hidden bg-gradient-to-b from-transparent to-ink-900/30">
      <main
        id="adf-scroll"
        className={cn("relative flex-1 overflow-y-auto", (route.name === "order-detail" || route.name === "ai") && "overflow-hidden")}
      >
        {screen}
      </main>
      {isMainTab && !isAdminRoute && <BottomNav active={route.name} />}
    </div>
  );
}

function BottomNav({ active }: { active: string }) {
  const { go } = useNav();
  const items: {
    k: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    center?: boolean;
  }[] = [
    { k: "home", label: "Accueil", icon: HomeIcon },
    { k: "services", label: "Services", icon: SparkIcon },
    { k: "ai", label: "ADF IA", icon: BotIcon, center: true },
    { k: "store", label: "Boutique", icon: BagIcon },
    { k: "orders", label: "Commandes", icon: ReceiptIcon },
  ];

  return (
    <nav className="glass-strong safe-bottom z-40 flex items-stretch justify-around border-t border-white/10 px-2 pb-1 pt-1.5">
      {items.map((it) => {
        const Icon = it.icon;
        const isActive = active === it.k;
        if (it.center) {
          return (
            <button
              key={it.k}
              onClick={() => go({ name: it.k })}
              className="flex flex-1 flex-col items-center"
            >
              <span
                className={cn(
                  "-mt-6 flex h-14 w-14 items-center justify-center rounded-full gradient-brand text-ink-900 shadow-lg shadow-cyan-500/30 transition active:scale-90",
                  isActive && "neon-ring"
                )}
              >
                <Icon className="h-7 w-7" />
              </span>
              <span className={cn("mt-0.5 text-[10px] font-medium", isActive ? "text-cyan-200" : "text-cyan-100/50")}>
                {it.label}
              </span>
            </button>
          );
        }
        return (
          <button
            key={it.k}
            onClick={() => go({ name: it.k })}
            className="flex flex-1 flex-col items-center gap-1 py-1.5"
          >
            <Icon className={cn("h-5 w-5 transition", isActive ? "text-cyan-300" : "text-cyan-100/45")} />
            <span className={cn("text-[10px] font-medium", isActive ? "text-cyan-200" : "text-cyan-100/45")}>
              {it.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <NavProvider>
          <Shell />
        </NavProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
