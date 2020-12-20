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
    layout: Layout;
    isPositioned: boolean;
    nodes: INode[];

    constructor(structure: {  [key: string]: PersonStructure },
                details: {[key: string]: PersonDetails}, personId: string) {

        this.layout = new Layout(personId, structure, details);
        this.isPositioned = false;
        this.nodes = flattenTree(this.layout.nodes);
    }


    getBoundaries() {
        return this.layout.getBoundaries();
    }
    lookupNodeById(person_id: string) {
        let idNode = this.layout.lookupNodeById(person_id);
        if (idNode == null) {
            return null;
        }
        return idNode.getInteriorNodeById(person_id);
    }

    hitTest(canvasView: any, x: number, y: number) {
        for (let node of this.nodes) {
            let nodeHit = node.hitTest(canvasView, x, y);

            if (nodeHit[0]) {
                return [node, nodeHit[1]];
            }
        }
        return [null, "none"];
    }

    position(canvasView: any) {
        this.layout.position(canvasView);
    }

    draw(canvasView: any) {
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
        helpDraw(this.layout.nodes);
    }
}