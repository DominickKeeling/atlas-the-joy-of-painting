const fs = require('fs/promises'); // Use promise-based fs module
const { pool } = require('../db/create_db');

async function readTextFile(filePath) {
  try {
    // Read file content
    const data = await fs.readFile(filePath, 'utf8');
    const lines = data.split('\n');

    // Process each line
    for (const line of lines) {
      const regex = /"([^"]+)"\s*\(([^)]+)\)/; // matches title
      const match = line.match(regex);

      if (match) {
        const title = match[1];
        const dateAired = formatDate(match[2]); // create formatDate function

        if (dateAired) {
          // Insert episode into the database
          await insertEpisode(title, dateAired);
        } else {
          console.warn(`EPISODE: "${title}" REJECTED.`);
        }
      } else {
        console.warn(`Invalid line being skipped: ${line}`);
      }
    }
  } catch (error) {
    console.error('ERROR READING FILE:', error);
  }
}

function formatDate(dateString) {
  const months = {
    January: '01',
    February: '02',
    March: '03',
    April: '04',
    May: '05',
    June: '06',
    July: '07',
    August: '08',
    September: '09',
    October: '10',
    November: '11',
    December: '12',
  };

  const regex = /([a-zA-Z]+) (\d{1,2}), (\d{4})/;
  const match = dateString.match(regex);

  if (match) {
    const month = months[match[1]];
    const day = match[2].padStart(2, '0');
    const year = match[3];

    return `${year}-${month}-${day}`;
  }
  console.error(`INVALID DATE FORMAT: ${dateString}`);
  return null;
}

async function insertEpisode(title, dateAired) {
  try {
    const query = 'INSERT INTO episode (title, date_aired) VALUES (?, ?)';
    const [results] = await pool.query(query, [title, dateAired]);
    console.log(`Episode: "${title}" inserted with ID ${results.insertId}`);
  } catch (error) {
    console.error(`FAILED to insert episode: "${title}"`, error);
  }
}

// Main function to read file and process data
(async () => {
  await readTextFile('data/Episode_dates.text');
  console.log('All data processed. Closing pool...');
  await pool.end(); // Close the connection pool
  console.log('Pool closed');
})();