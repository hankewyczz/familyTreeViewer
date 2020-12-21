"use strict";
// Creates the text for each node
function makeNodeText(person) {
    // Splits between the forenames and surnames
    let names = person["name"].split("/", 2);
    // Joins them with a linebreak in between the two
    let result = [baseFont, names.join("\n")];
    // If we have birth/death data, we append it to the result
    const sex = person["sex"].toUpperCase();
    let langArray = getLang();
    // Parses the date and place into a string
    function parseDatePlace(datePlace, eventWord) {
        let datePlaceStr = datePlace[0];
        // If we have a location, add it
        datePlaceStr += (datePlace[1]) ? `,${langArray["locatedIn"]}${datePlace[1]}` : "";
        return (datePlaceStr == "") ? null : [detailFont, `\n${eventWord} ${datePlaceStr}`];
    }
    let eventStrs = [parseDatePlace(person["birth"], langArray["born"][sex]),
        parseDatePlace(person["death"], langArray["died"][sex])];
    for (let str of eventStrs) {
        if (str !== null) {
            result = result.concat(str);
        }
    }
    return result;
}
// Generates a node
class PersonNode {
    constructor(_person, pDetails) {
        this.person = _person;
        this.details = pDetails;
        this.text = makeNodeText(_person); // Generates the text for this node
        this.textDimensions = null;
        this.imageScaling = scale;
        this.bgColor = { "m": "#ACE2F2", "f": "#F8AFD7", "": "#d3d3d3" }; // background colors
        this.sidePadding = 20 * this.imageScaling;
        this.x = 0;
        this.y = 0;
        this.ancestorsUp = []; // Top ancestor(s) a level up (ie. first parent)
        this.descendentsDown = []; // Direct children a level down
        this.generation = 0; // generation
        this.mod = 0; // if we need to shift the cell to fit
        this.parentsHidden = false; // Are the parents hidden?
        this.childrenHidden = false; // Are the children hidden?
        this.inFocus = false; // Is this the node currently in focus
        this.ancestorFocus = false; // Is this node the ancestor of the currently focused node?
        this.group = null; // by default we have no group
        this.redirects = pDetails.redirects;
        this.redirectsTo = pDetails.redirectsTo;
        this.ancestors = pDetails.ancestors;
    }
    // Returns the interior node
    getInteriorNodeById(_) {
        return this;
    }
    // Establishes relations (determines if any are hidden)
    areRelationsShown(structure) {
        // Gets the list of parents and children currently shown
        let displayParents = this.ancestorsUp.map(ancestor => ancestor.getIds()).flat();
        let displayKids = this.descendentsDown.map(desc => desc.getIds()).flat();
        // Are any of this person's parents/children currently not being shown?
        this.parentsHidden = structure[this.getId()].parents.some(p => !displayParents.includes(p));
        this.childrenHidden = structure[this.getId()].children.some(k => !displayKids.includes(k));
    }
    getChildConnectorPoint() {
        let newX = this.x + this.getWidth() / 2;
        let newY = this.y + this.getHeight() + nodeBorderMargin;
        return [newX, newY];
    }
    getParentConnectorPoint() {
        let newX = this.x + this.getWidth() / 2;
        let newY = this.y - nodeBorderMargin;
        return [newX, newY];
    }
    getId() {
        return this.person.id;
    }
    getIds() {
        return [this.person.id];
    }
    // unused
    //getText : function () { return _text; },
    // Positioning
    getX() {
        return this.x;
    }
    getY() {
        return this.y;
    }
    setX(newX) {
        this.x = newX;
    }
    setY(newY) {
        this.y = newY;
    }
    getPos() {
        return [this.x, this.y];
    }
    setPos(newX, newY) {
        this.setX(newX);
        this.setY(newY);
    }
    // Dimension calculations
    getScaling() {
        return this.imageScaling;
    }
    setScaling(newScale) {
        this.imageScaling = newScale;
    }
    // Dimensions
    getWidth() {
        return this.calcDimensions()[0];
    }
    getHeight() {
        return this.calcDimensions()[1];
    }
    calcDimensions(canvasView) {
        if (this.textDimensions == null) {
            if (typeof canvasView === 'undefined') {
                throw new Error("Cannot determine dimensions without a given canvas view");
            }
            let dimensions = renderText(this.text, canvasView, this.x, this.y, false);
            let width = dimensions[0] + (this.sidePadding * 2);
            let height = dimensions[1];
            this.textDimensions = [width, height];
        }
        return this.textDimensions;
    }
    getRect(canvasView) {
        let dimensions = this.calcDimensions(canvasView);
        let width = dimensions[0];
        let height = dimensions[1];
        return [this.x + canvasView.scrollx - nodeBorderMargin,
            this.y + canvasView.scrolly - nodeBorderMargin,
            width + nodeBorderMargin * 2,
            height + nodeBorderMargin * 2]; // Height
    }
    // TODO - CanvasView class
    // TODO - scrap hitTest
    hitTest(canvasView, x, y) {
        let rect = this.getRect(canvasView);
        let x1 = rect[0]; // left bounds
        let y1 = rect[1]; // top bounds
        let x2 = x1 + rect[2];
        let y2 = y1 + rect[3];
        let isHit = (x <= x2 && x >= x1) && (y <= y2 && y >= y1); // Checks if within bounds
        return [isHit, ["goto", this]];
    }
    draw(canvasView) {
        let x = this.getX() + canvasView.scrollx;
        let y = this.getY() + canvasView.scrolly;
        let rect = this.getRect(canvasView);
        let rectX = rect[0];
        let rectY = rect[1];
        let width = rect[2];
        let height = rect[3];
        // If offscreen, don't bother drawing, just return
        if (x > canvasView.canvas.width || y > canvasView.canvas.height ||
            x + width < 0 || y + height < 0) {
            return;
        }
        // Draws the rectangle
        canvasView.context.fillStyle = this.bgColor[this.person["sex"]];
        canvasView.context.fillRect(rectX, rectY, width, height);
        renderText(this.text, canvasView, x + this.sidePadding, y, true);
        // Defaults
        let lineWidth = (this.inFocus || this.ancestorFocus) ? 3 : 1;
        let color = "#000";
        // Special colors
        if (this.inFocus || this.ancestorFocus) {
            color = this.inFocus ? "#FF0" : "#DD0";
        }
        canvasView.context.lineWidth = lineWidth;
        canvasView.context.strokeStyle = color;
        canvasView.context.strokeRect(rectX, rectY, width, height);
        // Draws the images
        const dim = 15 * this.getScaling();
        if (this.parentsHidden || this.childrenHidden) {
            let image;
            if (this.parentsHidden && !this.childrenHidden) {
                image = imageIcons.upArrow;
            }
            else if (!this.parentsHidden && this.childrenHidden) {
                image = imageIcons.downArrow;
            }
            else if (this.parentsHidden && this.childrenHidden) {
                image = imageIcons.doubleArrow;
            }
            image.width = dim;
            canvasView.context.drawImage(image, x + this.getWidth() - dim, y, dim, dim);
        }
        // What should we use as the user image?
        if (this.details["pics"].length > 0) {
            canvasView.context.drawImage(loadImage(this.details["pics"][0]), x, y, dim, dim);
        }
        else if (this.details["notes"].length > 0) {
            /* If we have any notes and NO custom image, denote it with the notes icon */
            canvasView.context.drawImage(imageIcons.notes, x, y, dim, dim);
        }
    }
    drawLines(canvasView) {
        for (let desc of this.descendentsDown) {
            drawParentLine(canvasView, this, desc);
        }
    }
}
function NodeGroup(_nodes) {
    var imageScaling = scale;
    var spousalSpacing = 20 * imageScaling;
    var minHeight = 0;
    function reposition(_) {
        for (var i = 1; i < _nodes.length; i++) {
            // the X of the prev + width + the extra spousalSpacing
            _nodes[i].setX(_nodes[i - 1].getX() + _nodes[i - 1].getWidth() + spousalSpacing);
            _nodes[i].setY(_nodes[i - 1].getY());
        }
    }
    var prevDimensions = null;
    var nodeGroupDict = {
        ancestorsUp: [],
        descendentsDown: [],
        generation: 0,
        mod: 0,
        getInteriorNodeById: function (nodeId) {
            for (var i = 0; i < _nodes.length; i++) {
                if (_nodes[i].getId() == nodeId) {
                    return _nodes[i];
                }
            }
            return null;
        },
        areRelationsShown: function (structure) {
            for (let node of _nodes) {
                node.areRelationsShown(structure);
            }
            // Gets the displayed group
            function displayedGroup(group) {
                var displayGroup = [];
                for (var j = 0; j < group.length; j++) {
                    displayGroup = displayGroup.concat(group[j].getIds());
                }
                return displayGroup;
            }
            // Checks if any people in the group are NOT displayed
            function anyHidden(group, displayedGroup) {
                return group.some(p => !displayedGroup.includes(p));
            }
            for (var i = 0; i < _nodes.length; i++) {
                _nodes[i].group = this; // set each nodes group to this
                // Deal w/ parent relationships
                var parents = structure[_nodes[i].getId()].parents;
                var displayParents = displayedGroup(this.ancestorsUp);
                // Determine if this node's parents are hidden
                _nodes[i].parentsHidden = anyHidden(parents, displayParents);
                // Deal w/ children relationships
                var children = structure[_nodes[i].getId()].children;
                var displayChildren = displayedGroup(this.descendentsDown);
                // Determine if this node's children are hidden
                _nodes[i].childrenHidden = anyHidden(children, displayChildren);
                // Get all of the children of this node
                for (var j = 0; j < this.descendentsDown.length; j++) {
                    // @ts-ignore
                    var childId = this.descendentsDown[j].getId();
                    var parentId = _nodes[i].getId();
                    if (structure[parentId].children.indexOf(childId) >= 0) {
                        addUnique(this.descendentsDown[j], _nodes[i].descendentsDown);
                    }
                }
            }
        },
        getParentConnectorPoint: function () { return _nodes[0].getParentConnectorPoint(); },
        getId: function () { return _nodes[0].getId(); },
        getIds: function () { return _nodes.map(n => n.getId()); },
        getMembers: function () { return _nodes; },
        getText: function () { return ""; },
        getX: function () { return _nodes[0].getX(); },
        getY: function () { return _nodes[0].getY(); },
        setX: function (newX) {
            _nodes[0].setX(newX);
            // @ts-ignore
            reposition();
        },
        setY: function (newY) {
            _nodes[0].setY(newY);
            // @ts-ignore
            reposition();
        },
        getPos: function () { return [_nodes[0].getX(), _nodes[0].getY()]; },
        setPos: function (newX, newY) {
            _nodes[0].setX(newX);
            _nodes[0].setY(newY);
        },
        // Dimension calculations
        getScaling: function () { return _nodes[0].getScaling(); },
        setScaling: function (newScale) { _nodes[0].setScaling(newScale); },
        getWidth: function () {
            return this.calcDimensions()[0];
        },
        getHeight: function () {
            return this.calcDimensions()[1];
        },
        calcDimensions: function (canvasView) {
            if (prevDimensions == null) {
                for (var i = 0; i < _nodes.length; i++) {
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
        hitTest: function (canvasView, x, y) {
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
        draw: function (canvasView) {
            var lineWidth = 10 * scale; // Spouse line
            var y = this.getY() + (minHeight / 2); // Minheight make sure we work w/ the smallest one (ie. we fit all)
            var x2 = this.getX() + this.getWidth();
            simpleLine(canvasView, this.getX(), y, x2, y, lineWidth, "#777");
            for (var i = 0; i < _nodes.length; i++) {
                _nodes[i].draw(canvasView);
            }
        },
        drawLines: function (canvasView) {
            _nodes[0].drawLines(canvasView);
            for (var i = 2; i < _nodes.length; i++) { // For multiple spouses
                _nodes[i].drawLines(canvasView);
            }
        }
    };
    return nodeGroupDict;
}
function Layout(person, structure, details) {
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
            var newNode = new PersonNode(structure[person], details[person]);
            mappedNodes[person] = newNode;
        }
        else {
            var spouseList = [person].concat(getSpouses(person)); // well, spouses and the given person
            // @ts-ignore
            var newNode = NodeGroup(spouseList.map(p => new PersonNode(structure[p], details[p])));
            for (let p of spouseList) {
                mappedNodes[p] = newNode;
            }
        }
        newNode.generation = generation;
        // Parents
        if (getParents(person).length > 0) {
            if (getParents(person)[0] in mappedNodes) {
                // @ts-ignore
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
                // @ts-ignore
                newNode.descendentsDown = children.map(c => makeNode(c, generation + 1));
            }
        }
        newNode.areRelationsShown(structure);
        return newNode;
    }
    // Equalize the vertical spacing, so that each generation is on the same level
    function verticalSpacing(canvasView, nodeList) {
        // We get the max height per generation, so they're all aligned
        var maxHeights = {};
        for (let node of nodeList) {
            var height = node.calcDimensions(canvasView)[1];
            // @ts-ignore
            maxHeights[node.generation] = Math.max(maxHeights[node.generation] || 0, height);
        }
        var sumHeights = { 0: 0 }; // calculate the summed heights
        for (var i = 1; i in maxHeights; i++) {
            // @ts-ignore
            sumHeights[i] = sumHeights[i - 1] + maxHeights[i - 1] + verticalMargin;
        }
        for (var i = -1; i in maxHeights; i--) {
            // @ts-ignore
            sumHeights[i] = sumHeights[i + 1] - maxHeights[i] - verticalMargin;
        }
        for (var i = 0; i < nodeList.length; i++) {
            // Establish the new position (using the same X as before)
            // @ts-ignore
            nodeList[i].setPos(nodeList[i].getPos()[0], sumHeights[nodeList[i].generation]);
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
            console.log("Top level - no siblings");
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
        for (var i = 0; i < upDown.length, upDown[i] != node; i++) {
            var siblingContour = getRightContour(upDown[i]);
            for (var j = node.generation + 1; j in leftContour && j in siblingContour; j++) {
                // @ts-ignore
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
        for (let desc of node.descendentsDown) {
            calculateInitialX(desc);
        }
        if (isNodeLeaf(node)) {
            if (isNodeLeftmost(node)) {
                node.setX(0); // The leftmost leaf is our 0 point
            }
            else {
                node.setX(getPrevSibling(node).getX() + getPrevSibling(node).getWidth() + horizontalMargin);
            }
        }
        else {
            var lastChild = node.descendentsDown[node.descendentsDown.length - 1];
            var left = node.descendentsDown[0].getX(); // Gets the first child
            var right = lastChild.getX() + lastChild.getWidth(); // Right side of the last child
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
        for (let desc of node.descendentsDown) {
            calculateFinalPos(desc, modSum);
        }
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
    var layoutDict = {
        getBoundaries: function () { return boundaries; },
        lookupNodeById: function (personid) {
            if (personid in mappedNodes) {
                return mappedNodes[personid];
            }
            else {
                return null;
            }
        },
        nodes: makeNode(person, 0),
        position: function (canvasView) {
            verticalSpacing(canvasView, flattenTree(this.nodes));
            calculateInitialX(this.nodes);
            calculateFinalPos(this.nodes, 0);
        }
    };
    return layoutDict;
}
