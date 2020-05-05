function parseName(names) {
    var forenames = [];
    var surnames = []
    var inSurname = false;
    // Seperates the name into fore/sur-name arrays
    for (var i = 0; i < names.length; i++) {
        if (names[i].startsWith("/")) {
            inSurname = true;
        }

        if (inSurname) {
            surnames.push(displayName(names[i]));
        }
        else {
            forenames.push(displayName(names[i]));
        }
    }
    return [forenames, surnames];
}

// Parses the date and place into a string
function parseDatePlace(date) {
    var str = date[0];
    if (date[1]) {
        str += " in " + date[1];
    }
    return str.trim();
}

function makeNodeText(person) {
    var birthStr = parseDatePlace(person["birth"]);
    var deathStr = parseDatePlace(person["death"]);

    var names = parseName(person["name"].split(" "));


    var formattedName = names[0].join(" ");
    if (names[1].length > 0 && names[0].length > 0) { // Include forenames - if none, it's all on one line
        formattedName += "\n";
    }
    
    formattedName += names[1].join(" ");

    // If we have birth/death data, we append it to the result 
    var result = [baseFont, formattedName]; // Base name
    if (birthStr) {
        result = result.concat([detailFont, "\nBorn "+birthStr]);
    }
    if (deathStr) {
        result = result.concat([detailFont, "\nDied "+deathStr]);
    }

    return result;
}






