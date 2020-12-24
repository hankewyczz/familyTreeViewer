/**
 * An interface for either a single person node, or a group of nodes (spousal group).
 */
interface INode {
	// Relations
	ancestors: INode[];
	descendents: INode[];

	generation: number;
	shift_distance: number;
	ancestorFocus: boolean;

	// Methods
	getInteriorNodeById: (_: string) => (PersonNode | null);
	areRelationsShown: (structure: { [key: string]: PersonStructure }) => void;
	getChildConnectorPoint: () => number[];
	getParentConnectorPoint: () => number[];
	// IDs
	getId: () => string;
	getIds: () => string[];
	// Positioning
	getX: () => number;
	getY: () => number;
	setX: (newX: number) => void;
	setY: (newY: number) => void;
	// Dimensions
	getWidth: () => number;
	getHeight: () => number;
	calcDimensions: (canvasView?: CanvasView) => number[];
	// Other
	hitTest: (canvasView: CanvasView, x: number, y: number) => PersonNode | null;
	draw: (canvasView: CanvasView) => void;
	drawLinesToChildren: (canvasView: CanvasView) => void;
}


/**
 * Creates the text for each node
 * @param person	The person for which we create the node text.
 */
function makeNodeText(person: PersonStructure): StyledText[] {
	// Splits between the forenames and surnames, put them into a StyledText
	let names = new StyledText(person["name"].split("/", 2), baseFont);
	let result = [names];

	// If we have birth/death data, we append it to the result

	/**
	 * Parses the date into a StyledText.
	 * @param dateStr   An array containing the event information.
	 * @param eventWord The action verb for this event.
	 */
	function dateToStyledText(dateStr: string[], eventWord: string) {
		const str = dateStr[0];

		if (str !== "") {
			result.push(new StyledText([`${eventWord} ${str}`], detailFont));
		}
	}

	const sex: string = person["sex"].toUpperCase();
	let langArray: { [key: string]: any } = getLang();

	dateToStyledText(person["birth"], langArray["born"][sex]);
	dateToStyledText(person["death"], langArray["died"][sex]);

	return result;
}


/**
 * A node representing a single person.
 */
class PersonNode implements INode {
	person: PersonStructure;
	details: PersonDetails;
	text: StyledText[];
	private cachedDimensions: null | number[];
	sidePadding: number;

	x: number;
	y: number;

	ancestors: INode[];
	descendents: INode[];
	generation: number;
	shift_distance: number;
	parentsHidden: boolean;
	childrenHidden: boolean;
	inFocus: boolean;
	ancestorFocus: boolean;
	group: null | PersonNodeGroup;
	redirects: boolean;
	redirectsTo: string;
	flatAncestors: Array<Array<number | string>>;


	/**
	 * Constructs a PersonNode instance.
	 * @param _person		The PersonStructure of this person
	 * @param pDetails	The PersonDetails of this person
	 */
	constructor(_person: PersonStructure, pDetails: PersonDetails) {
		this.person = _person;
		this.details = pDetails;
		this.text = makeNodeText(_person); // Generates the text for this node
		this.cachedDimensions = null;

		this.sidePadding = 20 * scale;

		this.x = 0;
		this.y = 0;

		this.ancestors = [];         // Top ancestor(s) a level up (ie. first parent)
		this.descendents = []; // Direct children a level down
		this.generation = 0; // generation
		this.shift_distance = 0; // if we need to shift the cell to fit
		this.parentsHidden = this.person.parentsHidden; // Are the parents hidden?
		this.childrenHidden = this.person.childrenHidden; // Are the children hidden?
		this.inFocus = false; // Is this the node currently in focus
		this.ancestorFocus = false; // Is this node the ancestor of the currently focused node?
		this.group = null; // by default we have no group
		this.redirects = pDetails.redirects;
		this.redirectsTo = pDetails.redirectsTo;
		this.flatAncestors = pDetails.ancestors;
	}

	/**
	 * Returns this node.
	 * @param _		Unused
	 */
	getInteriorNodeById(_: string): PersonNode {
		return this;
	}

	/**
	 * Establishes relations (determines if any are hidden)
	 * @param structure		The structure object of the entire tree.
	 */
	areRelationsShown(structure: { [key: string]: PersonStructure }) {
		// Gets the list of parents and children currently shown
		let displayParents = this.ancestors.map(ancestor => ancestor.getIds()).flat();
		let displayKids = this.descendents.map(desc => desc.getIds()).flat();

		// Are any of this person's parents/children currently not being shown?
		// If this value is already set, don't change it (specifically, for the case of dummy people).
		if (!this.parentsHidden) {
			this.parentsHidden = structure[this.getId()].parents.some(p => !displayParents.includes(p));
		}
		if (!this.childrenHidden) {
			this.childrenHidden = structure[this.getId()].children.some(k => !displayKids.includes(k));
		}
	}

