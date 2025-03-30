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

const fetchAchievements = (game) => {
  const url = `https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v0001/`;
  const url2 =`https://api.steampowered.com/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v0002/?gameid=${game.appid}`;
  const url3 = 'http://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v0002/';


    const queries = {
    key: process.env.STEAM_API_KEY,
    steamid: '76561198120099395',
    appid: game.appid,
    l: 'japanese'
  }

  const queryString = `?${Object.entries(queries).map(([key, value]) => `${key}=${value}`).join('&')}`;

  return fetch(`${url}${queryString}`)
    .then(response => response.json())
    .then(json => json.playerstats.achievements)
    .then(achievements => Promise.all([
        fetch(url2)
          .then(response => response.json())
          .then(json => json.achievementpercentages?.achievements),
        fetch(`${url3}${queryString}`)
          .then(response => response.json())
          .then(json => json.game.availableGameStats?.achievements)
      ])
      .then(([percentages, images]) => achievements?.map(achievement => ({
        ...achievement,
        percent: +percentages?.find(({ name }) => name === achievement.apiname)?.percent,
        imageUrl: images?.find(({ name }) => name === achievement.apiname)?.icongray
      })))
    )
    .then(achievements => ({
      game,
      achievements,
      nextAchievements: achievements
        ?.filter(({ achieved }) => achieved !== 1)
        .sort((a, b) => a.percent > b.percent ? -1 : 1)
        ?.slice(0, 3)
    }));
}

const buildHtml = (games) => {
  const gamesHtml = games
    .map(({ game: { appid, name, playtime_forever, playtime_2weeks }, achievements }) => `
      <li style="padding: 8px 32px; display: flex; align-items: center; height: 40px;" onMouseOut="this.style.background='transparent';" onMouseOver="this.style.background='rgba(255, 255, 255, .03)'">
        <img style="display: inline-block; height: 40px; margin-right: 16px;" src="${`https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appid}/header.jpg`}" />
        <span style="display: inline-block; flex-grow: 1; margin-right: 16px;">${name}</span>
        <span style="display: inline-block; width: 60px; margin-right: 16px;">${Math.round(playtime_forever / 60 * 10) / 10}h</span>
        <span style="display: inline-block; width: 60px; margin-right: 16px;">${Math.round((playtime_2weeks ?? 0) / 60 * 10) / 10}h</span>
        <span style="display: inline-block; width: 60px; margin-right: 16px;">
          ${achievements ? `${Math.round(achievements.filter(({ achieved}) => achieved).length / achievements.length * 100)} %` : '--'}
        </span>
        <span style="display: inline-block; margin-right: 16px;">
          <a href="https://www.youtube.com/results?search_query=${encodeURI(name)}" target="_blank" rel="noopener noreferrer">
            YouTube
          </a>
        </span>
        <span style="display: inline-block; margin-right: 16px;">
          <a href="https://www.youtube.com/results?search_query=${encodeURI(name + ' 実況')}" target="_blank" rel="noopener noreferrer">
            実況
          </a>
        </span>
        <span style="display: inline-block; margin-right: 16px;">
          <a href="https://www.youtube.com/results?search_query=${encodeURI(name + ' VTuber')}" target="_blank" rel="noopener noreferrer">
            VTuber
          </a>
        </span>
        <span style="display: inline-block;">
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
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    <style>
        body {
          margin: 0;
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
    <ul style="margin: 0 auto; padding: 32px 0; max-width: 1200px;">
      ${gamesHtml}
    </ul>
  </body>
</html>
  `;
};

