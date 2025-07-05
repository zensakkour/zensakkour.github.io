import * as state from '../state.js';
import * as dom from '../domElements.js';
import { calculateDailyVolume } from '../utils.js'; // Shared utility
// Chart.js is loaded via CDN, so it's a global (Chart)

// --- Helper Functions (Moved from script.js) ---
function getAllUniqueExerciseNames() {
    const uniqueNames = new Set();
    if (state.gymData && state.gymData.sessions) {
        state.gymData.sessions.forEach(session => {
            if (session.exercises) {
                session.exercises.forEach(exercise => {
                    uniqueNames.add(exercise.name);
                });
            }
        });
    }
    return Array.from(uniqueNames).sort();
}

export function populateExerciseSelect() {
    if (!dom.exerciseSelectAnalysis) return;
    const currentVal = dom.exerciseSelectAnalysis.value; // Preserve selection if possible
    dom.exerciseSelectAnalysis.innerHTML = '<option value="">--Select Exercise--</option>';
    getAllUniqueExerciseNames().forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        dom.exerciseSelectAnalysis.appendChild(option);
    });
    if (currentVal) dom.exerciseSelectAnalysis.value = currentVal; // Restore
}

export function populateMultiExerciseSelect() {
    if (!dom.multiExerciseSelectAnalysis) return;
    // Multi-select doesn't easily preserve value, so just repopulate
    dom.multiExerciseSelectAnalysis.innerHTML = '';
    getAllUniqueExerciseNames().forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        dom.multiExerciseSelectAnalysis.appendChild(option);
    });
}


// --- Chart Display Functions (Moved from script.js) ---

// displayBodyWeightProgress will also be called by bodyWeightView when its tab is active or data changes.
// It can live here as an analysis component, or be in bodyWeightView.js and imported if analysis tab needs it.
// For now, keeping a version here for the analysis tab's direct use.
export function displayBodyWeightProgress() {
    if (state.progressChart) state.setProgressChart(null); // Destroy old chart via setter
    if (!dom.progressChartContainer || !dom.rawDataOutput || !dom.progressChartCanvas) return;

    dom.progressChartContainer.style.display = 'block';
    dom.rawDataContainer.style.display = 'block';

    if (!state.gymData.bodyWeightLog || state.gymData.bodyWeightLog.length === 0) {
        dom.rawDataOutput.textContent = "No body weight data recorded yet.";
        const newChart = new Chart(dom.progressChartCanvas, { // Use global Chart
            type: 'line', data: { labels: [], datasets: []},
            options: { responsive: true, maintainAspectRatio: false, plugins: { title: { display: true, text: 'Body Weight Progress - No Data', color: '#f4f4f4'}}}
        });
        state.setProgressChart(newChart);
        return;
    }
    const sortedLog = [...state.gymData.bodyWeightLog].sort((a, b) => new Date(a.date + 'T00:00:00') - new Date(b.date + 'T00:00:00'));
    const labels = sortedLog.map(entry => new Date(entry.date + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }));
    const weightData = sortedLog.map(entry => entry.weight);
    dom.rawDataOutput.textContent = JSON.stringify(sortedLog.map(e => ({date: e.date, weight: e.weight})), null, 2);

    const newChart = new Chart(dom.progressChartCanvas, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Body Weight (kg)', data: weightData, borderColor: 'rgb(153, 102, 255)',
                backgroundColor: 'rgba(153, 102, 255, 0.5)', fill: false, tension: 0.1
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: {
                x: { display: true, title: { display: true, text: 'Date', color: '#f4f4f4' }, ticks: { color: '#ccc' } },
                y: { display: true, title: { display: true, text: 'Weight (kg)', color: '#f4f4f4' }, ticks: { color: '#ccc' } }
            },
            plugins: {
                legend: { labels: { color: '#f4f4f4' } },
                tooltip: { titleColor: '#fff', bodyColor: '#ddd', backgroundColor: 'rgba(0,0,0,0.8)' },
                title: { display: true, text: 'Body Weight Over Time', color: '#f4f4f4', font: {size: 16}}
            }
        }
    });
    state.setProgressChart(newChart);
}

