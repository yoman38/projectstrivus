const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Serve the frontend files from the current directory
const publicPath = path.join(__dirname);
app.use(express.static(publicPath));

const exercisesFilePath = path.join(publicPath, 'exercises.json');

// --- API Endpoints ---

// Serve Supabase config
app.get('/api/config', (req, res) => {
    res.json({
        supabaseUrl: process.env.VITE_SUPABASE_URL || '',
        supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY || ''
    });
});

// 1. Get all exercises
app.get('/api/exercises', (req, res) => {
    res.sendFile(exercisesFilePath);
});

// 2. Add a new exercise to the database
app.post('/api/add-exercise', (req, res) => {
    const newExercise = req.body;

    fs.readFile(exercisesFilePath, 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error reading exercises file.');
        }

        const exercises = JSON.parse(data);
        const newId = Math.max(0, ...exercises.map(ex => ex.id)) + 1;
        newExercise.id = newId;
        
        exercises.push(newExercise);

        fs.writeFile(exercisesFilePath, JSON.stringify(exercises, null, 4), 'utf8', (writeErr) => {
            if (writeErr) {
                console.error(writeErr);
                return res.status(500).send('Error writing to exercises file.');
            }
            res.status(201).json({ message: 'Exercise added successfully!', newExercise });
        });
    });
});

// 3. Endpoint to call OpenAI API
app.post('/api/generate-exercise', async (req, res) => {
    const { exerciseName, youtubeUrl, materials } = req.body;
    
    // IMPORTANT: Replace with your actual OpenAI API key
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "YOUR_OPENAI_API_KEY_HERE";

    if (OPENAI_API_KEY === "YOUR_OPENAI_API_KEY_HERE") {
        return res.status(400).json({ error: "OpenAI API key is not configured on the server." });
    }

    const prompt = createAIPrompt(exerciseName, youtubeUrl, materials);

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-4o",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.6,
            })
        });

        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.statusText}`);
        }

        const data = await response.json();
        const jsonResponse = data.choices[0].message.content;
        
        // Clean up the response from OpenAI
        const cleanedJson = jsonResponse.replace(/```json\n|```/g, '').trim();
        
        res.json({ exerciseJson: cleanedJson });

    } catch (error) {
        console.error("Error calling OpenAI:", error);
        res.status(500).json({ error: 'Failed to generate exercise data from AI.' });
    }
});


// Fallback route - serve index.html for root and unmatched routes
app.get('/', (req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
});

app.get('*', (req, res, next) => {
    const requestedPath = path.join(publicPath, req.path);
    if (fs.existsSync(requestedPath) && fs.statSync(requestedPath).isFile()) {
        return next();
    }
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'API endpoint not found' });
    }
    res.sendFile(path.join(publicPath, 'index.html'));
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});


// Prompt creation function (moved to server-side)
function createAIPrompt(exerciseName, youtubeUrl, materials) {
    return `You are an expert kinesiologist and data entry specialist for a fitness application. Your task is to analyze an exercise based on provided information and generate a single, complete JSON object that conforms to a strict schema.

**User Input:**
* **Exercise Name:** ${exerciseName}
* **YouTube URL:** ${youtubeUrl}
* **Materials:** ${materials}

**Your Task:**
Analyze the user's input, including watching and interpreting the YouTube video, to fill out every field in the JSON schema below. Output **only the raw JSON object** and nothing else.

---
### JSON Schema and Field Explanations:
(The full, detailed prompt explaining each JSON field goes here, exactly as provided in the previous response)
---

**Example Output Format:**
\`\`\`json
{
  "Exercise_Name": "Barbell Bench Press",
  "Lats": 0,
  "Chest": 0.37,
  "Deltoids": 0.12,
  "sum": 0.9,
  "Material_1": "Barbell",
  "Material_2": "Bench",
  "Material_3": "",
  "Est_Time_for_10_Reps": 50,
  "coeff_rest_time": 1.3,
  "video_path_gif": "https://www.youtube.com/watch?v=gRVjAtPip0Y",
  "HowToPerform": "Lie on Bench. feet flat. Lower bar to mid-chest with elbows tucked (45-75°). Press explosively.",
  "CommonErrors": "Flaring elbows; Bouncing bar off chest.",
  "category": "push",
  "difficulty": 3,
  "metric": "reps",
  "AI_Explanation": "Observe, carbon-based unit...",
  "Persona": ["Bodybuilder", "Gym Lover", "Powerlifter", "Athlete"],
  "Primary_Muscles": ["Pectoralis Major (Sternocostal Head)", "Pectoralis Major (Clavicular Head)"],
  "Secondary_Muscles": ["Deltoid (Anterior Head)", "Triceps Brachii (All Heads)", "Serratus Anterior"],
  "risks": ["medium-risk-shoulders", "medium-risk-wrists"],
  "type": ["Isotonic (Dynamic)"],
  "mechanics": ["Compound"],
  "tags": ["Powerlifting / Weightlifting / Bodybuilding", "American Football / Rugby"],
  "skill_progression": []
}
\`\`\`

Now, based on the user's input, generate the JSON object.`;
}