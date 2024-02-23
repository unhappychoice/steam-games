const fs = require('fs');

const fetchGames = () => {
  const url = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/`

  const queries = {
    key: process.env.STEAM_API_KEY,
    steamid: '76561198120099395',
    format: 'json',
    include_appinfo: '1',
    include_played_free_games: '1'
  };

  const queryString = `?${Object.entries(queries).map(([key, value]) => `${key}=${value}`).join('&')}`;

  return fetch(`${url}${queryString}`)
    .then(response => response.json())
    .then(json => json.response.games)
    .then(games => games.sort((a, b) => a.name > b.name ? 1 : -1))
};

const buildHtml = (games) => {
  const gamesHtml = games
    .map(({ name, playtime_forever, playtime_2weeks }) => `
      <li style="margin-bottom: 16px;">
        <span style="display: inline-block; width: 600px;">${name}</span>
        <span style="display: inline-block; width: 120px;">${Math.round(playtime_forever / 60)}h</span>
        <span style="display: inline-block; width: 120px;">${Math.round((playtime_2weeks ?? 0) / 60)}h</span>
        <span style="display: inline-block; width: 120px;">
          <a href="https://www.youtube.com/results?search_query=${encodeURI(name)}" target="_blank" rel="noopener noreferrer">
            YouTube
          </a>
        </span>
        <span style="display: inline-block; width: 120px;">
          <a href="https://www.youtube.com/results?search_query=${encodeURI(name + ' 実況')}" target="_blank" rel="noopener noreferrer">
            実況
          </a>
        </span>
        <span style="display: inline-block; width: 120px;">
          <a href="https://www.youtube.com/results?search_query=${encodeURI(name + ' VTuber')}" target="_blank" rel="noopener noreferrer">
            VTuber
          </a>
        </span>
        <span style="display: inline-block; width: 120px;">
          <a href="https://www.youtube.com/results?search_query=${encodeURI(name)}&sp=EgIQAw%253D%253D" target="_blank" rel="noopener noreferrer">
            再生リスト
          </a>
        </span>
      </li>  
    `)
    .join('');

  return `
<html>
  <head>
    <style>
        body {
          background: #121212;
          color: #a2a2a2;
        }
        
        a:link {
          color: #aaaabb;
          text-decoration: none;
        }
        
        a:visited {
          color: #777799;
          text-decoration: none;
        }
        
        a:hover {
          text-decoration: underline;
        }
        
        a:active {
          color: #afafbf;
          text-decoration: none;
        }
    </style>
  </head>
  <body>
    <ul style="padding: 32px;">
      ${gamesHtml}
    </ul>
  </body>
</html>
  `;
};

fetchGames()
  .then(buildHtml)
  .then(html => fs.writeFileSync('./index.html', html));
