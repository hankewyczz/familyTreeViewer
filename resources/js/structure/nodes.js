"use strict";
// Parses the optional birth/death data
function makeBirthDeathText(person) {
    let langArray = getLang();
    // Parses the date and place into a string
    function parseDatePlace(dateAndPlace, eventWord) {
        let dateStr = dateAndPlace[0];
        // If we have a location, we add it (otherwise, add nothing)
        dateStr += dateAndPlace[1] ? `,${langArray["locatedIn"]}${dateAndPlace[1]}` : "";
        // If we have a year OR location, we formalize this into a statement with the given word
        return (dateStr !== "") ? `\n${eventWord} ${dateStr.trim()}` : "";
    }
    let sex = person["sex"].toUpperCase();
    let infoStrs = [parseDatePlace(person["birth"], langArray["born"][sex]),
        parseDatePlace(person["death"], langArray["died"][sex])];
    // Filter out null/undefined info
    infoStrs = infoStrs.filter(e => e !== "");
    // Add the font information
    return infoStrs.map(infoStr => [detailFont, infoStr]).flat();
}
// Creates the text for each node
function makeNodeText(person) {
    let splitName = person["name"].split("/");
    // Split between non-surnames and surnames
    let names = [splitName[0].trim(), splitName[1].trim()];
    // Filter out null/undefined names
    names = names.filter(e => e);
    // Set the font and text
    let result = [baseFont, names.join("\n")];
    // Now, we handle the optional birth/death data
    return result.concat(makeBirthDeathText(person));
}
// Generates a node
class PersonNode {
    constructor(person, pDetails) {
        this.person = person;
        this.details = pDetails;
        this.id = this.person.id;
        this.text = makeNodeText(person); // Generates the text for this node
        this.textDimensions = null;
        this.imageScaling = scale;
        this.sidePadding = 20 * this.imageScaling;
        this.bgColor = { "m": "#ACE2F2", "f": "#F8AFD7", "": "#d3d3d3" }; // background colors
        // Location
        this.x = 0;
        this.y = 0;
        this.ancestorsUp = []; // Top ancestor(s) a level up (ie. first parent)
        this.descendentsDown = []; // Direct children a level down
        this.generation = 0; // What generation is this person on?
        this.mod = 0; // If we need to shift the cell to fit
        this.parentsHidden = false; // Are the parents hidden?
        this.childrenHidden = false; // Are the children hidden?
        this.inFocus = false; // Is this the node currently in focus
        this.ancestorFocus = false; // Is this node the ancestor of the currently focused node?
        this.group = null; // by default we have no group
        this.redirects = pDetails.redirects;
        this.redirectsTo = pDetails.redirectsTo;
        this.ancestors = pDetails.ancestors;
    }
    // Inherited from PersonNodeGroup
    getInteriorNodeById(_) {
        return this;
    }
    // Establishes relations (determines if any are hidden)
    areRelationsShown(structure) {
        // Gets the list of parents and children currently shown
        let displayParents = this.ancestorsUp.map(ancestor => ancestor.getIds()).flat();
        let displayKids = this.descendentsDown.map(desc => desc.getIds()).flat();
        // Are any of this person's parents/children currently not being shown?
        this.parentsHidden = structure[this.id].parents.some(p => !displayParents.includes(p));
        this.childrenHidden = structure[this.id].children.some(k => !displayKids.includes(k));
    }
    getChildConnectorPoint() {
        let width = this.getWidth();
        let height = this.getHeight();
        let newX = this.x + width / 2;
        let newY = this.y + height + nodeBorderMargin;
        return [newX, newY];
    }
    getParentConnectorPoint() {
        let width = this.getWidth();
        if (width === null) {
            throw new Error("Null dimensions");
        }
        let newX = this.x + width / 2;
        let newY = this.y - nodeBorderMargin;
        return [newX, newY];
    }
    getId() {
        return this.person.id;
    }
    getIds() {
        return [this.person.id];
    }
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
    getWidth() {
        //@ts-ignore
        return this.calcDimensions()[0];
    }
    getHeight() {
        //@ts-ignore
        return this.calcDimensions()[1];
    }
    calcDimensions(canvasView) {
        if (this.textDimensions == null) {
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
            if (this.parentsHidden && this.childrenHidden) {
                image = imageIcons.doubleArrow;
            }
            else if (this.parentsHidden) {
                image = imageIcons.upArrow;
            }
            else {
                image = imageIcons.downArrow;
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
// A group of nodes (representing a spousal relationship)
class PersonNodeGroup {
    constructor(_nodes) {
        this.nodes = _nodes;
        this.imageScaling = scale;
        this.spousalSpacing = 20 * this.imageScaling;
        this.minHeight = 0;
        this.prevDimensions = null;
        this.ancestorsUp = [];
        this.descendentsDown = [];
        this.generation = 0;
        this.mod = 0;
    }
    // Ensures that the group is properly scaled relative to the first node
    // We store everything display-wise in the first node, and then adjust the rest to match here
    reposition() {
        for (let i = 1; i < this.nodes.length; i++) {
            // The x-coord of the previous node, plus the width of the previous node
            let width = this.nodes[i - 1].getWidth();
            if (width === null) {
                throw new Error("Null dimensions");
            }
            let startX = this.nodes[i - 1].getX() + width;
            this.nodes[i].setX(startX + this.spousalSpacing); // Don't forget the spacing!
            this.nodes[i].setY(this.nodes[i - 1].getY()); // Y is constant for the group
        }
    }
    getInteriorNodeById(nodeId) {
        let matchingId = this.nodes.filter(n => n.getId() === nodeId);
        // If we get a hit, return it. Otherwise, return null
        return matchingId.length >= 1 ? matchingId[0] : null;
    }
    areRelationsShown(structure) {
        for (let node of this.nodes) {
            node.group = this; // set each nodes group to this
            // Deal w/ parent relationships
            let parents = structure[node.getId()].parents;
            let displayParents = this.ancestorsUp.map(g => g.getIds()).flat();
            node.parentsHidden = parents.some(p => !displayParents.includes(p));
            // Deal w/ children relationships
            let children = structure[node.getId()].children;
            let displayChildren = this.descendentsDown.map(g => g.getIds()).flat();
            node.childrenHidden = children.some(c => !displayChildren.includes(c));
            // Get all of the children of this node
            for (let child of this.descendentsDown) {
                // We check if this child of the Group is also a child of this Node
                if (structure[node.getId()].children.includes(child.getId())) {
                    // If it is, then the child is visible - add it to the node
                    addUnique(child, node.descendentsDown);
                }
            }
        }
    }
    getChildConnectorPoint() {
        return this.nodes[0].getChildConnectorPoint();
    }
    getParentConnectorPoint() {
        return this.nodes[0].getParentConnectorPoint();
    }
    getId() {
        return this.nodes[0].getId();
    }
    getIds() {
        return this.nodes.map(n => n.getId());
    }
    getMembers() {
        return this.nodes;
    }
    getX() {
        return this.nodes[0].getX();
    }
    getY() {
        return this.nodes[0].getY();
    }
    setX(newX) {
        this.nodes[0].setX(newX);
        this.reposition();
    }
    setY(newY) {
        this.nodes[0].setY(newY);
        this.reposition();
    }
    getPos() {
        return [this.nodes[0].getX(), this.nodes[0].getY()];
    }
    setPos(newX, newY) {
        this.nodes[0].setX(newX);
        this.nodes[0].setY(newY);
    }
    // Dimension calculations
    getScaling() {
        return this.nodes[0].getScaling();
    }
    setScaling(newScale) {
        this.nodes[0].setScaling(newScale);
    }
    getWidth() {
        //@ts-ignore
        return this.calcDimensions()[0];
    }
    getHeight() {
        //@ts-ignore
        return this.calcDimensions()[1];
    }
    calcDimensions(canvasView) {
        if (this.prevDimensions == null) {
            for (let node of this.nodes) {
                node.calcDimensions(canvasView);
            }
            // We reposition after all of the dimensions have been recalculated
            this.reposition();
            let left = this.nodes[0].getX();
            let right = this.nodes[this.nodes.length - 1].getX() + // X position of the last node
                this.nodes[this.nodes.length - 1].getWidth(); // Width of the last node
            let heights = this.nodes.map(n => n.getHeight());
            let maxHeight = Math.max(...heights);
            this.minHeight = Math.min(...heights);
            let width = right - left;
            this.prevDimensions = [width, maxHeight];
        }
        return this.prevDimensions;
    }
    hitTest(canvasView, x, y) {
        for (let node of this.nodes) {
            let nodeHit = node.hitTest(canvasView, x, y);
            let isHit = nodeHit[0];
            let value = nodeHit[1];
            if (isHit) {
                return [isHit, value];
            }
        }
        return [false, "none"];
    }
    draw(canvasView) {
        let lineWidth = 10 * scale; // Spouse line
        let y = this.getY() + (this.minHeight / 2); // Minheight make sure we work w/ the smallest one (ie. we fit all)
        let x2 = this.getX() + this.getWidth();
        simpleLine(canvasView, this.getX(), y, x2, y, lineWidth, "#777");
        for (let node of this.nodes) {
            node.draw(canvasView);
        }
    }
    drawLines(canvasView) {
        this.nodes[0].drawLines(canvasView);
        for (let i = 2; i < this.nodes.length; i++) { // For multiple spouses
            this.nodes[i].drawLines(canvasView);
        }
    }
}
class Layout {
    constructor(person, structure, details) {
        this.person = person;
        this.structure = structure;
        this.details = details;
        this.mappedNodes = {}; // Initialize the nodes
        this.boundaries = null;
        this.nodes = this.makeNode(person, 0);
    }
    // Utility functions
    // Returns an array of this person's spouses
    getSpouses(person) {
        return this.structure[person].spouses;
    }
    getParents(person) {
        return this.structure[person].parents;
    }
    getChildren(person) {
        return this.structure[person].children;
    }
    // Makes the nodes
    makeNode(person, generation) {
        if (person in this.mappedNodes) {
            return this.mappedNodes[person]; // The node already exists, just return it
        }
        let newNode;
        if (this.getSpouses(person).length === 0) {
            // This person has no spouses - they're not a PersonNodeGroup
            newNode = new PersonNode(this.structure[person], this.details[person]);
            this.mappedNodes[person] = newNode;
        }
        else {
            let personList = [person].concat(this.getSpouses(person));
            let nodes = personList.map(p => new PersonNode(this.structure[p], this.details[p]));
            newNode = new PersonNodeGroup(nodes);
            // Update the mapped list
            personList.map(p => { this.mappedNodes[p] = newNode; });
        }
        newNode.generation = generation;
        // Generate the parents as well
        let parents = this.getParents(person);
        if (parents.length > 0) {
            // TODO - is this check necessary?
            if (parents[0] in this.mappedNodes) {
                newNode.ancestorsUp = [this.makeNode(parents[0], generation - 1)];
            }
        }
        else {
            newNode.ancestorsUp = [];
        }
        // Children
        let children = this.getChildren(person);
        if (children.length > 0) {
            // Should we display this, or is it out of the generation limit?
            if (Math.abs(generation) < generationLimit) {
                newNode.descendentsDown = children.map(c => this.makeNode(c, generation + 1));
            }
        }
        // Generate the relationship indicators (hidden children/parents)
        newNode.areRelationsShown(this.structure);
        return newNode;
    }
    // Equalize the vertical spacing, so that each generation is on the same level
    verticalSpacing(canvasView, nodeList) {
        // We get the max height per generation, so they're all aligned
        let maxHeights = {};
        for (let node of nodeList) {
            let gen = node.generation;
            maxHeights[gen] = Math.max(maxHeights[gen] || 0, node.getHeight());
        }
        // calculate the summed heights
        let sumHeights = { 0: 0 };
        for (let i = 1; i in maxHeights; i++) {
            // The bottom x-coord of the row below + the height of the row below + the margin
            sumHeights[i] = sumHeights[i - 1] + maxHeights[i - 1] + verticalMargin;
        }
        // Ditto, but for any rows below generation 0
        // Todo - is this still necessary?
        for (let i = -1; i in maxHeights; i--) {
            sumHeights[i] = sumHeights[i + 1] - maxHeights[i] - verticalMargin;
        }
        for (let node of nodeList) {
            // Establish the new position (using the same X as before)
            node.setPos(node.getX(), sumHeights[node.generation]);
        }
    }
    isNodeLeaf(node) {
        // If we have no descendants, its a leaf
        return node.descendentsDown.length == 0;
    }
    isNodeLeftmost(node) {
        // If we have no direct ancestors, it must be the top (and technically leftmost)
        if (node.ancestorsUp.length == 0) {
            return true;
        }
        // Are we the first descendent of our first ancestor? If so, we're leftmost
        return node.ancestorsUp[0].descendentsDown[0] == node;
    }
    getPrevSibling(node) {
        if (node.ancestorsUp.length > 0) {
            let position = node.ancestorsUp[0].descendentsDown.indexOf(node);
            return node.ancestorsUp[0].descendentsDown[position - 1];
        }
        else {
            console.log("Top level - no siblings");
        }
    }
    getLeftContour(node) {
        function leftHelper(n, values, modSum) {
            let gen = n.generation;
            let val = n.getX() + modSum;
            values[gen] = (gen in values) ? Math.min(val, values[gen]) : val;
            for (let desc of n.descendentsDown) {
                leftHelper(desc, values, modSum + n.mod);
            }
        }
        let values = {};
        leftHelper(node, values, 0);
        return values;
    }
    getRightContour(node) {
        function rightHelper(n, values, modSum) {
            let gen = n.generation;
            let val = n.getX() + n.getWidth() + modSum;
            values[gen] = (gen in values) ? Math.min(val, values[gen]) : val;
            modSum += n.mod;
            for (let desc of n.descendentsDown) {
                rightHelper(desc, values, modSum);
            }
        }
        let values = {};
        rightHelper(node, values, 0);
        return values;
    }
    // Check for subtree conflicts, and recalculate
    // TODO - refactor this
    checkForConflicts(node) {
        // Distance between subtrees (eg. cousins)
        let subtreeSpacing = 30 * scale;
        let shift = 0; // How much more we need to shift these nodes over
        let leftContour = this.getLeftContour(node);
        if (node.ancestorsUp.length == 0) {
            return; // if we're at the top of the tree, we've got nothing to do
        }
        for (let curNode of node.ancestorsUp[0].descendentsDown) { // or There and Back Again
            // We don't care about this node
            if (curNode == node) {
                continue;
            }
            let siblingContour = this.getRightContour(curNode);
            for (let j = node.generation + 1; j in leftContour && j in siblingContour; j++) {
                let distance = leftContour[j] - siblingContour[j];
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
                leftContour = this.getLeftContour(node); // After adjustment, update the contour of the changed nodes
            }
        }
    }
    // Calculate the initial X position of a node
    calculateInitialX(node) {
        node.descendentsDown.map(n => this.calculateInitialX(n));
        if (this.isNodeLeaf(node)) {
            if (this.isNodeLeftmost(node)) {
                node.setX(0); // The leftmost leaf is our 0 point
            }
            else {
                // This node isn't leftmost, so it must have a previous sibling
                let prevSibling = this.getPrevSibling(node);
                node.setX(prevSibling.getX() + prevSibling.getWidth() + horizontalMargin);
            }
        }
        else {
            let lastChild = node.descendentsDown[node.descendentsDown.length - 1];
            const left = node.descendentsDown[0].getX(); // Gets the first child
            const right = lastChild.getX() + lastChild.getWidth(); // Right side of the last child
            const mid = (left + right) / 2;
            if (this.isNodeLeftmost(node)) {
                node.setX(mid - (node.getWidth() / 2));
            }
            else {
                // We checked - this must have a previous sibling
                let prevSibling = this.getPrevSibling(node);
                // We can calculate it using the sibling here
                node.setX(prevSibling.getX() + prevSibling.getWidth() + horizontalMargin);
                node.mod = node.getX() - mid + node.getWidth() / 2;
            }
        }
        // If we have kids, and this isn't the leftmost node, we have to work around it
        if (node.descendentsDown.length > 0 && !this.isNodeLeftmost(node)) {
            this.checkForConflicts(node);
        }
    }
    calculateFinalPos(node, modSum) {
        node.setX(node.getX() + modSum); // Update the X
        modSum += node.mod;
        node.descendentsDown.map(n => this.calculateFinalPos(n, modSum));
        let x1 = node.getX();
        let y1 = node.getY();
        let x2 = node.getX() + node.getWidth();
        let y2 = node.getY() + node.getHeight();
        if (this.boundaries != null) {
            // We get the outer point for all
            x1 = Math.min(x1, this.boundaries[0]);
            y1 = Math.min(y1, this.boundaries[1]);
            x2 = Math.max(x2, this.boundaries[2]);
            y2 = Math.max(y2, this.boundaries[3]);
        }
        // Update the boundaries
        this.boundaries = [x1, y1, x2, y2];
    }
    getBoundaries() {
        return this.boundaries;
    }
    lookupNodeById(person_id) {
        if (person_id in this.mappedNodes) {
            return this.mappedNodes[person_id];
        }
        else {
            return null;
        }
    }
    position(canvasView) {
        this.verticalSpacing(canvasView, flattenTree(this.nodes));
        this.calculateInitialX(this.nodes);
        this.calculateFinalPos(this.nodes, 0);
    }
}