// Generates a node
function Node(_person) {
    var text = makeNodeText(_person); // Generates the text for this node
    var textDimensions = null;
    var imageScaling = scale;

    var bgColor = {"m": "#ACE2F2", "f": "#F8AFD7", "": "#d3d3d3"}; // background colors
    var sidePadding = 20 * imageScaling;
    
    var x = 0;
    var y = 0;

    nodeDict =  {
        ancestorsUp : [], // Top ancestor(s) a level up (ie. first parent)
        descendentsDown : [], // Direct children a level down
        generation : 0, // generation
        mod : 0, // if we need to shift the cell to fit
        parentsHidden: false, // Are the parents hidden?
        childrenHidden: false, // Are the children hidden?
        inFocus: false, // Is this the node currently in focus
        group: null, // by default we have no group

        // Returns the interior node
        getInteriorNodeById: function(_) { return this; },

        // Establishes relations (determines if any are hidden)
        relationships: function(structure) {
            var parents = structure[this.getId()].parents; // gets this person's parents
            var displayParents = [];

            for (var i = 0; i < this.ancestorsUp.length; i++) {
                displayParents = displayParents.concat(this.ancestorsUp[i].getIds()); // add to displayParents if shown
            }
            
            for (var i = 0; i < parents.length; i++) {
                if (displayParents.indexOf(parents[i]) < 0) {
                    this.parentsHidden = true; // If a parent is not in displayParents, we have a hidden one
                }
            }
                
            // Same thing, but for children 
            var children = structure[this.getId()].children;
            var displayChildren = [];

            for (var j = 0; j < this.descendentsDown.length; j++) {
                displayChildren = displayChildren.concat(this.descendentsDown[j].getIds());
            }

            for (var j = 0; j < children.length; j++)
                if (displayChildren.indexOf(children[j])<0)
                    this.childrenHidden = true;
        },

        getChildConnectorPoint: function() {
            var ax = x + this.getWidth() / 2;
            var ay = y + this.getHeight() + nodeBorderMargin;
            return [ax, ay];
        },

        getParentConnectorPoint: function() {
            var ax = x + this.getWidth() / 2;
            var ay = y - nodeBorderMargin;
            return [ax, ay];
        },

        getId : function() { return _person.id; },
        getIds : function() { return [_person.id]; },

        getText : function () { return _text; },


        // Positioning
        getX: function () { return x; },
        getY: function() { return y; },
        setX: function(newX) { x = newX; },
        setY: function(newY) { y = newY; },
        getPos : function() { return [x,y]; },
        setPos : function(newX, newY) {
            x = newX;
            y = newY;
        },


        // Dimension calculations
        getScaling: function() { return imageScaling; },
        setScaling: function(newScale) { imageScaling = newScale; },
        getWidth : function() { return this.calcDimensions()[0]; },
        getHeight : function() { return this.calcDimensions()[1]; },
        calcDimensions : function(canvasView) {
            if (textDimensions == null) {
                var dimensions = renderText(text, canvasView, x, y, false);
                var width = dimensions[0] + (sidePadding * 2);
                var height = dimensions[1];
                textDimensions = [width, height];
            }

            return textDimensions;
        },


        getRect : function(canvasView) {
            var dimensions = this.calcDimensions(canvasView);
            var width = dimensions[0];
            var height = dimensions[1];

            return [x + canvasView.scrollx - nodeBorderMargin, // X
                    y + canvasView.scrolly - nodeBorderMargin, // Y
                    width + nodeBorderMargin * 2, // Width
                    height + nodeBorderMargin * 2]; // Height
        },

        hitTest : function(canvasView, x, y) {
            var rect = this.getRect(canvasView);
            var rectX = rect[0]; // left bounds
            var rectY = rect[1]; // top bounds
            var width = rect[2];
            var height = rect[3];

            var right = rectX + width;
            var bottom = rectY + height;

            var isHit = (x <= right) && (x >= rectX) &&
            (y <= bottom) && (y >= rectY);

            var hitResult = [isHit, ["goto", this]];
            
            if (x < rectX + sidePadding || x > right - sidePadding) {
                hitResult = [isHit, ["info", this]];
            }

            return hitResult;
        },

        draw : function(canvasView) {
            var x = this.getX() + canvasView.scrollx;
            var y = this.getY() + canvasView.scrolly;


            var rect = this.getRect(canvasView);
            var rectX = rect[0];
            var rectY = rect[1];
            var width = rect[2];
            var height = rect[3];

            // If offscreen, don't bother drawing, just return
            if (x > canvasView.canvas.width || y > canvasView.canvas.height || 
                x + width < 0 || y + height < 0) {
                return ;
            }



            // Draws the rectangle
            function drawRect() {
                canvasView.context.fillStyle = bgColor[_person["sex"]]; // Fills with the above colors
                canvasView.context.fillRect(rectX, rectY, width, height);
                renderText(text, canvasView, x + sidePadding, y, true); // Renders the text
            }


            // Draws the images
            function drawImages(dim) {
                if (this.parentsHidden || this.childrenHidden) {
                    if (this.parentsHidden && !this.childrenHidden) {
                        var image = imageIcons.upArrow;
                    }
                    else if (!this.parentsHidden && this.childrenHidden) {
                        var image = imageIcons.downArrow;
                    }
                    else if (this.parentsHidden && this.childrenHidden) {
                        var image = imageIcons.doubleArrow;
                    }

                    image.width = dim;
                    canvasView.context.drawImage(image, x + this.getWidth() - dim, y, dim, dim);
                }

                
                if (_person["pics"].length > 0) {
                    // Icon image - we just use the first one
                    canvasView.context.drawImage(loadImage(_person["pics"][0]), x, y, dim, dim);
                }
                else { // Default icon
                    canvasView.context.drawImage(imageIcons.defaultPerson, x, y, dim, dim);
                }
            }

            drawRect();
            drawImages(15 * this.getScaling());

            if (this.inFocus) { // The focused node
                canvasView.context.lineWidth = 3;
                canvasView.context.strokeStyle = "#FFFF00";
                canvasView.context.strokeRect(rectX + 1, rectY + 1, width - 2, height - 2);    
            }
            else {
                canvasView.context.lineWidth = 1;
                canvasView.context.strokeStyle = "#000000";
                canvasView.context.strokeRect(rectX, rectY, width, height);    
            }
        },

        drawLines : function(canvasView) {
            for (var i = 0; i < this.descendentsDown.length; i++) {
                drawParentLine(canvasView, this, this.descendentsDown[i]);
            }
        },
    }

    return nodeDict;
}


