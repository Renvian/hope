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