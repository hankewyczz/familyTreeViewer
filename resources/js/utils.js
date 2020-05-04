// Some formatting options
var scale = 1;
var baseVM = 50;
var baseHM = 20;
var baseBM = 5;
var verticalMargin = baseVM * scale;
var horizontalMargin = baseHM * scale;
var nodeBorderMargin = baseBM * scale;
var generationLimit = 6;
var mouseClickRadius = 70;
var xmlRTimeout = 20000;


// Trims whitespace
String.prototype.trim = function() {
	// Replaces any space characters at start, or at end
    return String(this).replace(/^\s+|\s+$/g, '');
}




// Updates the scaling
function updateScale(newScale) {
	scale = newScale;
	verticalMargin = baseVM * scale;
	horizontalMargin = baseHM * scale;
	nodeBorderMargin = baseBM * scale;
}


// Checks the visibility of an element
function isVisible(element) {
    return element.offsetWidth > 0 || element.offsetHeight > 0;
}

// essentially the Array.map() function, but I define it manually since
// IE didn't support it until IE9 (of course)
function map(func, array) {
    var result = [];
    for (var i = 0; i < array.length; i++) {
        result.push(func(array[i]));
    }
    return result;
}

// Only add an item to a list if it doesn't exist in the list
function addUnique(value, lst) {
    for (var i = 0; i < lst.length;i++) {
        if (lst[i] == value) return;
    }
    lst.push(value);
}

// Loads an image
function loadImage(source) {
    var image = new Image();
    image.src = source;
    return image;
}


// Empties the given container element
function makeEmpty(container) {
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }        
}


// Generates the info window with the following
function showInfoWindow(content) {
    var info = document.getElementById("textinfo");
    makeEmpty(info);

    info.appendChild(content["text"]);
    info.scrollTop = 0;

    fadeIn(document.getElementById("infowindow"),  0.05, "block");
}



// Gets the hash string
function getHashString() {
    var hash = window.location.hash;
    if (hash[0] == "#") {
        hash = hash.substr(1);
    }
    return decodeURIComponent(hash);
}

