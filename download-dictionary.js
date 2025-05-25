/**
 * Download script for English dictionary files for typo-js spell checking
 * Downloads en_US.dic and en_US.aff files for Hunspell-compatible spell checking
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Create dictionaries directory if it doesn't exist
const dictionariesDir = path.join(__dirname, 'public', 'dictionaries');
if (!fs.existsSync(dictionariesDir)) {
    fs.mkdirSync(dictionariesDir, { recursive: true });
    console.log('Created dictionaries directory');
}

// Dictionary files to download
const dictionaryFiles = [
    {
        name: 'en_US.aff',
        url: 'https://raw.githubusercontent.com/LibreOffice/dictionaries/master/en/en_US.aff'
    },
    {
        name: 'en_US.dic', 
        url: 'https://raw.githubusercontent.com/LibreOffice/dictionaries/master/en/en_US.dic'
    }
];

// Function to download a file
function downloadFile(url, destination) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(destination);
        
        console.log(`Downloading ${path.basename(destination)}...`);
        
        https.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
                return;
            }
            
            let downloadedBytes = 0;
            const totalBytes = parseInt(response.headers['content-length'] || '0');
            
            response.on('data', (chunk) => {
                downloadedBytes += chunk.length;
                if (totalBytes > 0) {
                    const percent = ((downloadedBytes / totalBytes) * 100).toFixed(1);
                    process.stdout.write(`\r${path.basename(destination)}: ${percent}% (${downloadedBytes}/${totalBytes} bytes)`);
                }
            });
            
            response.pipe(file);
            
            file.on('finish', () => {
                file.close();
                console.log(`\n✓ Downloaded ${path.basename(destination)}`);
                resolve();
            });
        }).on('error', (err) => {
            fs.unlink(destination, () => {
                reject(err);
            });
        });
    });
}

// Download all dictionary files
async function downloadDictionaries() {
    try {
        console.log('Starting dictionary download...');
        
        for (const file of dictionaryFiles) {
            const destination = path.join(dictionariesDir, file.name);
            await downloadFile(file.url, destination);
        }
        
        console.log('\n🎉 All dictionary files downloaded successfully!');
        console.log('Dictionary files saved to:', dictionariesDir);
        
        // Verify files exist and have content
        for (const file of dictionaryFiles) {
            const filePath = path.join(dictionariesDir, file.name);
            const stats = fs.statSync(filePath);
            console.log(`- ${file.name}: ${(stats.size / 1024).toFixed(1)} KB`);
        }
        
    } catch (error) {
        console.error('❌ Error downloading dictionaries:', error.message);
        process.exit(1);
    }
}

// Run the download
downloadDictionaries();
