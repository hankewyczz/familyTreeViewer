/**
 * A CanvasView is the canvas on which we create the tree.
 */
class CanvasView {
	data: Data;
	structure: { [key: string]: PersonStructure };
	details: { [key: string]: PersonDetails };

	tree: Tree | null;
	canvas: HTMLCanvasElement | null;
	context: CanvasRenderingContext2D | null;
	focusId: string | null;

	x: number;
	y: number;
	target_x: number;
	target_y: number;

	prev_x: number;
	prev_y: number;
	prev_target_x: number;
	prev_target_y: number;


	dragging: boolean;
	dragTimer: boolean;
	isMouseDown: boolean;

	private static animEase: number = 0.5;

	/**
	 * Creates a CanvasView instance.
	 * @param data  The data associated with this CanvasView
	 */
	constructor(data: Data) {
		this.data = data;
		this.structure = data.structure;
		this.details = data.details;
		this.tree = null;
		this.canvas = null;
		this.context = null;
		this.focusId = null;

		this.x = 0;
		this.y = 0;
		this.target_x = 0;
		this.target_y = 0;

		this.prev_target_x = 0;
		this.prev_target_y = 0;
		this.prev_y = 0;
		this.prev_x = 0;

		this.dragging = false;
		this.dragTimer = false;
		this.isMouseDown = false;
	}


	/**
	 * Gets the top ancestor possible (up to X generations)
	 * @param person_id   The initial person.
	 */
	getTopAncestor(person_id: string) {
		let structure = this.structure;
		// How many generations UP are we willing to go?
		const generations = 4;

		/**
		 * Gets all ancestors from the given person.
		 * @param person  The person we are currently getting the ancestors for.
		 * @param gen     The generation number (relative to the initial person)
		 */
		function getAncestorsInGen(person: string, gen: number): string[] {
			// we're not going further, just return this person
			if (gen == 0) {
				return [person];
			}

			let resultArr: string[] = [];

			if (person in structure) {
				// Gets the gens of each parent as well
				// We go over the REVERSED array. This isn't necessary - it just looks better for my
				//    personal family tree.
				for (let parent of [...structure[person]["parents"]].reverse()) {
					resultArr = resultArr.concat(getAncestorsInGen(parent, gen - 1));
				}
			}
			return resultArr;
		}

		// Checks how many generations we have to go thru
		for (let i = generations; i > 0; i--) {
			let generationResult = getAncestorsInGen(person_id, i);
			if (generationResult.length > 0) {
				// We return the ancestor who is the furthest away from our person
				return generationResult[0];
			}
		}
		// If we don't find anyone, we return this person
		return person_id;
	}


	/**
	 * Initializes our canvas.
	 */
	initCanvas() {
		this.canvas = document.getElementById("canvas") as HTMLCanvasElement;
		this.context = this.canvas.getContext("2d");
	}


	////////////////////////
	// MOUSE AND POSITION //
	////////////////////////
	/**
	 * Helper function for mousePosition and touchPosition
	 * @param event The event to parse
	 */
	parseEventPosition(event: MouseEvent | Touch): number[] {
		if (this.canvas === null) {
			throw new Error("Canvas is null");
		}
		let boundingRect = this.canvas.getBoundingClientRect();
		let x = (event.clientX - boundingRect.left) * (this.canvas.width / boundingRect.width);
		let y = (event.clientY - boundingRect.top) * (this.canvas.height / boundingRect.height);

		return [x, y];
	}

	/**
	 * Gets the touch position (for mobile devices)
	 * @param event The TouchEvent to parse
	 */
	getTouchPosition(event: TouchEvent) {
		// If this is the last touch
		if (event.touches.length == 0) {
			return [this.prev_target_x, this.prev_target_y];
		}
		return this.parseEventPosition(event.touches[0]);
	}