function NodeGroup(_nodes) {
    var imageScaling = scale;
    var spousalSpacing = 20 * imageScaling;
    var minHeight = 0;

    function reposition(_) {
        for (var i = 1; i < _nodes.length; i++) {
            // the X of the prev + width + the extra spousalSpacing
            _nodes[i].setX(_nodes[i-1].getX() + _nodes[i-1].getWidth() + spousalSpacing);
            _nodes[i].setY(_nodes[i-1].getY());
        }
    }

    var prevDimensions = null;

    var nodeGroupDict = {
        ancestorsUp : [],
        descendentsDown : [],
        generation : 0,
        mod : 0,

        getInteriorNodeById: function(nodeId) {
            for (var i = 0; i < _nodes.length; i++) {
                if (_nodes[i].getId() == nodeId) {
                    return _nodes[i];
                }
            }
            return null;
        },

        relationships: function(structure) {
            for (var i = 0; i < _nodes.length; i++) {
                _nodes[i].group = this; // set each nodes group to this

                // Deal w/ parent relationships                
                var displayParents = [];
                for (var j = 0; j < this.ancestorsUp.length; j++) {
                    displayParents = displayParents.concat(this.ancestorsUp[j].getIds());
                }

                // Determine if this node's parents are hidden
                map(function(p) {
                    if (displayParents.indexOf(p) < 0) { _nodes[i].parentsHidden = true; } 
                }, structure[_nodes[i].getId()].parents);


                // Deal w/ children relationships
                var displayChildren = [];
                for (var j = 0; j < this.descendentsDown.length; j++) {
                    displayChildren = displayChildren.concat(this.descendentsDown[j].getIds());
                }

                // Determine if this node's children are hidden
                map(function(c) {
                    if (displayChildren.indexOf(c) < 0) { _nodes[i].childrenHidden = true; } 
                }, structure[_nodes[i].getId()].children);

                // Get all of the children of this node
                for (var j = 0; j < this.descendentsDown.length; j++) {
                    var childId = this.descendentsDown[j].getId()
                    var parentId = _nodes[i].getId();
                    if (structure[parentId].children.indexOf(childId)>=0) {
                        addUnique(this.descendentsDown[j], _nodes[i].descendentsDown);
                    }
                }
            }
        },

        getParentConnectorPoint: function() { return _nodes[0].getParentConnectorPoint(); },


        getId : function() { return _nodes[0].getId(); },
        getIds : function() { return map(function(n) { return n.getId(); }, _nodes); },
        getMembers : function() { return _nodes; },


        getText : function() { return ""; },
        getX: function() { return _nodes[0].getX(); },
        getY: function() { return _nodes[0].getY(); },
        setX: function(newX) {
            _nodes[0].setX(newX);
            reposition();
        },
        setY: function(newY) {
            _nodes[0].setY(newY);
            reposition();
        },
        getPos : function() { return [_nodes[0].getX(),_nodes[0].getY()]; },
        setPos : function(newX, newY) {
            _nodes[0].setX(newX);
            _nodes[0].setY(newY);
        },


        // Dimension calculations
        getScaling: function() { return _nodes[0].getScaling(); },
        setScaling: function(newScale) { _nodes[0].setScaling(newScale); },
        getWidth : function() { return this.calcDimensions()[0]; },
        getHeight : function() { return this.calcDimensions()[1]; },

        calcDimensions : function(canvasView) {
            if (prevDimensions == null) {
                for (var i=0; i<_nodes.length; i++) {
                    _nodes[i].calcDimensions(canvasView);
                }
                // We reposition after all of the dimensions have been recalculated

                reposition(canvasView);
                var left = _nodes[0].getX();
                var right = _nodes[_nodes.length - 1].getX() + _nodes[_nodes.length - 1].getWidth();

                

                var maxHeight = 0;
                for (var i = 0; i < _nodes.length; i++) {
                    maxHeight = Math.max(maxHeight, _nodes[i].getHeight());
                }

                var width = right - left;
                var height = maxHeight;

                prevDimensions = [width, height];

                minHeight = _nodes[0].getHeight();
                for (var i = 1; i < _nodes.length; i++) {
                    minHeight = Math.min(minHeight, _nodes[i].getHeight());
                }
            }
            return prevDimensions;
        },

        hitTest : function(canvasView, x, y) {
            for (var i = 0; i < _nodes.length; i++) {
                var nodeHit = _nodes[i].hitTest(canvasView, x, y);
                var isHit = nodeHit[0];
                var value = nodeHit[1];

                if (isHit) {
                    return [isHit, value];
                }
            }
            return [false, "none"];
        },

        draw : function(canvasView) {
            var lineWidth = 10 * scale; // Spouse line
            var y = this.getY() + (minHeight / 2); // Minheight make sure we work w/ the smallest one (ie. we fit all)
            var x2 = this.getX() + this.getWidth();

            simpleLine(canvasView, this.getX(), y, x2, y, lineWidth, "#777");

            for (var i = 0; i < _nodes.length; i++) {
                _nodes[i].draw(canvasView);
            }
        },

        drawLines : function(canvasView) {
            _nodes[0].drawLines(canvasView);

            for (var i = 2; i < _nodes.length; i++) { // For multiple spouses
                _nodes[i].drawLines(canvasView);
            }
        }
    }
    return nodeGroupDict;
}








