const emojis = ['0', '😢', '😐', '🙂', '😄', '🥳'];

function updateMoodUI(val) {
    document.getElementById('emoji').innerText = emojis[val];
}

async function logMood() {
    const user = await checkSession();
    const { data: patient } = await window.sb.from('patients')
        .select('id').eq('user_id', user.id).single();

    const val = document.getElementById('moodRange').value;
    const note = document.getElementById('moodNote').value;

    await window.sb.from('mood_logs').insert([{
        patient_id: patient.id,
        mood_score: val,
        note: note
    }]);
    
    alert("Mood Logged!");
}

// --- SLEEP LOGGING FEATURE ---
async function submitSleepLog() {
    const user = await checkSession();
    // Fetch patient ID based on logged-in user
    const { data: patient } = await window.sb.from('patients')
        .select('id').eq('user_id', user.id).single();

    const hours = document.getElementById('sleepHours').value;
    const quality = document.getElementById('sleepQuality').value;
    const note = document.getElementById('sleepNote').value;

    if(!hours) return alert("Please enter hours slept.");

    const { error } = await window.sb.from('sleep_logs').insert([{
        patient_id: patient.id,
        hours: parseFloat(hours),
        quality: parseInt(quality),
        note: note
    }]);

    if(error) {
        alert("Error: " + error.message);
    } else {
        alert("Sleep log saved! 🌙");
        window.location.href = "patient-dashboard.html";
    }
}