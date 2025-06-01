
const gamesAPIClient = new GamesAPIClient();

document.addEventListener('DOMContentLoaded', () =>
{
    getCategories();
    searchGames();

    const searchBar = document.getElementById('game-search-bar');
    const categorySelect = document.getElementById('game-category-select');
    const gameContainer = document.getElementById('game-container');

    let debounceTimeout;

    searchBar.addEventListener('input', (event) =>
    {
        clearTimeout(debounceTimeout);

        const searchTerm = event.target.value.trim();

        debounceTimeout = setTimeout(async () =>
        {
            if (searchTerm.length >= 3)
            {
                await searchGames(searchTerm);
            }
        }, 800);
    });

    categorySelect.addEventListener('change', async () =>
    {
        const searchTerm = searchBar.value.trim();
        await searchGames(searchTerm);
    });
});

async function getCategories()
{
    try
    {
        const response = await gamesAPIClient.getMultiplayerGameCategories();

        if (!response || !Array.isArray(response))
        {
            console.error('Invalid response:', response);
            return [];
        }

        // Populate the category select element
        const categorySelect = document.getElementById('game-category-select');
        categorySelect.innerHTML = '<option value="">Select Category</option>'; // Reset options

        response.forEach(category =>
        {
            const option = document.createElement('option');
            option.textContent = category;
            categorySelect.appendChild(option);
        });
    }
    catch (error)
    {
        console.error('Error fetching categories:', error);
        return [];
    }
}

async function searchGames()
{
    try
    {
        displayGames(await getGames());
    }
    catch (error)
    {
        console.error('Error searching for games:', error);
    }
}

async function getGames()
{
    try
    {
        const searchTerm = document.getElementById('game-search-bar').value.trim();
        const searchCategory = document.getElementById('game-category-select').value;
        const limit = searchTerm ? 20 : 10;

        var response;

        if (searchCategory)
        {
            response = await gamesAPIClient.getMultiplayerGamesByCategory(searchCategory, searchTerm, limit);
        }
        else
        {
            response = await gamesAPIClient.getMultiplayerGames(searchTerm, limit);
        }

        if (!response || !Array.isArray(response.data))
        {
            console.error('Invalid response format:', response);
            return [];
        }

        return response.data;
    }
    catch (error)
    {
        console.error('Error fetching games:', error);
        return [];
    }
}    function displayGames(games)
{
    const gameContainer = document.getElementById('game-container');
    
    // Show loading state
    gameContainer.innerHTML = '<div class="loading">Loading games...</div>';
    
    // Add each game to the container, or show a message if no games found
    if (games.length === 0)
    {
        gameContainer.innerHTML = '<div class="no-games-message">No games found. Try adjusting your search criteria.</div>';
        return;
    }

    gameContainer.innerHTML = ''; // Clear previous results

    games.forEach((game, index) =>
    {
        const gameElement = document.createElement('div');
        gameElement.className = 'game-item';

        // Truncate description for preview (max 120 characters)
        const maxPreviewLength = 120;
        const description = game.description || 'No description available.';
        const needsTruncation = description.length > maxPreviewLength;
        const previewText = needsTruncation ? description.substring(0, maxPreviewLength) + '...' : description;

        // Generate play URL for the future playGame page
        const playGameUrl = `/playGame?embed=${encodeURIComponent(game.embed)}&title=${encodeURIComponent(game.title)}`;

        gameElement.innerHTML = `
            <div class="game-image-container">
                <img src="${game.image}" alt="${game.title}" class="game-image" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzUwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDM1MCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzNTAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjBGMkY1Ii8+CjxwYXRoIGQ9Ik0xNzUgMTAwTDE2NSA4MFYxMjBMMTc1IDEwMFoiIGZpbGw9IiM2Qzc1N0QiLz4KPHN0eWxlPgoudGl0bGUgeyBmb250LWZhbWlseTogc2Fucy1zZXJpZjsgZm9udC1zaXplOiAxNHB4OyBmaWxsOiAjNkM3NTdEOyB0ZXh0LWFuY2hvcjogbWlkZGxlOyB9Cjwvc3R5bGU+Cjx0ZXh0IHg9IjE3NSIgeT0iMTMwIiBjbGFzcz0idGl0bGUiPkdhbWUgSW1hZ2U8L3RleHQ+Cjwvc3ZnPgo='">
                <div class="game-overlay"></div>
            </div>
            <div class="game-info">
                <h3 class="game-title">${game.title}</h3>
                <div class="game-description" id="description-${index}">
                    <span class="game-description-preview">${previewText}</span>
                    <span class="game-description-full">${description}</span>
                </div>
                ${needsTruncation ? `<span class="description-toggle" onclick="toggleDescription(${index})">Show more</span>` : ''}                    <div class="game-actions">
                    <button class="btn-play" onclick="playGame('${game.embed}', '${game.title.replace(/'/g, "\\'")}')">
                        <i>🎮</i> Play Game
                    </button>
                </div>
            </div>
        `;

        gameContainer.appendChild(gameElement);
    });
}

function playGame(embedUrl, gameTitle)
{
    window.open(`/play-game?embed=${encodeURIComponent(embedUrl)}&title=${encodeURIComponent(gameTitle)}`, '_blank');
}

function toggleDescription(index)
{
    const descriptionElement = document.getElementById(`description-${index}`);
    const toggleElement = descriptionElement.parentElement.querySelector('.description-toggle');
    
    if (descriptionElement.classList.contains('expanded'))
    {
        descriptionElement.classList.remove('expanded');
        toggleElement.textContent = 'Show more';
    }
    else
    {
        descriptionElement.classList.add('expanded');
        toggleElement.textContent = 'Show less';
    }
}