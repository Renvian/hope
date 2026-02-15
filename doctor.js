async function loadPatients() {
    await checkSession();
    
    const { data: patients } = await window.sb.from('patients')
        .select(`*, alerts(severity), assessments(score, test_type)`);

    const list = document.getElementById('patient-list');
    list.innerHTML = '';

    patients.forEach(p => {
        // Determine Badge Color
        let badge = 'bg-green';
        let status = 'Stable';
        const reds = p.alerts.filter(a => a.severity === 'Red');
        const oranges = p.alerts.filter(a => a.severity === 'Orange');

        if(reds.length > 0) { badge = 'bg-red'; status = 'Critical'; }
        else if(oranges.length > 0) { badge = 'bg-orange'; status = 'Watch'; }

        list.innerHTML += `
            <div class="card" onclick="viewProfile('${p.id}')" style="cursor:pointer">
                <h3>${p.name} <span class="badge ${badge}">${status}</span></h3>
                <p>${p.gender}, ${p.age} years old</p>
                <small>Click to view details</small>
            </div>
        `;
    });
}

function viewProfile(id) {
    localStorage.setItem('current_patient', id);
    window.location.href = 'patient-profile.html';
}

// --- SLEEP & MEDICATION FEATURES ---

// 1. Fetch and Render Sleep Charts
async function loadSleepCharts() {
    const pid = localStorage.getItem('current_patient');
    
    const { data: logs } = await window.sb
        .from('sleep_logs')
        .select('*')
        .eq('patient_id', pid)
        .order('created_at', { ascending: true })
        .limit(14); // Last 2 weeks

    if (!logs || logs.length === 0) return;

    const labels = logs.map(l => new Date(l.created_at).toLocaleDateString());
    const hours = logs.map(l => l.hours);
    const quality = logs.map(l => l.quality);

    // Render Hours Chart
    new Chart(document.getElementById('sleepHoursChart'), {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Hours Slept',
                data: hours,
                borderColor: '#8B5FBF', // Purple
                backgroundColor: 'rgba(139, 95, 191, 0.1)',
                tension: 0.3,
                fill: true
            }]
        }
    });

    // Render Quality Chart
    new Chart(document.getElementById('sleepQualityChart'), {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Quality (1-5)',
                data: quality,
                backgroundColor: '#F5A8C1', // Pink
            }]
        },
        options: {
            scales: { y: { min: 0, max: 5 } }
        }
    });
}

// 2. Add Medication
async function addMedication() {
    const pid = localStorage.getItem('current_patient');
    const user = await window.sb.auth.getUser(); // Get doctor ID

    const name = document.getElementById('medName').value;
    const dose = document.getElementById('medDose').value;
    const freq = document.getElementById('medFreq').value;
    const notes = document.getElementById('medNotes').value;

    if(!name) return alert("Medication name is required");

    const { error } = await window.sb.from('medication_records').insert([{
        patient_id: pid,
        doctor_id: user.data.user.id,
        name, dose, frequency: freq, notes
    }]);

    if(error) alert(error.message);
    else {
        alert("Medication Prescribed.");
        document.getElementById('medName').value = "";
        document.getElementById('medDose').value = "";
        document.getElementById('medFreq').value = "";
        document.getElementById('medNotes').value = "";
        loadMedications(); // Refresh list
    }
}

// 3. Load Medications List
async function loadMedications() {
    const pid = localStorage.getItem('current_patient');
    const { data: meds } = await window.sb
        .from('medication_records')
        .select('*')
        .eq('patient_id', pid)
        .order('created_at', { ascending: false });

    const list = document.getElementById('medicationList');
    list.innerHTML = "";

    if(meds.length === 0) {
        list.innerHTML = "<li style='color:#666'>No active medications.</li>";
        return;
    }

    meds.forEach(m => {
        list.innerHTML += `
            <li style="border-bottom:1px solid #eee; padding: 10px 0;">
                <strong style="color:var(--secondary)">${m.name}</strong> 
                <span style="background:#F6F0FA; padding:2px 8px; border-radius:10px; font-size:0.9em;">${m.dose}</span>
                <br>
                <small>Freq: ${m.frequency} | ${new Date(m.created_at).toLocaleDateString()}</small>
                <p style="margin:5px 0 0 0; font-size:0.9em; color:#555;">${m.notes || ''}</p>
            </li>
        `;
    });
}

// --- CUSTOM TESTS FEATURES ---

