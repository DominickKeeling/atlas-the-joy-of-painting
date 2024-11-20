const fs = require('fs');
const csv = require('csv-parser');
const client = require('./db');

const filePath = 'Subject_matter.csv';

const subjectItems = [
  "APPLE_FRAME", "AURORA_BOREDEALIS", "BARN", "BEACH", "BRIDGE",
  "BUILDING", "BUSHES", "CABIN", "CACTUS", "CIRCLE_FRAME", "CIRRUS", 
  "CLIFF", "CLOUDS", "CONIFER", "CUMULUS", "DECIDUOUS", "DIANE_ANDRE", 
  "DOCK", "DOUBLE_OVAL_FRAME", "FARM", "FENCE", "FIRE", "FLORIDA_FRAME", 
  "FLOWERS", "FOG", "FRAMED", "GRASS", "GUEST", "HALF_CIRCLE_FRAME", 
  "HALF_OVAL_FRAME", "HILLS", "LAKE", "LAKES", "LIGHTHOUSE", "MILL", 
  "MOON", "MOUNTAIN", "MOUNTAINS", "NIGHT", "OCEAN", "OVAL_FRAME", 
  "PALM_TREES", "PATH", "PERSON", "PORTRAIT", "RECTANGLE_3D_FRAME", 
  "RECTANGULAR_FRAME", "RIVER", "ROCKS", "SEASHELL_FRAME", "SNOW", 
  "SNOWY_MOUNTAIN", "SPLIT_FRAME", "STEVE_ROSS", "STRUCTURE", "SUN", 
  "TOMB_FRAME", "TREE", "TREES", "TRIPLE_FRAME", "WATERFALL", "WAVES", 
  "WINDMILL", "WINDOW_FRAME", "WINTER", "WOOD_FRAMED"
];

let episodesSubjectData = [];

fs.createReadStream(filePath)
.pipe(csv())
.on('data', (record) => {
  const episodeIdentifier = record.EPISODE;

  subjectItems.forEach(subjectName => {
    if (parseInt(record[subjectName], 10) === 1) {
      episodesSubjectData.push({
        episode_id: episodeIdentifier,
        subject_matter: subjectName
      });
    }
  });
})
.on('end', () => {
  console.log('CSV file successfully processed');
  saveSubjectsToDatabase();
});


async function saveSubjectsToDatabase() {
  for (const episodeSubjectRecord of episodeSubjectData) {
    try {
      const result = await client.query(`
        SELECT id FROM subjects WHERE subject_matter = $1
      `, [episodeSubjectRecord.subject_matter]);

      if (result.rows.length > 0) {
        const subjectId = result.rows[0].id;

        await client.query(`
          INSERT INTO episodes_subjects (episode_id, subject_id)
          VALUES ($1, $2)
        `, [episodeSubjectRecord.episode_id, subjectId]);
        console.log(`Inserted subject relation for episode: ${episodeSubjectRecord.episode_id}, subject: ${episodeSubjectRecord.subject_matter}`);
      }
    } catch (error) {
      console.error('Error inserting episode-subject relation:', error.stack);
    }
  }

  client.end();
}
