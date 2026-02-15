// Global variable to track if record exists
let recordExists = false;

async function loadPatientRecords() {
    const pid = localStorage.getItem('current_patient');
    
    if (!pid) {
        console.warn("No patient ID found in localStorage");
        return;
    }
    
    try {
        const { data, error } = await window.sb
            .from('patient_records')
            .select('*')
            .eq('patient_id', pid)
            .single();

        if (error) {
            // 406 means no record found, which is fine - it's a new patient
            if (error.code === 'PGRST116' || error.status === 406) {
                console.log("No patient records found yet - will create new on save");
                recordExists = false;
                return;
            }
            
            // For other errors, log but don't crash
            console.warn("Error loading patient records:", error);
            recordExists = false;
            return;
        }

        if (data) {
            recordExists = true;
            document.getElementById('clinicalNotes').value = data.notes || "";
            document.getElementById('treatmentPlan').value = data.treatment_plan || "";
        } else {
            recordExists = false;
        }
    } catch (error) {
        console.error("Exception loading patient records:", error);
        recordExists = false;
    }
}

async function saveRecord(type) {
    try {
        const pid = localStorage.getItem('current_patient');
        const userResult = await window.sb.auth.getUser();
        
        if (!userResult.data?.user?.id) {
            alert("Error: Please log in first");
            return;
        }

        const notesVal = document.getElementById('clinicalNotes').value;
        const planVal = document.getElementById('treatmentPlan').value;

        const payload = {
            patient_id: pid,
            doctor_id: userResult.data.user.id,
            notes: notesVal,
            treatment_plan: planVal,
            updated_at: new Date().toISOString()
        };

        let result;
        if (recordExists) {
            // Update existing row
            result = await window.sb.from('patient_records')
                .update(payload)
                .eq('patient_id', pid);
        } else {
            // Create new row
            result = await window.sb.from('patient_records')
                .insert([payload]);
            recordExists = true;
        }

        if (result.error) {
            console.error("Save error:", result.error);
            
            // Handle 403 Forbidden - likely RLS issue
            if (result.error.status === 403) {
                alert("Permission Denied: You don't have permission to save records for this patient.\n\nPlease ensure:\n1. RLS is properly configured\n2. You are the assigned doctor");
            } else {
                alert("Error saving: " + result.error.message);
            }
        } else {
            alert(`${type === 'notes' ? 'Clinical Notes' : 'Treatment Plan'} updated successfully!`);
        }
    } catch (error) {
        console.error("Exception saving record:", error);
        alert("Error: " + error.message);
    }
}
