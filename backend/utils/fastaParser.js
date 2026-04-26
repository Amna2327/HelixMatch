const fs = require('fs')

function parseFasta(FilePath) {
    const file = readFileSync(FilePath, 'utf-8');
    const linesArray = file.split('\n');
    linesArray.shift();
    const DNA = linesArray.join("").trim();
    return DNA;

}

module.exports = { parseFasta };