// todo canvasview
function simpleLine(canvasView: any, x1: number, y1: number, x2: number, y2: number,
                    width: number, color: string) {
    canvasView.context.strokeStyle = color;
    canvasView.context.lineWidth = width;

    canvasView.context.beginPath();
    canvasView.context.moveTo(x1 + canvasView.scrollx, y1 + canvasView.scrolly);
    canvasView.context.lineTo(x2 + canvasView.scrollx, y2 + canvasView.scrolly);
    canvasView.context.stroke();
}



function drawParentLine(canvasView: any, parent: INode, child: INode) {
    const childConnector = child.getParentConnectorPoint();
    const childX = childConnector[0] + canvasView.scrollx;
    const childY = childConnector[1] + canvasView.scrolly;

    const parentConnector = parent.getChildConnectorPoint();
    const parentX = parentConnector[0] + canvasView.scrollx;
    const parentY = parentConnector[1] + canvasView.scrolly;


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


