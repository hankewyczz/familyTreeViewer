function renderSvgTree() {
	let svgDoc = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	svgDoc.setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns:xlink", "http://www.w3.org/1999/xlink");

	svgDoc.setAttribute('width', '600');
	svgDoc.setAttribute('height', '250');


	let myShape = document.createElementNS("http://www.w3.org/2000/svg", "circle");
	myShape.setAttributeNS(null, "cx", "40");
	myShape.setAttributeNS(null, "cy", "40");
	myShape.setAttributeNS(null, "r", "30");
	myShape.setAttributeNS(null, "fill", "yellow");

	svgDoc.appendChild(myShape)

	return svgDoc;
}


function printTree(view: CanvasView) {

	const svg = renderSvgTree();
	// convert to a valid XML source
	const as_text = new XMLSerializer().serializeToString(svg);
	// store in a Blob
	const blob = new Blob([as_text], {type: "image/svg+xml"});

	// We use this link to initiate a download
	let a: HTMLAnchorElement = document.createElement("a");
	document.body.appendChild(a);
	(a as any).style = "display: none";

	// create an URI pointing to that blob
	const url = URL.createObjectURL(blob);
	const win = open(url);
	a.href = url;
	a.download = "test.svg";
	a.click();


	// so the Garbage Collector can collect the blob
	(win as Window).onload = (_: Event) => URL.revokeObjectURL(url);
}