export function displayProgressForExercise(exerciseName) {
    if (state.progressChart) state.setProgressChart(null); // Destroy old chart via setter
    if (!dom.progressChartContainer || !dom.rawDataOutput || !dom.progressChartCanvas) return;

    if (!exerciseName) {
        dom.progressChartContainer.style.display = 'none';
        dom.rawDataContainer.style.display = 'none';
        dom.rawDataOutput.textContent = "Select an exercise.";
        return;
    }
    dom.progressChartContainer.style.display = 'block';
    dom.rawDataContainer.style.display = 'block';

    const exerciseDataPoints = [];
    state.gymData.sessions.forEach(session => {
        session.exercises.forEach(exercise => {
            if (exercise.name === exerciseName) {
                exercise.sets.forEach(set => {
                    exerciseDataPoints.push({
                        timestamp: new Date(set.timestamp), weight: set.weight,
                        reps: set.reps, volume: set.weight * set.reps
                    });
                });
            }
        });
    });
    // exerciseDataPoints are already sorted by timestamp due to how they are loaded/added.
    // If not, sort here: exerciseDataPoints.sort((a, b) => a.timestamp - b.timestamp);


    if (exerciseDataPoints.length === 0) {
        dom.rawDataOutput.textContent = "No data for this exercise.";
        dom.progressChartContainer.style.display = 'none';
        return;
    }
    dom.rawDataOutput.textContent = JSON.stringify(exerciseDataPoints.map(dp => ({
        date: dp.timestamp.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }),
        time: dp.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        weight: dp.weight, reps: dp.reps, volume: dp.volume
    })), null, 2);

    const dailyVolumeData = calculateDailyVolume(exerciseDataPoints);

    if (dailyVolumeData.length === 0) {
        dom.progressChartContainer.style.display = 'none';
        dom.rawDataOutput.textContent = "No data for this exercise to plot daily volume.";
        return;
    }
    dom.progressChartContainer.style.display = 'block';

    const labels = dailyVolumeData.map(dayData => dayData.displayDate);
    const totalVolumes = dailyVolumeData.map(dayData => dayData.totalVolume);

    const newChart = new Chart(dom.progressChartCanvas, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [ {
                label: 'Total Daily Volume (kg)', data: totalVolumes,
                borderColor: 'rgb(75, 192, 192)', backgroundColor: 'rgba(75, 192, 192, 0.5)',
                fill: true, tension: 0.1
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
            scales: {
                x: { display: true, title: { display: true, text: 'Date', color: '#f4f4f4' }, ticks: { color: '#ccc' } },
                y: { display: true, title: { display: true, text: 'Total Daily Volume (kg)', color: '#f4f4f4' }, ticks: { color: '#ccc' }, beginAtZero: true }
            },
            plugins: {
                legend: { labels: { color: '#f4f4f4' } },
                tooltip: { titleColor: '#fff', bodyColor: '#ddd', backgroundColor: 'rgba(0,0,0,0.8)' },
                title: { display: true, text: `${exerciseName} - Daily Volume Progress`, color: '#f4f4f4', font: {size: 16}}
            }
        }
    });
    state.setProgressChart(newChart);
}