// Add option row for custom test creation
function addOptionRow() {
    const container = document.getElementById('optionsContainer');
    const row = document.createElement('div');
    row.className = 'option-row';
    row.style.cssText = 'display: flex; gap: 10px; margin-bottom: 10px; align-items: center;';
    row.innerHTML = `
        <input type="text" placeholder="Option (e.g. Never)" class="opt-text" style="flex: 1;">
        <input type="number" placeholder="Score" class="opt-score" style="width:100px;">
    `;
    container.appendChild(row);
}

// Add question row for custom test creation
function addQuestionRow() {
    const container = document.getElementById('questionsContainer');
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'custom-q';
    input.placeholder = `Question ${container.querySelectorAll('.custom-q').length + 1}`;
    input.style.cssText = 'margin-bottom: 10px;';
    container.appendChild(input);
}

// Save custom test
async function saveCustomTest() {
    const testName = document.getElementById('customTestName').value;
    if (!testName) return alert("Test name is required");

    // Check session first
    const session = await window.sb.auth.getSession();
    if (!session.data || !session.data.session) {
        alert("Please log in first");
        window.location.href = "login.html";
        return;
    }

    const user = await window.sb.auth.getUser();
    if (!user.data || !user.data.user) {
        alert("Please log in first");
        window.location.href = "login.html";
        return;
    }

    const currentUserId = user.data.user.id;
    console.log("Current user ID:", currentUserId);

    // Save test template
    const { data: test, error: testError } = await window.sb.from('custom_tests')
        .insert({ test_name: testName, doctor_id: currentUserId }).select().single();

    if (testError) {
        console.error("Test creation error:", testError);
        alert("Error creating test: " + testError.message + "\n\n" + 
              "Common causes:\n" +
              "1. Tables don't exist - Run the SQL schema in Supabase\n" +
              "2. RLS is enabled - Disable RLS in Supabase\n" +
              "3. Check browser console for details");
        return;
    }

    if (!test || !test.id) {
        alert("Test was not created properly. Please try again.");
        return;
    }

    // Save Options
    const optionRows = document.querySelectorAll('.option-row');
    const options = Array.from(optionRows).map(row => ({
        test_id: test.id,
        option_text: row.querySelector('.opt-text').value,
        score_value: parseInt(row.querySelector('.opt-score').value)
    })).filter(opt => opt.option_text && !isNaN(opt.score_value));

    if (options.length === 0) {
        alert("Please add at least one valid scoring option");
        return;
    }

    const { error: optionsError } = await window.sb.from('custom_test_options').insert(options);
    if (optionsError) {
        console.error("Options insert error:", optionsError);
        alert("Error saving options: " + optionsError.message);
        // Try to delete the test we just created
        await window.sb.from('custom_tests').delete().eq('id', test.id);
        return;
    }

    // Save Questions
    const qInputs = document.querySelectorAll('.custom-q');
    const questions = Array.from(qInputs).map(input => ({
        test_id: test.id,
        question_text: input.value
    })).filter(q => q.question_text);

    if (questions.length === 0) {
        alert("Please add at least one question");
        // Try to clean up
        await window.sb.from('custom_test_options').delete().eq('test_id', test.id);
        await window.sb.from('custom_tests').delete().eq('id', test.id);
        return;
    }

    const { error: questionsError } = await window.sb.from('custom_test_questions').insert(questions);
    if (questionsError) {
        console.error("Questions insert error:", questionsError);
        alert("Error saving questions: " + questionsError.message);
        // Try to clean up
        await window.sb.from('custom_test_options').delete().eq('test_id', test.id);
        await window.sb.from('custom_tests').delete().eq('id', test.id);
        return;
    }

    alert("Custom Test Created Successfully!");
    
    // Reset form
    document.getElementById('customTestName').value = '';
    document.getElementById('optionsContainer').innerHTML = `
        <h4>1. Define Scoring Options</h4>
        <div class="option-row" style="display: flex; gap: 10px; margin-bottom: 10px; align-items: center;">
            <input type="text" placeholder="Option (e.g. Never)" class="opt-text" style="flex: 1;">
            <input type="number" placeholder="Score" class="opt-score" style="width:100px;">
        </div>
    `;
    document.getElementById('questionsContainer').innerHTML = `
        <h4>2. Add Questions</h4>
        <input type="text" class="custom-q" placeholder="Question 1" style="margin-bottom: 10px;">
    `;
    
    // Reload test list
    if (document.getElementById('testList')) {
        loadCustomTests();
    }
}

