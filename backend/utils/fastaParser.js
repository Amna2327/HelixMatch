const fs = require('fs')
const path = require('path');

function parseFasta(FilePath) {
    const AbsoluteFilePath = path.join(__dirname, FilePath)
    const file = fs.readFileSync(AbsoluteFilePath, 'utf-8');
    const linesArray = file.split('\n');
    linesArray.shift();
    const DNA = linesArray.join("").trim();
    return DNA;

}

module.exports = { parseFasta };