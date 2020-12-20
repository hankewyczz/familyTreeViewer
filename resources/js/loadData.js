"use strict";
/* Utils for loading data */
// todo fix callback
// Grabs a json file
function getJsonData(address, callback, timeout = xmlRTimeout) {
    let xmlR = new XMLHttpRequest();
    let calledYet = false;
    function onStateChange() {
        if (xmlR.status && xmlR.status == 200 && xmlR.readyState == 4) { // "OK" and completed
            let returnVal;
            try {
                returnVal = JSON.parse(xmlR.responseText);
            }
            catch (e) {
                console.log("Could not parse responseText: " + e);
            }
            if (!calledYet && returnVal) {
                calledYet = true;
                callback(returnVal);
            }
        }
    }
    // We try again at the timeout
    setTimeout(function () {
        if (!calledYet) {
            calledYet = true;
            callback(null);
        }
    }, timeout);
    // Add the event listener
    xmlR.addEventListener("readystatechange", onStateChange);
    xmlR.open("GET", address, true);
    if (xmlR.overrideMimeType) { // If we have a mimeType, override it
        xmlR.overrideMimeType("application/json");
    }
    xmlR.send(); // close out
}
// todo fix callback
// Loads all the data we need
function loadData(callback) {
    /* We append this every time to ensure that the JSON files aren't kept in the cache.
    Fixes an issue where, for some reason, JSON files wouldn't reflect an update.
    For example, they'd call a person which no longer existed (since only some of the files would
    update?, or not reflect changes). */
    const rand = Math.random().toString(36).substr(2, 5);
    const file = "data/structure.json?" + rand;
    const detailsFile = "data/details.json?" + rand;
    const burialsFile = "data/burials.json?" + rand;
    const birthdaysFile = "data/birthdays.json?" + rand;
    // Initialize data dict
    let data = {};
    (function () {
        getJsonData(file, function (returnVal) {
            if (returnVal == null) {
                callback(null);
            }
            data["structure_raw"] = returnVal;
            data["structure"] = {};
            data["structure_raw"].map(p => data["structure"][p["id"]] = p);
            console.log("Loaded structure.json");
            loadDetails();
        }, xmlRTimeout);
    })(); // Execute immediately
    // Get details
    function loadDetails() {
        getJsonData(detailsFile, function (returnVal) {
            data["details"] = returnVal;
            console.log("Loaded details.json");
            loadBurials();
        }, xmlRTimeout);
    }
    // Get burials
    function loadBurials() {
        getJsonData(burialsFile, function (returnVal) {
            data["burials"] = returnVal;
            console.log("Loaded burials.json");
            loadBirthdays();
        }, xmlRTimeout);
    }
    // Get birthdays
    function loadBirthdays() {
        getJsonData(birthdaysFile, function (returnVal) {
            data["birthdays"] = returnVal;
            console.log("Loaded birthdays.json");
            callback(data);
        }, xmlRTimeout);
    }
}
