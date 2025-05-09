(function () {
    'use strict';

    // Store API key from user input
    let API_KEY = null;

    // Wait for the page to load before starting anything
    window.addEventListener('load', init);

    // Initializes the form and button behavior
    function init() {
        const apikeyInput = id('apikey');

        // Listen for form submission
        qs('form').addEventListener('submit', (evt) => {
            evt.preventDefault(); // Stop the form from refreshing the page

            // Validate that an API key was entered
            if (!apikeyInput.value.trim()) {
                alert('Please enter an API key.');
                return;
            }

            // Save API key for future requests
            API_KEY = apikeyInput.value.trim();

            // Get form input values
            const team = id('teamName').value.trim();
            const year = id('year').value.trim();
            const conference = id('conference').value;
            const division = id('division') ? id('division').value : null;

            // If all fields are filled, fetch and display data
            if (year && team && conference) {
                setTeamLogo(year, team);
                HistoricalTeamRecords(year, team);
                HistoricalGameData(year, team, division, conference);
                PollData(year, team);
            }
        });
    }

    // Gets the season win/loss/tie record for a team
    function HistoricalTeamRecords(year, team) {
        const url = `https://apinext.collegefootballdata.com/records?year=${year}`;

        fetch(url, {
            headers: { 'Authorization': `Bearer ${API_KEY}` }
        })
            .then(statusCheck)
            .then((data) => {
                // Find the matching team by name
                const match = data.find(obj => obj.team.toLowerCase() === team.toLowerCase());

                // If found, display record data
                if (match) {
                    const total = match.total;
                    id('HTR').innerHTML = `
                    <h2>Season Record</h2>
                    <p><strong>Team:</strong> ${match.team}</p>
                    <p><strong>Conference:</strong> ${match.conference}</p>
                    <p><strong>Record:</strong> ${total.wins}-${total.losses}-${total.ties}</p>
                `;
                } else {
                    id('HTR').innerHTML = `<h2>Season Record</h2><p>No record found for ${team}.</p>`;
                }
            })
            .catch(() => {
                id('HTR').innerHTML = `<h2>Season Record</h2><p>Error getting team record.</p>`;
            });
    }

    // Gets all the game scores for a given team that season
    function HistoricalGameData(year, team, division, conference) {
        const url = `https://apinext.collegefootballdata.com/games?year=${year}&team=${encodeURIComponent(team)}`;

        fetch(url, {
            headers: { 'Authorization': `Bearer ${API_KEY}` }
        })
            .then(statusCheck)
            .then((games) => {
                if (games.length > 0) {
                    let list = games.map(game => `
                    <li>${game.week}: ${game.awayTeam} (${game.awayPoints}) @ ${game.homeTeam} (${game.homePoints})</li>
                `).join('');
                    id('HGD').innerHTML = `
                    <h2>Season Game-By-Game Scores</h2>
                    <ul>${list}</ul>
                `;
                } else {
                    id('HGD').innerHTML = `<h2>Season Game-By-Game Scores</h2><p>No games found for ${team} in ${year}.</p>`;
                }
            })
            .catch(() => {
                id('HGD').innerHTML = `<h2>Season Game-By-Game Scores</h2><p>Error getting game data.</p>`;
            });
    }

    // Gets weekly poll rankings for a given team
    function PollData(year, team) {
        const url = `https://apinext.collegefootballdata.com/rankings?year=${year}`;

        fetch(url, {
            headers: { 'Authorization': `Bearer ${API_KEY}` }
        })
            .then(statusCheck)
            .then((data) => {
                const foundRanks = [];

                // Loop through every week's rankings
                data.forEach(week => {
                    if (week.season === parseInt(year)) {
                        week.polls.forEach(poll => {
                            poll.ranks.forEach(rank => {
                                if (rank.school.toLowerCase() === team.toLowerCase()) {
                                    foundRanks.push({
                                        week: week.week,
                                        poll: poll.poll,
                                        rank: rank.rank,
                                        points: rank.points,
                                        firstPlaceVotes: rank.firstPlaceVotes
                                    });
                                }
                            });
                        });
                    }
                });

                // Display poll data if found
                if (foundRanks.length > 0) {
                    let list = foundRanks.map(entry => `
                    <li>Week ${entry.week}: ${entry.poll}: #${entry.rank} (${entry.points} pts, ${entry.firstPlaceVotes} 1st-place votes)</li>
                `).join('');
                    id('HPD').innerHTML = `
                    <h2>Season Poll Data</h2>
                    <ul>${list}</ul>
                `;
                } else {
                    id('HPD').innerHTML = `<h2>Season Poll Data</h2><p>${team} was not ranked in any poll for ${year}.</p>`;
                }
            })
            .catch(() => {
                id('HPD').innerHTML = `<h2>Season Poll Data</h2><p>Error fetching poll data.</p>`;
            });
    }

    // Loads the team logo and applies it to the page
    function setTeamLogo(year, teamName) {
        const url = `https://apinext.collegefootballdata.com/teams?year=${year}`;

        fetch(url, {
            headers: { 'Authorization': `Bearer ${API_KEY}` }
        })
            .then(statusCheck)
            .then((teams) => {
                // Try to match user input with team name, abbreviation, or alt name
                const match = teams.find(team =>
                    team.school.toLowerCase() === teamName.toLowerCase() ||
                    (team.abbreviation && team.abbreviation.toLowerCase() === teamName.toLowerCase()) ||
                    (team.alternateNames && team.alternateNames.some(name => name.toLowerCase() === teamName.toLowerCase()))
                );

                if (!match || !match.logos || match.logos.length === 0) {
                    console.warn(`No logo found for ${teamName}`);
                    return;
                }

                // Get the first logo URL from the team's logos array
                let logoUrl = match.logos[0];

                // Some logo URLs use 'http' instead of 'https'
                // Browsers block 'http' content on secure pages, so it replaces 'http' with 'https'
                // This prevents the logo from being blocked due to mixed content
                if (logoUrl.startsWith('http://')) {
                    logoUrl = logoUrl.replace('http://', 'https://');
                }

                // Display the logo on screen
                const logoImg = id('team-logo');
                logoImg.src = logoUrl;
                logoImg.alt = `${match.school} Logo`;
                logoImg.style.display = 'block';

                // Use logo to set page colors
                applyColorFromLogo(logoUrl);
            })
            .catch(err => {
                console.error("Error getting team logo:", err);
            });
    }

    // Uses the logo to extract a prominent color and apply it to sections
    function applyColorFromLogo(logoUrl) {
        const img = new Image();

        // Enable CORS for this image so it can read pixel data for color extraction
        // 'anonymous' ensures no credentials (like cookies) are sent with the request
        img.crossOrigin = 'anonymous';
        img.src = `https://images.weserv.nl/?url=${encodeURIComponent(logoUrl.replace('https://', ''))}`;

        img.onload = () => {
            colorjs.prominent(img, { amount: 2, format: 'hex' }).then(colors => {
                let color = Array.isArray(colors) ? colors[0] : colors;
                if (color === '#000' || color === '#000000') {
                    if (Array.isArray(colors) && colors.length > 1) {
                        color = colors[1];
                    }
                }

                // Apply that color to the sections
                const form = qs('form');
                const HTRBG = id('HTR');
                const HGDBG = id('HGD');
                const HPDBG = id('HPD');

                if (form) form.style.backgroundColor = color;
                if (HTRBG) HTRBG.style.backgroundColor = color;
                if (HGDBG) HGDBG.style.backgroundColor = color;
                if (HPDBG) HPDBG.style.backgroundColor = color;

                // Adjust text color based on brightness
                applyTextColorBasedOnBackground(color);
            }).catch(err => {
                console.error("Color extraction failed:", err);
            });
        };

        img.onerror = () => {
            console.warn("Logo failed to load for color extraction.");
        };
    }

    // Adjust text color to white or black depending on how dark the background is
    function applyTextColorBasedOnBackground(hexColor) {
        const r = parseInt(hexColor.slice(1, 3), 16);
        const g = parseInt(hexColor.slice(3, 5), 16);
        const b = parseInt(hexColor.slice(5, 7), 16);
        const brightness = (0.299 * r + 0.587 * g + 0.114 * b);
        const textColor = brightness < 128 ? 'white' : 'black';

        const sections = ['HTR', 'HGD', 'HPD'];

        for (let i = 0; i < sections.length; i++) {
            const sectionId = sections[i];
            const section = id(sectionId);
            if (section) {
                section.style.color = textColor;
            }
        }

        const form = qs('form');
        if (form) form.style.color = textColor;
    }

    // Checks if the response was successful; otherwise throws an error
    async function statusCheck(res) {
        if (!res.ok) {
            throw new Error(await res.text());
        }
        return res.json();
    }

    // Helper function: get element by ID
    function id(idName) {
        return document.getElementById(idName);
    }

    // Helper function: query selector
    function qs(selector) {
        return document.querySelector(selector);
    }
})();
