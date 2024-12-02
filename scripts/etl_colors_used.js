const fs = require('fs');
const fsPromises = require('fs/promises'); // Use the promise-based fs module
const { pool } = require('../db/create_db');
const csvParser = require('csv-parser');
const stream = require('stream');
const { promisify } = require('util');

const pipeline = promisify(stream.pipeline);

async function readCSV(filePath) {
  const rows = [];
  const colorSet = new Set();

  await pipeline(
    fs.createReadStream(filePath),
    csvParser(),
    async function* (dataStream) {
      for await (const row of dataStream) {
        try {
          const colorList = JSON.parse(row.colors.replace(/'/g, '"'));
          const hexList = JSON.parse(row.color_hex.replace(/'/g, '"'));

          colorList.forEach((color, index) => {
            if (color && hexList[index]) {
              const colorHexKey = `${color.trim()}|${hexList[index].trim()}`;
              colorSet.add(colorHexKey);
            } else {
              console.warn('invalid color or hex');
            }
          });

          rows.push({
            title: row.painting_title.trim(),
            youtube_src: row.youtube_src ? row.youtube_src.trim() : null,
            colors: row.colors.replace(/'/g, '"'),
            color_hex: row.color_hex.replace(/'/g, '"'),
          });
        } catch (error) {
          console.error(`ERROR PARSING ${JSON.stringify(row)}. Error: ${error.message}`);
        }
      }
    }
  );

  const colors = Array.from(colorSet).map((colorHexKey) => {
    const [color, hex] = colorHexKey.split('|');
    return { color, hex };
  });

  console.log(`Unique colors extracted: ${colors.length}`);
  return { rows, colors };
}

async function insertColors(colors) {
  const query = 'INSERT INTO color (color, hex_code) VALUES (?, ?)';
  const colorInsertPromises = Array.from(colors).map(({ color, hex }) => 
    pool.query(query, [color, hex])
      .then(() => console.log(`COLOR INSERTED INTO TABLE: ${color} (${hex})`))
      .catch((error) => {
        if (error.code === 'ER_DUP_ENTRY') {
          console.log(`SKIPPED ${color} (DUPLICATE)`);
        } else {
          console.error(`ERROR INSERTING COLOR: ${color}`, error);
        }
      })
  );

  await Promise.all(colorInsertPromises);
}

async function processColors(rows) {
  const selectEpisodeQuery = 'SELECT episode_id FROM episode WHERE title = ?';
  const insertEpisodeColorQuery = 'INSERT INTO episodeColor (episode_id, color_id) VALUES (?, ?)';
  const selectColorQuery = 'SELECT color_id FROM color WHERE color = ?';
  const updateYoutubeUrlQuery = 'UPDATE episode SET youtube_url = ? WHERE episode_id = ?';

  for (const row of rows) {
    const title = row.title;
    const youtubeUrl = row.youtube_src;

    try {
      const [episodeResults] = await pool.query(selectEpisodeQuery, [title]);

      if (episodeResults.length === 0) {
        console.log(`EPISODE NOT FOUND: ${title}`);
        continue;
      }

      const episodeId = episodeResults[0].episode_id;

      if (youtubeUrl) {
        try {
          const [updateResult] = await pool.query(updateYoutubeUrlQuery, [youtubeUrl, episodeId]);
          if (updateResult.affectedRows > 0) {
            console.log(`UPDATED YOUTUBE URL FOR EPISODE: ${title}`);
          } else {
            console.log('failed to updata url');
          }
        } catch (error) {
            console.error(`ERROR UPDATING YOUTUBE URL FOR EPISODE: ${title}`, error);
        }
      } else {
        console.warn(`YOUTUBE URL NOT FOUND FOR ${title}`);
      }

      const colorList = JSON.parse(row.colors.replace(/'/g, '"'));

      for (const color of colorList) {
        if (!color) {
          console.warn(`INVALID COLOR FOR TITLE: ${title}`);
          continue;
        }
        try {
          const [colorResults] = await pool.query(selectColorQuery, [color.trim().toLowerCase()]);

          if (colorResults.length === 0) {
            console.log(`COLOR NOT FOUND: ${color}`);
            continue;
          }
          const colorId = colorResults[0].color_id;

          await pool.query(insertEpisodeColorQuery, [episodeId, colorId]);
          console.log(`${color} MAPPED TO EPISODE ID: ${episodeId}`);
        } catch (error) {
          console.error(`ERROR PROCESSING COLOR: ${color}`, error);
        }
      }
    } catch (error) {
      console.error(`ERROR PROCESSING COLORS FOR PAINTING: ${title}`, error);
    }
  }
}

/*
async function mapColorsAndEpisode(row, episodeId) {
  const selectColorQuery = 'SELECT color_id FROM color WHERE color = ?';
  const insertColorQuery = 'INSERT INTO episodeColor (episode_id, color_id) VALUES (?, ?)';
  const colorMappingPromises = Object.keys(row)
    .filter((color) => row[color] === '1')
    .map(async (color) => {
      try {
        const [colorResults] = await pool.query(selectColorQuery, [color]);
        if (colorResults.length === 0) {
          throw new Error(`COLOR NOT FOUND: ${color}`);
        }

        const colorId = colorResults[0].color_id;
        await pool.query(insertColorQuery, [episodeId, colorId]);
        console.log(`COLOR: ${color} MAPPED TO EPISODE: ${episodeId}`);
      } catch (error) {
        console.error(`ERROR MAPPING COLOR: ${color} to episode ${episodeId}`, error);
      }
    });

    await Promise.all(colorMappingPromises);
}
*/

async function main() {
  try {
    const { rows, colors } = await readCSV('data/Colors_used.csv');
    await insertColors(colors);
    await processColors(rows);
    console.log('Done processing episodes and colors');
  } catch (error) {
    console.error('ERROR PROCESSING COLORS', error);
  } finally {
    await pool.end();
    console.log('Database connection closed');
  }
}

main();