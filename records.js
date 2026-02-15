// Global variable to track if record exists
let recordExists = false;

async function loadPatientRecords() {
    const pid = localStorage.getItem('current_patient');
    
    const { data, error } = await window.sb
        .from('patient_records')
        .select('*')
        .eq('patient_id', pid)
        .single();

    if (data) {
        recordExists = true;
        document.getElementById('clinicalNotes').value = data.notes || "";
        document.getElementById('treatmentPlan').value = data.treatment_plan || "";
    } else {
        recordExists = false;
    }
}

async function saveRecord(type) {
    const pid = localStorage.getItem('current_patient');
    const user = await window.sb.auth.getUser();
    
    const notesVal = document.getElementById('clinicalNotes').value;
    const planVal = document.getElementById('treatmentPlan').value;

    const payload = {
        patient_id: pid,
        doctor_id: user.data.user.id,
        notes: notesVal,
        treatment_plan: planVal,
        updated_at: new Date()
    };

    let result;
    if (recordExists) {
        // Update existing row
        result = await window.sb.from('patient_records').update(payload).eq('patient_id', pid);
    } else {
        // Create new row
        result = await window.sb.from('patient_records').insert([payload]);
        recordExists = true;
    }

    if (result.error) {
        alert("Error saving: " + result.error.message);
    } else {
        alert(`${type === 'notes' ? 'Clinical Notes' : 'Treatment Plan'} updated successfully!`);
    }
}
