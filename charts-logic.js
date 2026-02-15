function renderCharts(phq, gad, pss, mood) {
    const ctxLine = document.getElementById('lineChart');
    const ctxPie = document.getElementById('pieChart');

    // Line Chart
    new Chart(ctxLine, {
        type: 'line',
        data: {
            labels: Array.from({length: phq.length}, (_, i) => `Week ${i+1}`),
            datasets: [
                { label: 'PHQ-9', data: phq, borderColor: '#C8A2C8', tension: 0.3 },
                { label: 'GAD-7', data: gad, borderColor: '#8B5FBF', tension: 0.3 },
                { label: 'PSS-10', data: pss, borderColor: '#F5A8C1', tension: 0.3 }
            ]
        }
    });

    // Pie Chart (Mood Distribution)
    // Simple calc for example: Count occurrences of 1-5
    const counts = [0,0,0,0,0];
    mood.forEach(v => counts[v-1]++);
    
    new Chart(ctxPie, {
        type: 'doughnut',
        data: {
            labels: ['😢', '😐', '🙂', '😄', '🥳'],
            datasets: [{
                data: counts,
                backgroundColor: ['#ffadad', '#ffd6a5', '#fdffb6', '#caffbf', '#9bf6ff']
            }]
        }
    });
}
