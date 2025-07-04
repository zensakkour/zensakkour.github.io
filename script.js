document.addEventListener('DOMContentLoaded', () => {
    console.log("JavaScript file loaded and DOM fully parsed.");

    // Data store
    let gymData = {
        sessions: [], // { id: Date.now(), name: "Arms Day", exercises: [] }
        // exercise: { id: Date.now(), name: "Bicep Curls", sets: [] }
        // set: { id: Date.now(), weight: 0, reps: 0, timestamp: new Date() }
    };

    // DOM Elements
    const sessionListDiv = document.getElementById('session-list');
    const newSessionNameInput = document.getElementById('new-session-name');
    const addSessionBtn = document.getElementById('add-session-btn');

    const exerciseListContainer = document.getElementById('exercise-list-container');
    const currentSessionTitle = document.getElementById('current-session-title');
    const exerciseListUl = document.getElementById('exercise-list');
    const newExerciseNameInput = document.getElementById('new-exercise-name');
    const addExerciseBtn = document.getElementById('add-exercise-btn');

    const setTrackerContainer = document.getElementById('set-tracker-container');
    const currentExerciseTitle = document.getElementById('current-exercise-title');
    const setsListDiv = document.getElementById('sets-list');
    const setWeightInput = document.getElementById('set-weight');
    const setRepsInput = document.getElementById('set-reps');
    const addSetBtn = document.getElementById('add-set-btn');
    const backToExercisesBtn = document.getElementById('back-to-exercises-btn');

    const addSessionControls = document.querySelector('.add-session-controls');
    const analysisSection = document.getElementById('analysis');
    const exerciseSelectAnalysis = document.getElementById('exercise-select-analysis');
    const progressChartCanvas = document.getElementById('progressChart').getContext('2d');
    const rawDataOutput = document.getElementById('raw-data-output');
    let progressChart = null; // To hold the Chart.js instance


    let currentSessionId = null;
    let currentExerciseId = null;

    const APP_STORAGE_KEY = 'gymTrackerData';

    // --- Data Persistence Functions ---
    function saveData() {
        try {
            localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(gymData));
            console.log("Data saved to localStorage.");
        } catch (e) {
            console.error("Error saving data to localStorage:", e);
            // Optionally alert the user if storage is full or permission denied
            alert("Could not save data. Your browser's storage might be full or private browsing mode is on.");
        }
    }

    function loadData() {
        try {
            const data = localStorage.getItem(APP_STORAGE_KEY);
            if (data) {
                gymData = JSON.parse(data);
                console.log("Data loaded from localStorage.");
                // Ensure date objects are correctly parsed if stored as strings
                // For example, set timestamps are ISO strings, convert them back to Date objects for charting
                gymData.sessions.forEach(session => {
                    session.exercises.forEach(exercise => {
                        exercise.sets.forEach(set => {
                            if (typeof set.timestamp === 'string') {
                                set.timestamp = new Date(set.timestamp);
                            }
                        });
                    });
                });
            } else {
                console.log("No data found in localStorage, starting fresh.");
                // Initialize with default structure if needed, though current structure is fine
            }
        } catch (e) {
            console.error("Error loading data from localStorage:", e);
            // If data is corrupted, might be good to clear it or start fresh
            // For now, we'll just log the error and proceed with empty/default data
            gymData = { sessions: [] }; // Reset to a known good state
        }
    }


    // --- Render Functions ---
    function renderSessions() {
        sessionListDiv.innerHTML = ''; // Clear existing sessions
        if (gymData.sessions.length === 0) {
            sessionListDiv.innerHTML = '<p>No sessions created yet. Add one below!</p>';
        } else {
            gymData.sessions.forEach(session => {
                const button = document.createElement('button');
                button.textContent = session.name;
                button.dataset.sessionId = session.id;
                button.addEventListener('click', () => {
                    currentSessionId = session.id;
                    renderExercisesForSession(session.id);
                    showExerciseList();
                });
                sessionListDiv.appendChild(button);
            });
        }
    }

    function renderExercisesForSession(sessionId) {
        const session = gymData.sessions.find(s => s.id === sessionId);
        if (!session) return;

        currentSessionTitle.textContent = `Exercises for ${session.name}`;
        exerciseListUl.innerHTML = ''; // Clear existing exercises

        if (session.exercises.length === 0) {
            exerciseListUl.innerHTML = '<li>No exercises added to this session yet.</li>';
        } else {
            session.exercises.forEach(exercise => {
                const li = document.createElement('li');
                const button = document.createElement('button');
                button.textContent = exercise.name;
                button.dataset.exerciseId = exercise.id; // Store exercise ID
                button.addEventListener('click', () => {
                    currentExerciseId = exercise.id;
                    renderSetsForExercise(sessionId, exercise.id);
                    showSetTracker();
                });
                li.appendChild(button);
                exerciseListUl.appendChild(li);
            });
        }
    }

    function renderSetsForExercise(sessionId, exerciseId) {
        const session = gymData.sessions.find(s => s.id === sessionId);
        if (!session) return;
        const exercise = session.exercises.find(ex => ex.id === exerciseId);
        if (!exercise) return;

        currentExerciseTitle.textContent = `Tracking: ${exercise.name}`;
        setsListDiv.innerHTML = ''; // Clear existing sets

        if (exercise.sets.length === 0) {
            setsListDiv.innerHTML = '<p>No sets recorded for this exercise yet.</p>';
        } else {
            exercise.sets.forEach((set, index) => {
                const div = document.createElement('div');
                div.textContent = `Set ${index + 1}: ${set.weight} kg x ${set.reps} reps`;
                setsListDiv.appendChild(div);
            });
        }
    }


    // --- UI Navigation Functions ---
    function showSessionList() {
        sessionListDiv.style.display = 'block';
        addSessionControls.style.display = 'flex';
        exerciseListContainer.style.display = 'none';
        setTrackerContainer.style.display = 'none';
        currentSessionId = null; // Reset when going back to session list
    }

    function showExerciseList() {
        sessionListDiv.style.display = 'none';
        addSessionControls.style.display = 'none';
        exerciseListContainer.style.display = 'block';
        setTrackerContainer.style.display = 'none';
        currentExerciseId = null; // Reset when going back to exercise list
    }

    function showSetTracker() {
        exerciseListContainer.style.display = 'none';
        setTrackerContainer.style.display = 'block';
    }


    // --- Event Handlers ---
    addSessionBtn.addEventListener('click', () => {
        const sessionName = newSessionNameInput.value.trim();
        if (sessionName) {
            const newSession = {
                id: Date.now(),
                name: sessionName,
                exercises: []
            };
            gymData.sessions.push(newSession);
            newSessionNameInput.value = ''; // Clear input
            renderSessions();
            saveData(); // Save after adding
            showFeedback("Session added!");
        } else {
            alert("Please enter a session name.");
        }
    });

    addExerciseBtn.addEventListener('click', () => {
        if (currentSessionId === null) {
            alert("Please select a session first.");
            return;
        }
        const exerciseName = newExerciseNameInput.value.trim();
        if (exerciseName) {
            const session = gymData.sessions.find(s => s.id === currentSessionId);
            if (session) {
                const newExercise = {
                    id: Date.now(),
                    name: exerciseName,
                    sets: []
                };
                session.exercises.push(newExercise);
                newExerciseNameInput.value = ''; // Clear input
                renderExercisesForSession(currentSessionId);
                saveData(); // Save after adding
                showFeedback("Exercise added!");
            }
        } else {
            alert("Please enter an exercise name.");
        }
    });

    addSetBtn.addEventListener('click', () => {
        if (currentSessionId === null || currentExerciseId === null) {
            alert("Error: Session or exercise not selected.");
            return;
        }
        const weight = parseFloat(setWeightInput.value);
        const reps = parseInt(setRepsInput.value);

        if (isNaN(weight) || isNaN(reps) || weight < 0 || reps <= 0) {
            alert("Please enter valid weight and reps.");
            return;
        }

        const session = gymData.sessions.find(s => s.id === currentSessionId);
        if (!session) return;
        const exercise = session.exercises.find(ex => ex.id === currentExerciseId);
        if (!exercise) return;

        const newSet = {
            id: Date.now(),
            weight: weight,
            reps: reps,
            timestamp: new Date().toISOString()
        };
        exercise.sets.push(newSet);

        setWeightInput.value = '';
        setRepsInput.value = '';
        renderSetsForExercise(currentSessionId, currentExerciseId);
        saveData(); // Save after adding
        showFeedback("Set added!");
    });

    backToExercisesBtn.addEventListener('click', () => {
        showExerciseList();
        // No need to re-render exercises unless data changed,
        // but if you were on a specific exercise, currentExerciseId is now null
        // So the exercise list will show all exercises for the currentSessionId
        renderExercisesForSession(currentSessionId);
    });

    // --- Navigation Links ---
    const navLinks = document.querySelectorAll('nav ul li a');
    const sections = document.querySelectorAll('main section');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href').substring(1);

            sections.forEach(section => {
                if (section.id === targetId) {
                    section.style.display = 'block';
                } else {
                    section.style.display = 'none';
                }
            });

            navLinks.forEach(navLink => navLink.classList.remove('active'));
            link.classList.add('active');

            // If navigating to sessions tab, ensure the session list is visible
            if (targetId === 'sessions') {
                showSessionList();
                renderSessions(); // Re-render sessions in case any were added/modified indirectly
            }
        });
    });

    // --- Analysis Functions ---
    function populateExerciseSelect() {
        exerciseSelectAnalysis.innerHTML = '<option value="">--Select Exercise--</option>'; // Clear and add default
        const allExercises = new Map(); // Use a Map to store unique exercises by name

        gymData.sessions.forEach(session => {
            session.exercises.forEach(exercise => {
                if (!allExercises.has(exercise.name)) {
                    allExercises.set(exercise.name, []);
                }
                // Aggregate all sets for this exercise name across all sessions
                allExercises.get(exercise.name).push(...exercise.sets.map(set => ({...set, sessionDate: session.date || new Date(session.id).toLocaleDateString()})));
            });
        });

        allExercises.forEach((sets, name) => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            exerciseSelectAnalysis.appendChild(option);
        });
    }

    function displayProgressForExercise(exerciseName) {
        rawDataOutput.textContent = ''; // Clear previous raw data
        if (progressChart) {
            progressChart.destroy(); // Destroy previous chart instance
        }

        if (!exerciseName) {
            document.getElementById('progress-chart-container').style.display = 'none';
            document.getElementById('raw-data-container').style.display = 'none';
            return;
        }

        document.getElementById('progress-chart-container').style.display = 'block';
        document.getElementById('raw-data-container').style.display = 'block';

        const exerciseDataPoints = [];
        gymData.sessions.forEach(session => {
            session.exercises.forEach(exercise => {
                if (exercise.name === exerciseName) {
                    exercise.sets.forEach(set => {
                        exerciseDataPoints.push({
                            timestamp: new Date(set.timestamp), // Ensure it's a Date object
                            weight: set.weight,
                            reps: set.reps,
                            volume: set.weight * set.reps // Calculated volume
                        });
                    });
                }
            });
        });

        // Sort data points by timestamp
        exerciseDataPoints.sort((a, b) => a.timestamp - b.timestamp);

        if (exerciseDataPoints.length === 0) {
            rawDataOutput.textContent = "No data recorded for this exercise yet.";
            if (progressChart) progressChart.destroy();
             document.getElementById('progress-chart-container').style.display = 'none';
            return;
        }

        // Display raw data
        rawDataOutput.textContent = JSON.stringify(exerciseDataPoints.map(dp => ({
            date: dp.timestamp.toLocaleDateString(),
            time: dp.timestamp.toLocaleTimeString(),
            weight: dp.weight,
            reps: dp.reps,
            volume: dp.volume
        })), null, 2);

        // Prepare data for Chart.js
        const labels = exerciseDataPoints.map(dp => dp.timestamp.toLocaleDateString() + ' ' + dp.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        const weightData = exerciseDataPoints.map(dp => dp.weight);
        const repsData = exerciseDataPoints.map(dp => dp.reps);
        const volumeData = exerciseDataPoints.map(dp => dp.volume);

        progressChart = new Chart(progressChartCanvas, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Weight (kg)',
                        data: weightData,
                        borderColor: 'rgb(255, 99, 132)',
                        backgroundColor: 'rgba(255, 99, 132, 0.5)',
                        yAxisID: 'yWeight',
                    },
                    {
                        label: 'Reps',
                        data: repsData,
                        borderColor: 'rgb(54, 162, 235)',
                        backgroundColor: 'rgba(54, 162, 235, 0.5)',
                        yAxisID: 'yReps',
                    },
                    {
                        label: 'Volume (Weight x Reps)',
                        data: volumeData,
                        borderColor: 'rgb(75, 192, 192)',
                        backgroundColor: 'rgba(75, 192, 192, 0.5)',
                        yAxisID: 'yVolume',
                        hidden: true, // Initially hidden, can be toggled
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                scales: {
                    x: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Date & Time of Set',
                            color: '#f4f4f4'
                        },
                        ticks: { color: '#ccc' }
                    },
                    yWeight: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Weight (kg)',
                            color: 'rgb(255, 99, 132)'
                        },
                        ticks: { color: 'rgb(255, 99, 132)' }
                    },
                    yReps: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Reps',
                            color: 'rgb(54, 162, 235)'
                        },
                        ticks: { color: 'rgb(54, 162, 235)' },
                        grid: {
                            drawOnChartArea: false, // only draw grid for yWeight axis
                        },
                    },
                    yVolume: {
                        type: 'linear',
                        display: true,
                        position: 'right', // Can be on left or right, adjust if too cluttered
                        title: {
                            display: true,
                            text: 'Volume (kg*reps)',
                            color: 'rgb(75, 192, 192)'
                        },
                        ticks: { color: 'rgb(75, 192, 192)'},
                        grid: {
                            drawOnChartArea: false,
                        },
                        // Offset this axis if needed, or hide by default
                        // For simplicity, we'll let it overlay for now or user can toggle
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            color: '#f4f4f4' // Light color for legend text
                        }
                    },
                    tooltip: {
                        titleColor: '#fff',
                        bodyColor: '#ddd',
                        backgroundColor: 'rgba(0,0,0,0.8)',
                    }
                }
            }
        });
    }


    // --- Event Listener for Analysis Tab ---
    exerciseSelectAnalysis.addEventListener('change', (e) => {
        displayProgressForExercise(e.target.value);
    });


    // --- Feedback Toast Function ---
    function showFeedback(message) {
        const feedbackToast = document.createElement('div');
        feedbackToast.textContent = message;
        feedbackToast.className = 'feedback-toast';
        document.body.appendChild(feedbackToast);

        // Animate in
        setTimeout(() => {
            feedbackToast.classList.add('show');
        }, 10); // Small delay to allow CSS transition to catch

        // Animate out and remove
        setTimeout(() => {
            feedbackToast.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(feedbackToast);
            }, 500); // Match CSS transition duration
        }, 2500); // Display time
    }


    // --- Initial Setup ---
    loadData(); // Load data from localStorage on startup

    // Start with the sessions section visible and others hidden
    document.getElementById('sessions').style.display = 'block';
    analysisSection.style.display = 'none'; // Use the variable
    document.querySelector('nav ul li a[href="#sessions"]').classList.add('active');

    showSessionList(); // Ensure the correct initial view within the "Sessions" section
    renderSessions(); // Initial render of sessions (now with potentially loaded data)

    // Populate exercise dropdown when analysis tab is shown (or initially if it's the default view)
    // We'll also update it when the analysis tab is clicked in nav
    const analysisNavLink = document.querySelector('nav ul li a[href="#analysis"]');
    if (analysisNavLink) {
        analysisNavLink.addEventListener('click', () => {
            populateExerciseSelect();
            // Reset chart if no exercise is selected or if navigating away and back
            displayProgressForExercise(exerciseSelectAnalysis.value);
        });
    }
    // Initial population in case the Analysis tab is made visible by default at some point
    populateExerciseSelect();
    displayProgressForExercise(""); // Initially show no chart / empty state

});