const buildRouletteHtml = (games) => {
  const game = games
    .filter(({ achievements }) => achievements && achievements.filter(({ achieved }) => achieved !== 1).length > 0)[0];

  const gamesJson = games
    .filter(({ achievements }) => achievements && achievements.filter(({ achieved }) => achieved !== 1).length > 0)
    .map(({ game: { name, appid }, nextAchievements }) => ({
      name,
      imageUrl: `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appid}/library_600x900.jpg`,
      nextAchievements
    }));

  const achievementHtml = (achievement, i) => {
    return `
<li style="display: flex; height: 48px; margin: 0 0 4px; padding: 12px; background: #232323;">
  <img id="achievement-image-${i}" src="${achievement.imageUrl}" style="width: 48px; height: 48px; margin-right: 12px;" />
  <div style="display: flex; flex-direction: column; flex-grow: 1; margin-right: 12px;">
    <p id="achievement-title-${i}" style="margin: 0; font-size: 13px">${achievement?.name}</p>
    <p id="achievement-description-${i}" style="margin: 1px 0 0; font-size: 10px; overflow: hidden;">${achievement?.description}</p>
  </div>
  <div style="display: flex; justify-content: center;">
    <p id="achievement-percentage-${i}" style="font-size: 12px">${achievement?.percent}%</p>
  </div>
</li>
    `
  };

  return `
<html>
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    ${games
      .flatMap(({ game: { appid }, nextAchievements }) => [
        ...(nextAchievements?.map(({ imageUrl }) => `<link href="${imageUrl}" as="image" rel="preload" />`) ?? []),
        `<link href="https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appid}/library_600x900.jpg" as="image" rel="preload" />`
      ])
      .join('\n')
    }
     
    <style>
        body {
          margin: 0;
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
    <div style="display: flex; padding: 64px 48px; flex-direction: column; align-items: center;">
      <img id="game-image" style="display: block; width: 300px; height:450px; background: #232323;" src="${`https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${game.game.appid}/library_600x900.jpg`}"/>
      <p id="game-title" style="margin: 24px 0 0; font-size: 22px">${game.game.name}</p>
      <ul style="margin: 32px 0 0; padding: 0; width: 450px;">
        ${game.nextAchievements.map(achievementHtml).join('\n')}
      </ul>            
      <button id="start-button" style="margin-top: 32px; padding: 8px 24px; appearance: none; border: 0; border-radius: 0; background: #232323; color: #a2a2a2; font-size: 24px;">Have fun!</button>                
    </div>
  </body>
  <script>
    const games = ${JSON.stringify(gamesJson)};

    const $gameTitle = document.getElementById('game-title');
    const $gameImage = document.getElementById('game-image');
    const $startButton = document.getElementById('start-button');
    
    const shuffle = (callback, weight, threshold) => {
      const interval = weight < 30
        ? 80
        : 80 + 1.4 ** (weight - 30);
      
      setTimeout(() => {
        callback();
        
        if (++weight < threshold) {
          shuffle(callback, weight, threshold);
        } else {
          $startButton.disabled = false;
        }
      }, interval);
    }
    
    $startButton.onclick = () => {
      $startButton.disabled = true;
          
      shuffle(() => {
        requestAnimationFrame(() => {
          const index = Math.floor(Math.random() * games.length);
          $gameTitle.textContent = games[index].name;
          $gameImage.src = games[index].imageUrl;
          
          games[index].nextAchievements.forEach((achievement, i) => {
            document.getElementById('achievement-image-' + i).src = achievement?.imageUrl;
            document.getElementById('achievement-title-' + i).textContent = achievement?.name;
            document.getElementById('achievement-description-' + i).textContent = achievement?.description;
            document.getElementById('achievement-percentage-' + i).textContent =  achievement?.percent + '%'; 
          })
        });
      }, 1, 50);
     
    }  
  </script>
</html>
  `;
}

fetchGames()
  // .then(games => games.slice(0, 10).map(fetchAchievements))
  .then(games => games.map(fetchAchievements))
  .then(promises => Promise.all(promises))
  .then(games => {
    fs.writeFileSync('./index.html', buildHtml(games))
    fs.writeFileSync('./roulette.html', buildRouletteHtml(games))
  });
