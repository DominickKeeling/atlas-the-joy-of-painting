const mysql = require('mysql2/promise'); // Use promise-based mysql2 library

// Create a connection for setup purposes (one-time tasks)
async function createSetupConnection() {
  return mysql.createConnection({
    host: 'localhost', // Specify the host where the MySQL server is running
    user: 'root',      // MySQL username to authenticate
    password: 'root'   // Password for the MySQL user
  });
}

// Create a connection pool for ongoing operations
const pool = mysql.createPool({
  host: 'localhost', // Specify the host where the MySQL server is running
  user: 'root',      // MySQL username to authenticate
  password: 'root',  // Password for the MySQL user
  database: 'the_joy_of_painting', // Name of the database to connect to
  waitForConnections: true, // Allow waiting for connections to become available
  connectionLimit: 10, // Set the maximum number of connections in the pool
  queueLimit: 0 // Allow unlimited queue of connection requests
});

// Function to set up the database and its tables
async function setupDatabase() {
  try {
    const setupConnection = await createSetupConnection(); // Create the setup connection
    console.log('CONNECTED TO MYSQL');

    // Create the MySQL database if it doesn't already exist
    await setupConnection.query('CREATE DATABASE IF NOT EXISTS the_joy_of_painting');
    console.log('MYSQL DATABASE CREATED OR ALREADY EXISTS');

    // Switch to the specified database for subsequent queries
    await setupConnection.query('USE the_joy_of_painting;');
    console.log('SWITCHED MYSQL DATABASE');

    // Array of SQL queries to create the necessary tables
    const tables = [
      `
        CREATE TABLE IF NOT EXISTS episode (
          episode_id INT AUTO_INCREMENT PRIMARY KEY, -- unique ID for each episode
          title VARCHAR(255) NOT NULL, -- title of the episode
          season INT, -- season number
          episode INT, -- episode number
          date_aired DATE NOT NULL, -- air date of the episode
          youtube_url VARCHAR(255) -- URL to the episode on YouTube
        );
      `,
      `
        CREATE TABLE IF NOT EXISTS feature (
          feature_id INT AUTO_INCREMENT PRIMARY KEY, -- unique ID for each feature
          feature VARCHAR(225) NOT NULL -- description of the feature
        );
      `,
      `
        CREATE TABLE IF NOT EXISTS episodeFeature (
          episode_id INT, -- ID of the episode
          feature_id INT, -- ID of the feature
          feature_exists BOOLEAN NOT NULL, -- indicates if the feature exists in the episode
          PRIMARY KEY (episode_id, feature_id), -- composite primary key
          FOREIGN KEY (episode_id) REFERENCES episode(episode_id), -- foreign key referencing episode
          FOREIGN KEY (feature_id) REFERENCES feature(feature_id) -- foreign key referencing feature
        );
      `,
      `
        CREATE TABLE IF NOT EXISTS color (
          color_id INT AUTO_INCREMENT PRIMARY KEY, -- unique ID for each color
          color VARCHAR(225) NOT NULL, -- name of the color
          hex_code VARCHAR(7) NOT NULL -- hex code representation of the color
          UNIQUE (color, hex_color)
        );
      `,
      `
        CREATE TABLE IF NOT EXISTS episodeColor (
          episode_id INT, -- ID of the episode
          color_id INT, -- ID of the color
          PRIMARY KEY (episode_id, color_id), -- composite primary key
          FOREIGN KEY (episode_id) REFERENCES episode(episode_id), -- foreign key referencing episode
          FOREIGN KEY (color_id) REFERENCES color(color_id) -- foreign key referencing color
        );
      `
    ];

    // Iterate over the table creation queries
    for (let i = 0; i < tables.length; i++) {
      await setupConnection.query(tables[i]); // Execute each table creation query
      console.log(`Table ${i + 1} of ${tables.length} created.`);
    }

    await setupConnection.end(); // Close the setup connection
    console.log('Setup connection closed');
    console.log('Database setup complete. Pool ready');
  } catch (error) {
    console.error('ERROR SETTING UP DATABASE:', error);
    process.exit(1); // Exit the process if there's an error
  }
}

// Export the connection pool for use in other modules
module.exports = { setupDatabase, pool};
