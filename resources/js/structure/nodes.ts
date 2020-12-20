// Parses the optional birth/death data
function makeBirthDeathText(person: PersonStructure): string[] {
    let langArray: any = getLang();

    // Parses the date and place into a string
    function parseDatePlace(dateAndPlace: string[], eventWord: string): string {
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
function makeNodeText(person: PersonStructure): string[] {
    let splitName = person["name"].split("/")
    // Split between non-surnames and surnames
    let names = [splitName[0].trim(), splitName[1].trim()];

    // Filter out null/undefined names
    names = names.filter(e => e)

    // Set the font and text
    let result = [baseFont, names.join("\n")];

    // Now, we handle the optional birth/death data
    return result.concat(makeBirthDeathText(person));
}



// Generates a node
class PersonNode {
    person: PersonStructure;
    details: PersonDetails;
    id: string;
    text: string[];
    textDimensions: null|number[];
    imageScaling: number;
    sidePadding: number;
    bgColor: {[key: string]: string };
    x: number;
    y: number;
    ancestorsUp: PersonNode[];
    descendentsDown: PersonNode[];
    generation: number;
    mod: number;
    parentsHidden: boolean;
    childrenHidden: boolean;
    inFocus: boolean;
    ancestorFocus: boolean;
    group: PersonNodeGroup | null;
    redirects: boolean;
    redirectsTo: string;
    ancestors: Array<Array<number | string>>;



    constructor(person: PersonStructure, pDetails: PersonDetails) {
        this.person = person;
        this.details = pDetails;
        this.id = this.person.id;

        this.text = makeNodeText(person); // Generates the text for this node
        this.textDimensions = null;

        this.imageScaling = scale;
        this.sidePadding = 20 * this.imageScaling;

        this.bgColor = {"m": "#ACE2F2", "f": "#F8AFD7", "": "#d3d3d3"}; // background colors

        // Location
        this.x = 0;
        this.y = 0;

        this.ancestorsUp = [];       // Top ancestor(s) a level up (ie. first parent)
        this.descendentsDown = [];   // Direct children a level down
        this.generation = 0;         // What generation is this person on?
        this.mod = 0;                // If we need to shift the cell to fit
        this.parentsHidden = false;  // Are the parents hidden?
        this.childrenHidden = false; // Are the children hidden?
        this.inFocus = false;        // Is this the node currently in focus
        this.ancestorFocus = false;  // Is this node the ancestor of the currently focused node?
        this.group = null;           // by default we have no group
        this.redirects = pDetails.redirects;
        this.redirectsTo = pDetails.redirectsTo;
        this.ancestors = pDetails.ancestors;
    }

    // Inherited from PersonNodeGroup
    getInteriorNodeById(_: any): PersonNode {
        return this;
    }

    // Establishes relations (determines if any are hidden)
    areRelationsShown(structure: {  [key: string]: PersonStructure }): void {
        // Gets the list of parents and children currently shown
        let displayParents = this.ancestorsUp.map(ancestor => ancestor.getIds()).flat();
        let displayKids = this.descendentsDown.map(desc => desc.getIds()).flat();

        // Are any of this person's parents/children currently not being shown?
        this.parentsHidden = structure[this.id].parents.some(p => !displayParents.includes(p));
        this.childrenHidden = structure[this.id].children.some(k => !displayKids.includes(k));
    }

    getChildConnectorPoint(): number[] {
        let newX = this.x + this.getWidth() / 2;
        let newY = this.y + this.getHeight() + nodeBorderMargin;
        return [newX, newY];
    }

    getParentConnectorPoint(): number[] {
        let newX = this.x + this.getWidth() / 2;
        let newY = this.y - nodeBorderMargin;
        return [newX, newY];
    }

    getId(): string {
        return this.person.id;
    }

    getIds(): string[] {
        return [this.person.id];
    }

    // Positioning
    getX(): number {
        return this.x;
    }
    getY(): number {
        return this.y;
    }
    setX(newX: number) {
        this.x = newX;
    }
    setY(newY: number) {
        this.y = newY;
    }
    getPos() {
        return [this.x, this.y];
    }
    setPos(newX: number, newY: number) {
        this.setX(newX);
        this.setY(newY);
    }

    // Dimension calculations
    getScaling() {
        return this.imageScaling;
    }
    setScaling(newScale: number) {
        this.imageScaling = newScale;
    }
    getWidth() {
        return this.calcDimensions()[0];
    }
    getHeight() {
        return this.calcDimensions()[1];
    }
    calcDimensions(canvasView = null) {
        if (this.textDimensions == null) {
            let dimensions = renderText(this.text, canvasView, this.x, this.y, false);
            let width = dimensions[0] + (this.sidePadding * 2);
            let height = dimensions[1];
            this.textDimensions = [width, height];
        }

        return this.textDimensions;
    }

    getRect(canvasView: any) {
        let dimensions = this.calcDimensions(canvasView);
        let width = dimensions[0];
        let height = dimensions[1];

        return [this.x + canvasView.scrollx - nodeBorderMargin, // X
            this.y + canvasView.scrolly - nodeBorderMargin, // Y
            width + nodeBorderMargin * 2, // Width
            height + nodeBorderMargin * 2]; // Height
    }

    hitTest(canvasView: any, x: number, y: number) {
        let rect = this.getRect(canvasView);
        let x1 = rect[0]; // left bounds
        let y1 = rect[1]; // top bounds
        let x2 = x1 + rect[2];
        let y2 = y1 + rect[3];

        let isHit = (x <= x2 && x >= x1) && (y <= y2 && y >= y1); // Checks if within bounds
        return [isHit, ["goto", this]];
    }

    draw(canvasView: any) {
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
        let color = "#000"

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
            let image: HTMLImageElement;
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
        } else if (this.details["notes"].length > 0) {
            /* If we have any notes and NO custom image, denote it with the notes icon */
            canvasView.context.drawImage(imageIcons.notes, x, y, dim, dim);
        }
    }

    drawLines(canvasView: any) {
        for (let desc of this.descendentsDown) {
            drawParentLine(canvasView, this, desc);
        }
    }
}



// A group of nodes (representing a spousal relationship)
class PersonNodeGroup {
    nodes: PersonNode[];
    imageScaling: number;
    spousalSpacing: number;
    minHeight: number;
    prevDimensions: null | number[];
    ancestorsUp: PersonNode[];
    descendentsDown: PersonNode[];
    generation: number;
    mod: number;

    constructor(_nodes: PersonNode[]) {
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
            let startX = this.nodes[i-1].getX() + this.nodes[i-1].getWidth();
            this.nodes[i].setX(startX + this.spousalSpacing);   // Don't forget the spacing!
            this.nodes[i].setY(this.nodes[i-1].getY());         // Y is constant for the group
        }
    }

    getInteriorNodeById(nodeId: string) {
        let matchingId = this.nodes.filter(n => n.getId() === nodeId);
        // If we get a hit, return it. Otherwise, return null
        return matchingId.length >= 1 ? matchingId[0] : null;
    }

    areRelationsShown(structure: {  [key: string]: PersonStructure }) {
        for (let node of this.nodes) {
            node.group = this; // set each nodes group to this

            // Deal w/ parent relationships
            let parents = structure[node.getId()].parents;
            let displayParents = this.ancestorsUp.map(g => g.getIds()).flat()
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

    getParentConnectorPoint() {
        return this.nodes[0].getParentConnectorPoint();
    }


    getId() {
        return this.nodes[0].getId()
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
    setX(newX: number) {
        this.nodes[0].setX(newX);
        this.reposition();
    }
    setY(newY: number) {
        this.nodes[0].setY(newY);
        this.reposition();
    }
    getPos() {
        return [this.nodes[0].getX(),this.nodes[0].getY()];
    }
    setPos(newX: number, newY: number) {
        this.nodes[0].setX(newX);
        this.nodes[0].setY(newY);
    }


    // Dimension calculations
    getScaling() {
        return this.nodes[0].getScaling();
    }
    setScaling(newScale: number) {
        this.nodes[0].setScaling(newScale);
    }
    getWidth() {
        return this.calcDimensions()[0];
    }
    getHeight() {
        return this.calcDimensions()[1];
    }

    calcDimensions(canvasView = null) {
        if (this.prevDimensions == null) {
            for (let node of this.nodes) {
                node.calcDimensions(canvasView);
            }

            // We reposition after all of the dimensions have been recalculated
            this.reposition();
            let left = this.nodes[0].getX();
            let right = this.nodes[this.nodes.length - 1].getX() +  // X position of the last node
                this.nodes[this.nodes.length - 1].getWidth();       // Width of the last node

            let heights = this.nodes.map(n => n.getHeight());
            let maxHeight = Math.max(...heights);
            this.minHeight = Math.min(...heights);

            let width = right - left;

            this.prevDimensions = [width, maxHeight];
        }
        return this.prevDimensions;
    }

    hitTest(canvasView: any, x: number, y: number) {
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

    draw(canvasView: any) {
        let lineWidth = 10 * scale; // Spouse line
        let y = this.getY() + (this.minHeight / 2); // Minheight make sure we work w/ the smallest one (ie. we fit all)
        let x2 = this.getX() + this.getWidth();

        simpleLine(canvasView, this.getX(), y, x2, y, lineWidth, "#777");

        for (let node of this.nodes) {
            node.draw(canvasView);
        }
    }

    drawLines(canvasView: any) {
        this.nodes[0].drawLines(canvasView);

        for (let i = 2; i < this.nodes.length; i++) { // For multiple spouses
            this.nodes[i].drawLines(canvasView);
        }
    }
}








function Layout(person, structure, details) {
    // Utility functions
    function getSpouses(person) {
        return structure[person].spouses; }
    function getParents(person) { return structure[person].parents; }
    function getChildren(person) { return structure[person].children; }


    var mappedNodes = {}; // Initialize the nodes

    // Makes the modes
    function makeNode(person, generation) {
        if (person in mappedNodes) {
            return mappedNodes[person]; // The node already exists, just return it
        }

        // Spouses
        if (getSpouses(person).length === 0) { // No spouses
            var newNode = new PersonNode(structure[person], details[person]);
            mappedNodes[person] = newNode;
        } 
        else {
            var spouseList = [person].concat(getSpouses(person)); // well, spouses and the given person
            var newNode = new PersonNodeGroup(spouseList.map(p => new PersonNode(structure[p], details[p])));

            spouseList.map(p => { mappedNodes[p] = newNode;});
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
        newNode.areRelationsShown(structure);
        return newNode;
    }


    // Equalize the vertical spacing, so that each generation is on the same level
    function verticalSpacing(canvasView, nodeList) {
        // We get the max height per generation, so they're all aligned
        var maxHeights = {};
        map(function(n) {
            var height = n.calcDimensions(canvasView)[1];
            maxHeights[n.generation] = Math.max(maxHeights[n.generation] || 0, height);
        }, nodeList);


        var sumHeights = {0: 0}; // calculate the summed heights
        for (var i = 1; i in maxHeights; i++) {
            sumHeights[i] = sumHeights[i-1] + maxHeights[i-1] + verticalMargin;
        }

        for (var i = -1; i in maxHeights; i--) {
            sumHeights[i] = sumHeights[i+1] - maxHeights[i] - verticalMargin;
        }

        for (var i = 0; i < nodeList.length; i++) {
            // Establish the new position (using the same X as before)
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
        for (var i = 0; i < upDown.length, upDown[i] != node; i++) {
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