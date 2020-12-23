// todo canvasview
function simpleLine(canvasView: View, x1: number, y1: number, x2: number, y2: number,
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



function drawParentLine(canvasView: View, parent: INode, child: INode) {
    if (canvasView.context === null) {
        return;
    }
    const childConnector = child.getParentConnectorPoint();
    const childX = childConnector[0] + canvasView.x;
    const childY = childConnector[1] + canvasView.y;

    const parentConnector = parent.getChildConnectorPoint();
    const parentX = parentConnector[0] + canvasView.x;
    const parentY = parentConnector[1] + canvasView.y;


    canvasView.context.strokeStyle = "#777";
    canvasView.context.lineWidth = 2;

    canvasView.context.beginPath();
    canvasView.context.moveTo(childX, childY);

    const horizontal = childY - verticalMargin / 2; // gets the Y of the horizontal line (meet halfway)
    canvasView.context.lineTo(childX, horizontal);
    canvasView.context.lineTo(parentX, horizontal);
    canvasView.context.lineTo(parentX, parentY);
    canvasView.context.stroke();
}


