(async function () {

  // Purpose: copy all items from the folder SOURCE to the folder TARGET that match the criterion
  // Criterion: at least 2 notes with YES tag (Y-[..] or YES-[...]) 
  // Assumption: at least 2 reasearchers have casted 2 YES votes for an item

  // string the html of a note
    function stripHTML(html) {
        let doc = new DOMParser().parseFromString(html, "text/html");
        return doc.body.textContent || "";
    }
        
    // function to loop the copy of elements, from an array of IDs, to a target folder
    async function addItemToCollection(itemID, targetCollectionID) {
        try {
            // Retrieve the item
            let item = await Zotero.Items.getAsync(itemID);
            if (!item) {
                Zotero.debug(`❌ Item with ID ${itemID} not found.`);
                return;
            }
    
            // Add the collection to the item's collections
            item.addToCollection(targetCollectionID);
    
            // Save the item
            await item.saveTx();
    
            Zotero.debug(`✅ Item ${itemID} successfully added to collection ${targetCollectionID}.`);
        } catch (error) {
            Zotero.debug(`❌ Error adding item to collection: ${error.message}`);
        }
    }
            
        
    ////    
        
    let libraryID = 2;  /// This is the ID of the Collection. Change with yours!!

    /* Find the library by name 
    // test:  the ID is now different.. ?
    
    let libraries = Zotero.Libraries.getAll();
    let library = libraries.find(lib => lib.name === "Datafication");
    let libraryID = library.id;
    
    Zotero.debug(`🚀 Found library ID: ${libraryID}`);
    */



  
    let sourceCollectionName = "SOURCE";
    let targetCollectionName = "TARGET";
    let notePattern = /^(Y-|YES-)/i; // Case-insensitive regex for notes starting with 'Y-' or 'YES-'

    // Fetch all collections in the library
    let collections = await Zotero.Collections.getByLibrary(libraryID);

    // Find source and target collections by name
    let sourceCollection = collections.find(c => c.name === sourceCollectionName);
    let targetCollection = collections.find(c => c.name === targetCollectionName);

    if (!sourceCollection || !targetCollection) {
        Zotero.debug(`❌ Source or Target Collection NOT found.`);
        return;
    }

    let sourceCollectionID = sourceCollection.id;
    let targetCollectionID = targetCollection.id;
    Zotero.debug(`✅ Source: "${sourceCollectionName}" (ID: ${sourceCollectionID})`);
    Zotero.debug(`✅ Target: "${targetCollectionName}" (ID: ${targetCollectionID})`);

    // Fetch all items in the library
    let allItems = await Zotero.Items.getAll(libraryID);

    if (!allItems || allItems.length === 0) {
        Zotero.debug(`❌ No items found in Library ${libraryID}.`);
        return;
    }

    // Filter items manually by collection ID
    let collectionItems = allItems.filter(item => {
        let collections = item.getCollections ? item.getCollections() : [];
        return collections.includes(sourceCollectionID);
    });

    Zotero.debug(`📂 Collection "${sourceCollectionName}" contains ${collectionItems.length} items.`);

    let matchingItems = [];

    for (let item of collectionItems) {
        let notesObjects = await item.getNotes();
        let notes = [];
    
        
        
        //Zotero.debug(`Notes ${JSON.stringify(Zotero.Items.get(notes[0]).getNote().trim())}`);
        
        // Debug: Print all notes found
        if (notesObjects.length === 0) {
            Zotero.debug(`📄 ${item.getField('title')} (ID: ${item.id}) has NO notes.`);
        } else {
            Zotero.debug(`📄 ${item.getField('title')} (ID: ${item.id}) has ${notesObjects.length} notes.`);
            
            for (let index = 0; index < notesObjects.length; index++) {
                let id = notesObjects[index];
                let note = Zotero.Items.get(id);
                
                if (!note) {
                    Zotero.debug(`⚠️ Note with ID ${id} not found.`);
                    continue;
                }
                
                let noteHTML = note.getNote().trim();
                let noteContent = stripHTML(noteHTML);
                Zotero.debug(`📝 Note ${index + 1}: ${noteContent}`);
            
                //Zotero.debug(`📝 Pattern ${index + 1}: ${noteContent.match(notePattern)}`);
            
                notes.push(noteContent);
                
            }
            
        }


    
        // Check if at least 2 notes match the pattern
        if (notes.length >= 2) {
            let matchingNotes = notes.filter(note => note.match(notePattern));
            
            Zotero.debug(`matchingNotes ${matchingNotes}`);
            
            if (matchingNotes.length >= 2) {
                matchingItems.push(item.id);
                Zotero.debug(`✅ MATCH: ${item.getField('title')} (ID: ${item.id}) - ${matchingNotes.length} valid notes.`);
            }
        }
    }

    Zotero.debug(`test ${matchingItems}`);

    if (matchingItems.length === 0) {
        Zotero.debug(`❌ No items met the criteria.`);
        return;
    }
    
    
    
     // Ensure the item exists
        let item = Zotero.Items.get(matchingItems[0]);
        if (!item) {
            Zotero.debug(`⚠️ Item with ID ${itemID} not found.`);
            return;
        }

        // Ensure the collection exists
        let collection = Zotero.Collections.get(targetCollectionID);
        if (!collection) {
            Zotero.debug(`⚠️ Collection with ID ${targetCollectionID} not found.`);
            return;
        }

    Zotero.debug(`Matching items: ${JSON.stringify(matchingItems)}`);


    // Copy matching items to the target collection 
    for (let itemID of matchingItems) {
        await addItemToCollection(itemID, targetCollectionID);
    }


    // Copy matching items to the target collection 
    // one liner not working..
    // await Zotero.Collections.addItems(targetCollectionID, matchingItems);

    Zotero.debug(`✅ Copied ${matchingItems.length} items to "${targetCollectionName}".`);
})();



