const { Client } = require('pg');

const client = new Client({
  user: 'dom',
  host: 'localhost',
  database: 'the_joy_of_painting',
  password: 'root',
  port: 5432,
});

// Connnecting to database
client.connect()
  .then(() => console.log('Connection to Postgres database is successfull'))
  .catch((err) => console.error('Error connecting to Postgres database:', err));

module.exports = client;
