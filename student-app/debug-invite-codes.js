// Debug script to check invite codes in database
// Run with: node debug-invite-codes.js

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkInviteCodes() {
  console.log('Checking invite codes in database...\n');
  console.log('Using Supabase URL:', supabaseUrl);
  console.log('Using anon key (first 20 chars):', supabaseKey?.substring(0, 20) + '...\n');

  // First, try to get all classes
  console.log('Attempting to fetch all classes...');
  const { data, error } = await supabase
    .from('classes')
    .select('id, name, invite_code, teacher_id')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching classes:', error);
    console.error('This might be a Row Level Security (RLS) issue.\n');

    // Try with a specific invite code
    console.log('Trying to search for "Time Machine" class specifically...');
    const { data: tmData, error: tmError } = await supabase
      .from('classes')
      .select('id, name, invite_code, teacher_id')
      .ilike('name', '%Time Machine%');

    if (tmError) {
      console.error('Error searching for Time Machine:', tmError);
    } else {
      console.log('Time Machine search result:', tmData);
    }
    return;
  }

  if (!data || data.length === 0) {
    console.log('No classes found in database (but no error - might be RLS filtering results).');
    console.log('This suggests RLS policies might be preventing read access.\n');
    return;
  }

  console.log(`Found ${data.length} class(es):\n`);
  data.forEach((cls, index) => {
    console.log(`${index + 1}. Class: ${cls.name}`);
    console.log(`   ID: ${cls.id}`);
    console.log(`   Invite Code: ${cls.invite_code}`);
    console.log(`   Teacher ID: ${cls.teacher_id}`);
    console.log('');
  });
}

checkInviteCodes();
