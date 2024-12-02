const fs = require('fs');
const fsPromises = require('fs/promises'); // Use the promise-based fs module
const { pool } = require('../db/create_db');
const csvParser = require('csv-parser');
const stream = require('stream');
const { promisify } = require('util');

// Convert the stream-based CSV parser to a promise-based function
const pipeline = promisify(stream.pipeline);

async function readCSV(filePath) {
  const rows = [];
  const features = new Set();

  await pipeline(
    fs.createReadStream(filePath),
    csvParser(),
    async function* (dataStream) {
      for await (const row of dataStream) {
        rows.push(row);

        Object.keys(row).forEach((key) => {
          if (key !== 'EPISODE' && key !== 'TITLE') {
            features.add(key);
          }
        });
      }
    }
  );

  console.log('CSV file successfully read');
  return { rows, features };
}

async function insertFeatures(features) {
  const query = 'INSERT INTO feature (feature) VALUES (?)';
  const featureInsertPromises = Array.from(features).map((feature) =>
    pool.query(query, [feature])
      .then(() => console.log(`FEATURE INSERTED INTO TABLE: ${feature}`))
      .catch((error) => console.error(`ERROR INSERTING FEATURE: ${feature}`, error))
  );

  await Promise.all(featureInsertPromises);
}

async function processEpisodes(rows) {
  const selectEpisodeQuery = 'SELECT episode_id FROM episode WHERE title = ?';
  const insertEpisodeQuery = 'INSERT INTO episode (title, season, episode) VALUES (?, ?, ?)';
  const updateEpisodeQuery = 'UPDATE episode SET season = ?, episode = ? WHERE episode_id = ?';

  for (const row of rows) {
    const regex = /S(\d+)E(\d+)/i;
    const match = row.EPISODE.match(regex);
    const season = match ? parseInt(match[1], 10) : null;
    const episodeNumber = match ? parseInt(match[2], 10) : null;
    const title = row.TITLE.replace(/"/g, '').toUpperCase();

    console.log(`Parsed Episode - Season: ${season}, Episode: ${episodeNumber}, Title: ${title}`);

    try {
      const [episodeResults] = await pool.query(selectEpisodeQuery, [title]);

      let episodeId;
      if (episodeResults.length === 0) {
        const [results] = await pool.query(insertEpisodeQuery, [title, season, episodeNumber]);
        console.log(`EPISODE INSERTED INTO TABLE: ${title}`);
        episodeId = results.insertId;
      } else {
        episodeId = episodeResults[0].episode_id;
        await pool.query(updateEpisodeQuery, [season, episodeNumber, episodeId]);
        console.log(`EPISODE UPDATED IN TABLE: ${title}`);
      }

      await mapFeaturesAndEpisode(row, episodeId);
    } catch (error) {
      console.error(`ERROR PROCESSING EPISODE: ${title}`, error);
    }
  }
}

async function mapFeaturesAndEpisode(row, episodeId) {
  const searchFeatureQuery = 'SELECT feature_id FROM feature WHERE feature = ?';
  const insertEpisodeFeatureQuery = 'INSERT INTO episodeFeature (episode_id, feature_id, feature_exists) VALUES (?, ?, ?)';

  const featureMappingPromises = Object.keys(row)
    .filter((feature) => row[feature] === '1')
    .map(async (feature) => {
      try {
        const [featureResults] = await pool.query(searchFeatureQuery, [feature]);
        if (featureResults.length === 0) {
          throw new Error(`Feature not found: ${feature}`);
        }

        const featureId = featureResults[0].feature_id;
        await pool.query(insertEpisodeFeatureQuery, [episodeId, featureId, true]);
        console.log(`Mapped feature ${feature} to episode ${episodeId}`);
      } catch (error) {
        console.error(`ERROR MAPPING FEATURE: ${feature} to episode ${episodeId}`, error);
      }
    });

  await Promise.all(featureMappingPromises);
}

async function main() {
  try {
    const { rows, features } = await readCSV('data/Subject_matter.csv');
    await insertFeatures(features);
    await processEpisodes(rows);
    console.log('Done processing episodes and features');
  } catch (error) {
    console.error('ERROR IN ETL PROCESS:', error);
  } finally {
    await pool.end(); // Ensure the connection pool is closed
    console.log('Database connection closed');
  }
}

main();