  // The scheduler (pg_cron / Vercel Cron) has no browser session; it proves
  // itself with `Authorization: Bearer <BRIEF_CRON_SECRET>`, which the brief
  // route verifies with a constant-time compare. Let that request through.
  if (!user && pathname === "/api/brief/run" && /^Bearer\s+\S+/i.test(request.headers.get("authorization") ?? "")) {
    return response;
  }