	/**
	 * Determines the coordinates at which the children connect to this node.
	 */
	getChildConnectorPoint() {
		let newX = this.x + this.getWidth() / 2;
		let newY = this.y + this.getHeight() + nodeBorderMargin;
		return [newX, newY];
	}

	/**
	 * Determines the coordinates at which the parents connect to this node.
	 */
	getParentConnectorPoint() {
		let newX = this.x + this.getWidth() / 2;
		let newY = this.y - nodeBorderMargin;
		return [newX, newY];
	}

	/**
	 * Returns this person's ID.
	 */
	getId() {
		return this.person.id;
	}

	/**
	 * Returns this ID as an array.
	 */
	getIds() {
		return [this.person.id];
	}

	/**
	 * Gets the X coordinate of this node.
	 */
	getX(): number {
		return this.x;
	}

	/**
	 * Gets the Y coordinate of this node.
	 */
	getY(): number {
		return this.y;
	}

	/**
	 * Changes the X-coordinate of this node.
	 * @param newX	The new X-coordinate.
	 */
	setX(newX: number) {
		this.x = newX;
	}

	/**
	 * Changes the Y-coordinate of this node.
	 * @param newY	The new X-coordinate.
	 */
	setY(newY: number) {
		this.y = newY;
	}

	/**
	 * Returns the width of this node.
	 */
	getWidth() {
		return this.calcDimensions()[0];
	}

	/**
	 * Returns the height of this node.
	 */
	getHeight() {
		return this.calcDimensions()[1];
	}

	/**
	 * Calculates the dimensions of this node (if it were placed on the given CanvasView)
	 * @param canvasView		The CanvasView with which we measure this node's dimensions
	 */
	calcDimensions(canvasView?: CanvasView): number[] {
		if (this.cachedDimensions == null) {
			if (typeof canvasView === 'undefined') {
				throw new Error("Cannot determine dimensions without a given CanvasView");
			}

			let dimensions = renderText(this.text, canvasView, this.x, this.y, false);

			if (typeof dimensions === 'undefined') {
				throw new Error("Could not determine dimensions");
			}
			let width = dimensions[0] + (this.sidePadding * 2);
			let height = dimensions[1];
			this.cachedDimensions = [width, height];
		}

		return this.cachedDimensions;
	}


	/**
	 * Get the rectangle bounding this PersonNode
	 * @param canvasView	The CanvasView with which we measure this PersonNode's dimensions.
	 */
	getRect(canvasView: CanvasView) {
		let dimensions = this.calcDimensions(canvasView);

		return [this.x + canvasView.x - nodeBorderMargin, // X
			this.y + canvasView.y - nodeBorderMargin, // Y
			dimensions[0] + nodeBorderMargin * 2, // Width
			dimensions[1] + nodeBorderMargin * 2]; // Height
	}

	/**
	 * Determines if the given coordinates fall within this PersonNode.
	 * @param canvasView	The CanvasView with which we determine this PersonNode's dimensions
	 * @param x		The x-coordinate of the click
	 * @param y		The y-coordinate of this click
	 */
	hitTest(canvasView: CanvasView, x: number, y: number) {
		let rect = this.getRect(canvasView);
		let left = rect[0];       // left bound
		let top = rect[1];       // top bound
		let right = left + rect[2];  // right bound
		let bottom = top + rect[3];  // bottom bound

		let isHit = (right >= x && x >= left) && (bottom >= y && y >= top); // Checks if within bounds
		return (isHit) ? this : null;
	}