// Load all custom tests for the doctor
async function loadCustomTests() {
    const list = document.getElementById('testList');
    const retryBtn = document.getElementById('retryBtn');
    
    if (!list) return;

    // Show loading state
    list.innerHTML = '<p style="color: var(--text-secondary);">Loading your custom tests...</p>';
    if (retryBtn) retryBtn.style.display = 'none';

    // First check session
    try {
        const session = await window.sb.auth.getSession();
        if (!session.data || !session.data.session) {
            list.innerHTML = `<p style="color: var(--alert-red);">Please log in to view your custom tests.</p>`;
            if (retryBtn) retryBtn.style.display = 'inline-block';
            return;
        }

        // Refresh session if needed
        await window.sb.auth.refreshSession();
    } catch (sessionError) {
        console.error("Session error:", sessionError);
        list.innerHTML = `<p style="color: var(--alert-red);">Session error. Please try logging in again.<br><button class="btn" onclick="window.location.href='login.html'" style="margin-top: 10px;">Go to Login</button></p>`;
        if (retryBtn) retryBtn.style.display = 'inline-block';
        return;
    }

    // Get user
    let user;
    try {
        const userResult = await window.sb.auth.getUser();
        if (!userResult.data || !userResult.data.user) {
            list.innerHTML = `<p style="color: var(--alert-red);">Unable to get user information. Please log in again.</p>`;
            return;
        }
        user = userResult.data.user;
    } catch (userError) {
        console.error("User error:", userError);
        list.innerHTML = `<p style="color: var(--alert-red);">Error getting user information: ${userError.message}</p>`;
        return;
    }

    // Load tests
    try {
        const { data: tests, error } = await window.sb
            .from('custom_tests')
            .select('*')
            .eq('doctor_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Database error:", error);
            list.innerHTML = `<p style="color: var(--alert-red);">Error loading tests: ${error.message}<br><small>Check browser console for details.</small></p>`;
            if (retryBtn) retryBtn.style.display = 'inline-block';
            return;
        }

        if (!tests || tests.length === 0) {
            list.innerHTML = "<p style='color: var(--text-secondary);'>No custom tests created yet.</p>";
            return;
        }

        list.innerHTML = '';
        tests.forEach(test => {
            list.innerHTML += `
                <div class="card" style="margin-bottom: 15px;">
                    <h4>${test.test_name}</h4>
                    <small style="color: var(--text-secondary);">Created: ${new Date(test.created_at).toLocaleDateString()}</small>
                    <div style="margin-top: 10px;">
                        <button class="btn btn-secondary" onclick="assignTestToPatient('${test.id}')" style="margin-right: 10px;">Assign to Patient</button>
                    </div>
                </div>
            `;
        });
    } catch (loadError) {
        console.error("Load error:", loadError);
        list.innerHTML = `<p style="color: var(--alert-red);">Unexpected error: ${loadError.message}</p>`;
        if (retryBtn) retryBtn.style.display = 'inline-block';
    }
}

// Assign test to patient
async function assignTestToPatient(testId) {
    try {
        // 1. Get list of patients
        const { data: patients, error: patError } = await window.sb.from('patients').select('id, name');
        
        if (patError || !patients || patients.length === 0) {
            alert("Error loading patients: " + (patError?.message || "No patients found"));
            return;
        }
        
        // 2. Create a simple prompt or custom modal to select a patient
        const patientName = prompt("Enter exactly the name of the patient to assign this to:\n\nAvailable patients:\n" + patients.map(p => p.name).join(", "));
        
        if (!patientName) {
            return; // User cancelled
        }
        
        const target = patients.find(p => p.name === patientName);

        if (!target) {
            alert("Patient not found. Please check the exact name.");
            return;
        }

        // Check if already assigned
        const { data: existing } = await window.sb.from('custom_test_assignments')
            .select('id')
            .eq('test_id', testId)
            .eq('patient_id', target.id)
            .eq('status', 'assigned')
            .single();

        if (existing) {
            alert("This test is already assigned to " + target.name);
            return;
        }

        const { error: insertError } = await window.sb.from('custom_test_assignments').insert([{
            test_id: testId,
            patient_id: target.id,
            status: 'assigned'
        }]);

        if (insertError) {
            console.error("Assignment error:", insertError);
            alert("Error assigning test: " + insertError.message);
            return;
        }

        alert("✓ Test assigned to " + target.name);
        // Reload the test list to show updated status
        if (typeof loadCustomTests === 'function') {
            loadCustomTests();
        }
    } catch (error) {
        console.error("Error in assignTestToPatient:", error);
        alert("Error: " + error.message);
    }
}

