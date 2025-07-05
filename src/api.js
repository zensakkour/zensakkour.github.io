import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import * as state from './state.js';
// import { showFeedback } from './ui/renderUtils.js'; // showFeedback is a UI concern, api.js should not call it directly.

// Initialize Supabase client
// Corrected: The global object from Supabase v2 CDN is 'supabase', not 'supabaseJs'
// When using Supabase via CDN, it's globally available.
// If we were using npm package, we'd do: import { createClient } from '@supabase/supabase-js';
export const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log("Supabase client initialized in api.js:", supabaseClient);


export async function loadData() {
    if (!state.currentUser) {
        console.log("loadData: No current user, clearing gymData.");
        state.setGymData({ sessions: [], bodyWeightLog: [] });
        // UI clearing will be handled by functions that call this or by auth state change
        return;
    }
    console.log("loadData: Loading data for user:", state.currentUser.id);
    // showFeedback("Loading data...", false); // showFeedback will be in renderUtils

    try {
        const { data: sessionsData, error: sessionsError } = await supabaseClient
            .from('sessions')
            .select(`
                id,
                name,
                date,
                sort_order,
                exercises (
                    id,
                    session_id,
                    name,
                    notes,
                    sort_order,
                    sets (
                        id,
                        exercise_id,
                        weight,
                        reps,
                        timestamp,
                        notes
                    )
                )
            `)
            .eq('user_id', state.currentUser.id)
            .order('sort_order', { ascending: true })
            .order('sort_order', { foreignTable: 'exercises', ascending: true })
            .order('timestamp', { foreignTable: 'exercises.sets', ascending: true });

        if (sessionsError) throw sessionsError;

        sessionsData.forEach(session => {
            if (!session.exercises) session.exercises = [];
            session.exercises.forEach(exercise => {
                if (!exercise.sets) exercise.sets = [];
                exercise.sets.forEach(set => {
                    if (typeof set.timestamp === 'string') {
                        set.timestamp = new Date(set.timestamp);
                    }
                });
            });
        });

        const loadedSessions = sessionsData || [];

        const { data: bodyWeightData, error: bodyWeightError } = await supabaseClient
            .from('body_weight_log')
            .select('*')
            .eq('user_id', state.currentUser.id)
            .order('date', { ascending: false });

        if (bodyWeightError) throw bodyWeightError;
        const loadedBodyWeightLog = bodyWeightData || [];

        state.setGymData({
            sessions: loadedSessions,
            bodyWeightLog: loadedBodyWeightLog
        });

        console.log("Data loaded from Supabase:", JSON.parse(JSON.stringify(state.gymData)));
        // showFeedback("Data loaded successfully!", false);
    } catch (error) {
        console.error("Error loading data from Supabase:", error);
        // showFeedback(`Error loading data: ${error.message}`, true);
        state.setGymData({ sessions: [], bodyWeightLog: [] }); // Fallback to empty
        throw error; // Re-throw for the caller to handle UI feedback if needed
    }
}

export async function loadUserProfile() {
    if (!state.currentUser) return null; // Return null or some indicator if no user
    try {
        const { data: profile, error } = await supabaseClient
            .from('profiles')
            .select('username, avatar_url')
            .eq('id', state.currentUser.id)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116: 'No rows found'
            throw error;
        }
        if (profile) {
            // Update the currentUser object in state.js directly or via a setter
            state.setCurrentUser({
                ...state.currentUser, // Spread existing user properties (like email, id)
                username: profile.username,
                avatar_url: profile.avatar_url
            });
            console.log("User profile loaded:", state.currentUser);
            return profile;
        } else {
            console.log("No profile found for user, can be created.");
            // Ensure username is explicitly null if no profile
            state.setCurrentUser({ ...state.currentUser, username: null, avatar_url: null });
            return null;
        }
    } catch (error) {
        console.error("Error loading user profile:", error);
        // showFeedback("Could not load user profile.", true);
        // Fallback: ensure email is displayed if username load fails
        if (state.currentUser && state.userEmailSpan) { // userEmailSpan might not be available here directly
            // This kind of UI update should be in auth.js or UI modules
        }
        throw error; // Re-throw for the caller
    }
}

// --- Session API Functions ---

export async function addSessionAPI(sessionData) {
    if (!state.currentUser) throw new Error("User must be logged in to add a session.");
    const dataToInsert = { ...sessionData, user_id: state.currentUser.id };
    const { data, error } = await supabaseClient.from('sessions').insert(dataToInsert).select().single();
    if (error) throw error;
    return data; // Returns the newly created session object from Supabase
}

export async function deleteSessionAPI(sessionId) {
    if (!state.currentUser) throw new Error("User must be logged in to delete a session.");
    const { error } = await supabaseClient.from('sessions').delete()
        .eq('id', sessionId)
        .eq('user_id', state.currentUser.id); // Ensure user owns the session
    if (error) throw error;
    // No data returned on successful delete by default
}

export async function updateSessionNameAPI(sessionId, newName) {
    if (!state.currentUser) throw new Error("User must be logged in to update a session.");
    const { error } = await supabaseClient
        .from('sessions')
        .update({ name: newName, updated_at: new Date().toISOString() })
        .eq('id', sessionId)
        .eq('user_id', state.currentUser.id);
    if (error) throw error;
}

