const fs = require('fs');
const csv = require('csv-parser');
const client = require('./db');

const filePath = 'colors_used.csv';

let colorsData = [];
let episodeColorsData = [];

function parseJsonArray(jsonString) {
  return JSON.parse(jsonString.replace(/'/g, '"'));
}

fs.createReadStream(filePath)
  .pipe(csv())
  .on('data', (row) => {
    const colorNames = parseJsonArray(row.colors);
    const colorHexes = parseJsonArray(row.color_hex);
    colorNames.forEach((color, index) => {
      colorsData.push({
        name: color.trim(),
        hexcode: colorHexes[index].trim()
      });
      episodeColorsData.push({
        episode_id: row.painting_index,
        color_name: color.trim()
      });
    });
  })
  .on('end', () => {
    console.log('CSV file successfully processed');
    saveColorsToDatabase();
  });

async function saveColorsToDatabase() {
  try {
    for (const color of colorsData) {
      await client.query(`
        INSERT INTO colors (name, hexcode)
        VALUES ($1, $2)
        ON CONFLICT (name) DO NOTHING
      `, [color.name, color.hexcode]);
    }

    for (const episodeColor of episodeColorsData) {
      const result = await client.query(`
        SELECT id FROM colors WHERE name = $1
      `, [episodeColor.color_name]);

      if (result.rows.length > 0) {
        const colorId = result.rows[0].id;
        await client.query(`
          INSERT INTO episodes_colors (episode_id, color_id)
          VALUES ($1, $2)
        `, [episodeColor.episode_id, colorId]);
      }
    }

    console.log('Colors and episode-colors data inserted successfully');
  } catch (error) {
    console.error('Error inserting colors data:', error.stack);
  } finally {
    client.end();
  }
}
