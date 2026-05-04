const fs = require('fs');

function generateAnchors() {
    console.log("🛠️ Compiling healthy DNA anchors...");
    let finalAnchors = {};

    try {

        // This will return an array like: ['CFTR_healthy.fasta', 'HBB_healthy.fasta']
        const files = fs.readdirSync('../../data/healthyDNAsequences/');
        let GENE_ANCHORS = {};

        for (const FileName of files) {

            const geneName = FileName.replace("_healthy.fasta", "");
            const FilePath = "../../data/healthyDNAsequences/" + FileName;
            const rawText = fs.readFileSync(FilePath, 'utf-8');
            const linesArray = rawText.split('\n');
            linesArray.shift();
            const DNA = linesArray.join("").trim();

            if (DNA.length < 230) {
                console.warn(`Skipping ${FileName}, size too small`);
                continue;
            }

            const anchor = DNA.substring(190, 230);
            GENE_ANCHORS[geneName] = anchor;

        }

        // 3. Write the compiled JSON to the root folder
        fs.writeFileSync('../../data/anchors.json', JSON.stringify(GENE_ANCHORS, null, 2));
        console.log("✅ anchors.json successfully generated!");

    } catch (error) {
        console.error("❌ Failed to build anchors:", error.message);
    }
}

// Execute the function
generateAnchors();