	/**
	 * Draws this PersonNode on the given CanvasView.
	 * @param canvasView		The CanvasView on which we draw this node.
	 */
	draw(canvasView: CanvasView) {
		let x = this.getX() + canvasView.x;
		let y = this.getY() + canvasView.y;

		let rect = this.getRect(canvasView);
		let rectX = rect[0];
		let rectY = rect[1];
		let width = rect[2];
		let height = rect[3];

		if (canvasView.canvas === null || canvasView.context === null) {
			return;
		}

		// If offscreen, don't bother drawing, just return
		if (x > canvasView.canvas.width || y > canvasView.canvas.height ||
				x + width < 0 || y + height < 0) {
			return;
		}

		// Draws the rectangle
		canvasView.context.fillStyle = bgColor[this.person["sex"]];
		canvasView.context.fillRect(rectX, rectY, width, height);
		renderText(this.text, canvasView, x + this.sidePadding, y);

		// Defaults
		let lineWidth = (this.inFocus || this.ancestorFocus) ? 3 : 1;
		let color = "#000"

		// Special colors
		if (this.inFocus || this.ancestorFocus) {
			color = this.inFocus ? "#FF0" : "#FFC";
		}

		canvasView.context.lineWidth = lineWidth;
		canvasView.context.strokeStyle = color;
		canvasView.context.strokeRect(rectX, rectY, width, height);

		// Draws the images
		const dim = 15 * scale;
		if (this.parentsHidden || this.childrenHidden) {
			let image: CanvasImageSource;
			if (this.parentsHidden && this.childrenHidden) {
				image = imageIcons.doubleArrow;
			}
			else if (this.parentsHidden) {
				image = imageIcons.upArrow;
			}
			else {
				image = imageIcons.downArrow;
			}
			image.width = dim;
			canvasView.context.drawImage(image, x + this.getWidth() - dim, y, dim, dim);
		}

		// What should we use as the user image?
		if (this.details["pics"].length > 0) {
			canvasView.context.drawImage(loadImage(this.details["pics"][0]), x, y, dim, dim);
		}
		else if (this.details["notes"].length > 0) {
			/* If we have any notes and NO custom image, denote it with the notes icon */
			canvasView.context.drawImage(imageIcons.notes, x, y, dim, dim);
		}
	}


	/**
	 * Draws the connecting line from a this INode to a child INode.
	 * @param canvasView    The view on which to draw the lines
	 * @param child         The child node
	 */
	private drawLineToChild(canvasView: CanvasView, child: INode) {
		if (canvasView.context === null) {
			return;
		}

		const childConnector = child.getParentConnectorPoint();
		const childX = childConnector[0] + canvasView.x;
		const childY = childConnector[1] + canvasView.y;

		const parentConnector = this.getChildConnectorPoint();
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


	/**
	 * Draws the lines connecting this node to its children.
	 * @param canvasView		The CanvasView on which we draw these lines
	 */
	drawLinesToChildren(canvasView: CanvasView) {
		for (let desc of this.descendents) {
			this.drawLineToChild(canvasView, desc);
		}
	}
}

/**
 * A group of PersonNodes (used to contain spousal relations).
 */
class PersonNodeGroup implements INode {
	// Fields
	nodes: PersonNode[];
	ancestors: INode[];
	descendents: INode[];
	generation: number;
	shift_distance: number;
	private prevDimensions: number[] | null;
	spousalSpacing: number;
	minHeight: number;
	ancestorFocus: boolean = false;


	/**
	 * Creates a PersonNodeGroup.
	 * @param _nodes	The PersonNodes which comprise this group.
	 */
	constructor(_nodes: PersonNode[]) {
		this.nodes = _nodes;
		this.spousalSpacing = 20 * scale;
		this.minHeight = 0;
		this.prevDimensions = null;
		this.ancestors = [];
		this.descendents = [];
		this.generation = 0;
		this.shift_distance = 0;
	}

	/**
	 * Adjusts the positions of all the member nodes to match the first node.
	 */
	reposition() {
		for (let i = 1; i < this.nodes.length; i++) {
			// width + the extra spousalSpacing
			let xPadding = this.nodes[i - 1].getWidth() + this.spousalSpacing;
			this.nodes[i].setX(this.nodes[i - 1].getX() + xPadding);
			this.nodes[i].setY(this.nodes[i - 1].getY());
		}
	}

	/**
	 * Returns the member node matching the given ID, or null.
	 * @param nodeId	The node ID for which we search
	 */
	getInteriorNodeById(nodeId: string) {
		let matchingId = this.nodes.filter(n => n.getId() === nodeId);
		// If we get a hit, return it. Otherwise, return null
		return matchingId.length >= 1 ? matchingId[0] : null;
	}

