/**
 * Flattens a tree into a list of INodes.
 * @param node  The starting node
 */
function flattenTree(node: INode) {
    let flattened: INode[] = [];

    function flattenTreeHelper(n: INode) {
        // This person + direct ancestors + direct descendents
        for (let person of [n].concat(n.ancestors).concat(n.descendents)) {
            if (!flattened.includes(person)) {
                flattened.push(person); // add to the array if it isn't already
                flattenTreeHelper(person);
            }
        }
    }
    flattenTreeHelper(node);
    return flattened;
}


/**
 * A Tree represents a complete family tree structure.
 */
class Tree {
    person: string;

    structure: {  [key: string]: PersonStructure };
    details: { [key: string]: PersonDetails};
    savedNodes: { [key: string]: INode};

    boundaries: null | number[];
    isPositioned: boolean;

    nodes: INode;
    flatNodes: INode[];

    /**
     * Constructs a Tree instance.
     * @param structure     The map of PersonStructures
     * @param details       The map of PersonDetails
     * @param person        The ID of the base person
     */
    constructor(structure: {  [key: string]: PersonStructure },
                details: {[key: string]: PersonDetails}, person: string) {

        this.person = person;
        this.structure = structure;
        this.details = details;
        this.savedNodes = {};
        this.boundaries = null;
        this.nodes = this.makeNode(person, 0); // Start with the base person, generation 0
        this.isPositioned = false;
        this.flatNodes = flattenTree(this.nodes);
    }

    // Generates the nodes for the tree structure
    private makeNode(person: string, generation: number): INode {
        // If we've already created this node, we just return it
        if (person in this.savedNodes) {
            return this.savedNodes[person];
        }

        let newNode: INode;

        // If this person has no spouses, they are not part of a PersonNodeGroup.
        if (this.structure[person].spouses.length === 0) {
            newNode = new PersonNode(this.structure[person], this.details[person]);
            this.savedNodes[person] = newNode;
        }
        // This person IS part of a PersonNodeGroup - we generate the group here.
        else {
            let personList = [person].concat(this.structure[person].spouses);
            let nodes = personList.map(p => new PersonNode(this.structure[p], this.details[p]));
            newNode = new PersonNodeGroup(nodes);

            // Update the list of saved nodes
            personList.map(p => { this.savedNodes[p] = newNode;});
        }

        // Set the generation of this new node
        newNode.generation = generation;

        // If we have parents, generate and save them
        let parents = this.structure[person].parents;
        if (parents.length > 0) {
            // There is only one PersonNodeGroup of parents (covers divorces, re-marrying, etc.)
            newNode.ancestors = [this.makeNode(parents[0], generation - 1)];
        }

        // Same for the children
        let children = this.structure[person].children;
        if (children.length > 0) {
            // If the children are out of the generation limit, we don't care about them.
            if (Math.abs(generation) < generationLimit) {
                newNode.descendents = children.map(c => this.makeNode(c, generation + 1));
            }
        }
        // Generate the relationship indicators (hidden children/parents)
        newNode.areRelationsShown(this.structure);
        return newNode;
    }


