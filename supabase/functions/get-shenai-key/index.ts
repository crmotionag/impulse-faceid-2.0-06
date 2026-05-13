const ALLOWED_ORIGIN_SUFFIXES = [
  ".lovable.app",
  ".lovableproject.com",
  ".lovable.dev",
];

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  try {
    const { hostname } = new URL(origin);
    return ALLOWED_ORIGIN_SUFFIXES.some((suffix) => hostname.endsWith(suffix));
  } catch {
    return false;
  }
}

function corsHeadersFor(origin: string | null) {
  // Quando o Origin é permitido, ecoamos ele de volta. Caso contrário,
  // ainda devolvemos "*" para evitar que clientes (Safari iOS especialmente)
  // mostrem o erro genérico "Edge Function returned a non-2xx status code"
  // em cima de um preflight bloqueado. A proteção real do segredo continua
  // sendo feita pela checagem de Origin/Referer no handler abaixo.
  const allowOrigin = origin && isAllowedOrigin(origin) ? origin : "*";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

Deno.serve((req) => {
  const origin = req.headers.get("Origin");
  const referer = req.headers.get("Referer");
  const headers = corsHeadersFor(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  // Validate origin OR referer to prevent unauthorized domains from
  // exfiltrating the third-party SHENAI_API_KEY.
  const refererOrigin = (() => {
    if (!referer) return null;
    try {
      return new URL(referer).origin;
    } catch {
      return null;
    }
  })();

  if (!isAllowedOrigin(origin) && !isAllowedOrigin(refererOrigin)) {
    return new Response(
      JSON.stringify({ error: "Forbidden origin" }),
      {
        status: 403,
        headers: { ...headers, "Content-Type": "application/json" },
      },
    );
  }

  const apiKey = Deno.env.get("SHENAI_API_KEY");
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "SHENAI_API_KEY not configured" }),
      {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" },
      },
    );
  }

  return new Response(JSON.stringify({ apiKey }), {
    status: 200,
    headers: { ...headers, "Content-Type": "application/json" },
  });
});
