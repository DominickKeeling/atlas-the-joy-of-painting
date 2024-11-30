const mysql = require('mysql2');

// create setupConnection to mysql
const setupConnection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'root'
});

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'the_joy_of_painting',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// create mysql server
function setupDatabase(callback) {
  setupConnection.connect((error) => {
    if (error) {
      console.error('ERROR CONNECTING TO MYSQL:' + error.stack);
      return;
    }
    console.log('CONNECTED TO MYSQL AS ' + setupConnection.threadId);

    // delete the_joy_of_painting database if it already exists
    setupConnection.query('DROP DATABASE IF EXISTS the_joy_of_painting', (error) => {
      if (error) {
        console.error('ERROR DELETING DATABASE:' + error.stack);
        return;
      }
      console.log('DATABASE DELETED (or already exists)');

      // create mysql database
      setupConnection.query('CREATE DATABASE IF NOT EXISTS the_joy_of_painting', (error) => {
        if (error) {
          console.error('ERROR CREATING MYSQL DATABASE:', error.stack);
          return;
        }
        console.log('MYSQL DATABASE CREATED OR ALREADY EXISTS');

        // USE the_joy_of_painting database
        setupConnection.query('USE the_joy_of_painting;', (error) => {
          if (error) {
            console.error('ERROR USING MYSQL DATABASE:', error.stack);
            return;
          }
          console.log('SWITCHED MYSQL DATABASE');
          
          // CREATE THE TABLES episode, feature, episodeFeature, color and episodeColor.
          const tables = [
            `
              CREATE TABLE IF NOT EXISTS episode (
                episode_id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                season INT NOT NULL DEFAULT 0,
                episode INT NOT NULL DEFAULT 0,
                date_aired DATE NOT NULL,
                youtube_url VARCHAR(255) NOT NULL DEFAULT 0
              );
            `,

            `
              CREATE TABLE IF NOT EXISTS feature (
                feature_id INT AUTO_INCREMENT PRIMARY KEY,
                feature VARCHAR(225) NOT NULL
              );
            `,

            `
              CREATE TABLE IF NOT EXISTS episodeFeature (
                episode_id INT,
                feature_id INT,
                feature_exists BOOLEAN NOT NULL,
                PRIMARY KEY (episode_id, feature_id),
                FOREIGN KEY (episode_id) REFERENCES episode(episode_id),
                FOREIGN KEY (feature_id) REFERENCES feature(feature_id)
              );
            `,

            `
              CREATE TABLE IF NOT EXISTS color (
                color_id INT AUTO_INCREMENT PRIMARY KEY,
                color VARCHAR(225) NOT NULL,
                hex_code VARCHAR(7) NOT NULL
              );
            `,

            `
              CREATE TABLE IF NOT EXISTS episodeColor (
                episode_id INT,
                color_id INT,
                PRIMARY KEY (episode_id, color_id),
                FOREIGN KEY (episode_id) REFERENCES episode(episode_id),
                FOREIGN KEY (color_id) REFERENCES color(color_id)
              );
            `,
          ];
          
          let completed = 0;

          tables.forEach((query, index) => {
            setupConnection.query(query, (error) => {
              if (error) {
                console.error(`Error creating table ${index + 1}:`, error.stack);
                process.exit(1);
              }
              completed++;
              console.log(`Table ${completed} of ${tables.length} created.`);

              if (completed === tables.length) {
                setupConnection.end(() => {
                  console.log('setup Connection closed');
                  if (callback) callback();
                });
              }
            });
          });
        });
      });
    });
  });
}

setupDatabase(() => {
  console.log('Database setup complete. Pool ready');
});

module.exports = pool;