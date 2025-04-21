import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://zampawknbmlrnhsaacqm.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InphbXBhd2tuYm1scm5oc2FhY3FtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE1MDYyNDksImV4cCI6MjA1NzA4MjI0OX0.IpNVkj9_ErG77aNbzXPULI4IXM6_iU2DAgFtLMZoUCA'

// Create a singleton instance of Supabase client
let supabaseInstance = null;

export const supabase = (() => {
  if (supabaseInstance) return supabaseInstance;
  
  // Determine the appropriate redirect URL
  const redirectTo = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  console.log('Supabase client initialized with redirectTo:', redirectTo);
  
  // Create the client with options to handle clock skew
  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
      redirectTo
    },
    global: {
      // Skip tolerance checks for clock skew
      fetchOptions: {
        headers: {}
      }
    }
  });
  
  return supabaseInstance;
})();

// Helper function to get image URL with token
export const getImageUrl = (bucket, filePath) => {
  if (!filePath) return null;
  
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${filePath}`;
};

// Helper function to upload profile picture
export const uploadProfilePicture = async (file, examinerName) => {
  try {
    // Create a unique filename
    const fileName = `${Date.now()}_${examinerName.replace(/\s+/g, '_').toLowerCase()}${file.name.substring(file.name.lastIndexOf('.'))}`;
    
    // Upload the file
    const { error } = await supabase.storage
      .from('examiner-avatars')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });
    
    if (error) {
      throw error;
    }
    
    // Return the path to be stored in the examiner record
    return fileName;
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    throw error;
  }
}; 