export async function updateSessionOrderAPI(sessionUpdates) {
    // sessionUpdates is expected to be an array of objects like:
    // [{ id: sessionId1, sort_order: 0, user_id: '...' }, { id: sessionId2, sort_order: 1, user_id: '...' }]
    // Ensure user_id is part of the update for RLS if policies require it on update.
    if (!state.currentUser) throw new Error("User must be logged in to update session order.");

    // Add/confirm user_id for each update object if not already present and RLS demands it
    const updatesWithUserId = sessionUpdates.map(s => ({ ...s, user_id: state.currentUser.id }));

    const { error } = await supabaseClient.from('sessions').upsert(updatesWithUserId, { onConflict: 'id' });
    if (error) throw error;
}


// --- Exercise API Functions ---
export async function addExerciseAPI(exerciseData) {
    if (!state.currentUser) throw new Error("User must be logged in to add an exercise.");
    // Ensure user_id is included, session_id should be in exerciseData
    if (!exerciseData.session_id) throw new Error("session_id is required to add an exercise.");

    const dataToInsert = {
        ...exerciseData,
        user_id: state.currentUser.id
    };

    const { data, error } = await supabaseClient.from('exercises').insert(dataToInsert).select().single();
    if (error) throw error;
    return data; // Returns the newly created exercise object
}

export async function updateExerciseNameAPI(exerciseId, newName) {
    if (!state.currentUser) throw new Error("User must be logged in to update an exercise.");
    const { error } = await supabaseClient
        .from('exercises')
        .update({ name: newName, updated_at: new Date().toISOString() })
        .eq('id', exerciseId)
        .eq('user_id', state.currentUser.id); // Ensure user owns the exercise's session indirectly
    if (error) throw error;
}

export async function deleteExerciseAPI(exerciseId) {
    if (!state.currentUser) throw new Error("User must be logged in to delete an exercise.");
    const { error } = await supabaseClient.from('exercises').delete()
        .eq('id', exerciseId)
        .eq('user_id', state.currentUser.id);
    if (error) throw error;
}

export async function updateExerciseOrderAPI(exerciseUpdates) {
    if (!state.currentUser) throw new Error("User must be logged in to update exercise order.");
    const updatesWithUserId = exerciseUpdates.map(ex => ({ ...ex, user_id: state.currentUser.id }));
    const { error } = await supabaseClient.from('exercises').upsert(updatesWithUserId, { onConflict: 'id' });
    if (error) throw error;
}

// --- Set API Functions ---
export async function addSetAPI(setData) {
    if (!state.currentUser) throw new Error("User must be logged in to add a set.");
    if (!setData.exercise_id) throw new Error("exercise_id is required to add a set.");

    const dataToInsert = {
        ...setData,
        user_id: state.currentUser.id
    };
    const { data, error } = await supabaseClient.from('sets').insert(dataToInsert).select().single();
    if (error) throw error;
    return data; // Returns the newly created set object
}

export async function deleteSetAPI(setId) {
    if (!state.currentUser) throw new Error("User must be logged in to delete a set.");
    const { error } = await supabaseClient.from('sets').delete()
        .eq('id', setId)
        .eq('user_id', state.currentUser.id); // Ensure user owns the set indirectly via exercise
    if (error) throw error;
}


// --- Body Weight API Functions ---
export async function addBodyWeightLogAPI(logEntryData) {
    if (!state.currentUser) throw new Error("User must be logged in to log body weight.");
    const dataToInsert = { ...logEntryData, user_id: state.currentUser.id };
    const { data, error } = await supabaseClient.from('body_weight_log').insert(dataToInsert).select().single();
    if (error) throw error;
    return data;
}

export async function deleteBodyWeightEntryAPI(entryId) {
    if (!state.currentUser) throw new Error("User must be logged in to delete a body weight entry.");
    const { error } = await supabaseClient.from('body_weight_log').delete()
        .eq('id', entryId)
        .eq('user_id', state.currentUser.id);
    if (error) throw error;
}

export async function updateBodyWeightLogDateAPI(entryId, newDate) {
    if (!state.currentUser) throw new Error("User must be logged in to update a body weight entry.");
    const { error } = await supabaseClient
        .from('body_weight_log')
        .update({ date: newDate, updated_at: new Date().toISOString() })
        .eq('id', entryId)
        .eq('user_id', state.currentUser.id);
    if (error) throw error;
}

// --- Profile API Functions ---
export async function updateUsernameAPI(userId, newUsername) {
    if (!state.currentUser || state.currentUser.id !== userId) {
        throw new Error("User mismatch or not logged in for updating username.");
    }
    const { data, error } = await supabaseClient
        .from('profiles')
        .update({ username: newUsername, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select() // Select to get the updated data, though username might be the only thing changing here
        .single();

    if (error) {
        // Check for unique constraint violation (Supabase error code 23505 for PostgreSQL)
        if (error.code === '23505') {
            throw new Error("This username is already taken. Please choose another.");
        }
        throw error;
    }
    return data; // Returns the updated profile data (or at least the username part)
}

// Password update is directly via Supabase auth, typically handled in authService
// No separate 'API' function here for it unless we add extra logic around it.
// For example, supabaseClient.auth.updateUser({ password: newPassword })

// Email update is also directly via Supabase auth
// For example, supabaseClient.auth.updateUser({ email: newEmail })
