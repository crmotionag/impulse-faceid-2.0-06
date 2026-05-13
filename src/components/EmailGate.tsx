import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import type { ScanResults } from "@/lib/shenai";

/**
 * Máscara BR para telefone:
 *  - até 10 dígitos → (99) 9999-9999
 *  - 11 dígitos     → (99) 99999-9999
 * Aceita qualquer entrada do usuário (cola, dígitos soltos) e formata progressivamente.
 */
const formatPhoneBR = (raw: string): string => {
  const digits = raw.replace(/\D/g, "").slice(0, 11);
  if (digits.length === 0) return "";
  if (digits.length < 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

const leadSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(3, "Informe seu nome completo")
    .max(120, "Nome muito longo")
    .refine((v) => v.split(/\s+/).filter(Boolean).length >= 2, {
      message: "Informe nome e sobrenome",
    }),
  phone: z
    .string()
    .trim()
    .max(32, "Telefone muito longo")
    .refine((v) => v.replace(/\D/g, "").length >= 8, {
      message: "Telefone inválido",
    }),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(5, "Email muito curto")
    .max(255, "Email muito longo")
    .email("Email inválido"),
  company: z
    .string()
    .trim()
    .min(2, "Informe o nome da empresa")
    .max(120, "Nome da empresa muito longo"),
});

interface EmailGateProps {
  results: ScanResults;
  onUnlock: () => void;
}

export const EmailGate = ({ results, onUnlock }: EmailGateProps) => {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsed = leadSchema.safeParse({ fullName, phone, email, company });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }

    setLoading(true);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke(
        "send-lead",
        {
          body: {
            fullName: parsed.data.fullName,
            email: parsed.data.email,
            phone: parsed.data.phone,
            company: parsed.data.company,
            userAgent: navigator.userAgent,
          },
        }
      );

      if (invokeError) {
        console.error("[email-gate] send-lead failed:", invokeError);
        setError("Não foi possível enviar seus dados. Tente novamente.");
        return;
      }

      console.log("[email-gate] lead enviado:", data);

      if (data?.notion && !data.notion.ok) {
        console.warn("[email-gate] Notion falhou (lead salvo no Apollo):", data.notion);
      }
      if (data?.apollo && !data.apollo.ok) {
        console.warn("[email-gate] Apollo falhou (lead salvo no Notion):", data.apollo);
      }

      try {
        sessionStorage.setItem("impulso:fullName", parsed.data.fullName);
        sessionStorage.setItem("impulso:email", parsed.data.email);
        sessionStorage.setItem("impulso:phone", parsed.data.phone);
        sessionStorage.setItem("impulso:company", parsed.data.company);
      } catch {
        /* ignore */
      }

      onUnlock();
    } catch (err) {
      console.error("[email-gate]", err);
      setError("Erro inesperado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="scan-contact-block">
      <span className="tag">Resultado pronto</span>
      <h2>
        Seu relatório <span className="it">está</span>{" "}
        <span className="hl">pronto.</span>
      </h2>
      <p>
        Preencha seus dados para receber o relatório completo por email. Seus
        dados são tratados conforme a LGPD.
      </p>

      <form onSubmit={handleSubmit} className="contact-form">
        <div className="field">
          <label htmlFor="eg-name">Nome completo</label>
          <input
            id="eg-name"
            type="text"
            autoComplete="name"
            placeholder="Seu nome completo"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={loading}
            maxLength={120}
            required
          />
        </div>

        <div className="field">
          <label htmlFor="eg-email">Email</label>
          <input
            id="eg-email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            maxLength={255}
            required
          />
        </div>

        <div className="field">
          <label htmlFor="eg-company">Empresa</label>
          <input
            id="eg-company"
            type="text"
            autoComplete="organization"
            placeholder="Nome da empresa"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            disabled={loading}
            maxLength={120}
            required
          />
        </div>

        <div className="field">
          <label htmlFor="eg-phone">Telefone</label>
          <input
            id="eg-phone"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            placeholder="(11) 99999-9999"
            value={phone}
            onChange={(e) => setPhone(formatPhoneBR(e.target.value))}
            disabled={loading}
            maxLength={16}
            required
          />
        </div>

        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}

        <button type="submit" className="scan-start-btn" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Enviando…
            </>
          ) : (
            "Receber relatório"
          )}
        </button>

        <p className="privacy">Sem spam · cancele quando quiser</p>
      </form>
    </div>
  );
};
