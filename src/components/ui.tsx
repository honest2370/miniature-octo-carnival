import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
  type SelectHTMLAttributes,
} from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { CheckCircleIcon, AlertIcon, InfoIcon, XIcon } from "../lib/icons";
import type {
  ServiceStatus,
  ProductStatus,
  PaymentType,
} from "../lib/types";

export function cn(...a: any[]) {
  return twMerge(clsx(a));
}

export function fmtCFA(n: number | null | undefined): string {
  const v = Number(n || 0);
  return new Intl.NumberFormat("fr-FR").format(Math.round(v)) + " FCFA";
}

export function fmtDate(s?: string | null): string {
  if (!s) return "";
  try {
    return new Date(s).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return s;
  }
}

export function timeShort(s?: string | null): string {
  if (!s) return "";
  try {
    return new Date(s).toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

/* ----------------------------- Button ----------------------------- */
type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "outline" | "danger" | "subtle";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  full?: boolean;
};
export function Button({
  variant = "primary",
  size = "md",
  loading,
  full,
  className,
  children,
  disabled,
  ...rest
}: BtnProps) {
  const sizes = {
    sm: "h-9 px-3 text-sm rounded-xl gap-1.5",
    md: "h-11 px-4 text-sm rounded-2xl gap-2",
    lg: "h-12 px-5 text-base rounded-2xl gap-2",
  };
  const variants = {
    primary:
      "gradient-brand text-ink-900 font-semibold shadow-lg shadow-cyan-500/25 hover:shadow-cyan-400/40 active:scale-[.98]",
    ghost: "text-cyan-100/80 hover:bg-white/5",
    outline: "border border-cyan-300/25 text-cyan-50 hover:bg-white/5",
    danger: "bg-rose-500/15 text-rose-200 border border-rose-400/25 hover:bg-rose-500/25",
    subtle: "bg-white/5 text-cyan-50 border border-white/10 hover:bg-white/10",
  };
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center font-medium transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none select-none",
        sizes[size],
        variants[variant],
        full && "w-full",
        className
      )}
      {...rest}
    >
      {loading && (
        <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
      )}
      {children}
    </button>
  );
}

export function IconButton({
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "inline-flex h-10 w-10 items-center justify-center rounded-xl text-cyan-100/80 hover:bg-white/10 active:scale-95 transition",
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

/* ----------------------------- Inputs ----------------------------- */
export function Field({
  label,
  hint,
  children,
}: {
  label?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1.5 block text-xs font-medium text-cyan-100/70">
          {label}
        </span>
      )}
      {children}
      {hint && <span className="mt-1 block text-[11px] text-cyan-100/40">{hint}</span>}
    </label>
  );
}

const inputBase =
  "w-full rounded-2xl bg-ink-900/60 border border-white/10 px-3.5 text-[15px] text-cyan-50 placeholder:text-cyan-100/30 outline-none transition focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/15";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(inputBase, "h-11", props.className)} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(inputBase, "py-2.5 min-h-[96px] resize-y", props.className)}
    />
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={cn(inputBase, "h-11 appearance-none pr-9 bg-[length:16px] bg-[right_12px_center] bg-no-repeat", props.className)}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%2367e8f9' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='m4 6 4 4 4-4'/></svg>\")",
      }}
    >
      {props.children}
    </select>
  );
}

/* ----------------------------- Card ----------------------------- */
export function Card({
  className,
  children,
  onClick,
}: {
  className?: string;
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "glass rounded-3xl p-4",
        onClick && "cursor-pointer active:scale-[.99] transition",
        className
      )}
    >
      {children}
    </div>
  );
}