// Parses the name for display
function displayName(name) {
    return name.replace(/\//g,"");
}

// Parses the surname for display
function displaySurname(name) {
    var names = name.split(" ");
    var surnames = [];
    var insurname = false;

    for (var i = 0; i < names.length; i++) {
        if (names[i].startsWith("/")) {
            insurname = true;
        }

        if (insurname) {
            surnames.push(names[i]);
        }

        if (names[i].endsWith("/")) {
            return surnames.join(" ").replace(/\//g, "");
        }
    }
    return "";
}


// Searches for the given person
function personSearch(data, view) {
    var structure = data["structure"];
    var rawStructure = data["structure_raw"];

    document.getElementById("indexbutton").onclick = function(_) {
    	// generate index
        function makeIndex() {
            var divContainer = document.createElement('div');
            divContainer.className = "container";

            var divRow = null;
            var divSurnames = null;
            var divNames = null;
            var newRow = true;
            var prevName = "";

			// Handle linking to the person
            function personLink(event) {
                view.setFocus(event.currentTarget["link_person_id"]);
            }

        	// Handles a specific person
            function handle(i) {
                var newSurname = displaySurname(data["structure_raw"][i]["name"]);
                newRow = newSurname != prevName;

                if (newRow) {
                    divRow = document.createElement('div');
                    var divClass = (styleNumber == 0) ? "detailRow" : "detailRow1";
                    styleNumber = (styleNumber == 0) ? 1 : 0; // Swap
                    divRow.className = divClass;

                    var divSurnames = document.createElement('div');
                    divSurnames.className = "rowDate";
                    divSurnames.appendChild(document.createTextNode(newSurname));

                    divNames = document.createElement('div');
                    divNames.className = "rowContent";

                    divRow.appendChild(divSurnames);
                    divRow.appendChild(divNames);
                    divContainer.appendChild(divRow);
                }

                var name = document.createElement('div');
                var link = document.createElement("a");
                link.style.cursor = "pointer";
                var personName = displayName(data["structure_raw"][i]["name"]);
                prevName = newSurname;

                link.appendChild(document.createTextNode(personName));
                link["link_person_id"] = data["structure_raw"][i]["id"];
                link.addEventListener("click", personLink);
                name.appendChild(link);
                divNames.appendChild(name);
            }

            var styleNumber = 0;
            for (var i = 0; i < data["structure_raw"].length; i++) {
            	handle(i);
            }
            return divContainer;
        }

        var names = document.createElement('div');
        names.className ='detailTitleDiv';
        var container = document.createElement('div');
        container.appendChild(names);

        var name = document.createElement('div'); 
        name.className='detailTitle';
        names.appendChild(name);
        name.appendChild(document.createTextNode('Index/Індекс'));

        var helptextdiv = document.createElement('div');
        helptextdiv.appendChild(makeIndex());
        container.appendChild(helptextdiv);

        showInfoWindow({"text": container});
    } 


    // HELP BUTTON
    document.getElementById("helpbutton").onclick = function(_) {
    	showInfoWindow({"text": document.getElementById("helpDivHidden").cloneNode(true)});
    } 


    // Zoom handling
    document.getElementById("zoomin").onclick = function(_) {
        view.zoomIn();
    }
    document.getElementById("zoomout").onclick = function(_) {
        view.zoomOut();
    }
 
    // Executes a direct search (name must match person's name EXACTLY)
    function executeSearch(name) {
    	var cleanName = name.toLowerCase().trim();

        if (cleanName == "") return; // Kill the empty case

        for (var i = 0; i < rawStructure.length; i++) {
            if (displayName(rawStructure[i]["name"]).toLowerCase() == cleanName) {
            	// Only take direct matches
                view.setFocus(rawStructure[i]["id"]);
                return;
            }
        }

        showError('"' + cleanName + '" could not be found in the tree (names must exactly match)');
    }


    var searchText = document.getElementById("searchtext");
    var searchList = document.getElementById("searchlist");

    searchText.addEventListener("focus", 
    	function(event){
        	event.currentTarget.setSelectionRange(0, event.currentTarget.value.length);
    }) 

    searchText.addEventListener("keydown",
    	function(keyEvent) {
	        if (keyEvent.keyCode == 13) { // On enter
	            executeSearch(searchText.value);
	        }
    })
    searchText.addEventListener("blur",
    	function(event){ 
    		searchList.style.display = "none"; // Hide when not in focus
    })

    // Event Listener for each individual search result
    function searchResultEL(event) {
        view.setFocus(event.currentTarget["data-search_id"]);
        searchText.value = displayName(structure[event.currentTarget["data-search_id"]]["name"]);
    }

    searchText.addEventListener("input",
    	function(event) {
	        while (searchList.firstChild) { // Empty the list and begin anew
	            searchList.removeChild(searchList.firstChild); 
	        }

	        if (searchText.value.length < 3) return; // Don't start searching unless 3+ characters

	        var splitText = searchText.value.toLowerCase().split(" ");
	        var anyMatches = false;

	        for (var i = 0; i < rawStructure.length; i++) {
	            var name = displayName(rawStructure[i]["name"]).toLowerCase();
	            var nameMatches = true; // Assume true, show false for all cases
	            
	            for (var j = 0; j < splitText.length; j++) {
	            	if (name.indexOf(splitText[j]) < 0) {
	            		nameMatches = false;
	            		break;
	            	}
	            }

	            if (nameMatches) {
	                anyMatches = true;
	                searchList.style.display = "block";

	                var result = document.createElement('div');
	                result.className = "searchresult";

	                // add life dates (if we have any)
	                var birth = rawStructure[i]["birth"][0];
	                var death = rawStructure[i]["death"][0];
	                var range = "";
	                if (birth || death) {
	                    range = " (" + birth + "–" + death + ")";
	                }

	                result.textContent = displayName(rawStructure[i]["name"]) + range;
	                result.addEventListener("mousedown", searchResultEL);

	                result["data-search_id"] = rawStructure[i]["id"];
	                searchList.appendChild(result);
	            }
	        }
	        if (!anyMatches) {
	            searchList.style.display="none";  
	        }
    })
}