    // Equalize the vertical spacing, so that each generation is on the same level
    private verticalSpacing(canvasView: CanvasView) {
        // We get the max height per generation, so they're all aligned
        let maxHeights: {[key: number]: number} = {};
        for (let node of this.flatNodes) {
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
        // Gen 0 is our starting person; negatives are parents, pos are children
        for (let i = -1; i in maxHeights; i--) {
            sumHeights[i] = sumHeights[i+1] - maxHeights[i] - verticalMargin;
        }

        for (let node of this.flatNodes) {
            // Establish the new Y position
            node.setY(sumHeights[node.generation]);
        }
    }

    private static isNodeLeaf(node: INode): boolean {
        // If we have no descendants, its a leaf
        return node.descendents.length === 0;
    }

    private static isNodeLeftmost(node: INode): boolean {
        // If we have no direct ancestors, it must be the top (and technically leftmost)
        if (node.ancestors.length === 0) {
            return true;
        }
        // Are we the first descendent of our first ancestor? If so, we're leftmost
        return node.ancestors[0].descendents[0] == node;
    }

    private static getPrevSibling(node: INode): (INode | void) {
        if (node.ancestors.length > 0) {
            let position = node.ancestors[0].descendents.indexOf(node);
            return node.ancestors[0].descendents[position - 1];
        }
    }

    private getLeftContour(node: INode): {[key: number]: number} {
        let values: {[key: number]: number} = {};

        // Inner helper method for recursion
        function leftHelper(n: INode, shiftSum: number) {
            let gen = n.generation;

            // The new X-coordinate of this node
            let val = n.getX() + shiftSum;
            // We want to keep track of the smallest (ie. leftmost) x-value for this generation
            values[gen] = (gen in values) ? Math.min(val, values[gen]) : val;

            // We do the same for the descendents
            for (let desc of n.descendents) {
                // The node's shift distance is added to the shiftSum
                // Since this node is the parent, its shift distance will affect all of its children
                leftHelper(desc, shiftSum + n.shift_distance);
            }
        }

        leftHelper(node, 0);
        return values;
    }

    private getRightContour(node: INode): {[key: number]: number} {
        let values: {[key: number]: number} = {};

        // Inner helper method for recursion
        function rightHelper(n: INode, shiftSum: number) {
            let gen = n.generation;

            let val = n.getX() + n.getWidth() + shiftSum;

            // We want the max x-value (ie. the rightmost)
            values[gen] = (gen in values) ? Math.max(values[gen], val) : val;

            for (let desc of n.descendents) {
                rightHelper(desc, shiftSum + n.shift_distance);
            }
        }

        rightHelper(node, 0);
        return values;
    }

    // Check for subtree conflicts, and recalculate
    private checkForConflicts(node: INode) {
        // Distance between subtrees (eg. cousins)
        let subtreeSpacing = 30 * scale;
        let shift = 0; // How much more we need to shift these nodes over
        let leftContour = this.getLeftContour(node);

        if (node.ancestors.length == 0) {
            return; // if we're at the top of the tree, we've got nothing to do
        }

        // Get all of this node's siblings
        for (let curNode of node.ancestors[0].descendents) {
            // We only care about the sibling nodes to the LEFT of this node
            if (curNode == node) {
                break;
            }

            let siblingContour = this.getRightContour(curNode);

            // We go down the family tree, starting with this node's children.
            // We only need to check for conflict if both this node and the sibling node have
            // children at this level (otherwise, there can't possibly be a conflict)
            for (let j = node.generation + 1; j in leftContour && j in siblingContour; j++) {
                // How much distance is between the right side of the sibling,
                // and the left side of this node?
                let distance = leftContour[j] - siblingContour[j];

                // We need to be a certain distance apart - if we don't meet it, we shift over.
                if (distance + shift < subtreeSpacing) {
                    shift = subtreeSpacing - distance;
                }
            }

            // If we needed a shift, we implement it here
            if (shift !== 0) {
                node.setX(node.getX() + shift);     // Update the X coordinate
                node.shift_distance += shift;             // Alter the shift
                shift = 0;
                leftContour = this.getLeftContour(node); // After adjustment, update the contour of the changed nodes
            }
        }
    }

    // Calculate the initial X position of a node
    private calculateInitialX(node: INode) {
        node.descendents.map(n => this.calculateInitialX(n));

        if (Tree.isNodeLeaf(node)) {
            if (Tree.isNodeLeftmost(node)) {
                node.setX(0); // The leftmost leaf is our 0 point
            }
            else {
                // This node isn't leftmost, so it must have a previous sibling
                let prevSibling = Tree.getPrevSibling(node) as INode;
                node.setX(prevSibling.getX() + (prevSibling.getWidth() as number) + horizontalMargin);
            }
        }

        else {
            let lastChild = node.descendents[node.descendents.length - 1];

            const left = node.descendents[0].getX(); // Gets the first child
            const right = lastChild.getX() + (lastChild.getWidth() as number);  // Right side of the last child
            const mid = (left + right) / 2;

            if (Tree.isNodeLeftmost(node)) {
                node.setX(mid - ((node.getWidth() as number) / 2));
            }
            else {
                // We checked - this must have a previous sibling
                let prevSibling = Tree.getPrevSibling(node) as INode;
                // We can calculate it using the sibling here
                node.setX(prevSibling.getX() + (prevSibling.getWidth() as number) + horizontalMargin);
                node.shift_distance = node.getX() - mid + (node.getWidth() as number) / 2;
            }
        }

        // If we have kids, and this isn't the leftmost node, we have to work around it
        if (node.descendents.length > 0 && !Tree.isNodeLeftmost(node)) {
            this.checkForConflicts(node);
        }
    }

    private calculateFinalPos(node: INode, shift_distance: number) {
        node.setX(node.getX() + shift_distance); // Update the X
        shift_distance += node.shift_distance;

        node.descendents.map(n => this.calculateFinalPos(n, shift_distance));

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

    lookupNodeById(person_id: string): null | PersonNode { // Gets us the node by ID if it exists
        if (person_id in this.savedNodes) {
            return this.savedNodes[person_id].getInteriorNodeById(person_id);
        }
        return null;
    }

    position(canvasView: CanvasView) {
        this.verticalSpacing(canvasView);
        this.calculateInitialX(this.nodes);
        this.calculateFinalPos(this.nodes, 0);
    }

    hitTest(canvasView: CanvasView, x: number, y: number) {
        for (let node of this.flatNodes) {
            let nodeHit = node.hitTest(canvasView, x, y);

            if (nodeHit !== null) {
                return nodeHit;
            }
        }
        return null;
    }

    draw(canvasView: CanvasView) {
        if (!this.isPositioned) {
            this.position(canvasView);
            this.isPositioned = true;
        }

        function helpDraw(node: INode) {
            node.draw(canvasView);
            node.drawLines(canvasView);
            for (let desc of node.descendents) {
                helpDraw(desc)
            }
        }
        helpDraw(this.nodes);
    }
}