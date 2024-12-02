const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const { pool } = require('./db/create_db');

const app = express();
app.use(bodyParser.json());

function setupQuery(filters, filterType = 'AND') {
  const fieldMapping = {
    month: 'MONTH(e.date_aired)',
    colors: 'c.color',
    features: 'f.feature'
  }

  let query = `
    SELECT e.episode_id, e.title, e.date_aired, e.youtube_url,
      GROUP_CONCAT(DISTINCT c.color) AS colors,
      GROUP_CONCAT(DISTINCT f.feature) AS features
    FROM episode e
    LEFT JOIN episodeColor ec ON e.episode_id = ec.episode_id
    LEFT JOIN color c ON ec.color_id = c.color_id
    LEFT JOIN episodeFeature ef ON e.episode_id = ef.episode_id
    LEFT JOIN feature f ON ef.feature_id = f.feature_id
    WHERE 1=1
    `;

    const queryParameters = [];

    filters.forEach(({ field, value, operator }) => {
      if (!field || !value) return;

      const dbField = fieldMapping[field] || field;

      if (operator === 'EQUALS') {
        query += ` AND ${dbField} = ?`;
        queryParameters.push(value);
      } else if (operator === 'INCLUDES') {
        const placeholders = value.split(',').map(() => '?').join(filterType === 'AND' ? ' AND' : ' OR');
        query += ` AND ${dbField} IN (${placeholders})`;
        queryParameters.push(...value.split(','));
      }
    });
    query += ` GROUP BY e.episode_id`;
    return { query, queryParameters };
}

app.get('/', async (req, res) => {
  res.send('Welcome to The Joy of Painting API');
});

app.get('/episodes', async (req, res) => {
  // filter logic
  const { filters = '[]', filterType = 'AND', page = 1, limit = 403 } = req.query;

  try {
    const parsedFilters = JSON.parse(filters);
    let { query, queryParameters } = setupQuery(parsedFilters, filterType);

    const offset = (page - 1) * limit;
    query += ' LIMIT ? OFFSET ?';
    queryParameters.push(parseInt(limit, 10), parseInt(offset, 10));

    const [results] = await pool.query(query, queryParameters);

    res.json({
      filters: parsedFilters,
      filterType,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      totalResults: results.length,
      data: results
    });
  } catch (error) {
    console.error('ERROR REQUESTING episodes:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

module.exports = app;
