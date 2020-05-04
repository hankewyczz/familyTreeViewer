/* Utils for loading data */

// Grabs a json file
function getJsonData(address, callback, timeout) {
    var xmlR = new XMLHttpRequest();
    var calledYet = false;

    function onStateChange() {
        var returnVal = null;
        if (xmlR.status && xmlR.status == 200) { // If we get a 200 ("OK")
            if (xmlR.readyState == 4) { // if the call is complete
                try {
                    returnVal = JSON.parse(xmlR.responseText);
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
    }

    // We try again at the timeout
    if (timeout) {
        setTimeout(function() {
            if (!calledYet) {
                calledYet = true;
                callback(null);
            }
        }, timeout);
    }

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
    var files = {
        "structure_raw": "../../data/structure.json",
    }
    // Initialize data dict
    var data = {}
    // Gets the file keys, and the number of keys
    var fileKeys = Object.keys(files);
    var fileKeysLeft = fileKeys.length

    var errors = 0;

    for (var i = 0; i < fileKeys.length; i++) {
        var curFile = files[fileKeys[i]];
        
        (function() { // we wrap it so we don't run into timing errors w/ getJsonData
            var curI = i; // callback function can't reach i; out of scope
            getJsonData(curFile, 
                function(returnVal) {
                    fileKeysLeft--;

                    if (returnVal == null) {
                        errors++;
                    }

                    data[fileKeys[curI]] = returnVal;

                    if (fileKeysLeft == 0) { // If there are no keys left, 
                        if (errors == 0) { // and we encountered no errors
                            var structure = {};

                            for (var j = 0; j < data["structure_raw"].length; j++) {
                                // Generate the structure dict
                                // We use the IDs as keys here
                                structure[data["structure_raw"][j]["id"]] = data["structure_raw"][j];
                            }

                            // Initialize the structure
                            data["structure"] = structure;
                            data["details"] = {};
                            callback(data);
                        }

                        else {
                            callback(null);
                        }
                    }
                }, xmlRTimeout);
        })();

    }
}


function getLoadingPanelJson(address, callback, timeout) {
    var loadingScreen = document.createElement("div");
    loadingScreen.className = "loadingpanel";
    loadingScreen.appendChild(document.createTextNode("Loading family data..."));

    showInfoWindow({"text": loadingScreen});

    getJsonData(address, function(js) {
        if (js == null) {
            showError("The requested data could not be loaded. Please refresh the page.", true);
        }
        else {
            callback(js);
        }
    }, timeout);
}