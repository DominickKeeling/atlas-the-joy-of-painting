const fs = require('fs');
const pool = require('../db/create_db');

let pendingQueries = 0;

function readTextFile(filePath, callback) {
  fs.readFile(filePath, 'utf8', (error, data) => {
    if (error) {
      console.error('ERROR READING FILE:', error);
      return;
    }

    const lines = data.split('\n');
    lines.forEach((line) => {
      const regex = /"([^"]+)"\s*\(([^)]+)\)/; // matches title
      const match = line.match(regex)

      if (match) {
        const title = match[1];
        const dateAired = formatDate(match[2]); // create formatDate function

        pendingQueries++;

        insertEpisode(title, dateAired, () => {
          pendingQueries--;
          if (pendingQueries === 0 && callback) {
            callback();
          }
        }); 
      } else {
        console.warn(`Invalid line being skipped: ${line}`);
      }
    });
    if (lines.length === 0 && callback) callback();
  });
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
    December: '12'
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

// INSERTING EPISODE
function insertEpisode(title, dateAired, callback) {
  if (!dateAired) {
    console.warn(`EPISODE: "${title}" REJECTED.`);
    callback();
    return;
  }
  
  const query = 'INSERT INTO episode (title, date_aired) VALUES (?, ?)';
  pool.query(query, [title, dateAired], (error, results) => {
    if (error) {
      console.error(`FAILED to insert episode:`, error);
    } else {
      console.log(`Episode: ${title} with ID ${results.insertId}`);
    }
    callback();
  });
}

readTextFile('data/Episode_dates.text',() => {
  console.log('All data processed and closing pool');
  pool.end(() => {
    console.log('Pool closed');
  });
});