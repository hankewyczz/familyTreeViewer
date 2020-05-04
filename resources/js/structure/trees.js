function flattenTree(node) {
    var flattened = [];

    function flattenTreeHelper(node) {
        var directRelations = [node].concat(node.ancestorsUp).concat(node.descendentsDown);
        for (var i = 0; i < directRelations.length; i++) {
            if (flattened.indexOf(directRelations[i]) < 0) { // we could use .includes() here if it weren't for IE
                flattened.push(directRelations[i]); // add to the array if it isn't already
                flattenTreeHelper(directRelations[i]);
            }
        }
    }
    flattenTreeHelper(node);
    return flattened;
}


// Main tree function
function Tree(structure, personId) {
    var layout = Layout(personId, structure);
    var isPositioned = false;
    var nodes = flattenTree(layout.nodes);

    var treeFuncs = {
        getBoundaries: function() { return layout.getBoundaries(); },
        lookupNodeById: function(personid) {
            var idNode = layout.lookupNodeById(personid);
            if (idNode == null) {
                return null;
            }
            return idNode.getInteriorNodeById(personid);
        },

        hitTest : function(canvasView, x, y) {
            for (var i = 0; i < nodes.length; i++) {
                var nodeHit = nodes[i].hitTest(canvasView, x, y);
                var isHit = nodeHit[0];
                var hitType = nodeHit[1];
                if (isHit) {
                    return [nodes[i], hitType];
                }                   
            }
            return [null, "none"];
        },

        position : function(canvasView) { layout.position(canvasView); },
        draw : function(canvasView) {
            if (!isPositioned) {
                isPositioned = true;
                this.position(canvasView);
            }

            function helpDraw(node) {
                node.draw(canvasView);
                node.drawLines(canvasView);
                for (var i = 0; i < node.descendentsDown.length; i++) {
                    helpDraw(node.descendentsDown[i])
                }
            }
            helpDraw(layout.nodes);
        }
    }
    return treeFuncs;
}