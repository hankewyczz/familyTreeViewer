/* Utils for loading data */

// Grabs a json file
function getJsonData(address, callback, timeout=xmlRTimeout) {
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
    // Initialize data dict
    var data = {};
    
    (function() { // we wrap it so we don't run into timing errors w/ getJsonData
        getJsonData(file, function(returnVal) {
            if (returnVal == null) { callback(null); }

            data["structure_raw"] = returnVal;
            data["details"] = {};
            data["structure"] = {};

            map(function(p) { data["structure"][p["id"]] = p; },  
                data["structure_raw"]);

            callback(data);
        }, xmlRTimeout);
    })(); // Execute immediately
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