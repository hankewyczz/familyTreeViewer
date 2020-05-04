"use strict";

var imageIcons = {
    defaultPerson: loadImage('resources/images/person.png'),
    downArrow: loadImage('resources/images/downarrow.png'),
    upArrow: loadImage('resources/images/uparrow.png'),
    doubleArrow: loadImage('resources/images/doublearrow.png'),
}



function getDetails(canvasView, data, curPerson) {
    var structure = data["structure"];

    var container = document.createElement('div');
    container.style.display = "table";
    container.style.borderCollapse = "collapse";
    container.style.width = "100%";
    var names = document.createElement('div');
    names.className = 'detailTitleDiv';
    container.appendChild(names);
    // Named div inside the infoWindow


    // If we have multiple names
    for (var i = 0; i < curPerson.names.length; i++) {
        var nameDiv = document.createElement('div');
        nameDiv.className = 'detailTitle';
        // Parse the name
        var name = (i == 0 ? "" : 'AKA ') + displayName(curPerson.names[i]);
        nameDiv.appendChild(document.createTextNode(name));
        names.appendChild(nameDiv);
    }

    function makeEventsPane() {
        // Initialize the data container
        var eventsDivContainer = document.createElement('div');
        eventsDivContainer.className = "detailRowcontainer";

        var rowGroupContainer = document.createElement('div');
        rowGroupContainer.style.display = "table-row-group";
        rowGroupContainer.style.width = "100%";

        // We use this to alternate div background colors. Using n-th child doesn't work too well,
        // since we go thru multiple exterior container divs
        var styleNumber = 0;

        // Run over each event
        for (var i = 0; i < curPerson["events"].length; i++) {
            var event = curPerson.events[i];

            var eventDiv = document.createElement('div');
            var divClass = (styleNumber == 0) ? "detailRow" : "detailRow1";
            styleNumber = (styleNumber == 0) ? 1 : 0; // Swap

            eventDiv.className = divClass;


            // Creates a field with a date and string
            function field(date, str) {
                var dateDiv = document.createElement('div');
                dateDiv.className = 'rowDate';
                dateDiv.appendChild(document.createTextNode(date));
                eventDiv.appendChild(dateDiv);

                var dataDiv = document.createElement('div');
                dataDiv.className = 'rowContent';
                // We make it text if it isn't already
                var dataNode = typeof str == "string" ? document.createTextNode(str) : str;
                dataDiv.appendChild(dataNode);
                eventDiv.appendChild(dataDiv);
            }

            // Creates a relationship event (marriage or divorce)
            function relationship(relArray) {
                var relDiv = document.createElement('div');

                for (var i = 0; i < relArray.length; i++) {
                    // We make it text if it isn't already
                    var relNode = typeof relArray[i] == "string" ? document.createTextNode(relArray[i]) : relArray[i];
                    relDiv.appendChild(relNode);
                }

                return relDiv;
            }

            // Creates a link to another person
            function makePersonLink(personId) {
                var personLink = document.createElement('a');
                personLink.style.cursor = "pointer";
                var linkContent = document.createTextNode(displayName(structure[personId].name));
                personLink.appendChild(linkContent);
                personLink["linked_person_id"] = personId;

                personLink.addEventListener("click", function(event) {
                    canvasView.setFocus(event.currentTarget["linked_person_id"]);
                });

                return personLink;
            }

            
            switch (event[event.length - 1]) { // We take the letter indicating event type
                // Birth
                case "B":
                    var birthInfo = document.createElement('span');
                    var birthDate = event[0] || "";
                    // If we have a birth location, we parse it properly
                    var birthLocation = event[1] ? " in " + event[1] : "";
                    birthInfo.appendChild(document.createTextNode("Born" + birthLocation));

                    var parents = structure[curPerson.id]["parents"];
                    if (parents.length > 0) {
                        birthInfo.appendChild(document.createTextNode(" to "));
                        birthInfo.appendChild(makePersonLink(structure[parents[0]].id));

                        if (parents.length > 1) {
                            birthInfo.appendChild(document.createTextNode(" and "));
                            birthInfo.appendChild(makePersonLink(structure[parents[1]].id));
                        }
                    }

                    field(birthDate, birthInfo);
                    break;

                // Death
                case "D":
                    var deathLocation = event[1] ? " in " + event[1] : "";
                    var deathType = event[2] ? " (" + event[2] + ")" : "";
                    var deathDate = event[0] || "";

                    field(deathDate, "Died" + deathLocation + deathType);
                    break;

                // Occupation
                case "OCC":
                    var occupationType = event[1] ? " " + event[1] : "";
                    var occupationDate = event[0] || "";

                    field(occupationDate,"Occupation:" + occupationType);
                    break;

                // Marriage
                case "M":
                    var marriageLocation = event[2] ? " at " + event[2] : "";
                    var marriageDate = event[0];
                    var marriageLink = makePersonLink(event[1]);
                    
                    field(marriageDate, relationship(["Married ", marriageLink, marriageLocation]));
                    break;

                // Divorce
                case "DIV":
                    var divorceLocation = event[2] ? " at " + event[2] : "";
                    var divorceDate = event[0];
                    var divorceLink = makePersonLink(event[1]);
                    
                    field(divorceDate, relationship(["Divorced ", divorceLink, divorceLocation]));
                    break;

                // Catch case
                default:
                    console.log("Could not parse event type");
            }
            rowGroupContainer.appendChild(eventDiv);
        }
        eventsDivContainer.appendChild(rowGroupContainer);


        // Handle the pictures
        for (var i = 0; i < curPerson["pics"].length; i++) {
            var picture = curPerson.pics[i];
            var eventDiv = document.createElement('div');

            var divClass = (styleNumber == 0) ? "detailRow" : "detailRow1";
            styleNumber = (styleNumber == 0) ? 1 : 0; // Swap

            eventDiv.className = divClass;
            eventDiv.style.display = "table";
            eventDiv.style.textAlign = "center";

            // Get the pictures set up
            function makePicture(src) {
                var image = document.createElement('img');
                image.onclick = function() { img_box(this) };
                image.style.width = "90%";
                image.style.marginTop = "5%";
                image.style.cursor = "pointer";
                image.src = src;

                eventDiv.appendChild(image);
            }

            makePicture(picture);
            eventsDivContainer.appendChild(eventDiv);
        }
        return eventsDivContainer;
    }


    if (curPerson["events"].length > 0 || curPerson["pics"].length > 0) {
        container.appendChild(makeEventsPane());
    }

    return {"text":container};
}






