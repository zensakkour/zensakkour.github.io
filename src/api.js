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

// Placeholder for other API functions to be moved here:
// e.g., export async function addSession(sessionData) { ... }
// export async function updateSessionOrder(updates) { ... }
// ... etc. for all CRUD operations for sessions, exercises, sets, bodyweight, profile settings ...
