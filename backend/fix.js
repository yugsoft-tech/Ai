const { Client } = require('pg'); 
const client = new Client({ connectionString: 'postgresql://neondb_owner:npg_XbifUM9QD5BY@ep-green-hat-aqshetvy-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=verify-full&channel_binding=require' }); 

client.connect().then(() => {
    return client.query("UPDATE users SET tenant_id = 'fe0accb8-a067-4182-ac17-5f09c9b8ba74' WHERE role = 'teacher'");
}).then(res => { 
    console.log('Updated', res.rowCount); 
    client.end(); 
});
