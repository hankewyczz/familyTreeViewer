function flattenTree(node: INode) {
    let flattened: INode[] = [];

    function flattenTreeHelper(n: INode) {
        // This person + direct ancestors + direct descendents
        for (let person of [n].concat(n.ancestorsUp).concat(n.descendentsDown)) {
            if (!flattened.includes(person)) {
                flattened.push(person); // add to the array if it isn't already
                flattenTreeHelper(person);
            }
        }
    }
    flattenTreeHelper(node);
    return flattened;
}


// Main tree function
class Tree {
    structure: {  [key: string]: PersonStructure };
    details: { [key: string]: PersonDetails};
    mappedNodes: { [key: string]: INode};
    boundaries: null | number[];
    nodes: INode;

    //layout: Layout;
    isPositioned: boolean;
    flatNodes: INode[];

    constructor(structure: {  [key: string]: PersonStructure },
                details: {[key: string]: PersonDetails}, person: string) {

        this.structure = structure;
        this.details = details;
        this.mappedNodes = {};
        this.boundaries = null;
        this.nodes = this.makeNode(person, 0); // Start with the base person, generation 0

        //this.layout = new Layout(person, structure, details);
        this.isPositioned = false;
        this.flatNodes = flattenTree(this.nodes);
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
    lookupNodeById(person_id: string): null | PersonNode { // Gets us the node by ID if it exists
        if (person_id in this.mappedNodes) {
            return this.mappedNodes[person_id].getInteriorNodeById(person_id);
        }
        return null;
    }

    position(canvasView: any) {
        this.verticalSpacing(canvasView, flattenTree(this.nodes));
        this.calculateInitialX(this.nodes);
        this.calculateFinalPos(this.nodes, 0);
    }

    isHit(canvasView: View, x: number, y: number) {
        for (let node of this.flatNodes) {
            let nodeHit = node.isHit(canvasView, x, y);

            if (nodeHit !== null) {
                return nodeHit;
            }
        }
        return null;
    }

    draw(canvasView: View) {
        if (!this.isPositioned) {
            this.position(canvasView);
            this.isPositioned = true;
        }

        function helpDraw(node: INode) {
            node.draw(canvasView);
            node.drawLines(canvasView);
            for (let desc of node.descendentsDown) {
                helpDraw(desc)
            }
        }
        helpDraw(this.nodes);
    }
}