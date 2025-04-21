import { supabase } from '../lib/supabase';

/**
 * Get all settings
 * @returns {Promise} Promise object with settings data
 */
export const getSettings = async () => {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('*');

    if (error) {
      // If the table doesn't exist, return default settings
      if (error.code === '42P01') { // PostgreSQL error code for undefined_table
        console.warn('Settings table does not exist, returning default settings');
        return getDefaultSettings();
      }
      throw error;
    }

    // If no settings found, return default settings
    if (!data || data.length === 0) {
      console.warn('No settings found, returning default settings');
      return getDefaultSettings();
    }

    // Format settings into an object with key-value pairs
    const formattedSettings = data.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {});

    return formattedSettings;
  } catch (error) {
    console.error('Error getting settings:', error);
    // Return default settings instead of throwing
    return getDefaultSettings();
  }
};

/**
 * Get default settings
 * @returns {Object} Default settings
 */
const getDefaultSettings = () => {
  return {
    theme: 'light',
    language: 'en',
    notifications: 'enabled',
    // Add any other default settings here
  };
};

/**
 * Update a setting
 * @param {string} key - The setting key
 * @param {any} value - The setting value
 * @returns {Promise} Promise object with update info
 */
export const updateSetting = async (key, value) => {
  try {
    // First check if the settings table exists
    const { error: tableCheckError } = await supabase
      .from('settings')
      .select('key')
      .limit(1);
    
    // If table doesn't exist, create it
    if (tableCheckError && tableCheckError.code === '42P01') {
      console.warn('Settings table does not exist, creating it');
      // We can't create tables directly from the client, so we'll just log this
      // In a real app, you would have a migration script or backend API to create tables
      console.warn('Cannot create settings table from client. Please run database migrations.');
      return { success: false, message: 'Settings table does not exist' };
    }
    
    // Proceed with upsert
    const { data, error } = await supabase
      .from('settings')
      .upsert({ key, value })
      .select();

    if (error) {
      console.error('Error updating setting:', error);
      return { success: false, error };
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('Error updating setting:', error);
    return { success: false, error };
  }
};

/**
 * Backup database
 * @returns {Promise} Promise object with backup info
 */
export const backupDatabase = async () => {
  try {
    // Get all tables data for backup
    const tables = ['settings', 'examiners', 'calculations', 'staff'];
    const backupData = {};

    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('*');
      
      if (error) throw error;
      backupData[table] = data;
    }

    // Create a blob with the JSON data
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    
    // Create a download link
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const filename = `examinerpro_backup_${timestamp}.json`;
    
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    window.URL.revokeObjectURL(url);
    document.body.removeChild(link);
    
    return { 
      success: true, 
      path: filename 
    };
  } catch (error) {
    console.error('Error backing up database:', error);
    throw error;
  }
};

/**
 * Restore database from backup
 * @param {FormData} formData FormData object containing the backup file
 * @returns {Promise} Promise object with restore info
 */
export const restoreDatabase = async (formData) => {
  try {
    // Extract file from FormData
    const file = formData.get('backupFile');
    if (!file) {
      throw new Error('No backup file provided');
    }

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    
    // Read and parse the backup file
    const text = await file.text();
    const backupData = JSON.parse(text);

    // Validate the backup data
    if (!backupData || typeof backupData !== 'object') {
      throw new Error('Invalid backup file format');
    }

    // Restore data for each table
    for (const [table, rows] of Object.entries(backupData)) {
      if (!Array.isArray(rows)) continue;

      // First, clear existing data
      const { error: deleteError } = await supabase
        .from(table)
        .delete()
        .neq('id', 0); // This is a trick to delete all rows

      if (deleteError) throw deleteError;

      // If there's data to restore
      if (rows.length > 0) {
        // Insert the backup data
        const { error: insertError } = await supabase
          .from(table)
          .insert(rows.map(row => {
            // For settings table, don't add user_id
            if (table === 'settings') {
              return row;
            }
            
            // Remove the id field to let Supabase generate new ones
            // and ensure user_id is set to current user
            const { id, ...rowWithoutId } = row;
            return { ...rowWithoutId, user_id: user.id };
          }));

        if (insertError) throw insertError;
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error restoring database:', error);
    throw error;
  }
};

/**
 * Clear all application data
 * @returns {Promise} Promise object with clear info
 */
export const clearAllData = async () => {
  try {
    // Tables to clear (excluding settings)
    const tables = ['examiners', 'calculations', 'staff'];

    // Clear each table
    for (const table of tables) {
      const { error } = await supabase
        .from(table)
        .delete()
        .neq('id', 0); // This is a trick to delete all rows

      if (error) throw error;
    }

    return { success: true };
  } catch (error) {
    console.error('Error clearing data:', error);
    throw error;
  }
}; 