// Render custom test graph
async function renderCustomTestGraph(testId, patientId) {
    const { data } = await window.sb.from('custom_test_results')
        .select('total_score, created_at, custom_test_assignments!inner(test_id, patient_id)')
        .eq('custom_test_assignments.test_id', testId)
        .eq('custom_test_assignments.patient_id', patientId)
        .order('created_at', { ascending: true });

    if (!data || data.length === 0) return;

    const canvasId = `graph-${testId}`;
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(r => new Date(r.created_at).toLocaleDateString()),
            datasets: [{
                label: 'Total Score',
                data: data.map(r => r.total_score),
                borderColor: '#B57EDC',
                tension: 0.4
            }]
        }
    });
}

// Load custom graphs for patient profile
async function loadCustomGraphs(patientId) {
    const container = document.getElementById('customGraphsContainer');
    if (!container) return;

    try {
        // Get all custom tests
        const { data: allTests } = await window.sb.from('custom_tests').select('id, test_name');
        
        if (!allTests || allTests.length === 0) {
            container.innerHTML = "<p style='color:#666'>No custom tests available.</p>";
            return;
        }

        // Collect all graphs to render (one per test type)
        const graphsToRender = [];
        let hasResults = false;
        
        for (const test of allTests) {
            // Try to fetch results with relationship first
            let results = null;
            
            const result1 = await window.sb.from('custom_test_results')
                .select('id, total_score, created_at, custom_test_assignments!inner(id, test_id, patient_id)')
                .eq('custom_test_assignments.test_id', test.id)
                .eq('custom_test_assignments.patient_id', patientId)
                .order('created_at', { ascending: true });

            results = result1.data;
            
            // Fallback: use separate queries if relationship fails
            if (result1.error || !results) {
                console.warn("Relationship query failed for test", test.id, "trying separate query");
                
                const { data: assignments } = await window.sb.from('custom_test_assignments')
                    .select('id')
                    .eq('test_id', test.id)
                    .eq('patient_id', patientId);
                
                if (assignments && assignments.length > 0) {
                    const assignmentIds = assignments.map(a => a.id);
                    const { data: tmpResults } = await window.sb.from('custom_test_results')
                        .select('total_score, created_at')
                        .in('assignment_id', assignmentIds)
                        .order('created_at', { ascending: true });
                    
                    results = tmpResults;
                }
            }

            // Only add to render queue if there are results
            if (results && results.length > 0) {
                hasResults = true;
                graphsToRender.push({
                    testId: test.id,
                    testName: test.test_name,
                    results: results.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
                });
            }
        }
        
        // Clear container only once before adding all graphs
        if (!hasResults) {
            container.innerHTML = "<p style='color:#666'>No custom test results yet.</p>";
            return;
        }

        // Build all HTML first
        let htmlContent = '';
        graphsToRender.forEach(graph => {
            const canvasId = `graph-${graph.testId}`;
            htmlContent += `
                <div class="card">
                    <h4>${graph.testName}</h4>
                    <canvas id="${canvasId}"></canvas>
                </div>
            `;
        });
        
        // Insert all HTML at once
        container.innerHTML = htmlContent;
        
        // Now render all charts
        graphsToRender.forEach(graph => {
            const canvasId = `graph-${graph.testId}`;
            
            // Small timeout to ensure canvas is in DOM
            setTimeout(() => {
                const canvas = document.getElementById(canvasId);
                if (canvas && typeof Chart !== 'undefined') {
                    try {
                        const ctx = canvas.getContext('2d');
                        new Chart(ctx, {
                            type: 'line',
                            data: {
                                labels: graph.results.map(r => new Date(r.created_at).toLocaleDateString()),
                                datasets: [{
                                    label: 'Score',
                                    data: graph.results.map(r => r.total_score),
                                    borderColor: '#B57EDC',
                                    backgroundColor: 'rgba(181, 126, 220, 0.1)',
                                    tension: 0.4,
                                    fill: true,
                                    pointBackgroundColor: '#B57EDC',
                                    pointBorderColor: '#fff',
                                    pointBorderWidth: 2,
                                    pointRadius: 4
                                }]
                            },
                            options: {
                                responsive: true,
                                maintainAspectRatio: true,
                                plugins: {
                                    legend: { display: true }
                                },
                                scales: {
                                    y: { 
                                        beginAtZero: true,
                                        ticks: {
                                            stepSize: 1
                                        }
                                    }
                                }
                            }
                        });
                    } catch (chartError) {
                        console.error("Error rendering chart for test", graph.testId, ":", chartError);
                    }
                }
            }, 50);
        });
    } catch (error) {
        console.error("Error loading custom graphs:", error);
        container.innerHTML = "<p style='color:#d9534f'>Error loading test results: " + error.message + "</p>";
    }
}