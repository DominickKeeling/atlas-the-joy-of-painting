const fs = require('fs');
const pool = require('../db/create_db');
const csvParser = require('csv-parser');
const { on } = require('events');

// read csv file
function readCSV(filePath, callback) {
  const rows = [];
  const features = new Set();

  fs.createReadStream(filePath) 
    .pipe(csvParser()) // pipes the stream through the parser to convert each line into a javascript obj
    .on('data', (row) => { // using built-in event 'data'
      rows.push(row);

      Object.keys(row).forEach((key) => {
        if (key !== 'EPISODE' && key !== 'TITLE') {
          features.add(key);
        }
      });
    })
    .on('end', () => {
      console.log('csv file successfully read');
      callback(rows, features);
    });
}

// Insert features into feature table
function insertFeatures(features, callback) {
  const query = 'INSERT INTO feature (feature) VALUES (?)';
  let completed = 0;

  features.forEach((feature) => {
    // Executes the SQL query inserting the current feature int the feature table
    pool.query(query, [feature], (error) => {
      if(error) {
        console.error('ERROR INSERTING FEATURE: ${feature}', error);
        return;
      }
      console.log('FEATURE INSERTED INTO TABLE: ${feature}');

      completed++;

      if (completed === features.length) {
        callback();
      }
    });
  });
}

function processEpisodes(row, callback) {
  const selectEpisodeQuery = 'SELECT episode_id FROM episode WHERE title = ?';
  const insertEpisodeQuery = 'INSERT INTO episode (title, season, episode) VALUES (?, ?, ?)';
  const selectFeatureQuery = 'SELECT feature_id FROM feature WHERE feature = ?';
  const insertFeatureQuery = 'INSERT INTO episodeFeature (episode_id, feature_id, feature_exists) VALUES (?, ?, ?)';

  let completed = 0;

  rows.forEach((row) => {
    // extract each season and column from EPISODE column
    const regex = /S(\d+)E(\d+)/;
    const match = row.EPISODE.match(regex);
    const season = match ? parseInt(match[1], 10) : null;
    const episodeNumber = match ? parseInt(match[2], 10) : null;

    const title = row.TITLE.replace(/"/g, '').toUpperCase();

    pool.query(selectEpisodeQuery, [title], (error, episodeResults) => {
      if (error){
        console.error('ERROR Finding EPISODE: ${title}', error);
      }
    })
  })
}

// loop through the feature names ( Columns after title )

// Add feature names to feature table if they dont already exist.

// Map episodes to features

//