const { from } = require('../src/models');

async function testDB() {
  console.log('Testing connection to system_settings...');
  const { data, error } = await from('system_settings').select('*').limit(1);
  
  if (error) {
    console.error('❌ Database error:', error.message);
    console.error('Error Code:', error.code);
  } else {
    console.log('✅ Connection successful. Found rows:', data.length);
  }
}

testDB();
