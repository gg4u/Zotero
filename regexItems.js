// Run text analytics in pdf

// Replace with your group's name
const groupName = "MyGroup";
// Replace with your collection's name
const collectionName = "SELECTED";

// Retrieve all groups
const groups = Zotero.Groups.getAll();
let targetGroup = null;

// Find the target group
for (let group of groups) {
    if (group.name === groupName) {
        targetGroup = group;
        break;
    }
}

if (!targetGroup) {
    throw new Error(`Group '${groupName}' not found.`);
}

// Retrieve all collections in the group
const collections = Zotero.Collections.getByLibrary(targetGroup.libraryID);
let targetCollection = null;

// Find the target collection
for (let collection of collections) {
    if (collection.name === collectionName) {
        targetCollection = collection;
        Zotero.debug(`Found:${targetCollection.id}`)
        break;
    }
}

if (!targetCollection) {
    throw new Error(`Collection '${collectionName}' not found in group '${groupName}'.`);
}



//
// Define keywords and their regex patterns
const keywords = {
    "education": /\beducation\b/gi,
    "datafication": /\bdatafication\b/gi,
    "university": /\buniversity\b/gi,
    "higher education": /\bhigher education\b/gi
};

// Function to extract text from a PDF attachment
async function extractTextFromPDF(attachment) {
    const filePath = attachment.getFilePath();
    if (!filePath) return null;
    return await Zotero.Text.extractFromFile(filePath);
}

// Function to count keyword occurrences in text
function countKeywords(text, patterns) {
    const counts = {};
    for (const [keyword, pattern] of Object.entries(patterns)) {
        const matches = text.match(pattern);
        counts[keyword] = matches ? matches.length : 0;
    }
    return counts;
}


(async function () {
let items = await Zotero.Items.getAll(targetCollection.id);


// Process each item in the collection
for (let item of items) {
    // Skip non-regular items (e.g., notes, attachments)
    if (item.isAttachment() || item.isNote()) continue;

    // Get the title of the item
    const title = item.getField('title') || 'Untitled';

    // Get attachments related to the item
    const attachments = await item.getAttachments();

    // Process each attachment
    for (let attachmentID of attachments) {
        const attachment = Zotero.Items.get(attachmentID);
        if (!attachment || attachment.attachmentContentType !== 'application/pdf') continue;

        // Extract text from the PDF
        const text = await extractTextFromPDF(attachment);
        if (!text) continue;

        // Count keyword occurrences
        const counts = countKeywords(text, keywords);

        // Output the results to the console
        Zotero.debug(`Title: ${title}`);
        for (const [keyword, count] of Object.entries(counts)) {
            Zotero.debug(`'${keyword}' count: ${count}`);
        }
        Zotero.debug('---');
    }
}

})