	/**
	 * Determines if all the relations of the members of this group are currently visible.
	 * @param structure		The structure object of the entire tree.
	 */
	areRelationsShown(structure: { [key: string]: PersonStructure }) {
		for (let node of this.nodes) {
			node.group = this; // set each nodes group to this

			// Deal w/ parent relationships
			if (!node.parentsHidden) {
				let parents = structure[node.getId()].parents;
				let displayParents = this.ancestors.map(g => g.getIds()).flat()
				node.parentsHidden = parents.some(p => !displayParents.includes(p));
			}

			if (!node.childrenHidden) {
				// Deal w/ children relationships
				let children = structure[node.getId()].children;
				let displayChildren = this.descendents.map(g => g.getIds()).flat();
				node.childrenHidden = children.some(c => !displayChildren.includes(c));
			}

			// Get all of the children of this node
			for (let child of this.descendents) {
				// We check if this child of the Group is also a child of this Node
				if (structure[node.getId()].children.includes(child.getId())) {
					// If it is, then the child is visible - add it to the node
					if (!node.descendents.includes(child)) {
						node.descendents.push(child);
					}
				}
			}
		}
	}

	/**
	 * Get the point at which the parent connects to this node.
	 */
	getParentConnectorPoint() {
		return this.nodes[0].getParentConnectorPoint();
	}

	/**
	 * Get the point at which the child connects to this node.
	 */
	getChildConnectorPoint() {
		return this.nodes[0].getChildConnectorPoint();
	}

	/**
	 * Gets the ID of the first member node.
	 */
	getId() {
		return this.nodes[0].getId()
	}

	/**
	 * Gets the IDs of all the member nodes.
	 */
	getIds() {
		return this.nodes.map(n => n.getId());
	}

	/**
	 * Returns the member nodes of this group.
	 */
	getMembers() {
		return this.nodes;
	}

	/**
	 * Returns the X coordinate of this group.
	 */
	getX() {
		return this.nodes[0].getX();
	}

	/**
	 * Returns the X coordinate of this group.
	 */
	getY() {
		return this.nodes[0].getY();
	}

	/**
	 * Changes the X-coordinate of this node.
	 * @param newX	The new X-coordinate.
	 */
	setX(newX: number) {
		this.nodes[0].setX(newX);
		this.reposition();
	}

	/**
	 * Changes the Y-coordinate of this node.
	 * @param newY	The new X-coordinate.
	 */
	setY(newY: number) {
		this.nodes[0].setY(newY);
		this.reposition();
	}

	/**
	 * Returns the width of this node group.
	 */
	getWidth() {
		return this.calcDimensions()[0];
	}

	/**
	 * Returns the height of this node group.
	 */
	getHeight() {
		return this.calcDimensions()[1];
	}

	/**
	 * Calculates the dimensions of this node group.
	 * @param canvasView		The CanvasView with which we calculate the dimensions of this group.
	 */
	calcDimensions(canvasView?: CanvasView) {
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

	/**
	 * Checks if the given coordinates are inside any of the nodes in this node group.
	 * @param canvasView		The CanvasView on which we test the coordinates
	 * @param x							The x-coordinate to test
	 * @param y							The y-coordinate to test
	 */
	hitTest(canvasView: CanvasView, x: number, y: number) {
		for (let node of this.nodes) {
			let nodeHit = node.hitTest(canvasView, x, y);

			if (nodeHit !== null) {
				return nodeHit;
			}
		}
		return null;
	}


	/**
	 * Draws a line segment between the two sets of given coordinates
	 * @param canvasView    The CanvasView on which to draw the line
	 * @param x1    The starting x-coordinate
	 * @param y1    The starting y-coordinate
	 * @param x2    The end x-coordinate
	 * @param y2    The end y-coordinate
	 * @param width The width of the line
	 * @param color The color of the line
	 */
	private static drawLine(canvasView: CanvasView,
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
	 * Draws this PersonNodeGroup.
	 * @param canvasView		The CanvasView on which we draw this group.
	 */
	draw(canvasView: CanvasView) {
		let lineWidth = 10 * scale; // Spouse line
		let y = this.getY() + (this.minHeight / 2); // Min-height make sure we work w/ the smallest one (ie. we fit all)
		let x2 = this.getX() + this.getWidth();

		PersonNodeGroup.drawLine(canvasView, this.getX(), y, x2, y, lineWidth, "#777");

		for (let node of this.nodes) {
			node.draw(canvasView);
		}
	}

	/**
	 * Draws lines connecting this PersonNodeGroup to its children.
	 * @param canvasView		The CanvasView on which we draw.
	 */
	drawLinesToChildren(canvasView: CanvasView) {
		this.nodes[0].drawLinesToChildren(canvasView);

		// If we have multiple spouses, draw their lines here.
		for (let i = 2; i < this.nodes.length; i++) {
			this.nodes[i].drawLinesToChildren(canvasView);
		}
	}
}