/* ----------------------------- Badge ----------------------------- */
export function Badge({
  children,
  tone = "cyan",
  className,
}: {
  children: ReactNode;
  tone?: "cyan" | "amber" | "emerald" | "rose" | "violet" | "slate" | "blue";
  className?: string;
}) {
  const tones = {
    cyan: "bg-cyan-400/12 text-cyan-200 border-cyan-300/20",
    amber: "bg-amber-400/12 text-amber-200 border-amber-300/20",
    emerald: "bg-emerald-400/12 text-emerald-200 border-emerald-300/20",
    rose: "bg-rose-400/12 text-rose-200 border-rose-300/20",
    violet: "bg-violet-400/12 text-violet-200 border-violet-300/20",
    blue: "bg-blue-400/12 text-blue-200 border-blue-300/20",
    slate: "bg-white/8 text-cyan-100/70 border-white/10",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

const SVC_LABELS: Record<ServiceStatus, { t: string; tone: any }> = {
  pending: { t: "En attente", tone: "slate" },
  reviewing: { t: "En examen", tone: "blue" },
  approved: { t: "Approuvée", tone: "cyan" },
  invoiced: { t: "Facturée", tone: "amber" },
  sample_sent: { t: "Échantillon envoyé", tone: "violet" },
  completed: { t: "Terminée", tone: "emerald" },
  rejected: { t: "Rejetée", tone: "rose" },
  cancelled: { t: "Annulée", tone: "slate" },
};

export function ServiceStatusBadge({ status }: { status: ServiceStatus }) {
  const m = SVC_LABELS[status] || SVC_LABELS.pending;
  return <Badge tone={m.tone}>{m.t}</Badge>;
}

const PRD_LABELS: Record<ProductStatus, { t: string; tone: any }> = {
  pending: { t: "À payer", tone: "slate" },
  paid: { t: "Preuve envoyée", tone: "amber" },
  approved: { t: "Validée", tone: "cyan" },
  delivered: { t: "Livrée", tone: "emerald" },
  rejected: { t: "Rejetée", tone: "rose" },
  cancelled: { t: "Annulée", tone: "slate" },
};

export function ProductStatusBadge({ status }: { status: ProductStatus }) {
  const m = PRD_LABELS[status] || PRD_LABELS.pending;
  return <Badge tone={m.tone}>{m.t}</Badge>;
}

export const PAYMENT_LABELS: Record<PaymentType, string> = {
  mobile_money: "Mobile Money",
  orange_money: "Orange Money",
  wave: "Wave",
  moov: "Moov Money",
  bank: "Virement bancaire",
  paypal: "PayPal",
  card: "Carte bancaire",
  crypto: "Cryptomonnaie",
  other: "Autre",
};

/* ----------------------------- Sheet (bottom modal) ----------------------------- */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md glass-strong rounded-t-3xl border-b-0 p-5 pb-8 animate-sheet safe-bottom max-h-[92vh] overflow-y-auto no-scrollbar">
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-white/15" />
        {title && (
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-cyan-50">{title}</h3>
            <IconButton onClick={onClose} aria-label="Fermer">
              <XIcon className="h-5 w-5" />
            </IconButton>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

/* ----------------------------- Spinner / Empty ----------------------------- */
export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block h-5 w-5 rounded-full border-2 border-cyan-300/30 border-t-cyan-300 animate-spin",
        className
      )}
    />
  );
}

export function EmptyState({
  icon,
  title,
  desc,
  action,
}: {
  icon?: ReactNode;
  title: string;
  desc?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center animate-fade">
      {icon && (
        <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-3xl bg-white/5 text-cyan-300/70">
          {icon}
        </div>
      )}
      <p className="font-semibold text-cyan-50">{title}</p>
      {desc && <p className="mt-1 max-w-xs text-sm text-cyan-100/50">{desc}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* ----------------------------- Avatar ----------------------------- */
export function Avatar({
  name,
  url,
  size = 40,
}: {
  name?: string;
  url?: string | null;
  size?: number;
}) {
  const initials = (name || "?")
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full gradient-brand font-bold text-ink-900 overflow-hidden"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {url ? (
        <img src={url} alt={name} className="h-full w-full object-cover" />
      ) : (
        initials
      )}
    </div>
  );
}

/* ----------------------------- Toasts ----------------------------- */
type Toast = { id: number; type: "success" | "error" | "info"; msg: string };
const ToastCtx = createContext<(t: Omit<Toast, "id">) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setToasts((s) => [...s, { ...t, id }]);
    setTimeout(() => setToasts((s) => s.filter((x) => x.id !== id)), 3600);
  }, []);

  const icons = {
    success: <CheckCircleIcon className="h-5 w-5 text-emerald-300" />,
    error: <AlertIcon className="h-5 w-5 text-rose-300" />,
    info: <InfoIcon className="h-5 w-5 text-cyan-300" />,
  };

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[200] flex flex-col items-center gap-2 px-4 pt-3 safe-top">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="glass-strong pointer-events-auto flex w-full max-w-sm items-center gap-2.5 rounded-2xl px-4 py-3 text-sm text-cyan-50 shadow-xl animate-slide-up"
          >
            {icons[t.type]}
            <span className="flex-1">{t.msg}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
