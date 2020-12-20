"use strict";
function flattenTree(node) {
    let flattened = [];
    function flattenTreeHelper(n) {
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
    constructor(structure, details, personId) {
        this.layout = new Layout(personId, structure, details);
        this.isPositioned = false;
        this.nodes = flattenTree(this.layout.nodes);
    }
    getBoundaries() {
        return this.layout.getBoundaries();
    }
    lookupNodeById(person_id) {
        let idNode = this.layout.lookupNodeById(person_id);
        if (idNode == null) {
            return null;
        }
        return idNode.getInteriorNodeById(person_id);
    }
    hitTest(canvasView, x, y) {
        for (let node of this.nodes) {
            let nodeHit = node.hitTest(canvasView, x, y);
            if (nodeHit[0]) {
                return [node, nodeHit[1]];
            }
        }
        return [null, "none"];
    }
    position(canvasView) {
        this.layout.position(canvasView);
    }
    draw(canvasView) {
        if (!this.isPositioned) {
            this.position(canvasView);
            this.isPositioned = true;
        }
        function helpDraw(node) {
            node.draw(canvasView);
            node.drawLines(canvasView);
            for (let desc of node.descendentsDown) {
                helpDraw(desc);
            }
        }
        helpDraw(this.layout.nodes);
    }
}