	/**
	 * Generates the animation for dragging.
	 */
	draggingAnim() {
		let elem: CanvasView = this;

		// If we're already in one, we don't want to start a new one
		if (elem.dragTimer) {
			return;
		}

		// We initialize the timer
		elem.dragTimer = true;

		function dragAnim() {
			// get new X, Y coordinates
			elem.x += CanvasView.animEase * (elem.target_x - elem.x);
			elem.y += CanvasView.animEase * (elem.target_y - elem.y);

			// If not dragging + we're within 0.1 of the target:
			if ((!elem.dragging) && (Math.abs(elem.x - elem.target_x) < 0.1)
					&& (Math.abs(elem.y - elem.target_y) < 0.1)) {
				elem.x = elem.target_x;
				elem.y = elem.target_y;
				elem.dragTimer = false;
			}

			elem.redraw();  // Redraw

			if (elem.dragTimer) {
				window.requestAnimationFrame(dragAnim); // If the dragTimer isn't null, we keep going & animate
			}
		}


		window.requestAnimationFrame(dragAnim); // Initialize
	}


	//////////////////////
	//  TREE FUNCTIONS  //
	//////////////////////

	/**
	 * Recreates the tree, re-sets the focus.
	 */
	recreateTree() {
		if (this.focusId === null) {
			throw new Error("No ID is focused");
		}
		this.setFocus(this.focusId, true);
	}

	/**
	 * Gets the true screen center.
	 */
	findScreenCenter() {
		if (this.canvas === null) {
			throw new Error("Canvas is null");
		}
		let right = this.canvas.width;
		let bottom = this.canvas.height;

		// We take the infowindow into account here
		let infoWindow = (document.getElementById("infowindow") as HTMLElement);
		// Check for mobile (infoWindow will never be this wide normally)
		if (infoWindow.offsetWidth >= this.canvas.width * 0.8) {
			bottom -= infoWindow.offsetHeight;
		}
		else { // normal case
			right -= infoWindow.offsetWidth;
		}

		return {"x": (right / 2), "y": (bottom / 2)};
	}

	/**
	 * Sets the ancestor focus for the ancestors of the currently-selected node.
	 * @param node  The node whose ancestors we select.
	 */
	setAncestors(node: any) {
		if (node == null) {
			return;
		}

		for (let ancestor of node.flatAncestors) {
			if (ancestor === null || this.tree === null) {
				continue;
			}
			let ancestorNode = this.tree.lookupNodeById(ancestor[0]);
			if (ancestorNode != null) {
				ancestorNode.ancestorFocus = true;
			}
		}
	}

	/**
	 * Sets the focus on the given node.
	 * @param node      The node to focus on.
	 * @param scaling   Do we change positions, or merely scale?
	 */
	setFocus(node: string, scaling: boolean = false) {
		const center = this.findScreenCenter();
		this.setFocusPosition(node, center.x, center.y, scaling);
	}

	/**
	 * Shows the details of a person in the info frame.
	 * @param personId    The person whose details we display
	 */
	showDetailedView(personId: string) {
		if (personId in this.details) {
			showInInfoWindow(showPersonDetails(this, this.data, this.details[personId]));
		}
		else {
			showError("Person lookup failed", true);
		}
	}


	/**
	 * Sets the focus on the given node at the given position.
	 * @param node      The node to focus on.
	 * @param x         The x-coordinate to focus on
	 * @param y         The y-coordinate to focus on
	 * @param scaling   Do we change positions, or merely scale?
	 */
	setFocusPosition(node: string, x: number, y: number, scaling: boolean = false) {
		this.tree = new Tree(this.structure, this.details, this.getTopAncestor(node));

		if (this.tree === null || this.canvas === null) {
			return;
		}

		this.tree.position(this);

		let theNode = this.tree.lookupNodeById(node);

		if (theNode === null) {
			return;
		}


		if (theNode.redirects) {
			this.setFocus(theNode.redirectsTo);
			return;
		}

		this.setAncestors(theNode);

		this.focusId = node;
		window.location.hash = node;

		const center = this.findScreenCenter();

		if (scaling) {
			this.x = center.x - theNode.getX() - (theNode.getWidth() / 2);
			this.y = center.y - theNode.getY() - (theNode.getHeight() / 2);
		}
		else {
			this.x = x - theNode.getX();
			this.y = y - theNode.getY();
		}

		theNode.inFocus = true;
		this.canvas.focus();
		this.redraw();

		this.showDetailedView(node);


		this.target_x = center.x - theNode.getX() - (theNode.getWidth() / 2);
		this.target_y = center.y - theNode.getY() - (theNode.getHeight() / 2);

		this.draggingAnim();
	}


