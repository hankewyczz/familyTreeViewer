// An interface for either a single person node, or a group of nodes (spousal group)
interface INode {
    // Fields
    ancestorsUp: INode[];
    descendentsDown: INode[];
    generation: number;
    mod: number;
    prevDimensions: number[]|null;
    imageScaling: number;

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
    prevDimensions: number[]|null;
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
        this.prevDimensions = null;
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
        if (this.prevDimensions == null) {
            if (typeof canvasView === 'undefined') {
                throw new Error("Cannot determine dimensions without a given canvas view");
            }

            let dimensions = renderText(this.text, canvasView, this.x, this.y, false);
            let width = dimensions[0] + (this.sidePadding * 2);
            let height = dimensions[1];
            this.prevDimensions = [width, height];
        }

        return this.prevDimensions;
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



class PersonNodeGroup implements INode {
    // Fields
    nodes: PersonNode[];
    ancestorsUp: INode[];
    descendentsDown: INode[];
    generation: number;
    mod: number;
    prevDimensions: number[]|null;
    imageScaling: number;
    spousalSpacing: number;
    minHeight: number;


    constructor(_nodes: any[]) {
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


    reposition(_?: any) {
        for (let i = 1; i < this.nodes.length; i++) {
            // width + the extra spousalSpacing
            let xPadding = this.nodes[i-1].getWidth() + this.spousalSpacing;
            this.nodes[i].setX(this.nodes[i-1].getX() + xPadding);
            this.nodes[i].setY(this.nodes[i-1].getY());
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

    getChildConnectorPoint() {
        return this.nodes[0].getChildConnectorPoint();
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
        return this.calcDimensions()[0]; }
    getHeight() {
        return this.calcDimensions()[1]; }

    calcDimensions(canvasView?: any) {
        if (this.prevDimensions == null) {
            for (let node of this.nodes) {
                node.calcDimensions(canvasView);
            }

            // We reposition after all of the dimensions have been recalculated
            this.reposition();
            let left = this.nodes[0].getX();
            let right = this.nodes[this.nodes.length - 1].getX() +  // X position of the last node
                (this.nodes[this.nodes.length - 1].getWidth() as number);       // Width of the last node

            let heights = this.nodes.map(n => (n.getHeight() as number));
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
        let y = this.getY() + (this.minHeight / 2); // Min-height make sure we work w/ the smallest one (ie. we fit all)
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








class Layout {
    person: string;
    structure: {  [key: string]: PersonStructure };
    details: { [key: string]: PersonDetails};
    mappedNodes: { [key: string]: INode};
    boundaries: null | number[];
    nodes: INode;

    constructor(person: string,
                structure: {  [key: string]: PersonStructure },
                details: {[key: string]: PersonDetails}) {
        this.person = person;
        this.structure = structure;
        this.details = details;
        this.mappedNodes = {};
        this.boundaries = null;
        this.nodes = this.makeNode(person, 0); // Start with the base person, generation 0

    }

    // Utility functions
    // Returns an array of this person's spouses
    getSpouses(person: string) {
        return this.structure[person].spouses;
    }
    getParents(person: string) {
        return this.structure[person].parents;
    }
    getChildren(person: string) {
        return this.structure[person].children;
    }


    // Makes the nodes
    makeNode(person: string, generation: number): INode {
        if (person in this.mappedNodes) {
            return this.mappedNodes[person]; // The node already exists, just return it
        }

        let newNode: INode;
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
            personList.map(p => { this.mappedNodes[p] = newNode;});
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
    verticalSpacing(canvasView: any, nodeList: INode[]) {
        // We get the max height per generation, so they're all aligned
        let maxHeights: {[key: number]: number} = {};
        for (let node of nodeList) {
            let height = node.calcDimensions(canvasView)[1];
            maxHeights[node.generation] = Math.max(maxHeights[node.generation] || 0, height);
        }


        // calculate the summed heights
        let sumHeights: {[key: number]: number} = {0: 0};
        for (let i = 1; i in maxHeights; i++) {
            // The bottom x-coord of the row below + the height of the row below + the margin
            sumHeights[i] = sumHeights[i-1] + maxHeights[i-1] + verticalMargin;
        }
        // Ditto, but for any rows below generation 0
        // Todo - is this still necessary?
        for (let i = -1; i in maxHeights; i--) {
            sumHeights[i] = sumHeights[i+1] - maxHeights[i] - verticalMargin;
        }

        for (let node of nodeList) {
            // Establish the new position (using the same X as before)
            node.setPos(node.getX(), sumHeights[node.generation]);
        }
    }

    isNodeLeaf(node: INode): boolean {
        // If we have no descendants, its a leaf
        return node.descendentsDown.length == 0;
    }

    isNodeLeftmost(node: INode): boolean {
        // If we have no direct ancestors, it must be the top (and technically leftmost)
        if (node.ancestorsUp.length == 0) {
            return true;
        }
        // Are we the first descendent of our first ancestor? If so, we're leftmost
        return node.ancestorsUp[0].descendentsDown[0] == node;
    }

    getPrevSibling(node: INode): (INode | void) {
        if (node.ancestorsUp.length > 0) {
            let position = node.ancestorsUp[0].descendentsDown.indexOf(node);
            return node.ancestorsUp[0].descendentsDown[position - 1];
        }
        else {
            console.log("Top level - no siblings")
        }
    }

    getLeftContour(node: INode): {[key: number]: number} {
        function leftHelper(n: INode, values: {[key: number]: number}, modSum: number) {
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

    getRightContour(node: any): {[key: number]: number} {
        function rightHelper(n: any, values: any, modSum: any) {
            let gen = n.generation;

            if (gen in values) {
                values[gen] = Math.max(values[gen], n.getX() + n.getWidth() + modSum);
            }
            else {
                values[gen] = n.getX() + n.getWidth() + modSum;
            }

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
    checkForConflicts(node: INode) {
        // Distance between subtrees (eg. cousins)
        let subtreeSpacing = 30 * scale;
        let shift = 0; // How much more we need to shift these nodes over
        let leftContour = this.getLeftContour(node);

        if (node.ancestorsUp.length == 0) {
            return; // if we're at the top of the tree, we've got nothing to do
        }

        for (let curNode of node.ancestorsUp[0].descendentsDown) { // or There and Back Again
            // We only go up to this node - dont' care about the rest
            if (curNode == node) {
                break;
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
    calculateInitialX(node: INode) {
        node.descendentsDown.map(n => this.calculateInitialX(n));

        if (this.isNodeLeaf(node)) {
            if (this.isNodeLeftmost(node)) {
                node.setX(0); // The leftmost leaf is our 0 point
            }
            else {
                // This node isn't leftmost, so it must have a previous sibling
                let prevSibling = this.getPrevSibling(node) as INode;
                node.setX(prevSibling.getX() + (prevSibling.getWidth() as number) + horizontalMargin);
            }
        }

        else {
            let lastChild = node.descendentsDown[node.descendentsDown.length - 1];

            const left = node.descendentsDown[0].getX(); // Gets the first child
            const right = lastChild.getX() + (lastChild.getWidth() as number);  // Right side of the last child
            const mid = (left + right) / 2;

            if (this.isNodeLeftmost(node)) {
                node.setX(mid - ((node.getWidth() as number) / 2));
            }
            else {
                // We checked - this must have a previous sibling
                let prevSibling = this.getPrevSibling(node) as INode;
                // We can calculate it using the sibling here
                node.setX(prevSibling.getX() + (prevSibling.getWidth() as number) + horizontalMargin);
                node.mod = node.getX() - mid + (node.getWidth() as number) / 2;
            }
        }

        // If we have kids, and this isn't the leftmost node, we have to work around it
        if (node.descendentsDown.length > 0 && !this.isNodeLeftmost(node)) {
            this.checkForConflicts(node);
        }
    }

    calculateFinalPos(node: INode, modSum: number) {
        node.setX(node.getX() + modSum); // Update the X
        modSum += node.mod;

        node.descendentsDown.map(n => this.calculateFinalPos(n, modSum));

        let x1 = node.getX();
        let y1 = node.getY();
        let x2 = node.getX() + (node.getWidth() as number);
        let y2 = node.getY() + (node.getHeight() as number);

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
    lookupNodeById(person_id: string) { // Gets us the node by ID if it exists
        if (person_id in this.mappedNodes) {
            return this.mappedNodes[person_id];
        }
        else {
            return null;
        }
    }

    position(canvasView: any) {
        this.verticalSpacing(canvasView, flattenTree(this.nodes));
        this.calculateInitialX(this.nodes);
        this.calculateFinalPos(this.nodes, 0);
    }
}