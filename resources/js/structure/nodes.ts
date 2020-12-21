// An interface for either a single person node, or a group of nodes (spousal group)
interface INode {
    // Fields
    ancestorsUp: INode[];
    descendentsDown: INode[];
    generation: number;
    mod: number;

    // Methods
    getInteriorNodeById: (_: string) => (INode | null);
    areRelationsShown: (structure: { [key: string]: PersonStructure }) => void;
    getChildConnectorPoint: () => number[];
    getParentConnectorPoint: () => number[];
    getId: () => string;
    getIds: () => string[];
    getX: () => number;
    getY: () => number;
    setX: (newX: number) => void;
    setY: (newY: number) => void;
    getPos: () => number[];
    setPos: (newX: number, newY: number) => void;
    getScaling: () => number;
    setScaling: (newScale: number) => void;
    getWidth: () => number;
    getHeight: () => number;
    calcDimensions: (canvasView?: any) => number[];
    hitTest: (canvasView: any, x: number, y: number) => any[];
    draw: (canvasView: any) => void;
    drawLines: (canvasView: any) => void;
}



// Creates the text for each node
function makeNodeText(person: PersonStructure) {
    // Splits between the forenames and surnames
    let names = person["name"].split("/", 2);
    // Joins them with a linebreak in between the two
    let result = [baseFont, names.join("\n")];

    // If we have birth/death data, we append it to the result
    const sex: string = person["sex"].toUpperCase();
    let langArray: { [key: string]: any } = getLang();

    // Parses the date and place into a string
    function parseDatePlace(datePlace: string[], eventWord: string) {
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
class PersonNode implements INode {
    person: PersonStructure;
    details: PersonDetails;
    text: any[];
    textDimensions: number[]|null;
    imageScaling: number;
    bgColor: {[key: string]: string};
    sidePadding: number;

    x: number;
    y: number;

    ancestorsUp: INode[];
    descendentsDown: INode[];
    generation: number;
    mod: number;
    parentsHidden: boolean;
    childrenHidden: boolean;
    inFocus: boolean;
    ancestorFocus: boolean;
    group: any;
    redirects: boolean;
    redirectsTo: string;
    ancestors: any[];


    constructor(_person: PersonStructure, pDetails: PersonDetails) {
        this.person = _person;
        this.details = pDetails;
        this.text = makeNodeText(_person); // Generates the text for this node
        this.textDimensions = null;
        this.imageScaling = scale;

        this.bgColor = {"m": "#ACE2F2", "f": "#F8AFD7", "": "#d3d3d3"}; // background colors
        this.sidePadding = 20 * this.imageScaling;

        this.x = 0;
        this.y = 0;

        this.ancestorsUp = [];         // Top ancestor(s) a level up (ie. first parent)
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
    getInteriorNodeById(_: string): INode {
        return this;
    }

    // Establishes relations (determines if any are hidden)
    areRelationsShown(structure: {[key: string]: PersonStructure}) {
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

    // Dimensions
    getWidth() {
        return this.calcDimensions()[0];
    }
    getHeight() {
        return this.calcDimensions()[1];
    }

    calcDimensions(canvasView?: any): number[] {
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


    getRect(canvasView: any) {
        let dimensions = this.calcDimensions(canvasView);
        let width = dimensions[0];
        let height = dimensions[1];

        return [this.x + canvasView.scrollx - nodeBorderMargin, // X
            this.y + canvasView.scrolly - nodeBorderMargin, // Y
            width + nodeBorderMargin * 2, // Width
            height + nodeBorderMargin * 2]; // Height
    }

    // TODO - CanvasView class
    // TODO - scrap hitTest
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
            (image as HTMLImageElement).width = dim;
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


function NodeGroup(_nodes: any[]) {
    var imageScaling = scale;
    var spousalSpacing = 20 * imageScaling;
    var minHeight = 0;

    function reposition(_: any) {
        for (var i = 1; i < _nodes.length; i++) {
            // the X of the prev + width + the extra spousalSpacing
            _nodes[i].setX(_nodes[i-1].getX() + _nodes[i-1].getWidth() + spousalSpacing);
            _nodes[i].setY(_nodes[i-1].getY());
        }
    }

    var prevDimensions: number[]|null = null;

    var nodeGroupDict = {
        ancestorsUp : [],
        descendentsDown : [],
        generation : 0,
        mod : 0,

        getInteriorNodeById: function(nodeId: string) {
            for (var i = 0; i < _nodes.length; i++) {
                if (_nodes[i].getId() == nodeId) {
                    return _nodes[i];
                }
            }
            return null;
        },

        areRelationsShown: function(structure: any) {
            for (let node of _nodes) {
                node.areRelationsShown(structure);
            }
            // Gets the displayed group
            function displayedGroup(group: any) {
                var displayGroup: any[] = [];
                for (var j = 0; j < group.length; j++) {
                    displayGroup = displayGroup.concat(group[j].getIds());
                }
                return displayGroup;
            }

            // Checks if any people in the group are NOT displayed
            function anyHidden(group: any[], displayedGroup: any[]) {
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
        getIds : function() { return _nodes.map(n => n.getId()); },
        getMembers : function() { return _nodes; },


        getText : function() { return ""; },
        getX: function() { return _nodes[0].getX(); },
        getY: function() { return _nodes[0].getY(); },
        setX: function(newX: number) {
            _nodes[0].setX(newX);
            // @ts-ignore
            reposition();
        },
        setY: function(newY: number) {
            _nodes[0].setY(newY);
            // @ts-ignore
            reposition();
        },
        getPos : function() { return [_nodes[0].getX(),_nodes[0].getY()]; },
        setPos : function(newX: number, newY: number) {
            _nodes[0].setX(newX);
            _nodes[0].setY(newY);
        },


        // Dimension calculations
        getScaling: function() { return _nodes[0].getScaling(); },
        setScaling: function(newScale: number) { _nodes[0].setScaling(newScale); },
        getWidth : function() { // @ts-ignore
            return this.calcDimensions()[0]; },
        getHeight : function() { // @ts-ignore
            return this.calcDimensions()[1]; },

        calcDimensions : function(canvasView: any) {
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

        hitTest : function(canvasView: any, x: number, y: number) {
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

        draw : function(canvasView: any) {
            var lineWidth = 10 * scale; // Spouse line
            var y = this.getY() + (minHeight / 2); // Minheight make sure we work w/ the smallest one (ie. we fit all)
            var x2 = this.getX() + this.getWidth();

            simpleLine(canvasView, this.getX(), y, x2, y, lineWidth, "#777");

            for (var i = 0; i < _nodes.length; i++) {
                _nodes[i].draw(canvasView);
            }
        },

        drawLines : function(canvasView: any) {
            _nodes[0].drawLines(canvasView);

            for (var i = 2; i < _nodes.length; i++) { // For multiple spouses
                _nodes[i].drawLines(canvasView);
            }
        }
    }
    return nodeGroupDict;
}








function Layout(person: any, structure: any, details: any) {
    // Utility functions
    function getSpouses(person: any) { return structure[person].spouses; }
    function getParents(person: any) { return structure[person].parents; }
    function getChildren(person: any) { return structure[person].children; }


    var mappedNodes: any = {}; // Initialize the nodes

    // Makes the modes
    function makeNode(person: any, generation: number) {
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
        var children: any[] = getChildren(person);
        if (children.length > 0) {
            if (Math.abs(generation) < generationLimit) {
                // @ts-ignore
                newNode.descendentsDown = children.map(c => makeNode(c, generation+1));
            }
        }
        newNode.areRelationsShown(structure);
        return newNode;
    }


    // Equalize the vertical spacing, so that each generation is on the same level
    function verticalSpacing(canvasView: any, nodeList: any[]) {
        // We get the max height per generation, so they're all aligned
        var maxHeights = {};
        for (let node of nodeList) {
            var height = node.calcDimensions(canvasView)[1];
            // @ts-ignore
            maxHeights[node.generation] = Math.max(maxHeights[node.generation] || 0, height);
        }


        var sumHeights = {0: 0}; // calculate the summed heights
        for (var i = 1; i in maxHeights; i++) {
            // @ts-ignore
            sumHeights[i] = sumHeights[i-1] + maxHeights[i-1] + verticalMargin;
        }

        for (var i = -1; i in maxHeights; i--) {
            // @ts-ignore
            sumHeights[i] = sumHeights[i+1] - maxHeights[i] - verticalMargin;
        }

        for (var i = 0; i < nodeList.length; i++) {
            // Establish the new position (using the same X as before)
            // @ts-ignore
            nodeList[i].setPos(nodeList[i].getPos()[0], sumHeights[nodeList[i].generation]);
        }
    }


    function isNodeLeaf(node: any) {
        // If we have no descendants, its a leaf
        return node.descendentsDown.length == 0;
    }


    function isNodeLeftmost(node: any) {
        if (node.ancestorsUp.length == 0) {
            return true;
        }
        return node.ancestorsUp[0].descendentsDown[0] == node;
    }

    function getPrevSibling(node: any) {
        if (node.ancestorsUp.length > 0) {
            var position = node.ancestorsUp[0].descendentsDown.indexOf(node);
            return node.ancestorsUp[0].descendentsDown[position - 1];
        }
        else {
            console.log("Top level - no siblings")
        }
    }

    function getLeftContour(node: any) {
        function leftContourHelper(node: any, values: any, modSum: number) {
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

    function getRightContour(node: any) {
        function rightContourHelper(node: any, values: any, modSum: any) {
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
    function checkForConflicts(node: any) {
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
    function calculateInitialX(node: any) {
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

    var boundaries: any = null;

    function calculateFinalPos(node: any, modSum: any) {
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


    var layoutDict =  {
        getBoundaries: function() { return boundaries; }, // Returns the boundaries
        lookupNodeById: function(personid: any) { // Gets us the node by ID if it exists
            if (personid in mappedNodes) {
                return mappedNodes[personid];
            }
            else {
                return null;
            }
        },
        nodes: makeNode(person, 0), // Start with the base person, generation 0
        position : function(canvasView: any) {
            verticalSpacing(canvasView, flattenTree(this.nodes));
            calculateInitialX(this.nodes);
            calculateFinalPos(this.nodes, 0);
        }
    }

    return layoutDict;
}