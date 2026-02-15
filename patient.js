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

// --- CUSTOM TESTS FEATURES ---

// Load assigned custom tests for patient
async function loadAssignedTests() {
    const list = document.getElementById('assignedTestsList');
    if (!list) return;

    try {
        // Refresh session first
        await window.sb.auth.refreshSession();
        
        const user = await checkSession();
        if (!user) {
            list.innerHTML = "<p style='color: var(--alert-red);'>Please log in to view assigned tests.</p>";
            return;
        }

        const { data: patient, error: patientError } = await window.sb.from('patients')
            .select('id').eq('user_id', user.id).single();

        if (patientError) {
            console.error("Patient error:", patientError);
            list.innerHTML = "<p style='color: var(--alert-red);'>Error loading patient data.</p>";
            return;
        }

        if (!patient) {
            list.innerHTML = "<p style='color: var(--text-secondary);'>Patient profile not found.</p>";
            return;
        }

        const { data: assignments, error: assignError } = await window.sb.from('custom_test_assignments')
            .select(`*, custom_tests(test_name)`)
            .eq('patient_id', patient.id)
            .eq('status', 'assigned');

        if (assignError) {
            console.error("Assignments error:", assignError);
            list.innerHTML = "<p style='color: var(--alert-red);'>Error loading assigned tests.</p>";
            return;
        }

        if (!assignments || assignments.length === 0) {
            list.innerHTML = "<p style='color: var(--text-secondary);'>No custom tests assigned at the moment.</p>";
            return;
        }
    } catch (error) {
        console.error("Load assigned tests error:", error);
        list.innerHTML = "<p style='color: var(--alert-red);'>Error loading tests. Please refresh the page.</p>";
        return;
    }

    list.innerHTML = '';
    assignments.forEach(assign => {
        list.innerHTML += `
            <div class="card" style="cursor: pointer; text-decoration: none; color: inherit;" onclick="window.location.href='take-custom-test.html?assignmentId=${assign.id}'">
                <h4>${assign.custom_tests.test_name}</h4>
                <p>Click to start →</p>
            </div>
        `;
    });
}

// Initialize custom test taking page
async function initTest() {
    const urlParams = new URLSearchParams(window.location.search);
    const assignmentId = urlParams.get('assignmentId');

    if (!assignmentId) {
        alert("Invalid test assignment");
        window.location.href = 'patient-dashboard.html';
        return;
    }

    // 1. Fetch the assignment and the template details
    const { data: assignment, error } = await window.sb.from('custom_test_assignments')
        .select(`*, custom_tests(*, custom_test_questions(*), custom_test_options(*))`)
        .eq('id', assignmentId).single();

    if (error || !assignment) {
        alert("Error loading test: " + (error?.message || "Test not found"));
        window.location.href = 'patient-dashboard.html';
        return;
    }

    const test = assignment.custom_tests;
    document.getElementById('testTitle').innerText = test.test_name;

    // 2. Build the Questions UI
    const container = document.getElementById('testContent');
    container.innerHTML = '';

    test.custom_test_questions.forEach((q, qIdx) => {
        let optionsHTML = test.custom_test_options.map(opt => `
            <label class="option-label">
                <input type="radio" name="q${qIdx}" value="${opt.score_value}" required>
                ${opt.option_text} (${opt.score_value})
            </label>
        `).join('');

        container.innerHTML += `
            <div class="card" style="margin-bottom: 15px;">
                <p><strong>${qIdx + 1}. ${q.question_text}</strong></p>
                ${optionsHTML}
            </div>
        `;
    });
}

// Submit custom test
async function submitCustomTest() {
    const inputs = document.querySelectorAll('input[type="radio"]:checked');
    
    if (inputs.length === 0) {
        alert("Please answer all questions");
        return;
    }

    let totalScore = 0;
    inputs.forEach(i => totalScore += parseInt(i.value));

    const assignmentId = new URLSearchParams(window.location.search).get('assignmentId');

    // Save results and mark as completed
    const { error: resultError } = await window.sb.from('custom_test_results').insert([{
        assignment_id: assignmentId,
        total_score: totalScore
    }]);

    if (resultError) {
        alert("Error saving results: " + resultError.message);
        return;
    }

    const { error: assignError } = await window.sb.from('custom_test_assignments')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', assignmentId);

    if (assignError) {
        alert("Error updating assignment: " + assignError.message);
        return;
    }

    alert(`Test Submitted! Total Score: ${totalScore}`);
    window.location.href = 'patient-dashboard.html';
}