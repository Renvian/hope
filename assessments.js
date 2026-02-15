const SCORING = {
    'PHQ-9': { max: 27, reverse: [] },
    'GAD-7': { max: 21, reverse: [] },
    'PSS-10': { max: 40, reverse: [3, 4, 6, 7] } // Indices to reverse
};

async function submitTest(testType, answers) {
    const user = await checkSession();
    
    // Get Patient ID
    const { data: patient } = await window.sb.from('patients')
        .select('id').eq('user_id', user.id).single();

    // Calculate Score
    let score = 0;
    answers.forEach((val, idx) => {
        let v = parseInt(val);
        if (SCORING[testType].reverse.includes(idx)) v = 4 - v; // Reverse logic for PSS
        score += v;
    });

    // Save
    await window.sb.from('assessments').insert([{
        patient_id: patient.id,
        test_type: testType,
        answers: answers,
        score: score
    }]);

    // Check Alerts (Immediate logic)
    let sev = 'Green'; let msg = 'Stable';
    if(testType === 'PHQ-9') {
        if(parseInt(answers[8]) > 0 || score >= 20) { sev = 'Red'; msg = 'Critical Risk'; }
        else if(score >= 15) { sev = 'Orange'; msg = 'High Depression'; }
    }
    
    if(sev !== 'Green') {
        await window.sb.from('alerts').insert([{ patient_id: patient.id, severity: sev, message: msg }]);
    }

    alert(`Submitted. Score: ${score}`);
    window.location.href = "patient-dashboard.html";
}