	/**
	 * Checks the given mouse position hits any of the tree elements.
	 * @param mousePosition   The mouse position [x, y]
	 */
	hitTest(mousePosition: number[]) {
		if (this.tree !== null) {
			return this.tree.hitTest(this, mousePosition[0], mousePosition[1]);
		}
		return null;
	}

	/**
	 * Actions on mouseUp
	 * @param _             Unused
	 * @param mousePosition The mouse position
	 */
	mouseUp(_: any, mousePosition: number[]) {
		let wasDragging = this.dragging;
		this.stopDragging(); // stop dragging

		if (wasDragging) {
			return; // We don't deal w/ drag mouseup cases here
		}

		// Hit-test for current mouse position
		let hitTest1 = this.hitTest(mousePosition);

		// Hit-test for the last click
		let hitTest2 = this.hitTest([this.prev_target_x, this.prev_target_y]);


		if ((hitTest1 === null || hitTest2 === null) || hitTest1 != hitTest2) {
			return; // Both nodes need to be the same (ie. our click and mouseUp must be on the same node)
		}

		this.setFocusPosition(hitTest1.getId(), hitTest1.getX() + this.x, hitTest1.getY() + this.y);
	}

	/**
	 * Stops the dragging animation.
	 */
	stopDragging() {
		this.dragging = false;
		this.isMouseDown = false;
		this.adjustVisibleArea();
	}

