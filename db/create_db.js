const mysql = require('mysql2');

// create connection to mysql
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'root'
});

// create mysql server
connection.connect((error) => {
  if (error) {
    console.error('ERROR CONNECTING TO MYSQL:' + error.stack);
    return;
  }
  console.log('CONNECTED TO MYSQL AS ' + connection.threadId);

  // delete the_joy_of_painting database if it already exists
  connection.query('DROP DATABASE IF EXISTS the_joy_of_painting', (error, results) => {
    if (error) {
      console.error('ERROR DROPPING DATABASE:' + error.stack);
      return;
    }
    console.log('DATABASE DELETED (if it already exists)');

    // create mysql database
    connection.query('CREATE DATABASE IF NOT EXISTS the_joy_of_painting', (error, results) => {
      if (error) {
        console.error('ERROR CREATING MYSQL DATABASE:', error.stack);
        return;
      }
      console.log('MYSQL DATABASE CREATED OR ALREADY EXISTS');

      // USE the_joy_of_painting database
      connection.query('USE the_joy_of_painting;', (error, results) => {
        if (error) {
          console.error('ERROR USING MYSQL DATABASE:', error.stack);
          return;
        }
        
        // CREATE THE TABLES episode, feature, episodeFeature, color and episodeColor.
        const createEpisodeTable =
          `
            CREATE TABLE IF NOT EXISTS episode (
              episode_id INT AUTO_INCREMENT PRIMARY KEY,
              title VARCHAR(255) NOT NULL,
              season INT NOT NULL,
              episode INT NOT NULL,
              date_aired DATE NOT NULL,
              youtube_url VARCHAR(255)
            );
          `;

          const createFeatureTable =
          `
            CREATE TABLE IF NOT EXISTS feature (
              feature_id INT AUTO_INCREMENT PRIMARY KEY,
              feature VARCHAR(225) NOT NULL
            );
          `;

          const createEpisodeFeatureTable = 
          `
            CREATE TABLE IF NOT EXISTS episodeFeature (
              episode_id INT,
              feature_id INT,
              feature_exists BOOLEAN NOT NULL,
              PRIMARY KEY (episode_id, feature_id),
              FOREIGN KEY (episode_id) REFERENCES episode(episode_id),
              FOREIGN KEY (feature_id) REFERENCES feature(feature_id)
            );
          `;

          const createColorTable =
          `
            CREATE TABLE IF NOT EXISTS color (
              color_id INT AUTO_INCREMENT PRIMARY KEY,
              color VARCHAR(225) NOT NULL,
              hex_code VARCHAR(7) NOT NULL
            );
          `;

          const createEpisodeColorTable =
          `
            CREATE TABLE IF NOT EXISTS episodeColor (
              episode_id INT,
              color_id INT,
              PRIMARY KEY (episode_id, color_id),
              FOREIGN KEY (episode_id) REFERENCES episode(episode_id),
              FOREIGN KEY (color_id) REFERENCES color(color_id)
            );
          `;

          // execute the queries one by one
          connection.query(createEpisodeTable, (error, results) => {
            if (error) {
              console.error('Error creating episode table:', error.stack);
              return;
            }
            console.log('Episode table created');

            connection.query(createFeatureTable, (error, results) => {
              if (error) {
                console.error('Error creating Feature table:', error.stack);
                return;
              }
              console.log('Feature table created successfully');
  
              connection.query(createEpisodeFeatureTable, (error, results) => {
                if (error) {
                  console.error('Error creating EpisodeFeature table:', error.stack);
                  return;
                }
                console.log('EpisodeFeature table created successfully');
  
                connection.query(createColorTable, (error, results) => {
                  if (error) {
                    console.error('Error creating Color table:', error.stack);
                    return;
                  }
                  console.log('Color table created successfully');
  
                  connection.query(createEpisodeColorTable, (error, results) => {
                    if (error) {
                      console.error('Error creating EpisodeColor table:', error.stack);
                      return;
                    }
                    console.log('EpisodeColor table created successfully');

                    // close connection
                    connection.end();
                  });
                });
              });        
          });
        });
      });
    });
  });
});