// Handles the canvasview
function View(data) {
    // Grabs the necessary parts
    var structure = data["structure"];
    var details = data["details"];

    // Gets the top ancestor possible (up to X generations)
    function getTopAncestor(personid, generations=4) {
        // Gets all the ancestors up to the given
        function getAncestorsInGen(person, gen) {
            var result = [];

            // we're not going further, just return this person
            if (gen == 0) { 
                return [person];
            }
            
            if (person in structure) {
                // Gets the gens of each parent as well
                map(function(parent) { result = result.concat(getAncestorsInGen(parent, gen - 1)); }, 
                    structure[person].parents);   
            }
            return result;
        }
        
        var result = null;
        // Checks how many generations we have to go thru
        for (var i = generations; i >= 0; i--) {
            var generationResult = getAncestorsInGen(personid, i);
            if (generationResult.length > 0) {
                result = generationResult[0]; // Basically, this returns the male ancestor who is 
                // the max generations (< generation) away from the given person
                break;
            }
        }
        return result;
    }
    // AsA
    // Start on the tree itself
    // Keys for which the initial value is null
    var initialNull = ["tree", "dragTimer", "canvas", "context", "focusId"];
    // Keys for which the initial value is zero
    var initialZero = ["scrollx", "scrolly", "targetx", "targety", "lastclickposx", "lastclickposy", "lastclickposx", 
    "lastscrollposy"];
    // Keys for which the initial value is false
    var initialFalse = ["dragging", "ismousedown"]

    var initialDict = {
        // The amount by which to ease the animation
        animEase: 0.10,

        // initializes the canvas
        initCanvas: function() {
            this.canvas = document.getElementById("canvas");
            this.context = this.canvas.getContext("2d");
        },  

          ////////////////////////
         // MOUSE AND POSITION //
        ////////////////////////

        // Helper function for mousePosition and touchPosition
        parseEventPosition: function(event) {
            var boundingRect = this.canvas.getBoundingClientRect();
            var x = (event.clientX - boundingRect.left) * (this.canvas.width / boundingRect.width);
            var y = (event.clientY - boundingRect.top) * (this.canvas.height / boundingRect.height);

            return [x, y];
        },


        // gets the true mouse position
        getMousePosition: function(event) { return this.parseEventPosition(event); },
        // Gets the touch position (for mobile devices)
        getTouchPosition: function(event) {
            // If this is the last touch
            if (event.touches.length == 0) {
                return [this.lastclickposx,this.lastclickposy];
            }
            return this.parseEventPosition(event.touches[0]);
        },

        // Animation for the dragging
        draggingAnim: function() {
            var elem = this;
            if (elem.dragTimer != null) {
                return;
            }

            // We initialize the timer
            elem.dragTimer = true;

            function dragAnim() {
                // get new X, Y coordinates
                elem.scrollx += elem.animEase * (elem.targetx - elem.scrollx);
                elem.scrolly += elem.animEase * (elem.targety - elem.scrolly);

                // If not dragging + we're within 0.1 of the targetx and targety:
                if ((!elem.dragging) && (Math.abs(elem.scrollx - elem.targetx) < 0.1) 
                    && (Math.abs(elem.scrolly - elem.targety) < 0.1)) {
                        elem.scrollx = elem.targetx;
                        elem.scrolly = elem.targety;
                        elem.dragTimer = null;
                }
                elem.redraw();  // Redraw
                if (elem.dragTimer != null) {
                    requestAnimFrame(dragAnim); // If the dragTimer isn't null, we keep going & animate
                }
            }
            requestAnimFrame(dragAnim); // Initialize
        },

          //////////////////////
         //  TREE FUNCTIONS  //
        //////////////////////

        // Generate the tree
        makeTree: function(nodeid) {
            var ancestor = getTopAncestor(nodeid);
            // Handle ancestor errors
            if (ancestor == null) {
                showError("No ancestor (" + nodeid + ") was found", true);
                return null;
            }
            return Tree(structure, ancestor);;
        },

        recreateTree: function() { this.setFocus(this.focusId); }, // we just set focus to current node, redraw tree

        // Gets the true screen center
        findScreenCenter: function() {
            var left = 0;
            var top = 0;
            var right = this.canvas.width;
            var bottom = this.canvas.height;

            // We take the infowindow into account here
            var infoWindow = document.getElementById("infowindow");
            if (isVisible(infoWindow)) {
                // Check for mobile (infoWindow will never be this wide normally)
                if (infoWindow.offsetWidth >= this.canvas.width * 0.8) {
                    bottom -= infoWindow.offsetHeight;
                } 
                else { // normal case
                    right -= infoWindow.offsetWidth;
                }
            }

            return {"x": left + ((right - left) / 2), "y": top + ((bottom - top) / 2)}; 
        },


        setFocus: function(node) {
            this.tree = this.makeTree(node);

            if (this.tree == null) { // null-case
                return;
            }

            this.focusId = node; // Focus on the given node
            window.location.hash = node; // Change window hash
            this.tree.position(this);

            var theNode = this.tree.lookupNodeById(node);
            var center = this.findScreenCenter();


            this.scrollx = this.targetx = center.x - theNode.getX() - (theNode.getWidth() / 2);
            this.scrolly = this.targety = center.y - theNode.getY() - (theNode.getHeight() / 2);
            

            theNode.inFocus = true; 
            this.canvas.focus();
            this.redraw();

            if (isVisible(document.getElementById("infowindow"))) {
                // If the info window is open, update it
                this.showDetailedView(node);
            }

        },

        setFocusPosition: function(node, x, y) {
            this.tree = this.makeTree(node);
            if (this.tree == null) {
                return;
            }
            this.focusId = node;
            window.location.hash = node; 
            this.tree.position(this);
            var theNode = this.tree.lookupNodeById(node);
            
            this.scrollx = x - theNode.getX();
            this.scrolly = y - theNode.getY();
            
            theNode.inFocus = true;
            this.canvas.focus();
            this.redraw();

            if (isVisible(document.getElementById("infowindow"))) {
                this.showDetailedView(node);
            }

            var center = this.findScreenCenter();
            this.targetx = center.x - theNode.getX() - (theNode.getWidth() / 2);
            this.targety = center.y - theNode.getY() - (theNode.getHeight() / 2);
            this.draggingAnim();
        },


        hitTest: function(mousePosition) {
            var hitTest = this.tree.hitTest(this, mousePosition[0], mousePosition[1]);
            var isHit = hitTest[0];
            var hitData = hitTest[1];

            if (isHit != null) {
                return ["node", hitData];
            }
            return ["none", null];
        },


        mouseUp: function(_, mousePosition) {
            var wasDragging = this.dragging;
            this.stopDragging(); // stop dragging

            if (wasDragging) {
                return; // We don't deal w/ drag mouseup cases here
            }

            // Hittest for current mouse position
            var hitTest1 = this.hitTest(mousePosition);
            var hitType1 = hitTest1[0]; 
            var hitData1 = hitTest1[1];


            // Hittest for the last click
            var hitTest2 = this.hitTest([this.lastclickposx,this.lastclickposy]);
            var hitType2 = hitTest2[0];
            var hitData2 = hitTest2[1];

            if (hitType1 == "node" && hitType2 == "node") { // Both need to be hits
                if (hitData1 == null || hitData2 == null) {
                    return;
                }

                var clickType1 = hitData1[0];
                var node1 = hitData1[1];
                var clickType2 = hitData2[0];
                var node2 = hitData2[1];

                if (node1 != node2) { 
                    return; // Both nodes need to be the same (ie. our click and mouseUp must be on the same node)
                }
                if (clickType1 == "info") {
                    this.showDetailedView(node1.getId());
                }
                this.setFocusPosition(node1.getId(), node1.getX() + this.scrollx, node1.getY() + this.scrolly);
            }
        },


        // DETAILS
        lookupDetails: function(personId, callback) {
            if (personId in details) {
                callback(details[personId]);
                return;
            }
            // If not, we have to get it ourselves
            getLoadingPanelJson("../../data/details.json", 
                function(el) {
                    if (el == null) {
                        callback(null);
                    } 
                    else {
                        var newKeyValues = Object.keys(el);
                        for (var i = 0; i < newKeyValues.length; i++) {
                            details[newKeyValues[i]] = el[newKeyValues[i]];
                        }
                        if (personId in details) {
                            callback(details[personId]);
                        }
                        else {
                            callback(null);
                        }
                    }
                }, xmlRTimeout);
        },
        showDetailedView: function(personId) {
            var thisEl = this;

            this.lookupDetails(personId, 
                function(thisDetails) {
                    if(thisDetails == null) {
                        showError("Person lookup failed", true);
                    }
                    else {
                        showInfoWindow(getDetails(thisEl, data, thisDetails));
                    }
            });
        },



        // Mouse Functions
        stopDragging: function() {
            this.dragging = false;
            this.ismousedown = false;
            this.adjustVisibleArea();
        },
        // On mousemove
        mouseMove: function(buttons, mousePosition) {
            if (window.event) {
                buttons = window.event.button || buttons;
            }


            if (buttons == 0) {
                this.stopDragging(); // if no longer holding
            }
            
            var x = mousePosition[0] - this.lastclickposx;
            var y = mousePosition[1] - this.lastclickposy;

            if (this.dragging) {
                this.targetx = this.lastscrollposx + x;
                this.targety = this.lastscrollposy + y;
                this.draggingAnim();
            }
            else if (this.ismousedown) {
                var d = Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2));
                if (d > mouseClickRadius) {
                    this.dragging = true;
                }
            }
        },

        // On mousedown
        mouseDown: function(buttons, mousePosition) {
            this.lastclickposx = mousePosition[0];
            this.lastclickposy = mousePosition[1];
            this.lastscrollposx = this.scrollx;
            this.lastscrollposy = this.scrolly;

            var hitTest = this.hitTest(mousePosition);
            if (hitTest[0] == "none" && !this.dragging) { // Only start dragging if it isn't a node
                this.dragging = true;
            }
            this.ismousedown = true;
        },


        setCanvasSize: function() {
            var width = Math.min(window.outerWidth, window.innerWidth);
            var height = Math.min(window.outerHeight, window.innerHeight);

            this.canvas.width = width;
            this.canvas.height = height;
        },


        /// SCALING
        changeScale: function(newScale) {
            if (newScale > 2 || newScale < 0.2) {
                return;
            }
            scale = newScale;
            updateScale(scale); // takes care of our default variables
            map(function(font) { font.setSize(font.getBaseSize() * scale); }, [baseFont, detailFont]);


            this.recreateTree();
        },
        zoomIn: function() {
            var newScale = scale + 0.1;
            this.changeScale(newScale);
        },

        zoomOut: function() {
            var newScale = scale - 0.1;
            this.changeScale(newScale);
        },
        zeroOut: function() {
            this.changeScale(1);
        },


        init: function(intialPerson) {
            var curView = this;

            // Intitialize
            this.initCanvas();
            this.setCanvasSize();
            this.setFocus(intialPerson);

            // Event listeners
            this.canvas.addEventListener("mousedown", 
                function(mEvent) { 
                    curView.mouseDown(mEvent.buttons, curView.getMousePosition(mEvent)); 
                }, false);
            this.canvas.addEventListener("mouseup", 
                function(mEvent){ 
                    curView.mouseUp(mEvent.buttons, curView.getMousePosition(mEvent)); 
                }, false);
            this.canvas.addEventListener("mousemove", 
                function(mEvent){ 
                    curView.mouseMove(mEvent.buttons, curView.getMousePosition(mEvent));
                }, false);
            this.canvas.addEventListener("touchstart", 
                function(mEvent){ 
                    curView.mouseDown(1, curView.getTouchPosition(mEvent));
                    mEvent.preventDefault(); // just to be safe
                    mEvent.stopPropagation(); // ditto
                }, false);
            this.canvas.addEventListener("touchend",
                function(mEvent){ 
                    curView.mouseUp(1, curView.getTouchPosition(mEvent)); 
                    mEvent.preventDefault();
                    mEvent.stopPropagation();
                }, false);
            this.canvas.addEventListener("touchmove", 
                function(mEvent){ 
                    curView.mouseMove(1, curView.getTouchPosition(mEvent)); 
                    mEvent.stopPropagation();
                    mEvent.preventDefault();
                }, false);

            // KEY EVENT LISTENERS //
            this.canvas.addEventListener("keydown", 
                function(keyEvent){
                    var target = null;

                    // Don't mess w/ any system shortcuts (we use metaKey in case of macs)
                    if (keyEvent.ctrlKey || keyEvent.altKey || keyEvent.metaKey) {
                        return;
                    }

                    switch (keyEvent.keyCode) {
                        case 189: // Minus
                        case 173: // Why does Firefox have a seperate minus keyCode?
                            curView.zoomOut();
                            keyEvent.preventDefault();
                            break;

                        case 187: // plus
                        case 61: // is firefox trying to be like IE by breaking keycodes?
                            curView.zoomIn();
                            keyEvent.preventDefault();
                            break

                        case 48: // Zero
                            curView.zeroOut();
                            keyEvent.preventDefault();
                            break

                        case 38: // Up arrow
                        case 87: // We're adding WASD as well here
                            var currentNode = curView.tree.lookupNodeById(curView.focusId);
                            if (currentNode.ancestorsUp.length > 0) {
                                target = currentNode.ancestorsUp[0]; // If we can go up, target is first parent
                            }
                            else if (currentNode.group && currentNode.group.ancestorsUp.length > 0) {
                                target = currentNode.group.ancestorsUp[0]; // If they're grouped, the group has them
                            }

                            keyEvent.preventDefault();
                            break;

                        case 40: // Down arrow
                        case 83: // S key
                            var currentNode = curView.tree.lookupNodeById(curView.focusId);
                            if (currentNode.descendentsDown.length > 0) {
                                target = currentNode.descendentsDown[0];
                            }
                            else if (currentNode.group && currentNode.group.descendentsDown.length > 0) {
                                target = currentNode.group.descendentsDown[0];
                            }

                            keyEvent.preventDefault();
                            break;

                        case 37: // Left arrow
                        case 65: // A key
                            var currentNode = curView.tree.lookupNodeById(curView.focusId);
                            var parentNode = null;

                            if (currentNode.ancestorsUp.length > 0) {
                                parentNode = currentNode.ancestorsUp[0]; // First parent
                            }
                            else if (currentNode.group && currentNode.group.ancestorsUp.length > 0) {
                                parentNode = currentNode.group.ancestorsUp[0]; // Group ancestor
                            }

                            if (parentNode) {
                                var siblings = parentNode.descendentsDown;
                                var index = siblings.indexOf(currentNode);

                                if (index < 0 && currentNode.group) { // Group case
                                    index = siblings.indexOf(currentNode.group);
                                }
                                if (index > 0) {
                                    target = siblings[index - 1]; // Get prev sibling
                                }
                            }
                            
                            keyEvent.preventDefault();
                            break;

                        case 39: // Right
                        case 68: // D key
                            var currentNode = curView.tree.lookupNodeById(curView.focusId);
                            var parentNode = null;

                            // Same as for right key
                            if (currentNode.ancestorsUp.length > 0) {
                                parentNode = currentNode.ancestorsUp[0];
                            }
                            else if (currentNode.group && currentNode.group.ancestorsUp.length > 0) {
                                parentNode = currentNode.group.ancestorsUp[0];
                            }

                            if (parentNode) {
                                var siblings = parentNode.descendentsDown;
                                var index = siblings.indexOf(currentNode);

                                if (index < 0 && currentNode.group) {
                                    index = siblings.indexOf(currentNode.group);
                                }
                                if (index < siblings.length - 1) {
                                    target = siblings[index + 1];
                                }
                            }

                            keyEvent.preventDefault();
                            break;

                        case 9: // Tab
                            // Switch spouses                            
                            var currentNode = curView.tree.lookupNodeById(curView.focusId);
                            if (currentNode.group) {
                                var spouses = currentNode.group.getMembers();
                                var currentIndex = spouses.indexOf(currentNode);
                                if (currentIndex + 1 < spouses.length) {
                                    target = spouses[currentIndex + 1];
                                }
                            }
                            
                            keyEvent.preventDefault();
                            break;
                    }

                    if (target != null) {
                        var x = target.getX() + curView.scrollx;
                        var y = target.getY() + curView.scrolly
                        curView.setFocusPosition(target.getId(), x, y);
                    }
            }, false);

            window.addEventListener("resize", 
                function(_){
                    curView.setCanvasSize(); 
                    curView.adjustVisibleArea();
                    curView.redraw();
                }, false);
            window.addEventListener("hashchange", 
                function(_) {
                    var hash = getHashString();
                    if (hash == "") {
                        hash = intialPerson;
                    }
                    if (curView.focusId == hash) {
                        return;
                    }
                    curView.setFocus(hash);
                });
        },

        adjustVisibleArea: function() {
            var changed = false;
            var boundaries = this.tree.getBoundaries();


            if (boundaries[2] + this.scrollx < 0) {
                this.targetx = (this.canvas.width / 2) - boundaries[2];
                changed = true;
            }
            if (boundaries[3] + this.scrolly < 0) {
                this.targety = (this.canvas.height / 2) - boundaries[3];
                changed = true;
            }
            if (boundaries[0] + this.scrollx > this.canvas.width) {
                this.targetx = (this.canvas.width / 2) + boundaries[0];
                changed = true;
            }
            if (boundaries[1] + this.scrolly > this.canvas.height) {
                this.targety = (this.canvas.height / 2) - boundaries[1];
                changed = true;
            }

            if (changed) {
                this.draggingAnim();
            }
        },

        redraw: function() {
            this.context.clearRect(0, 0, canvas.width, canvas.height);
            
            if (this.tree != null) {
                this.tree.draw(this);
            }
        },
    }

    // Sets the default tree variables
    for (var i = 0; i < initialNull.length; i++) {
        initialDict[initialNull[i]] = null;
    }
    for (var i = 0; i < initialFalse.length; i++) {
        initialDict[initialFalse[i]] = false;
    }
    for (var i = 0; i < initialZero.length; i++) {
        initialDict[initialZero[i]] = 0;
    }

    return initialDict;
}



function main() {
    loadData(function(data) {
        fadeOut(document.getElementById("loadingwindow"), 0.07); // fade out once we load all the data

        if (data == null) {
            showError("Data could not be loaded", fatal=true);
            return;
        }

        var canvasView = View(data);
        personSearch(data, canvasView);


        var initialPerson = "@I0000@";
        var showHelp = false;

        if (getHashString()) {
            if (getHashString().toLowerCase() == "help") {
                showHelp = true;
            }
            else {
                initialPerson = getHashString();
            }
        }



        canvasView.init(initialPerson); // Initialize with the initial user
        canvasView.zeroOut(); // Zero-out just to initialize

        // If the hash requires help:
        if (showHelp) {
            // We keep looping until the document is loaded, then replace
            var helpInterval = setInterval(function () {
                if (document.readyState !== 'complete') {
                    return; // Return if not yet ready
                }
                clearInterval(helpInterval); // Kill the interval
                // Show the info window for help
                showInfoWindow({"text": document.getElementById("helpDivHidden").cloneNode(true)});
            }, 200);

        }
    });
}