	/**
	 * Mousemove actions.
	 * @param buttons       The buttons being held
	 * @param mousePosition The mouse position
	 */
	mouseMove(buttons: any, mousePosition: number[]) {
		// if no longer holding any buttons
		if (buttons == 0) {
			this.stopDragging();
		}

		let x = mousePosition[0] - this.prev_target_x;
		let y = mousePosition[1] - this.prev_target_y;

		if (this.dragging) {
			this.target_x = this.prev_x + x;
			this.target_y = this.prev_y + y;
			this.draggingAnim();
		}
		else if (this.isMouseDown) {
			if (Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2)) > mouseClickRadius) {
				this.dragging = true;
			}
		}
	}

	/**
	 * Actions on mousedown.
	 * @param buttons       The buttons being held.
	 * @param mousePosition The position of the mouse
	 */
	mouseDown(buttons: any, mousePosition: number[]) {
		this.prev_target_x = mousePosition[0];
		this.prev_target_y = mousePosition[1];
		this.prev_x = this.x;
		this.prev_y = this.y;


		let hitTest = this.hitTest(mousePosition);
		if (hitTest === null && !this.dragging) { // Only start dragging if it isn't a node
			this.dragging = true;
		}
		this.isMouseDown = true;

	}

	/**
	 * Sets the canvas size.
	 */
	setCanvasSize() {
		if (this.canvas === null) {
			throw new Error("Canvas is null");
		}

		this.canvas.width = Math.min(window.outerWidth, window.innerWidth);
		this.canvas.height = Math.min(window.outerHeight, window.innerHeight);
	}


	/**
	 * Updates the scaling of this CanvasView
	 * @param newScale  The new scale factor
	 */
	updateScale(newScale: number) {
		if (newScale > 2 || newScale < 0.2) {
			return;
		}
		updateScale(newScale); // takes care of our default variables
		this.recreateTree();
	}

	/**
	 * Zooms in on the contents of this canvas.
	 */
	zoomIn() {
		this.updateScale(scale + .1);
	}

	/**
	 * Zooms out of the contents of this canvas.
	 */
	zoomOut() {
		this.updateScale(scale - 0.1);
	}

	/**
	 * Zeros out the scale of the canvas (back to default).
	 */
	zeroOut() {
		this.updateScale(1);
	}

	/**
	 * Initializes the construction of the members of this CanvasView.
	 * @param initialPerson The person around whom the tree is centered.
	 */
	init(initialPerson: string) {
		let curView: CanvasView = this;
		// Initialize
		this.initCanvas();

		if (this.canvas === null) {
			throw new Error("Canvas is null");
		}

		this.setCanvasSize();
		this.setFocus(initialPerson);

		// Event listeners
		this.canvas.addEventListener("mousedown",
				(e: MouseEvent) => this.mouseDown(e.buttons, this.parseEventPosition(e)),
				false);

		this.canvas.addEventListener("mouseup",
				(e: MouseEvent) => this.mouseUp(e.buttons, this.parseEventPosition(e)),
				false);

		this.canvas.addEventListener("mousemove",
				(e: MouseEvent) => this.mouseMove(e.buttons, this.parseEventPosition(e)),
				false);

		this.canvas.addEventListener("touchstart", (e: TouchEvent) => {
			this.mouseDown(1, this.getTouchPosition(e));
			e.preventDefault(); // just to be safe
			e.stopPropagation();
		}, false);

		this.canvas.addEventListener("touchend", (e: TouchEvent) => {
			this.mouseUp(1, this.getTouchPosition(e));
			e.preventDefault();
			e.stopPropagation();
		}, false);

		this.canvas.addEventListener("touchmove", (e: TouchEvent) => {
			this.mouseMove(1, this.getTouchPosition(e));
			e.stopPropagation();
			e.preventDefault();
		}, false);


		// KEY EVENT LISTENERS //
		/**
		 * Finds the next person in a group (either ancestors or descendents)
		 * @param individual  The individual group (eg. person.ancestors)
		 * @param group       The group group      (eg. person.group.ancestors)
		 */
		function nextRelation(individual: INode[], group: INode[] | null): INode | null {
			// If we have an individual group, we start there
			if (individual.length > 0) {
				return individual[0];
			}

			if (group !== null && group.length > 0) {
				return group[0];
			}

			return null;
		}

		/**
		 * Finds the first ancestor from this given person.
		 * @param node  The node for which we find the first ancestor.
		 */
		function nextAncestor(node: PersonNode) {
			let group = node.group ? node.group.ancestors : null;
			return nextRelation(node.ancestors, group);
		}

		/**
		 * Finds the first descendent from this given person.
		 * @param node  The node for which we find the first descendent.
		 */
		function nextDescendent(node: PersonNode) {
			let group = node.group ? node.group.descendents : null;
			return nextRelation(node.descendents, group);
		}

		/**
		 * Gets a sibling from this person's sibling group
		 * @param indexChange	How much should the index be changed (relative to this person's index
		 * 												in their sibling group?)
		 */
		function getSibling(indexChange: number) {
			if (curView.tree === null || curView.focusId === null) {
				return;
			}
			let node = curView.tree.lookupNodeById(curView.focusId) as PersonNode;
			let parentNode = nextAncestor(node);


			if (parentNode !== null) {
				let siblings = parentNode.descendents;

				// Individual case
				let index = siblings.indexOf(node);
				// Group case
				if (index < 0 && node.group) {
					index = siblings.indexOf(node.group);
				}

				index += indexChange;

				if (index >= 0 && index < siblings.length) {
					return siblings[index]; // Get the sibling
				}
			}
			return null;
		}

		/**
		 * Key event listeners
		 * @param keyEvent	A keyEvent
		 */
		function keyEventListeners(keyEvent: KeyboardEvent) {
			let target = null;

			// Don't mess w/ any system shortcuts
			if (keyEvent.ctrlKey || keyEvent.altKey || keyEvent.metaKey) {
				return;
			}

			let node: PersonNode | null;
			switch (keyEvent.key) {
				case "-":
					curView.zoomOut();
					keyEvent.preventDefault();
					break;

				case "=":
				case "+":
					curView.zoomIn();
					keyEvent.preventDefault();
					break;

				case "0": // Zero
					curView.zeroOut();
					keyEvent.preventDefault();
					break

				case "ArrowUp": // Up arrow
				case "Up":
					if (curView.tree === null || curView.focusId === null) {
						break;
					}
					node = curView.tree.lookupNodeById(curView.focusId);
					if (node === null) {
						break;
					}

					target = nextAncestor(node);
					keyEvent.preventDefault();
					break;

				case "ArrowDown": // Down arrow
				case "Down":
					if (curView.tree === null || curView.focusId === null) {
						break;
					}
					node = curView.tree.lookupNodeById(curView.focusId);
					if (node === null) {
						break;
					}

					target = nextDescendent(node);
					keyEvent.preventDefault();
					break;

				case "ArrowLeft": // Left arrow
				case "Left":
					target = getSibling(-1);
					keyEvent.preventDefault();
					break;

				case "ArrowRight": // Right arrow
				case "Right":
					target = getSibling(1);
					keyEvent.preventDefault();
					break;

				case "Tab": // Tab
					// Switch spouses
					if (curView.tree === null || curView.focusId === null) {
						break;
					}
					node = curView.tree.lookupNodeById(curView.focusId);

					if (node === null) {
						break;
					}

					if (node.group) {
						const spouses = node.group.getMembers();
						const currentIndex = spouses.indexOf(node);
						if (currentIndex + 1 < spouses.length) {
							target = spouses[currentIndex + 1];
						}
					}

					keyEvent.preventDefault();
					break;
			}

			if (target != null) {
				let x = target.getX() + curView.x;
				let y = target.getY() + curView.y
				curView.setFocusPosition(target.getId(), x, y);
			}
		}


		this.canvas.addEventListener("keydown", function (keyEvent: KeyboardEvent) {
			keyEventListeners(keyEvent);
		}, false);

		window.addEventListener("resize", function (_) {
			curView.setCanvasSize();
			curView.adjustVisibleArea();
			curView.redraw();
		}, false);

		window.addEventListener("hashchange", function (_) {
			let hash = getHashString();
			if (hash === "") {
				hash = initialPerson;
			}
			if (curView.focusId == hash) {
				return;
			}
			curView.setFocus(hash);
		});
	}

	/**
	 * Adjusts the visible area of this CanvasView.
	 */
	adjustVisibleArea() {
		let changed = false;
		if (this.tree === null) {
			return;
		}
		let boundaries = this.tree.getBoundaries();

		if (boundaries === null || this.canvas === null) {
			return;
		}


		if (boundaries[2] + this.x < 0) {
			this.target_x = (this.canvas.width / 2) - boundaries[2];
			changed = true;
		}

		if (boundaries[3] + this.y < 0) {
			this.target_y = (this.canvas.height / 2) - boundaries[3];
			changed = true;
		}
		if (boundaries[0] + this.x > this.canvas.width) {
			this.target_x = (this.canvas.width / 2) + boundaries[0];
			changed = true;
		}
		if (boundaries[1] + this.y > this.canvas.height) {
			this.target_y = (this.canvas.height / 2) - boundaries[1];
			changed = true;
		}

		if (changed) {
			this.draggingAnim();
		}
	}

	/**
	 * Redraws this canvas and its contents.
	 */
	redraw() {
		if (this.canvas === null || this.context === null) {
			return;
		}

		if (this.tree != null) {
			this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
			this.tree.draw(this);
		}
	}

	/**
	 * Creates an HTMLAnchorElement linking to a person.
	 * @param id		The person ID we link to.
	 */
	makePersonLink(id: string) {
		// Create a link to the given person
		const personNameLink = document.createElement("a");
		personNameLink.style.cursor = "pointer";

		const person = this.data.findPersonById(id);
		if (person === null) {
			return null;
		}
		const personName = displayName(person.name);

		// Set the link text
		personNameLink.appendChild(document.createTextNode(personName));
		// Make sure the link goes to the correct person
		(personNameLink as any)["link_person_id"] = id;
		personNameLink.addEventListener("click",
				(e: any) => this.setFocus(e.currentTarget["link_person_id"]));

		return personNameLink;
	}
}