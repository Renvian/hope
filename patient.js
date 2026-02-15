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

        // Initialize assignments as empty array
        let assignments = [];
        
        // Try to get assignments with test relationship first
        const result1 = await window.sb.from('custom_test_assignments')
            .select(`id, test_id, status, created_at, custom_tests(id, test_name)`)
            .eq('patient_id', patient.id)
            .eq('status', 'assigned');
        
        if (result1.error) {
            console.warn("Relationship query failed, trying separate queries:", result1.error);
            
            // Fallback: Get assignments separately
            const { data: tmpAssignments, error: tmpError } = await window.sb.from('custom_test_assignments')
                .select('id, test_id, status')
                .eq('patient_id', patient.id)
                .eq('status', 'assigned');
            
            if (tmpError) {
                console.error("Fallback query error:", tmpError);
                list.innerHTML = "<p style='color: var(--alert-red);'>Error loading assigned tests: " + tmpError.message + "</p>";
                return;
            }
            
            if (tmpAssignments && tmpAssignments.length > 0) {
                // Fetch test names for each assignment
                const testIds = tmpAssignments.map(a => a.test_id);
                const { data: tests, error: testsError } = await window.sb.from('custom_tests')
                    .select('id, test_name')
                    .in('id', testIds);
                
                if (testsError) {
                    console.error("Tests fetch error:", testsError);
                    list.innerHTML = "<p style='color: var(--alert-red);'>Error loading test names: " + testsError.message + "</p>";
                    return;
                }
                
                assignments = tmpAssignments.map(assign => ({
                    ...assign,
                    custom_tests: tests ? tests.find(t => t.id === assign.test_id) : null
                }));
            } else {
                assignments = [];
            }
        } else if (result1.data) {
            assignments = result1.data;
        }

        if (!assignments || assignments.length === 0) {
            list.innerHTML = "<p style='color: var(--text-secondary);'>No custom tests assigned at the moment.</p>";
            return;
        }

        list.innerHTML = '';
        assignments.forEach(assign => {
            const testName = (assign.custom_tests?.test_name) || 'Unknown Test';
            list.innerHTML += `
                <div class="card" style="cursor: pointer; text-decoration: none; color: inherit;" onclick="window.location.href='take-custom-test.html?assignmentId=${assign.id}'">
                    <h4>${testName}</h4>
                    <p>Click to start →</p>
                </div>
            `;
        });
    } catch (error) {
        console.error("Load assigned tests error:", error);
        list.innerHTML = "<p style='color: var(--alert-red);'>Error: " + error.message + "</p>";
    }
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

    try {
        // 1. Fetch the assignment and the template details
        let assignment = null;
        let test = null;
        
        const result1 = await window.sb.from('custom_test_assignments')
            .select(`id, test_id, status, custom_tests(id, test_name)`)
            .eq('id', assignmentId).single();

        if (result1.error || !result1.data) {
            console.warn("Direct assignment query failed, trying step by step", result1.error);
            throw new Error(result1.error?.message || "Test assignment not found");
        }

        assignment = result1.data;
        const testId = assignment.test_id || assignment.custom_tests?.id;

        if (!testId) {
            throw new Error("Test ID not found");
        }

        // Fetch full test details with questions and options
        const { data: testData, error: testError } = await window.sb.from('custom_tests')
            .select(`id, test_name, custom_test_questions(id, question_text), custom_test_options(id, option_text, score_value)`)
            .eq('id', testId)
            .single();

        if (testError || !testData) {
            // Fallback: Fetch test and separate queries for questions/options
            const { data: basicTest } = await window.sb.from('custom_tests')
                .select('id, test_name')
                .eq('id', testId)
                .single();
            
            if (!basicTest) throw new Error("Test not found");
            
            const { data: questions } = await window.sb.from('custom_test_questions')
                .select('id, question_text')
                .eq('test_id', testId);
            
            const { data: options } = await window.sb.from('custom_test_options')
                .select('id, option_text, score_value')
                .eq('test_id', testId);
            
            test = {
                ...basicTest,
                custom_test_questions: questions || [],
                custom_test_options: options || []
            };
        } else {
            test = testData;
        }

        if (!test) {
            throw new Error("Failed to load test details");
        }

        document.getElementById('testTitle').innerText = test.test_name || 'Custom Test';

        // 2. Build the Questions UI
        const container = document.getElementById('testContent');
        container.innerHTML = '';

        if (!test.custom_test_questions || test.custom_test_questions.length === 0) {
            container.innerHTML = '<p style="color: var(--alert-red);">No questions found for this test.</p>';
            return;
        }

        if (!test.custom_test_options || test.custom_test_options.length === 0) {
            container.innerHTML = '<p style="color: var(--alert-red);">No scoring options found for this test.</p>';
            return;
        }

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
    } catch (error) {
        console.error("Error initializing test:", error);
        document.getElementById('testTitle').innerText = 'Error Loading Test';
        document.getElementById('testContent').innerHTML = `
            <p style="color: var(--alert-red); font-weight: bold;">Error: ${error.message}</p>
            <p style="color: var(--text-secondary);">Please go back and try again.</p>
        `;
    }
}

// Submit custom test
async function submitCustomTest() {
    try {
        const inputs = document.querySelectorAll('input[type="radio"]:checked');
        
        if (inputs.length === 0) {
            alert("Please answer all questions");
            return;
        }

        let totalScore = 0;
        inputs.forEach(i => totalScore += parseInt(i.value));

        const assignmentId = new URLSearchParams(window.location.search).get('assignmentId');

        if (!assignmentId) {
            alert("Error: Assignment ID not found");
            return;
        }

        // Save results and mark as completed
        const { error: resultError } = await window.sb.from('custom_test_results').insert([{
            assignment_id: assignmentId,
            total_score: totalScore
        }]);

        if (resultError) {
            console.error("Result save error:", resultError);
            alert("Error saving results: " + resultError.message);
            return;
        }

        const { error: assignError } = await window.sb.from('custom_test_assignments')
            .update({ status: 'completed', completed_at: new Date().toISOString() })
            .eq('id', assignmentId);

        if (assignError) {
            console.error("Assignment update error:", assignError);
            alert("Error updating assignment: " + assignError.message);
            return;
        }

        alert(`Test Submitted! Total Score: ${totalScore}`);
        window.location.href = 'patient-dashboard.html';
    } catch (error) {
        console.error("Error submitting test:", error);
        alert("Error: " + error.message);
    }
}