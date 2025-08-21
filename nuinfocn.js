<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NovelUpdates Info Finder</title>
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        
        body {
            background: linear-gradient(135deg, #1a2a6c, #b21f1f, #fdbb2d);
            color: #333;
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: rgba(255, 255, 255, 0.95);
            border-radius: 10px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
            padding: 20px;
        }
        
        header {
            text-align: center;
            padding: 20px 0;
            border-bottom: 2px solid #eee;
            margin-bottom: 30px;
        }
        
        h1 {
            color: #2c3e50;
            margin-bottom: 10px;
            font-size: 2.5rem;
        }
        
        .description {
            color: #7f8c8d;
            font-size: 1.1rem;
            max-width: 800px;
            margin: 0 auto;
        }
        
        .controls {
            display: flex;
            justify-content: center;
            gap: 15px;
            margin-bottom: 30px;
            flex-wrap: wrap;
        }
        
        button {
            padding: 12px 25px;
            border: none;
            border-radius: 5px;
            background: #3498db;
            color: white;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s ease;
            font-size: 1rem;
        }
        
        button:hover {
            background: #2980b9;
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
        }
        
        button:disabled {
            background: #bdc3c7;
            cursor: not-allowed;
            transform: none;
            box-shadow: none;
        }
        
        #nuInfoBtn {
            background: #e74c3c;
        }
        
        #nuInfoBtn:hover {
            background: #c0392b;
        }
        
        #autoFillBtn {
            background: #2ecc71;
        }
        
        #autoFillBtn:hover {
            background: #27ae60;
        }
        
        .info-panel {
            display: none;
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 20px;
            margin-top: 20px;
            background: #f9f9f9;
        }
        
        .info-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 1px solid #eee;
        }
        
        .close-btn {
            background: #e74c3c;
            padding: 8px 15px;
            font-size: 0.9rem;
        }
        
        .search-results {
            max-height: 500px;
            overflow-y: auto;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 5px;
            background: white;
            margin-bottom: 20px;
        }
        
        .search_main_box_nu {
            padding: 15px;
            margin-bottom: 15px;
            border: 1px solid #eee;
            border-radius: 5px;
            background: white;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
        }
        
        .info-btn {
            margin-top: 10px;
            padding: 8px 15px;
            background: #3498db;
            font-size: 0.9rem;
        }
        
        .novel-details {
            display: grid;
            grid-template-columns: 200px 1fr;
            gap: 20px;
            margin-top: 20px;
        }
        
        .novel-cover img {
            width: 100%;
            border-radius: 5px;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
        }
        
        .novel-info h2 {
            color: #2c3e50;
            margin-bottom: 15px;
            font-size: 1.8rem;
        }
        
        .info-item {
            margin-bottom: 10px;
        }
        
        .info-item h5 {
            color: #7f8c8d;
            font-size: 0.9rem;
            margin-bottom: 5px;
        }
        
        .info-item div {
            color: #2c3e50;
            font-size: 1rem;
        }
        
        .genre {
            display: inline-block;
            background: #eee;
            padding: 3px 8px;
            border-radius: 3px;
            margin-right: 5px;
            margin-bottom: 5px;
            font-size: 0.9rem;
            color: #3498db;
            text-decoration: none;
        }
        
        .genre:hover {
            background: #3498db;
            color: white;
        }
        
        #log {
            margin-top: 30px;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 5px;
            border-left: 4px solid #3498db;
            font-family: monospace;
            max-height: 200px;
            overflow-y: auto;
        }
        
        @media (max-width: 768px) {
            .novel-details {
                grid-template-columns: 1fr;
            }
            
            .controls {
                flex-direction: column;
                align-items: center;
            }
            
            button {
                width: 100%;
                max-width: 300px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>NovelUpdates Info Finder</h1>
            <p class="description">Search for novel information on NovelUpdates and automatically fill metadata forms.</p>
        </header>
        
        <div class="controls">
            <button id="fetchMetadataBtn">Fetch Metadata</button>
            <button id="nuInfoBtn" disabled>Search on NovelUpdates</button>
            <button id="autoFillBtn" disabled>Auto-Fill Form</button>
        </div>
        
        <div id="nuInfo" class="info-panel">
            <div class="info-header">
                <h2>NovelUpdates Search Results</h2>
                <button class="close-btn" onclick="closeNuInfo()">Close</button>
            </div>
            <div id="nuInfoResults" class="search-results">
                <!-- Results will appear here -->
            </div>
        </div>
        
        <div id="log">
            <p>Log messages will appear here...</p>
        </div>
    </div>

    <script>
        // Mock novelData object for demonstration
        const novelData = {
            metadata: {
                title: "The Beginning After The End"
            }
        };

        // Mock fetch function for demonstration
        async function fetchRawHTML(url) {
            log(`Fetching: ${url}`);
            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Return mock HTML content for demonstration
            return `
                <div class="search_main_box_nu">
                    <div class="search_title">
                        <a href="https://www.novelupdates.com/series/the-beginning-after-the-end/">The Beginning After The End</a>
                    </div>
                    <div class="search_stats">
                        Rating: 4.5/5 | Chapters: 350 | Year: 2018
                    </div>
                </div>
                <div class="search_main_box_nu">
                    <div class="search_title">
                        <a href="https://www.novelupdates.com/series/tbate-second-series/">TBATE: Second Series</a>
                    </div>
                    <div class="search_stats">
                        Rating: 4.3/5 | Chapters: 150 | Year: 2020
                    </div>
                </div>
            `;
        }

        // Helper function to log messages
        function log(message) {
            const logElement = document.getElementById('log');
            logElement.innerHTML += `<p>${new Date().toLocaleTimeString()}: ${message}</p>`;
            logElement.scrollTop = logElement.scrollHeight;
        }

        // Get DOM elements
        const nuBtn = document.getElementById('nuInfoBtn');
        const autoFillBtn = document.getElementById('autoFillBtn');
        const nuInfo = document.getElementById('nuInfo');
        const nuInfoResults = document.getElementById('nuInfoResults');
        const fetchMetadataBtn = document.getElementById('fetchMetadataBtn');

        /* ---------- helpers ---------- */
        function closeNuInfo() {
            nuInfo.style.display = 'none';
            nuInfoResults.innerHTML = '';
        }

        /* ---------- fetch search page and display results ---------- */
        async function openNuSearch() {
            const query = novelData.metadata?.title?.trim() || 
                         prompt('Enter novel title for NovelUpdates search:')?.trim();
            if (!query) return;

            const searchUrl = `https://www.novelupdates.com/series-finder/?sf=1&sh=${encodeURIComponent(query)}&sort=sdate&order=desc`;

            try {
                nuBtn.disabled = true;
                log(`Fetching NU search for "${query}" …`);
                const html = await fetchRawHTML(searchUrl);

                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                const series = doc.querySelectorAll('.search_main_box_nu');
                
                if (!series.length) {
                    log('No results found on NovelUpdates.');
                    return;
                }

                let resultsHtml = '';
                series.forEach(box => {
                    const titleLink = box.querySelector('.search_title a');
                    if (titleLink) {
                        const infoButton = `<button class="info-btn" data-url="${titleLink.href}">Info</button>`;
                        resultsHtml += box.outerHTML + infoButton + '<hr>';
                    }
                });

                nuInfoResults.innerHTML = resultsHtml;
                nuInfo.style.display = 'block';

                // Use event delegation for dynamically created buttons
                nuInfoResults.addEventListener('click', async (event) => {
                    if (event.target.classList.contains('info-btn')) {
                        const url = event.target.getAttribute('data-url');
                        try {
                            log(`Fetching detailed info from: ${url}`);
                            const detailedHtml = await fetchRawHTML(url);
                            const detailedDoc = new DOMParser().parseFromString(detailedHtml, 'text/html');

                            // Extract information from the detailed page
                            const title = detailedDoc.querySelector('.seriestitlenu')?.textContent || 'Title not found';
                            const imageUrl = "https://via.placeholder.com/200x300/4A6572/FFFFFF?text=Novel+Cover"; // Placeholder
                            const type = "Web Novel"; // Mock data
                            const genres = ["Action", "Adventure", "Fantasy", "Reincarnation"]; // Mock data
                            const authors = ["TurtleMe"]; // Mock data
                            const year = "2018"; // Mock data
                            const statuscoo = "Ongoing"; // Mock data
                            const originalPublisher = "Tapas"; // Mock data
                            const englishPublisher = "Tapas"; // Mock data
                            const description = "King Grey has unrivaled strength, wealth, and prestige in a world governed by martial ability. However, solitude lingers closely behind those with great power. Beneath the glamorous exterior of a powerful king lurks the shell of man, devoid of purpose and will. Reincarnated into a new world filled with magic and monsters, the king has a second chance to relive his life. Correcting the mistakes of his past will not be his only challenge, however. Underneath the peace and prosperity of the new world is an undercurrent threatening to destroy everything he has worked for, questioning his role and reason for being born again."; // Mock data
                            const associatedNames = "TBATE, The Beginning After The End"; // Mock data
                            const language = "English"; // Mock data

                            // Format associated names
                            const formattedAssociatedNames = associatedNames.split(',').join(', ');

                            // Create detailed content HTML
                            const detailedContent = `
                                <div class="novel-details">
                                    <div class="novel-cover">
                                        <img src="${imageUrl}" alt="${title}">
                                    </div>
                                    <div class="novel-info">
                                        <h2>${title}</h2>
                                        <div class="info-item">
                                            <h5>Type</h5>
                                            <div>${type} <span style="color:#8D8D8D;">(CN)</span></div>
                                        </div>
                                        <div class="info-item">
                                            <h5>Genre</h5>
                                            <div>${genres.map(genre => `<a class="genre" href="#">${genre}</a>`).join(' ')}</div>
                                        </div>
                                        <div class="info-item">
                                            <h5>Author(s)</h5>
                                            <div>${authors.map(author => `<a class="genre" href="#">${author}</a>`).join(' ')}</div>
                                        </div>
                                        <div class="info-item">
                                            <h5>Year</h5>
                                            <div>${year}</div>
                                        </div>
                                        <div class="info-item">
                                            <h5 title="Status in Country of Origin">Status in COO</h5>
                                            <div>${statuscoo}</div>
                                        </div>
                                        <div class="info-item">
                                            <h5>Original Publisher</h5>
                                            <div><a class="genre" href="#">${originalPublisher}</a></div>
                                        </div>
                                        <div class="info-item">
                                            <h5>English Publisher</h5>
                                            <div>${englishPublisher}</div>
                                        </div>
                                        <div class="info-item">
                                            <h5>Language</h5>
                                            <div><a class="genre lang" href="#">${language}</a></div>
                                        </div>
                                        <div class="info-item">
                                            <h5>Associated Names</h5>
                                            <div>${formattedAssociatedNames}</div>
                                        </div>
                                        <div class="info-item">
                                            <h5>Description</h5>
                                            <div>${description}</div>
                                        </div>
                                    </div>
                                </div>
                            `;

                            // Show the detailed information
                            nuInfoResults.innerHTML = detailedContent;
                            autoFillBtn.disabled = false;
                            
                            log("Detailed information loaded successfully!");
                        } catch (e) {
                            log(`Error fetching detailed info: ${e.message}`);
                        }
                    }
                });
            } catch (e) {
                log(`NU search error: ${e.message}`);
            } finally {
                nuBtn.disabled = false;
            }
        }

        /* ---------- AutoFill button click event ---------- */
        autoFillBtn.addEventListener('click', () => {
            // This would normally extract data from the info panel and fill a form
            log("Auto-fill functionality triggered!");
            alert("Form would be auto-filled with the novel information.");
        });

        /* ---------- enable/disable button ---------- */
        fetchMetadataBtn.addEventListener('click', () => {
            log("Fetching metadata...");
            // Simulate metadata fetch
            setTimeout(() => {
                nuBtn.disabled = false;
                log("Metadata fetched successfully. You can now search on NovelUpdates.");
            }, 1000);
        });

        nuBtn.addEventListener('click', openNuSearch);

        // Initialize
        log("System initialized. Click 'Fetch Metadata' to begin.");
    </script>
</body>
</html>
