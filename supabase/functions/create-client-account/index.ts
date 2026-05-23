// Edge Function: create a client login account (auth user + profile),
// optionally linking it to a matter. Runs server-side with the service role.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { fullName, email, password, role, matterId } = await req.json();

    if (!email || !password) {
      return new Response(JSON.stringify({ error: "Email and password are required." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (password.length < 6) {
      return new Response(JSON.stringify({ error: "Password must be at least 6 characters." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // 1. Verify the CALLER is a partner (only partners may create accounts)
    const authHeader = req.headers.get("Authorization") || "";
    const callerToken = authHeader.replace("Bearer ", "");
    const { data: caller, error: callerErr } = await admin.auth.getUser(callerToken);
    if (callerErr || !caller?.user) {
      return new Response(JSON.stringify({ error: "Not authenticated." }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: callerProfile } = await admin
      .from("profiles").select("role").eq("id", caller.user.id).single();
    if (callerProfile?.role !== "partner") {
      return new Response(JSON.stringify({ error: "Only a partner can create accounts." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Create the auth user (auto-confirmed so they can log in immediately)
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName || "" },
    });
    if (createErr || !created?.user) {
      return new Response(JSON.stringify({ error: createErr?.message || "Could not create user." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const newId = created.user.id;

    // 3. Upsert the profile row with the chosen role
    const { error: profileErr } = await admin.from("profiles").upsert({
      id: newId,
      email,
      full_name: fullName || "",
      role: role || "client",
    });
    if (profileErr) {
      return new Response(JSON.stringify({ error: "User created but profile failed: " + profileErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Optionally link to a matter
    if (matterId) {
      await admin.from("matters").update({ client_user_id: newId }).eq("id", matterId);
    }

    return new Response(JSON.stringify({ success: true, userId: newId }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
