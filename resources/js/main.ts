var imageIcons = {
    defaultPerson: loadImage('resources/images/person.png'),
    downArrow: loadImage('resources/images/downarrow.png'),
    upArrow: loadImage('resources/images/uparrow.png'),
    doubleArrow: loadImage('resources/images/doublearrow.png'),
    notes: loadImage('resources/images/notes.png'),
}



function getDetails(canvasView: any, data: any, curPerson: PersonDetails) {
    var structure = data["structure"];
    var sex = structure[curPerson["id"]]["sex"].toUpperCase();

    var container = document.createElement('div');
    container.style.display = "table";
    container.style.borderCollapse = "collapse";
    container.style.width = "100%";
    var names = document.createElement('div');
    names.className = 'detailTitleDiv';
    container.appendChild(names);


    // Localizaiton
    var langArray: any = getLang();

    // If we have multiple names
    for (var i = 0; i < curPerson.names.length; i++) {
        var nameDiv = document.createElement('div');
        nameDiv.className = 'detailTitle';
        // Parse the name
        if (i != 0) {
            if (curPerson.names[i] = "\/\/") {
                // A weird case we see with the English monarcy example file
                break;
            }
            else {
                var name = "AKA " + displayName(curPerson.names[i]);
            }
        }
        else {
            var name = displayName(curPerson.names[i]);
        }
        nameDiv.appendChild(document.createTextNode(name));
        names.appendChild(nameDiv);
    }


    function openRelCalc(person: PersonDetails) {
        var container = document.createElement('div');
        container.style.width = "100%";

        var nameDiv = document.createElement('div');
        nameDiv.className = 'detailTitle';

        var names = document.createElement('div');
        names.className = 'detailTitleDiv';
        container.appendChild(names);

        nameDiv.appendChild(document.createTextNode(langArray["relationshipCalculator"]));
        names.appendChild(nameDiv);

        var relCalcContainer = document.createElement('div');
        relCalcContainer.className = "detailRowcontainer";
        relCalcContainer.style.width = "100%";
        relCalcContainer.style.textAlign = "center";

        var person2text = document.createTextNode(langArray["person"] + "2");
        relCalcContainer.appendChild(person2text)

        // Second search bar
        var searchArea2 = document.createElement('div');
        searchArea2.id = "searchAreaP2";
        searchArea2.className = "search";

        var searchtext2 = document.createElement('input');
        searchtext2.type = "text";
        searchtext2.id = "searchtextP2";
        searchtext2.className = "searchTerm";
        searchtext2.autocomplete = "off";
        searchtext2.placeholder = "Пошук (Search)";

        var searchlist2 = document.createElement('div');
        searchlist2.id = "searchlistP2";

        searchArea2.appendChild(searchtext2);
        searchArea2.appendChild(searchlist2);
        relCalcContainer.appendChild(searchArea2);

        // Calculates the relationship, returns the result
        var searchButton = document.createElement('div');
        searchButton.className = "button";
        searchButton.style.cursor = "pointer";
        searchButton.appendChild(document.createTextNode("Calculate"));


        //finds the given person
        function findPerson(personName: string, id: null|string=null) {
            for (var i = 0; i < data["structure_raw"].length; i++) {
                if ((displayName(data["structure_raw"][i]["name"]) == personName.toString()) ||
                (data["structure_raw"][i]["id"] == id)) {
                    return data["structure_raw"][i];
                }
            }
        }

        searchButton.onclick = function(_) {
            var person1 = findPerson(person.names[0], person.id);
            var person2 = findPerson((document.getElementById("searchtextP2") as HTMLInputElement).value);

            if (person1 == null || person2 == null) {
                showError("Names must be entered exactly and in full");
            }
            
            var names = displayFirstName(person1.name) + langArray["and"] + displayFirstName(person2.name);
            names += langArray["are"];
            var relationship = relationshipCalculator(person1.id, person2.id, data);

            (document.getElementById("relCalResponse") as HTMLElement).innerHTML = names + relationship;

        } 
            
        
        var responseText = document.createElement('p');
        responseText.id = "relCalResponse";
        responseText.style.padding = "5px";

        relCalcContainer.appendChild(document.createElement('br'));
        relCalcContainer.appendChild(searchButton);
        relCalcContainer.appendChild(document.createElement('br'));
        relCalcContainer.appendChild(responseText);


        container.appendChild(relCalcContainer);

        showInfoWindow({"text": container});
        setSearchEvents((document.getElementById("searchtextP2") as HTMLInputElement),
            (document.getElementById("searchlistP2") as HTMLElement), data, canvasView, false);
    }

    // Creates a link to the relationship calculator
    function relCalcLink(content: any) {
        var personLink = document.createElement('a');
        personLink.style.cursor = "pointer";
        var linkContent = document.createTextNode(content);
        personLink.appendChild(linkContent);

        personLink.addEventListener("click", function(event) {
            openRelCalc(curPerson);
        });

        personLink.style.color = "#2D89EF";
        return personLink;
    }

    function makeEventsPane() {
        // Initialize the data container
        var eventsDivContainer = document.createElement('div');
        eventsDivContainer.className = "detailRowcontainer";
        //eventsDivContainer.style.display = "table";
        eventsDivContainer.style.width = "100%";


        var rowGroupContainer = document.createElement('div');
        rowGroupContainer.style.display = "table";
        rowGroupContainer.style.width = "100%";

        var eventDiv = document.createElement('div');
        eventDiv.className = "detailRow1";
        eventDiv.style.display = "table";
        eventDiv.style.textAlign = "center";
        eventDiv.appendChild(relCalcLink(langArray["relationshipCalculator"]));
        eventsDivContainer.appendChild(eventDiv);



        // We use this to alternate div background colors. Using n-th child doesn't work too well,
        // since we go thru multiple exterior container divs
        var styleNumber = 0;


        // Creates the notes
        function makeNotes() {
            for (var i = 0; i < curPerson["notes"].length; i++) {
                var note = curPerson["notes"][i];
                var eventDiv = document.createElement('div');

                var divClass = (styleNumber == 0) ? "detailRow" : "detailRow1";
                styleNumber = (styleNumber == 0) ? 1 : 0; // Swap

                eventDiv.className = divClass;
                eventDiv.style.display = "table";

                var text = document.createElement('div');
                text.style.fontSize = "85%";
                text.style.lineHeight = "120%";
                text.style.padding = "5px";
                text.style.whiteSpace = "pre-wrap";

                text.appendChild(document.createTextNode(note));
                eventDiv.appendChild(text);
                eventsDivContainer.appendChild(eventDiv);
            }
        }
        makeNotes();

        // Run over each event
        for (var i = 0; i < curPerson["events"].length; i++) {
            var event = curPerson.events[i];

            var eventDiv = document.createElement('div');
            var divClass = (styleNumber == 0) ? "detailRow" : "detailRow1";
            styleNumber = (styleNumber == 0) ? 1 : 0; // Swap

            eventDiv.className = divClass;


            // Creates a field with a date and string
            function field(date: string, str: string|HTMLElement) {
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
            function relationship(relArray: any[]) {
                var relDiv = document.createElement('div');

                for (var i = 0; i < relArray.length; i++) {
                    // We make it text if it isn't already
                    var relNode = typeof relArray[i] == "string" ? document.createTextNode(relArray[i]) : relArray[i];
                    relDiv.appendChild(relNode);
                }

                return relDiv;
            }

            // Creates a link to another person
            function makePersonLink(personId: string) {
                var personLink = document.createElement('a');
                personLink.style.cursor = "pointer";
                var linkContent = document.createTextNode(displayName(structure[personId].name));
                personLink.appendChild(linkContent);
                (personLink as any)["linked_person_id"] = personId;

                personLink.addEventListener("click", function(event) {
                    canvasView.setFocus((event.currentTarget as any)["linked_person_id"]);
                });

                return personLink;
            }

            
            let dateStr;
            let birthDate;
            switch (event[event.length - 1]) { // We take the letter indicating event type
                case "B": // Birth
                    var birthInfo = document.createElement('span');
                    birthDate = event[0] || "";

                    // If we have a birth location, we parse it properly
                    var birthLocation = event[1] ? langArray["locatedIn"] + event[1] : "";
                    birthInfo.appendChild(document.createTextNode((langArray["born"] as any)[sex] + birthLocation));


                    
                    try {
                        let birthDateIso = dateToIso(birthDate);
                        dateStr = isoToLocale(birthDateIso, langArray["months"]);

                        if ((birthDate != "") && (birthDate != null)) {
                            let bd = new Date(birthDateIso);

                            let ageToday = new Date(Date.now() - bd.valueOf());
                            let yearsOld = Math.abs(ageToday.getUTCFullYear() - 1970);

                            // MS * Secs * Mins * Hours * Days
                            birthInfo.appendChild(
                                document.createTextNode(` (${yearsOld.toString()} ${langArray["yearsAgo"]})`));
                        }
                    } 
                    catch (e) {
                        dateStr = birthDate;
                    }

                    
                    field(dateStr, birthInfo);
                    break;

                case "D": // Death
                    var deathLocation = event[1] ? langArray["locatedIn"] + event[1] : "";
                    var deathType = event[2] ? " (" + event[2] + ")" : "";
                    var deathDate = event[0] || "";

                    var ageAtDeath = "";
                    let ageAtDeathStr = "";
                    if ((birthDate != "") && (birthDate != null) && (deathDate != "")) {
                        var dd = new Date(deathDate);
                        var bd = new Date(birthDate);
                        let ageApart = new Date(dd.valueOf() - bd.valueOf());
                        let ageAtDeath = Math.abs(ageApart.getUTCFullYear() - 1970);
                        // MS * Secs * Mins * Hours * Days
                        ageAtDeathStr = " (" + ageAtDeath.toString() + " " + langArray["yearsOld"] + ")";
                    }

                    try {
                        dateStr = isoToLocale(dateToIso(deathDate), langArray["months"]);
                    }
                    catch (e) {
                        dateStr = deathDate;
                    }

                    field(dateStr, (langArray["died"] as any)[sex] + deathLocation + deathType + ageAtDeathStr);
                    break;

                case "BUR": // Burial data
                    var burialDate = event[0] || "";
                    var burialLocation = event[1] ? langArray["locatedIn"] + event[1] : "";
                    var burialType = event[2] ? " (" + event[2] + ")" : "";
                    
                    field(burialDate, langArray["buried"][sex] + burialLocation + burialType);
                    break;

                case "OCC": // Occupation
                    var occupationType = event[1] ? " " + event[1] : "";
                    var occupationDate = event[0] || "";

                    field(occupationDate, langArray["occupation"] + ":" + occupationType);
                    break;

                case "M": // Marriage
                case "MARR":
                    var marriageLocation = event[2] ? langArray["locatedIn"] + event[2] : "";
                    var marriageLink = makePersonLink(event[1]);
                    
                    field(event[0], relationship([langArray["married"][sex], marriageLink, marriageLocation]));
                    break;

                case "DIV": // Divorce
                    var divorceLocation = event[2] ? langArray["locatedIn"] + event[2] : "";
                    var divorceLink = makePersonLink(event[1]);
                    
                    field(event[0], relationship([langArray["divorced"], divorceLink, divorceLocation]));
                    break;

                default: // Catch case
                    console.log("Could not parse event type" + event[event.length - 1]);
            }
            rowGroupContainer.appendChild(eventDiv);
        }
        eventsDivContainer.appendChild(rowGroupContainer);


        // Handle the pictures
        
        function makePictures() {
            for (var i = 0; i < curPerson["pics"].length; i++) {
                var picture = curPerson.pics[i];
                var eventDiv = document.createElement('div');

                var divClass = (styleNumber == 0) ? "detailRow" : "detailRow1";
                styleNumber = (styleNumber == 0) ? 1 : 0; // Swap

                eventDiv.className = divClass;
                eventDiv.style.display = "table";
                eventDiv.style.textAlign = "center";

                // Get the pictures set up
                function makePicture(src: string) {
                    var image = document.createElement('img');
                    image.onclick = function() { imgBox(this) };
                    image.style.width = "90%";
                    image.style.marginTop = "5%";
                    image.style.cursor = "pointer";
                    image.src = src;

                    eventDiv.appendChild(image);
                }

                makePicture(picture);
                eventsDivContainer.appendChild(eventDiv);
            }
        }
        
        makePictures();
        return eventsDivContainer;
    }


    container.appendChild(makeEventsPane());

    return {"text":container};
}




// Handles the canvasView
function View(data: any) {
    // Grabs the necessary parts
    var structure = data["structure"];
    var details = data["details"];


    // Gets the top ancestor possible (up to X generations)
    function getTopAncestor(personid: string, generations=4) {
        // Gets all the ancestors up to the given
        function getAncestorsInGen(person: string, gen: number): any {
            var result: any[] = [];

            // we're not going further, just return this person
            if (gen == 0) { 
                return [person];
            }
            
            if (person in structure) {
                // Gets the gens of each parent as well
                var parents = structure[person]["parents"];
                for (var j = parents.length - 1; j >= 0; j--) {
                    result = result.concat(getAncestorsInGen(parents[j], gen - 1));
                }
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
        animEase: 0.5,

        // initializes the canvas
        initCanvas: function() {
            // @ts-ignore
            this.canvas = document.getElementById("canvas");
            // @ts-ignore
            this.context = this.canvas.getContext("2d");
        },  

          ////////////////////////
         // MOUSE AND POSITION //
        ////////////////////////

        // Helper function for mousePosition and touchPosition
        // @ts-ignore
        parseEventPosition: function(event: any): number[] {
            // @ts-ignore
            var boundingRect = this.canvas.getBoundingClientRect();
            // @ts-ignore
            var x = (event.clientX - boundingRect.left) * (this.canvas.width / boundingRect.width);
            // @ts-ignore
            var y = (event.clientY - boundingRect.top) * (this.canvas.height / boundingRect.height);

            return [x, y];
        },


        // gets the true mouse position
        // @ts-ignore
        getMousePosition: function(event) { return this.parseEventPosition(event); },
        // Gets the touch position (for mobile devices)
        // @ts-ignore
        getTouchPosition: function(event) {
            // If this is the last touch
            if (event.touches.length == 0) {
                // @ts-ignore
                return [this.lastclickposx,this.lastclickposy];
            }
            return this.parseEventPosition(event.touches[0]);
        },

        // Animation for the dragging
        // @ts-ignore
        draggingAnim: function() {
            var elem: any = this;
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
        makeTree: function(nodeid: string) {
            var ancestor = getTopAncestor(nodeid);
            // Handle ancestor errors
            if (ancestor == null) {
                throw new Error();
                showError("No ancestor (" + nodeid + ") was found", true);
                return null;
            }
            return new Tree(structure, details, ancestor);
        },
        // @ts-ignore
        recreateTree: function() { this.setFocus(this.focusId); }, // we just set focus to current node, redraw tree

        // Gets the true screen center
        findScreenCenter: function() {
            var left = 0;
            var top = 0;
            // @ts-ignore
            var right = this.canvas.width;
            // @ts-ignore
            var bottom = this.canvas.height;

            // We take the infowindow into account here
            var infoWindow = (document.getElementById("infowindow") as HTMLElement);
            if (isVisible(infoWindow)) {
                // Check for mobile (infoWindow will never be this wide normally)
                // @ts-ignore
                if (infoWindow.offsetWidth >= this.canvas.width * 0.8) {
                    bottom -= infoWindow.offsetHeight;
                } 
                else { // normal case
                    right -= infoWindow.offsetWidth;
                }
            }

            return {"x": left + ((right - left) / 2), "y": top + ((bottom - top) / 2)}; 
        },

        setAncestors: function(node: PersonNode) {
            if (node == null) {
                return;
            }

            var ancestors = node.ancestors;
            for (var i = 0; i < ancestors.length; i++) {
                // @ts-ignore
                var ancestorNode = this.tree.lookupNodeById(ancestors[i][0]);
                if (ancestorNode != null) {
                    ancestorNode.ancestorFocus = true;
                }
            }

        }, 

        setFocus: function(node: string) {


            console.log(node);
            // @ts-ignore
            this.tree = this.makeTree(node);

            // @ts-ignore
            if (this.tree == null) { return; }


            // @ts-ignore
            var theNode = this.tree.lookupNodeById(node);
            if (theNode.redirects) {
                node = theNode.redirectsTo;
                this.setFocus(node);
                return;
            }

            this.setAncestors(theNode); // highlight ancestors
            // @ts-ignore
            this.focusId = node; // Focus on the given node
            window.location.hash = node; // Change window hash
            // @ts-ignore
            this.tree.position(this);

            var center = this.findScreenCenter();


            // @ts-ignore
            this.scrollx = this.targetx = center.x - theNode.getX() - (theNode.getWidth() / 2);
            // @ts-ignore
            this.scrolly = this.targety = center.y - theNode.getY() - (theNode.getHeight() / 2);
            
            theNode.inFocus = true;
            // @ts-ignore
            this.canvas.focus();
            this.redraw();

            if (isVisible(document.getElementById("infowindow") as HTMLElement)) {
                this.showDetailedView(node); // If the info window is open, update it
            }

        },
        setFocusPosition: function(node: string, x: number, y: number) {
            // @ts-ignore
            this.tree = this.makeTree(node);
            // @ts-ignore
            if (this.tree == null) {
                return;
            }
            // @ts-ignore
            this.tree.position(this);
            // @ts-ignore
            var theNode = this.tree.lookupNodeById(node);
            

            if (theNode.redirects) {
                node = theNode.redirectsTo;
                this.setFocus(node);
                return;
            }
            this.setAncestors(theNode);

            // @ts-ignore
            this.focusId = node;
            window.location.hash = node;

            // @ts-ignore
            this.scrollx = x - theNode.getX();
            // @ts-ignore
            this.scrolly = y - theNode.getY();
            
            theNode.inFocus = true;
            // @ts-ignore
            this.canvas.focus();
            this.redraw();

            if (isVisible(document.getElementById("infowindow") as HTMLElement)) {
                this.showDetailedView(node);
            }

            var center = this.findScreenCenter();
            // @ts-ignore
            this.targetx = center.x - theNode.getX() - (theNode.getWidth() / 2);
            // @ts-ignore
            this.targety = center.y - theNode.getY() - (theNode.getHeight() / 2);
            this.draggingAnim();
        },


        hitTest: function(mousePosition: number[]) {
            // @ts-ignore
            var hitTest = this.tree.hitTest(this, mousePosition[0], mousePosition[1]);
            var isHit = hitTest[0];
            var hitData = hitTest[1];

            if (isHit != null) {
                return ["node", hitData];
            }
            return ["none", null];
        },


        mouseUp: function(_: any, mousePosition: number[]) {
            // @ts-ignore
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
            // @ts-ignore
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
                // @ts-ignore
                this.setFocusPosition(node1.getId(), node1.getX() + this.scrollx, node1.getY() + this.scrolly);
            }
        },


        // DETAILS
        lookupDetails: function(personId: string, callback: any) {
            if (personId in details) {
                callback(details[personId]);
                return;
            }
        },
        showDetailedView: function(personId: string) {
            var thisEl = this;

            this.lookupDetails(personId, 
                function(thisDetails: any) {
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
            // @ts-ignore
            this.dragging = false;
            // @ts-ignore
            this.ismousedown = false;
            this.adjustVisibleArea();
        },
        // On mousemove
        // @ts-ignore
        mouseMove: function(buttons, mousePosition) {
            // @ts-ignore
            if (window.event) { buttons = window.event.button || buttons; }

            if (buttons == 0) { this.stopDragging(); } // if no longer holding

            // @ts-ignore
            var x = mousePosition[0] - this.lastclickposx;
            // @ts-ignore
            var y = mousePosition[1] - this.lastclickposy;

            // @ts-ignore
            if (this.dragging) {
                // @ts-ignore
                this.targetx = this.lastscrollposx + x;
                // @ts-ignore
                this.targety = this.lastscrollposy + y;
                this.draggingAnim();
            }
            // @ts-ignore
            else if (this.ismousedown) {
                if (Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2)) > mouseClickRadius) {
                    // @ts-ignore
                    this.dragging = true;
                }
            }
        },

        // On mousedown
        // @ts-ignore
        mouseDown: function(buttons, mousePosition) {
            // @ts-ignore
            this.lastclickposx = mousePosition[0];
            // @ts-ignore
            this.lastclickposy = mousePosition[1];
            // @ts-ignore
            this.lastscrollposx = this.scrollx;
            // @ts-ignore
            this.lastscrollposy = this.scrolly;

            var hitTest = this.hitTest(mousePosition);
            // @ts-ignore
            if (hitTest[0] == "none" && !this.dragging) { // Only start dragging if it isn't a node
                // @ts-ignore
                this.dragging = true;
            }
            // @ts-ignore
            this.ismousedown = true;
        },


        setCanvasSize: function() {
            var width = Math.min(window.outerWidth, window.innerWidth);
            var height = Math.min(window.outerHeight, window.innerHeight);

            // @ts-ignore
            this.canvas.width = width;
            // @ts-ignore
            this.canvas.height = height;
        },


        /// SCALING
        changeScale: function(newScale: number) {
            if (newScale > 2 || newScale < 0.2) {
                return;
            }
            scale = newScale;
            updateScale(scale); // takes care of our default variables
            [baseFont, detailFont].map(f => f.setSize(f.getBaseSize() * scale));

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


        init: function(intialPerson: string) {
            var curView = this;

            // Intitialize
            this.initCanvas();
            this.setCanvasSize();
            this.setFocus(intialPerson);

            // Event listeners
            // @ts-ignore
            this.canvas.addEventListener("mousedown", function(mEvent) { 
                    curView.mouseDown(mEvent.buttons, curView.getMousePosition(mEvent)); }, false);

            // @ts-ignore
            this.canvas.addEventListener("mouseup", function(mEvent){ 
                    curView.mouseUp(mEvent.buttons, curView.getMousePosition(mEvent)); }, false);

            // @ts-ignore
            this.canvas.addEventListener("mousemove", function(mEvent){ 
                    curView.mouseMove(mEvent.buttons, curView.getMousePosition(mEvent)); }, false);

            // @ts-ignore
            this.canvas.addEventListener("touchstart", function(mEvent){ 
                    curView.mouseDown(1, curView.getTouchPosition(mEvent));
                    mEvent.preventDefault(); // just to be safe
                    mEvent.stopPropagation(); }, false);

            // @ts-ignore
            this.canvas.addEventListener("touchend", function(mEvent){ 
                    curView.mouseUp(1, curView.getTouchPosition(mEvent)); 
                    mEvent.preventDefault();
                    mEvent.stopPropagation(); }, false);

            // @ts-ignore
            this.canvas.addEventListener("touchmove", function(mEvent){
                    curView.mouseMove(1, curView.getTouchPosition(mEvent)); 
                    mEvent.stopPropagation();
                    mEvent.preventDefault(); }, false);

            // KEY EVENT LISTENERS //
            // Finds the next relation in the groups given
            // @ts-ignore
            function upDown(relations, groupRelations) {
                if (relations.length > 0) {
                    return relations[0]; // If we can go up/down, target is the first one
                }
                else if (groupRelations && groupRelations.length > 0) {
                    return groupRelations[0]; // If they're grouped, the group has them
                }
            }

            // @ts-ignore
            function moveSiblings(lowerBound, upperBound, change) {
                var target = null;
                // @ts-ignore
                var node = curView.tree.lookupNodeById(curView.focusId);
                var groupUp = node.group ? node.group.ancestorsUp : null;
                var parentNode = upDown(node.ancestorsUp, groupUp) || null;


                if (parentNode) {
                    var siblings = parentNode.descendentsDown;
                    var index = siblings.indexOf(node);

                    if (index < 0 && node.group) { // Group case
                        index = siblings.indexOf(node.group);
                    }
                    if (index > lowerBound && index < (siblings.length + upperBound)) {
                        target = siblings[index + change]; // Get the sibling
                    }
                }
                return target;
            }

            // @ts-ignore
            function keyEventListeners(keyEvent){
                var target = null;

                // Don't mess w/ any system shortcuts (we use metaKey in case of macs)
                if (keyEvent.ctrlKey || keyEvent.altKey || keyEvent.metaKey) { return; }

                switch (keyEvent.keyCode) {
                    case 189: case 173: // MINUS (and the seperate FireFox minus keycode)
                        curView.zoomOut();
                        keyEvent.preventDefault(); break;

                    case 187: case 61: // PLUS (and FireFox's plus)
                        curView.zoomIn();
                        keyEvent.preventDefault(); break;

                    case 48: // Zero
                        curView.zeroOut();
                        keyEvent.preventDefault(); break

                    case 38: case 87: // up arrow and W
                        // @ts-ignore
                        var node = curView.tree.lookupNodeById(curView.focusId);
                        var groupUp = node.group ? node.group.ancestorsUp : null;
                        target = upDown(node.ancestorsUp, groupUp);
                        keyEvent.preventDefault(); break;

                    case 40: case 83: // Down arrow and S key
                        // @ts-ignore
                        var node = curView.tree.lookupNodeById(curView.focusId);
                        var groupDown = node.group ? node.group.descendentsDown : null;
                        target = upDown(node.descendentsDown, groupDown);
                        keyEvent.preventDefault(); break;

                    case 37: case 65: // Left arrow and A key
                        target = moveSiblings(0, 0, -1);
                        keyEvent.preventDefault();
                        break;

                    case 39: case 68: //  Right arrow and D key
                        target = moveSiblings(-1, -1, 1);
                        keyEvent.preventDefault();
                        break;

                        keyEvent.preventDefault(); break;

                    case 9: // Tab
                        // Switch spouses
                        // @ts-ignore
                        var node = curView.tree.lookupNodeById(curView.focusId);
                        if (node.group) {
                            var spouses = node.group.getMembers();
                            var currentIndex = spouses.indexOf(node);
                            if (currentIndex + 1 < spouses.length) {
                                target = spouses[currentIndex + 1];
                            }
                        }
                        
                        keyEvent.preventDefault(); break;
                }

                if (target != null) {
                    // @ts-ignore
                    var x = target.getX() + curView.scrollx;
                    // @ts-ignore
                    var y = target.getY() + curView.scrolly
                    curView.setFocusPosition(target.getId(), x, y);
                }
            }


            // @ts-ignore
            this.canvas.addEventListener("keydown", function(keyEvent) {
                keyEventListeners(keyEvent); }, false);

            window.addEventListener("resize", function(_){
                curView.setCanvasSize(); 
                curView.adjustVisibleArea();
                curView.redraw(); }, false);

            window.addEventListener("hashchange", function(_) {
                var hash = getHashString();
                if (hash == "") {
                    hash = intialPerson;
                }
                // @ts-ignore
                if (curView.focusId == hash) {
                    return;
                }
                curView.setFocus(hash); });
        },

        adjustVisibleArea: function() {
            var changed = false;
            // @ts-ignore
            var boundaries = this.tree.getBoundaries();


            // @ts-ignore
            if (boundaries[2] + this.scrollx < 0) {
                // @ts-ignore
                this.targetx = (this.canvas.width / 2) - boundaries[2];
                changed = true;
            }
            // @ts-ignore
            if (boundaries[3] + this.scrolly < 0) {
                // @ts-ignore
                this.targety = (this.canvas.height / 2) - boundaries[3];
                changed = true;
            }
            // @ts-ignore
            if (boundaries[0] + this.scrollx > this.canvas.width) {
                // @ts-ignore
                this.targetx = (this.canvas.width / 2) + boundaries[0];
                changed = true;
            }
            // @ts-ignore
            if (boundaries[1] + this.scrolly > this.canvas.height) {
                // @ts-ignore
                this.targety = (this.canvas.height / 2) - boundaries[1];
                changed = true;
            }

            if (changed) {
                this.draggingAnim();
            }
        },

        redraw: function() {
            // @ts-ignore
            this.context.clearRect(0, 0, canvas.width, canvas.height);

            // @ts-ignore
            if (this.tree != null) {
                // @ts-ignore
                this.tree.draw(this);
            }
        },
    }

    // Sets the default tree variables
    for (var i = 0; i < initialNull.length; i++) {
        // @ts-ignore
        initialDict[initialNull[i]] = null;
    }
    for (var i = 0; i < initialFalse.length; i++) {
        // @ts-ignore
        initialDict[initialFalse[i]] = false;
    }
    for (var i = 0; i < initialZero.length; i++) {
        // @ts-ignore
        initialDict[initialZero[i]] = 0;
    }

    return initialDict;
}

// Parses the hash
function parseHash(initPerson: string) {
    var showHelp = false;
    var initialPerson = initPerson;
    if (getHashString()) {
        if (getHashString().toLowerCase() == "help") {
            showHelp = true;
        }
        else {
            initialPerson = getHashString();
        }
    }
    return [showHelp, initialPerson];
}


// Shows the help window once fully loaded
function showHelp() {
    var helpInterval = setInterval(function() {
        if (document.readyState !== 'complete') {
            return;
        }

        clearInterval(helpInterval); // Kill the interval
        // Show the info window for help
        showInfoWindow({"text": (document.getElementById("helpDivHidden") as HTMLElement).cloneNode(true)});
    }, 200);
}


// @ts-ignore
function numPeople(data) {
    var num = Object.keys(data).length;
    (document.getElementById("numPeople") as HTMLElement).innerHTML = "<strong>" + num + "</strong> people in this tree";
}

function main() {
    // @ts-ignore
    loadData(function(data) {
        console.log("%cDone", "font-weight:bold; font-size: 1.2em;");
        fadeOut((document.getElementById("loadingwindow") as HTMLElement), 0.07); // fade out once we load all the data

        if (data == null) { showError("Data could not be loaded", true); return; }

        var canvasView = View(data);
        personSearch(data, canvasView);

        var initialPerson = "@I0000@";
        if (!(initialPerson in data["structure"])) {
            initialPerson = Object.keys(data["structure"])[0];
        }

        var hashParsed = parseHash(initialPerson);

        // @ts-ignore
        canvasView.init(hashParsed[1]); // Initialize with the initial user

        // If the hash requires help:
        if (hashParsed[0]) {
            showHelp();
        }

        numPeople(data["structure"]);
    });
    
}


