const GEMINI_KEY = "";

async function generateInsight(name, phq, gad, pss, mood) {
    const prompt = `
    Analyze mental health trends for patient ${name}.
    Data (Last sessions):
    PHQ-9 (Depression): ${phq.join(', ')}
    GAD-7 (Anxiety): ${gad.join(', ')}
    PSS-10 (Stress): ${pss.join(', ')}
    Mood (1-5): ${mood.join(', ')}
    
    Provide a 3-sentence summary of trends and risk patterns. Do NOT diagnose.`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`;
    
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        const data = await res.json();
        return data.candidates[0].content.parts[0].text;
    } catch (e) {
        return "AI Analysis unavailable.";
    }
}
