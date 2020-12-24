/**
 * Draws a line segment between the two sets of given coordinates
 * @param canvasView    The view on which to draw the line
 * @param x1    The starting x-coordinate
 * @param y1    The starting y-coordinate
 * @param x2    The end x-coordinate
 * @param y2    The end y-coordinate
 * @param width The width of the line
 * @param color The color of the line
 */
function drawLine(canvasView: CanvasView,
                  x1: number, y1: number, x2: number, y2: number,
                  width: number, color: string) {

    if (canvasView.context === null) {
        return;
    }

    canvasView.context.strokeStyle = color;
    canvasView.context.lineWidth = width;

    canvasView.context.beginPath();
    canvasView.context.moveTo(x1 + canvasView.x, y1 + canvasView.y);
    canvasView.context.lineTo(x2 + canvasView.x, y2 + canvasView.y);
    canvasView.context.stroke();
}


/**
 * Draws the connecting line from a parent INode to a child INode.
 * @param canvasView    The view on which to draw the lines
 * @param parent        The parent node
 * @param child         The child node
 */
function drawLineToChild(canvasView: CanvasView, parent: INode, child: INode) {
    if (canvasView.context === null) {
        return;
    }

    const childConnector = child.getParentConnectorPoint();
    const childX = childConnector[0] + canvasView.x;
    const childY = childConnector[1] + canvasView.y;

    const parentConnector = parent.getChildConnectorPoint();
    const parentX = parentConnector[0] + canvasView.x;
    const parentY = parentConnector[1] + canvasView.y;

    // Default styles
    canvasView.context.strokeStyle = "#777";
    canvasView.context.lineWidth = 2;

    canvasView.context.beginPath();
    // Start at the child
    canvasView.context.moveTo(childX, childY);

    // We create a horizontal line halfway between the child and the parent
    const horizontal = childY - verticalMargin / 2;
    canvasView.context.lineTo(childX, horizontal);
    canvasView.context.lineTo(parentX, horizontal);
    // Connect the horizontal to the parent
    canvasView.context.lineTo(parentX, parentY);
    canvasView.context.stroke();
}


