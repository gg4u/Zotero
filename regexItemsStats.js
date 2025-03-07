// fetch regex matches and compute stats on articles in a selected folder 

(async function processZoteroPaneItems() {
    Zotero.debug("🔍 Fetching items from the currently visible collection in ZoteroPane...");

    // 🔹 Get all items currently visible in ZoteroPane (not just selected)
    let items = ZoteroPane.getSelectedItems(); 

    if (!items || items.length === 0) {
        Zotero.debug("❌ No items found in the current ZoteroPane view.");
        return;
    }

    Zotero.debug(`📂 Total articles found: ${items.length}`);

    // 🔹 Regular Expressions for Search
    let regexPatterns = {
        "dataf*": /\bdataf\w*\b/gi,
        "higher education": /\bhigher education\b/gi,
        "education": /\beducation\b/gi,
        "universit*": /\buniversit\w*\b/gi,
        "child*": /\bchild\w*\b/gi,
        "school*": /\bschool\w*\b/gi,
        "primary school*": /\b(primary|elementary|grade) school(s)?\b/gi,
        "secondary school*": /\b(secondary|high|middle|junior high|senior high) school(s)?\b/gi
    };

    let results = [];
    let stats = {
        "dataf*": [],
        "higher education": [],
        "education": [],
        "universit*": [],
        "child*": [],
        "school*": [],
        "primary school*": [],
        "secondary school*": []
    };

    let filePath = '/Users/gg4u/Desktop/zotero_results.txt'; // 🔹 Change path if needed

    // 🔹 Process each item
    for (let item of items) {
        if (!item.isRegularItem()) continue; // Skip attachments, notes, etc.

        let title = item.getField('title') || 'Untitled';
        let attachmentIDs = item.getAttachments();
        let fulltext = [];

        // 🔹 Extract Full Text from Attachments
        for (let id of attachmentIDs) {
            let attachment = Zotero.Items.get(id);
            if (attachment && (attachment.attachmentContentType === 'application/pdf' || attachment.attachmentContentType === 'text/html')) {
                if (attachment.attachmentText) {
                    fulltext.push(await attachment.attachmentText);
                }
            }
        }

        if (fulltext.length === 0) {
            Zotero.debug(`⚠️ No full text found for '${title}'. Skipping...`);
            continue;
        }

        let combinedText = fulltext.join(" ");
        let matchCounts = {};

        // 🔹 Perform Regex Search
        for (let [key, pattern] of Object.entries(regexPatterns)) {
            let matches = combinedText.match(pattern);
            matchCounts[key] = matches ? matches.length : 0;
            stats[key].push(matchCounts[key]); // Save for final statistics
        }

        // 🔹 Print Results to Debug Console
        Zotero.debug(`📄 Title: '${title}'`);
        for (let [key, count] of Object.entries(matchCounts)) {
            Zotero.debug(`  - '${key}': ${count}`);
        }
        Zotero.debug('---');

        // 🔹 Save Results for Writing to File
        results.push(`📄 Title: '${title}'\n` + 
                     Object.entries(matchCounts).map(([key, count]) => `  - '${key}': ${count}`).join("\n") + 
                     "\n---\n");
    }

    // 🔹 Compute Mean & Standard Deviation
    function computeStats(values) {
        let mean = values.reduce((a, b) => a + b, 0) / values.length || 0;
        let variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length || 0;
        return { mean: mean.toFixed(2), stdDev: Math.sqrt(variance).toFixed(2) };
    }

    let finalStats = "\n📊 **Final Statistics**\n";
    for (let key of Object.keys(stats)) {
        let { mean, stdDev } = computeStats(stats[key]);
        finalStats += `  - '${key}': Mean = ${mean}, StdDev = ${stdDev}\n`;
        Zotero.debug(`📊 '${key}': Mean = ${mean}, StdDev = ${stdDev}`);
    }

    // 🔹 Write Results to File
    let fileData = results.join("") + finalStats;
    await Zotero.File.putContentsAsync(filePath, fileData);
    Zotero.debug(`✅ Results saved to '${filePath}'`);

})();