function Layout(person, structure) {
    /* Tree structure from  https://rachel53461.wordpress.com/2014/04/20/algorithm-for-drawing-trees/
    Based on https://pastebin.com/SxkjJauX */


    // Utility functions
    function getSpouses(person) { return structure[person].spouses; }
    function getParents(person) { return structure[person].parents; }
    function getChildren(person) { return structure[person].children; }


    var mappedNodes = {}; // Initialize the nodes

    // Makes the modes
    function makeNode(person, generation) {
        if (person in mappedNodes) {
            return mappedNodes[person]; // The node already exists, just return it
        }

        // Spouses
        if (getSpouses(person).length == 0) { // No spouses
            var newNode = Node(structure[person]);
            mappedNodes[person] = newNode;
        } 
        else {
            var spouseList = [person].concat(getSpouses(person)); // well, spouses and the given person
            var newNode = NodeGroup(map(function(p) { return Node(structure[p]) }, spouseList));

            map(function(p) { mappedNodes[p] = newNode; }, spouseList);
        }

        newNode.generation = generation;

        // Parents
        if (getParents(person).length > 0) {
            if (getParents(person)[0] in mappedNodes) {
                newNode.ancestorsUp = [makeNode(getParents(person)[0], generation - 1)];
            }
        }
        else {
            newNode.ancestorsUp = [];
        }
        
        // Children
        var children = getChildren(person);
        if (children.length > 0) {
            if (Math.abs(generation) < generationLimit) {
                newNode.descendentsDown = [];
                map(function(c) { newNode.descendentsDown.push(makeNode(c, generation + 1)); }, children);
            }
        }
        newNode.relationships(structure);
        return newNode;
    }


    // Equalize the vertical spacing, so that each generation is on the same level
    function verticalSpacing(canvasView, nodeList) {
        // We get the max height per generation, so they're all aligned
        var maxHeights = {};
        for (var i = 0; i < nodeList.length; i++) {
            var dimensions = nodeList[i].calcDimensions(canvasView);
            var width = dimensions[0];
            var height = dimensions[1];
            maxHeights[nodeList[i].generation] = Math.max(maxHeights[nodeList[i].generation] || 0, height);
        }

        var sumHeights = {0: 0}; // calculate the summed heights
        for (var i = 1; i in maxHeights; i++) {
            sumHeights[i] = sumHeights[i-1] + maxHeights[i-1] + verticalMargin;
        }

        for (var i = -1; i in maxHeights; i--) {
            sumHeights[i] = sumHeights[i+1] - maxHeights[i] - verticalMargin;
        }

        for (var i = 0; i < nodeList.length; i++) {
            var position = nodeList[i].getPos();
            // Establish the new position
            nodeList[i].setPos(position[0], sumHeights[nodeList[i].generation]);
        }
    }


    function isNodeLeaf(node) {
        // If we have no descendants, its a leaf
        return node.descendentsDown.length == 0;
    }


    function isNodeLeftmost(node) {
        if (node.ancestorsUp.length == 0) {
            return true; 
        }
        return node.ancestorsUp[0].descendentsDown[0] == node;
    }

    function getPrevSibling(node) {
        if (node.ancestorsUp.length > 0) {
            var position = node.ancestorsUp[0].descendentsDown.indexOf(node);
            return node.ancestorsUp[0].descendentsDown[position - 1];
        }
        else {
            console.log("Top level - no siblings")
        }
    }

    function getLeftContour(node) {
        function leftContourHelper(node, values, modSum) {
            if (node.generation in values) {
                values[node.generation] = Math.min(values[node.generation], node.getX() + modSum);
            }
            else {
                values[node.generation] = node.getX() + modSum;
            }

            modSum += node.mod;
            for (var i = 0; i < node.descendentsDown.length; i++) {
                leftContourHelper(node.descendentsDown[i], values, modSum);
            }
        }
        var values = {};
        leftContourHelper(node, values, 0);
        return values;
    }

    function getRightContour(node) {
        function rightContourHelper(node, values, modSum) {
            if (node.generation in values) {
                values[node.generation] = Math.max(values[node.generation], node.getX() + node.getWidth() + modSum);
            }
            else {
                values[node.generation] = node.getX() + node.getWidth() + modSum;
            }

            modSum += node.mod;
            for (var i = 0; i < node.descendentsDown.length; i++) {
                rightContourHelper(node.descendentsDown[i], values, modSum);
            }
        }
        var values = {};
        rightContourHelper(node, values, 0);
        return values;
    }

    // Check for subtree conflicts, and recalculate
    function checkForConflicts(node) {
        // Distance between subtrees (eg. cousins)
        var subtreeSpacing = 30 * scale;
        var shift = 0; // How much more we need to shift these nodes over
        var leftContour = getLeftContour(node);

        if (node.ancestorsUp.length == 0) {
            return; // if we're at the top of the tree, we've got nothing to do
        }

        var upDown = node.ancestorsUp[0].descendentsDown; // or There and Back Again
        for (var i=0; i < upDown.length, upDown[i] != node; i++) {
            var siblingContour = getRightContour(upDown[i]);

            for (var j = node.generation + 1; j in leftContour && j in siblingContour; j++) {
                var distance = leftContour[j] - siblingContour[j];
                // If we need to make up the difference here, we boost shift
                if (distance + shift < subtreeSpacing) {
                    shift = subtreeSpacing - distance;
                }
            }
            // We set and reset shift here
            if (shift > 0) {
                node.setX(node.getX() + shift); // Update the X coordinate
                node.mod += shift; // Alter mod
                shift = 0;
                leftContour = getLeftContour(node); // After adjustment, update the contour of the changed nodes
            }
        }
    }

    
    // Calculate the initial X position of a node
    function calculateInitialX(node) {
        map(function(n) { calculateInitialX(n); }, node.descendentsDown);

        if (isNodeLeaf(node)) {
            if (isNodeLeftmost(node)) {
                node.setX(0); // The leftmost leaf is our 0 point
            }
            else {
                node.setX(getPrevSibling(node).getX() + getPrevSibling(node).getWidth() + horizontalMargin);
            }
        } 

        else {
            var lastChild = node.descendentsDown[node.descendentsDown.length-1];

            var left = node.descendentsDown[0].getX(); // Gets the first child
            var right = lastChild.getX() + lastChild.getWidth();  // Right side of the last child
            var mid = (left + right) / 2;

            if (isNodeLeftmost(node)) {
                node.setX(mid - (node.getWidth() / 2));
            }
            else {
                var prevSibling = getPrevSibling(node);
                // We can calculate it using the sibling here
                node.setX(prevSibling.getX() + prevSibling.getWidth() + horizontalMargin);
                node.mod = node.getX() - mid + node.getWidth() / 2;
            }
        }

        // If we have kids, and this isn't the leftmost node, we have to work around it
        if (node.descendentsDown.length > 0 && !isNodeLeftmost(node)) {
            checkForConflicts(node);
        }
    }

    var boundaries = null;

    function calculateFinalPos(node, modSum) {
        node.setX(node.getX() + modSum); // Update the X
        modSum += node.mod;

        map(function(n) { calculateFinalPos(n, modSum); }, node.descendentsDown);

        var x1 = node.getX();
        var y1 = node.getY();
        var x2 = node.getX() + node.getWidth();
        var y2 = node.getY() + node.getHeight();

        if (boundaries != null) {
            // We get the outer point for all
            x1 = Math.min(x1, boundaries[0]);
            y1 = Math.min(y1, boundaries[1]);
            x2 = Math.max(x2, boundaries[2]);
            y2 = Math.max(y2, boundaries[3]);
        }
        // Update the boundaries
        boundaries = [x1, y1, x2, y2];
    }


    var layoutDict =  {
        getBoundaries: function() { return boundaries; }, // Returns the boundaries
        lookupNodeById: function(personid) { // Gets us the node by ID if it exists
            if (personid in mappedNodes) { 
                return mappedNodes[personid];
            }
            else {
                return null;
            }
        },
        nodes: makeNode(person, 0), // Start with the base person, generation 0
        position : function(canvasView) {
            verticalSpacing(canvasView, flattenTree(this.nodes));
            calculateInitialX(this.nodes);
            calculateFinalPos(this.nodes, 0);
        }
    }

    return layoutDict;
}