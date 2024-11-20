const fs = require('fs');
const csv = require('csv-parser');
const client = require('./db');

const filePath = 'Episode_dates.csv';

let episodesData = [];

function transformDate(dateString) {
  const date = new Date(dateString);
  return date.toISOString().split('T')[0];
}

fs.createReadStream(filePath)
  .pipe(csv())
  .on('data', (row) => {
    episodesData.push({
      title: row.TITLE.trim(),
      date: transformDate(row.DATE)
    });
  })
  .on('end', () => {
    console.log('CSV file successfully processed');
    saveEpisodesToDatabase();
  });

async function saveEpisodesToDatabase() {
  try {
    for (const episode of episodesData) {
      await client.query(`
        INSERT INTO episodes (title, date)
        VALUES ($1, $2)
        ON CONFLICT (title) DO NOTHING
      `, [episode.title, episode.date]);
    }
    console.log('Episodes data inserted successfully');
  } catch (error) {
    console.error('Error inserting episodes data:', error.stack);
  } finally {
    client.end();
  }
}
