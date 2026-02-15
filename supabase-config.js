const SUPABASE_URL = "https://atqsbqtgtxtlphicawto.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0cXNicXRndHh0bHBoaWNhd3RvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwNDE5OTEsImV4cCI6MjA4NjYxNzk5MX0.4BBGMpueD5IGFY6VxJq6ElECyLbgyefahBgP93vvOPc";

// Configure Supabase client with proper storage for GitHub Pages hosting
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
        storage: window.localStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
    }
});

window.sb = _supabase;
