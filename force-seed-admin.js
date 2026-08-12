const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase URL or Service Role Key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seedAdmin() {
  const adminEmail = 'admin@codernest.cloud';
  const adminPassword = 'Admin123!';
  
  console.log(`Ensuring ${adminEmail} exists in Supabase Auth...`);
  
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
    user_metadata: { role: 'SUPER_ADMIN' },
    app_metadata: { role: 'SUPER_ADMIN' }
  });

  if (authError && authError.code === 'email_exists') {
    console.log(`${adminEmail} already exists in Supabase Auth. Fetching ID...`);
    const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers();
    if (!usersError && usersData?.users) {
      const existingUser = usersData.users.find(u => u.email === adminEmail);
      if (existingUser) {
        console.log(`Found user: ${existingUser.id}`);
        // Update password just in case it was different
        await supabase.auth.admin.updateUserById(existingUser.id, {
          password: adminPassword,
          user_metadata: { role: 'SUPER_ADMIN' },
          app_metadata: { role: 'SUPER_ADMIN' }
        });
        console.log('Updated user password and role.');
      }
    }
  } else if (authError) {
    console.error('Error creating user:', authError);
  } else if (authData?.user) {
    console.log(`${adminEmail} created successfully in Supabase Auth with ID: ${authData.user.id}`);
  }
}

seedAdmin();
