import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: "Missing environment variables" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const testUsers = [
      {
        email: "test@test.com",
        password: "Guillaume",
        name: "Test User A - Musculation",
      },
      {
        email: "test1@test1.com",
        password: "Guillaume",
        name: "Test User B - Running",
      },
    ];

    const results = [];

    for (const user of testUsers) {
      try {
        // Create auth user
        const { data: authData, error: authError } =
          await supabase.auth.admin.createUser({
            email: user.email,
            password: user.password,
            email_confirm: true,
          });

        if (authError) {
          results.push({
            email: user.email,
            status: "error",
            message: authError.message,
          });
          continue;
        }

        const userId = authData.user.id;

        // Create user profile
        const { error: profileError } = await supabase
          .from("user_profiles")
          .insert({
            id: userId,
            display_name: user.name,
          });

        if (profileError) {
          results.push({
            email: user.email,
            userId,
            status: "error",
            message: `Profile creation failed: ${profileError.message}`,
          });
          continue;
        }

        results.push({
          email: user.email,
          userId,
          status: "success",
          message: "User and profile created",
        });
      } catch (error) {
        results.push({
          email: user.email,
          status: "error",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