export function displayVolumeComparisonChart(selectedExerciseNames) {
    if (state.progressChart) state.setProgressChart(null); // Destroy old chart via setter
    if (!dom.progressChartContainer || !dom.rawDataOutput || !dom.progressChartCanvas) return;


    if (!selectedExerciseNames || selectedExerciseNames.length === 0) {
        dom.rawDataOutput.textContent = "Select exercises to compare.";
        dom.progressChartContainer.style.display = 'none'; return;
    }
    dom.progressChartContainer.style.display = 'block';
    dom.rawDataOutput.textContent = ''; // Clear raw data or show relevant summary

    const datasets = [];
    const allTimestamps = new Set(); // To collect all unique dates across selected exercises
    const exerciseDataMap = new Map(); // To store aggregated daily volumes for each exercise

    selectedExerciseNames.forEach(exName => {
        const exerciseSets = [];
        state.gymData.sessions.forEach(session => {
            session.exercises.forEach(exercise => {
                if (exercise.name === exName) {
                    exercise.sets.forEach(set => {
                        exerciseSets.push({
                            timestamp: new Date(set.timestamp), // Ensure Date object
                            weight: set.weight,
                            reps: set.reps
                        });
                    });
                }
            });
        });

        const dailyVolumes = calculateDailyVolume(exerciseSets); // Calculate daily volume for this exercise
        exerciseDataMap.set(exName, new Map(dailyVolumes.map(dv => [dv.displayDate, dv.totalVolume]))); // Map date string to volume
        dailyVolumes.forEach(dv => allTimestamps.add(new Date(dv.date).getTime())); // Add date (as time) to ensure uniqueness and allow sorting
    });

    // Create sorted unique labels (date strings DD/MM/YY)
    const sortedUniqueDateStrings = Array.from(allTimestamps)
        .sort((a,b) => a - b)
        .map(ts => new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }));

    const colorPalette = ['rgb(255, 99, 132)', 'rgb(54, 162, 235)', 'rgb(255, 206, 86)', 'rgb(75, 192, 192)', 'rgb(153, 102, 255)', 'rgb(255, 159, 64)'];

    selectedExerciseNames.forEach((exName, index) => {
        const dailyVolumesMap = exerciseDataMap.get(exName);
        datasets.push({
            label: `${exName} Volume`,
            data: sortedUniqueDateStrings.map(dateStr => dailyVolumesMap.get(dateStr) || 0), // Get volume for each date, or 0
            borderColor: colorPalette[index % colorPalette.length],
            backgroundColor: colorPalette[index % colorPalette.length].replace('rgb', 'rgba').replace(')', ', 0.2)'),
            fill: false, tension: 0.1,
        });
    });

    const newChart = new Chart(dom.progressChartCanvas, {
        type: 'line',
        data: { labels: sortedUniqueDateStrings, datasets: datasets },
        options: {
            responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
            scales: {
                x: { display: true, title: { display: true, text: 'Date', color: '#f4f4f4' }, ticks: { color: '#ccc' } },
                y: { display: true, title: { display: true, text: 'Total Volume (kg*reps)', color: '#f4f4f4' }, ticks: { color: '#ccc' }, beginAtZero: true }
            },
            plugins: {
                legend: { labels: { color: '#f4f4f4' } },
                tooltip: { titleColor: '#fff', bodyColor: '#ddd', backgroundColor: 'rgba(0,0,0,0.8)' },
                title: { display: true, text: 'Exercise Volume Comparison', color: '#f4f4f4', font: {size: 16}}
            }
        }
    });
    state.setProgressChart(newChart);
}


// --- Event Listener Setup ---
export function handleAnalysisTypeChange() { // Exported to be callable from viewManager or auth
    if (!dom.analysisDataTypeSelect || !dom.exerciseSelectGroupAnalysis || !dom.multiExerciseSelectGroupAnalysis || !dom.progressChartContainer || !dom.rawDataContainer) return;

    const selectedType = dom.analysisDataTypeSelect.value;
    dom.exerciseSelectGroupAnalysis.style.display = 'none';
    dom.multiExerciseSelectGroupAnalysis.style.display = 'none';
    dom.progressChartContainer.style.display = 'none';
    dom.rawDataContainer.style.display = 'none';

    if (selectedType === 'exercise') {
        dom.exerciseSelectGroupAnalysis.style.display = 'inline-block'; // Or 'block'
        if (dom.exerciseSelectAnalysis.value) {
            displayProgressForExercise(dom.exerciseSelectAnalysis.value);
        } else {
            if (state.progressChart) state.setProgressChart(null);
            if (dom.rawDataOutput) dom.rawDataOutput.textContent = "Select an exercise.";
        }
    } else if (selectedType === 'bodyweight') {
        displayBodyWeightProgress();
    } else if (selectedType === 'volume_comparison_exercises') {
        dom.multiExerciseSelectGroupAnalysis.style.display = 'block';
        populateMultiExerciseSelect(); // Ensure it's populated
        // Chart generation is triggered by button
    }
}

export function setupAnalysisEventListeners() {
    if (dom.analysisDataTypeSelect) {
        dom.analysisDataTypeSelect.addEventListener('change', handleAnalysisTypeChange);
    }
    if (dom.exerciseSelectAnalysis) {
        dom.exerciseSelectAnalysis.addEventListener('change', (e) => displayProgressForExercise(e.target.value));
    }
    if (dom.generateVolumeComparisonBtn) {
        dom.generateVolumeComparisonBtn.addEventListener('click', () => {
            if (!dom.multiExerciseSelectAnalysis) return;
            const selectedOptions = Array.from(dom.multiExerciseSelectAnalysis.selectedOptions).map(option => option.value);
            if (selectedOptions.length === 0) {
                alert("Please select exercises to compare.");
                return;
            }
            displayVolumeComparisonChart(selectedOptions);
        });
    }
}
