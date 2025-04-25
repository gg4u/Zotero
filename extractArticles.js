// extract articles contents and tag the sections
// TODO: adjust the regex

(async function processZoteroPaneItems() {
    Zotero.debug("🔍 Fetching items from the currently visible collection in ZoteroPane...");

    let items = ZoteroPane.getSelectedItems();

    if (!items || items.length === 0) {
        Zotero.debug("❌ No items found in the current ZoteroPane view.");
        return;
    }

    Zotero.debug(`📂 Total articles found: ${items.length}`);

    let regexPatterns = {
        space: / /g,
        columnSemicolumn: /[:;]/g,
        quotesParenthesis: /["'()]/g,
        // Regex to identify potential page headers (numbers, author names, journal info, "downloaded from")
        pageHeader: /(?:^\s*\d+\s*$)|(?:^\s*[A-Z][a-z]+\s+[A-Z]\.\s*$)|(?:^\s*[A-Z]\.\s+[A-Z][a-z]+\s*$)|(?:^.+?\s+et al\.\s*$)|(?:^.+?\s+\d{4}\s*$)|(?:^.+?\s+Downloaded from.+?\s*$)/gm,
        figureText: /^(?:Fig\.|Figure)\s+\d+\:.+/m, // Basic pattern for figure captions
        referenceStart: /^(References|Bibliography)\s*$/i,
        keywordStart: /^(Keywords|Index Terms)\s*:\s*(.+)$/i,
        sectionNumbering: /^(\d+\.)+(\s+[A-Za-z])/m // Matches numbered sections like "1.", "2.1.", etc.
    };

    const outputFolder = '/Users/[USER]/Documents/Datafication/data/';
    const allFilesPath = '/Users/[USER]/Desktop/Documents/Datafication/all_files.txt';
    let allFilesContent = "";

    try {
        await Zotero.File.ensureDirectoryExists(outputFolder);
    } catch (error) {
        Zotero.debug(`⚠️ Error creating directory '${outputFolder}': ${error}`);
        return;
    }

    for (let item of items) {
        if (!item.isRegularItem()) continue;

        let title = item.getField('title') || 'Untitled';
        let creators = item.getCreators();
        let attachmentIDs = item.getAttachments();
        let fulltext = [];

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

        let combinedText = fulltext.join("\n\n");

        // 1. Stripping Page Headers (Basic Regex Approach)
        let textWithoutHeaders = combinedText.replace(regexPatterns.pageHeader, '').replace(/\n{2,}/g, '\n');

        // 2. Handling Text Mixed with Figures (Basic Regex Approach)
        let textWithoutFigures = textWithoutHeaders.replace(regexPatterns.figureText, '').replace(/\n{2,}/g, '\n');

        // 3. Formatting Section Names
        let formattedText = textWithoutFigures.split('\n').map(line => {
            const referenceMatch = line.match(regexPatterns.referenceStart);
            if (referenceMatch) {
                return `## ${referenceMatch[1]}`;
            }

            const keywordMatch = line.match(regexPatterns.keywordStart);
            if (keywordMatch) {
                return `## ${keywordMatch[1]}: ${keywordMatch[2]}`;
            }

            const sectionMatch = line.match(regexPatterns.sectionNumbering);
            if (sectionMatch) {
                const depth = sectionMatch[1].split('.').length;
                const hashmarks = '#'.repeat(Math.min(depth + 1, 6)); // Limit to H6
                return `${hashmarks}${line.substring(sectionMatch[0].indexOf(sectionMatch[2]))}`;
            }

            return line;
        }).join('\n').replace(/\n{2,}/g, '\n'); // Clean up extra newlines

        let sanitizedTitle = title.replace(regexPatterns.space, '--')
                                .replace(regexPatterns.columnSemicolumn, '-')
                                .replace(regexPatterns.quotesParenthesis, '');
        const filename = `${item.id}-${sanitizedTitle}.txt`;
        const filePath = Zotero.File.pathToFile(outputFolder + filename);

        const individualFileContent = `# ${title}\n\n${formattedText}`;
        try {
            await Zotero.File.putContentsAsync(filePath.path, individualFileContent);
            Zotero.debug(`✅ Article '${title}' saved to '${filePath.path}'`);
        } catch (error) {
            Zotero.debug(`⚠️ Error writing to file '${filePath.path}': ${error}`);
        }

        allFilesContent += `---BEGIN ARTICLE---\n`;
        allFilesContent += `# ${title}\n`;
        if (creators && creators.length > 0) {
            allFilesContent += `## Authors: ${creators.map(creator => creator.firstName + ' ' + creator.lastName).join(', ')}\n`;
        }
        allFilesContent += `${formattedText}\n`;
        allFilesContent += `---END ARTICLE---\n\n`;
    }

    try {
        await Zotero.File.putContentsAsync(allFilesPath, allFilesContent);
        Zotero.debug(`✅ All articles content saved to '${allFilesPath}'`);
    } catch (error) {
        Zotero.debug(`⚠️ Error writing to file '${allFilesPath}': ${error}`);
    }

})();
