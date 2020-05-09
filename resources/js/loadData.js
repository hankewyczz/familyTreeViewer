/* Utils for loading data */



// Grabs a json file
function getJsonData(address, callback, timeout=xmlRTimeout) {
    var xmlR = new XMLHttpRequest();
    var calledYet = false;

    function onStateChange() {
        if (xmlR.status && xmlR.status == 200 && xmlR.readyState == 4) { // "OK" and completed
            try {
                var returnVal = JSON.parse(xmlR.responseText);
            } 
            catch (e) {
                console.log("Could not parse responseText: " + e);
            }
            if (!calledYet) {
                calledYet = true;
                callback(returnVal);
            }
        }
    }

    // We try again at the timeout
    setTimeout(function() { if (!calledYet) {
            calledYet = true;
            callback(null);
        }}, timeout);

    // Add the event listener
    xmlR.addEventListener("readystatechange", onStateChange);
    xmlR.open("GET", address, async=true);

    if (xmlR.overrideMimeType) { // If we have a mimeType, override it
        xmlR.overrideMimeType("application/json");
    }

    xmlR.send(); // close out  
}


// Loads all the data we need
function loadData(callback) {
    var file = "../../data/structure.json";
    var detailsFile = "../../data/details.json"; 
    var burialsFile = "../../data/burials.json"; 
    var birthdaysFile = "../../data/birthdays.json"; 

    // Initialize data dict
    var data = {};
    
    (function() { // we wrap it so we don't run into timing errors w/ getJsonData
        getJsonData(file, function(returnVal) {
            if (returnVal == null) { callback(null); }

            data["structure_raw"] = returnVal;
            data["structure"] = {};

            map(function(p) { data["structure"][p["id"]] = p; },  
                data["structure_raw"]);

        }, xmlRTimeout);
    })(); // Execute immediately

    // Get details
    (function() {
        getJsonData(detailsFile, function(returnVal) { 
            data["details"] = returnVal;
            callback(data);
        }, xmlRTimeout)
    })();

    // Get burials
    (function() {
        getJsonData(burialsFile, function(returnVal) { 
            data["burials"] = returnVal;
            callback(data);
        }, xmlRTimeout)
    })();

// Get details
    (function() {
        getJsonData(birthdaysFile, function(returnVal) { 
            data["birthdays"] = returnVal;
            callback(data);
        }, xmlRTimeout)
    })();
}