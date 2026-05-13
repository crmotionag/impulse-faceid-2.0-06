import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const NOTION_TOKEN = Deno.env.get("NOTION_TOKEN")!;
const NOTION_DATA_SOURCE_ID = "226328c5-8232-4a19-8924-f92f74966f0e";
const NOTION_VERSION = "2026-03-11";

const APOLLO_API_KEY = Deno.env.get("APOLLO_API_KEY")!;
const APOLLO_LABEL = "facescan-leads";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface LeadPayload {
  fullName: string;
  email: string;
  phone: string;
  company?: string;
  userAgent?: string;
}

interface DispatchResult {
  ok: boolean;
  status?: number;
  id?: string;
  error?: unknown;
}

function safeText(v: unknown, max = 2000): string {
  if (v === null || v === undefined) return "";
  return String(v).slice(0, max);
}

function cleanPhone(raw: string): string {
  if (!raw) return "";
  let digits = String(raw).replace(/\D/g, "");
  if (!digits.startsWith("55")) {
    digits = "55" + digits;
  }
  return digits;
}

function splitName(fullName: string): { first: string; last: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: "", last: "" };
  if (parts.length === 1) return { first: parts[0], last: "" };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

async function dispatchToNotion(payload: LeadPayload): Promise<DispatchResult> {
  if (!NOTION_TOKEN) return { ok: false, error: "NOTION_TOKEN not configured" };

  const properties: Record<string, unknown> = {
    "Nome": { title: [{ text: { content: safeText(payload.fullName, 200) } }] },
    "Email": { email: payload.email },
    "Telefone": { phone_number: safeText(payload.phone, 50) },
    "Data do Scan": { date: { start: new Date().toISOString() } },
    "Status": { select: { name: "Novo" } },
    "Origem": { select: { name: "Landing FaceScan" } },
    "User Agent": {
      rich_text: [{ text: { content: safeText(payload.userAgent ?? "", 1500) } }],
    },
    "Empresa": {
      rich_text: [{ text: { content: safeText(payload.company ?? "", 200) } }],
    },
  };

  try {
    const res = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${NOTION_TOKEN}`,
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        parent: { type: "data_source_id", data_source_id: NOTION_DATA_SOURCE_ID },
        properties,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("[send-lead/notion] error:", res.status, JSON.stringify(data));
      return { ok: false, status: res.status, error: data };
    }
    return { ok: true, status: res.status, id: data.id };
  } catch (err) {
    console.error("[send-lead/notion] exception:", err);
    return { ok: false, error: String(err) };
  }
}

async function dispatchToApollo(payload: LeadPayload): Promise<DispatchResult> {
  if (!APOLLO_API_KEY) return { ok: false, error: "APOLLO_API_KEY not configured" };

  const { first, last } = splitName(payload.fullName);
  const body: Record<string, unknown> = {
    first_name: first,
    last_name: last,
    email: payload.email,
    mobile_phone: payload.phone,
    label_names: [APOLLO_LABEL],
    run_dedupe: true,
  };
  if (payload.company && payload.company.trim()) {
    body.organization_name = payload.company.trim();
  }

  try {
    const res = await fetch("https://api.apollo.io/api/v1/contacts", {
      method: "POST",
      headers: {
        "Cache-Control": "no-cache",
        "Content-Type": "application/json",
        "Accept": "application/json",
        "X-Api-Key": APOLLO_API_KEY,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("[send-lead/apollo] error:", res.status, JSON.stringify(data));
      return { ok: false, status: res.status, error: data };
    }
    return { ok: true, status: res.status, id: data?.contact?.id };
  } catch (err) {
    console.error("[send-lead/apollo] exception:", err);
    return { ok: false, error: String(err) };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const payload = (await req.json()) as LeadPayload;

    if (!payload.fullName || !payload.email || !payload.phone) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields",
          required: ["fullName", "email", "phone"],
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedPayload: LeadPayload = {
      ...payload,
      phone: cleanPhone(payload.phone),
    };

    const [notionResult, apolloResult] = await Promise.allSettled([
      dispatchToNotion(normalizedPayload),
      dispatchToApollo(normalizedPayload),
    ]);

    const notion: DispatchResult =
      notionResult.status === "fulfilled"
        ? notionResult.value
        : { ok: false, error: String(notionResult.reason) };

    const apollo: DispatchResult =
      apolloResult.status === "fulfilled"
        ? apolloResult.value
        : { ok: false, error: String(apolloResult.reason) };

    console.log("[send-lead] notion=%s apollo=%s", notion.ok, apollo.ok);

    if (!notion.ok && !apollo.ok) {
      return new Response(
        JSON.stringify({ ok: false, notion, apollo }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ ok: true, notion, apollo }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[send-lead] unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Unexpected error", message: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
