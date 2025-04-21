const { createClient } = require('@supabase/supabase-js');

// Get Supabase URL and key from environment variables or command line arguments
const supabaseUrl = process.env.SUPABASE_URL || process.argv[2];
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.argv[3];

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Supabase URL and service key are required.');
  console.error('Usage: node bucket-setup.js <SUPABASE_URL> <SUPABASE_SERVICE_KEY>');
  console.error('Or set environment variables SUPABASE_URL and SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupBuckets() {
  console.log('Setting up Supabase storage buckets...');

  try {
    // Check if examiner-profiles bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      throw listError;
    }
    
    const examinerProfilesBucket = buckets.find(bucket => bucket.name === 'examiner-profiles');
    
    if (!examinerProfilesBucket) {
      console.log('Creating examiner-profiles bucket...');
      
      // Create the bucket
      const { data, error } = await supabase.storage.createBucket('examiner-profiles', {
        public: false,  // Not publicly accessible by default
        fileSizeLimit: 5242880,  // 5MB size limit
      });
      
      if (error) {
        throw error;
      }
      
      console.log('examiner-profiles bucket created successfully');
      
      // Set up bucket policies to allow authenticated users to read/write
      const { error: policyError } = await supabase.storage.from('examiner-profiles').createPolicy(
        'authenticated-read-write', 
        'authenticated', 
        { type: 'select', expiry: 0 }
      );
      
      if (policyError) {
        console.warn('Warning: Failed to create bucket policy:', policyError.message);
      } else {
        console.log('Bucket policy created successfully');
      }
    } else {
      console.log('examiner-profiles bucket already exists, skipping creation');
    }
    
    console.log('Storage setup completed successfully');
  } catch (error) {
    console.error('Error setting up storage:', error.message);
    process.exit(1);
  }
}

setupBuckets(); 