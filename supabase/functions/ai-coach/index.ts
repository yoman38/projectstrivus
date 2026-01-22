import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface UserContext {
  userId: string;
  recentWorkouts: any[];
  personalRecords: any[];
  checkInData: any[];
  fitnessMetrics: any;
}

interface CoachRequest {
  message: string;
  userContext: UserContext;
}

async function getGPTResponse(message: string, userContext: UserContext): Promise<string> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    return "I'm not configured yet. Please set up your OpenAI API key!";
  }

  const systemPrompt = buildSystemPrompt(userContext);

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: message,
          },
        ],
        temperature: 0.7,
        max_tokens: 300,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenAI API error:", data);
      return "I encountered an issue processing your question. Please try again!";
    }

    return data.choices[0]?.message?.content || "I couldn't generate a response.";
  } catch (error) {
    console.error("Error calling OpenAI:", error);
    return "There was an error connecting to the AI service. Please try again!";
  }
}

function buildSystemPrompt(userContext: UserContext): string {
  const lastWorkout = userContext.recentWorkouts?.[0];
  const topPR = userContext.personalRecords?.[0];
  const lastCheckIn = userContext.checkInData?.[0];

  return `You are Strivus, an enthusiastic and knowledgeable AI fitness coach represented by a magical unicorn character. You're supportive, energetic, and always motivating!

User Context:
- Last Workout: ${lastWorkout ? `${lastWorkout.exercises?.length} exercises on ${lastWorkout.workout_date}` : "None logged yet"}
- Top PR: ${topPR ? `${topPR.exercise_name}: ${topPR.max_weight}lbs` : "None yet"}
- Latest Check-in: ${lastCheckIn ? `Readiness score: ${Math.round(((lastCheckIn.sleep_quality || 0) + (lastCheckIn.nutrition_quality || 0)) / 2 * 10)}/40` : "Not logged"}

Your personality:
- Enthusiastic and motivating with unicorn-themed reactions
- Provide specific, actionable advice based on their training data
- Celebrate their wins and PRs
- Give form tips and recovery advice
- Keep responses concise (2-3 sentences max)
- Use fitness emojis occasionally

Remember: You're talking to a real person with real goals. Be their cheerleader and guide!`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { message, userContext }: CoachRequest = await req.json();

    if (!message || !userContext) {
      return new Response(
        JSON.stringify({ error: "Missing message or userContext" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const coachResponse = await getGPTResponse(message, userContext);

    return new Response(JSON.stringify({ response: coachResponse }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error in AI Coach function:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
