// An interface for either a single person node, or a group of nodes (spousal group)
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
  drawLines: (canvasView: CanvasView) => void;
}


// Creates the text for each node
function makeNodeText(person: PersonStructure): StyledText[] {
  // Splits between the forenames and surnames
  let names = person["name"].split("/", 2);
  // Joins them with a linebreak in between the two
  let result = [new StyledText(names, baseFont)];

  // If we have birth/death data, we append it to the result
  const sex: string = person["sex"].toUpperCase();
  let langArray: { [key: string]: any } = getLang();

  // Parses the date into a StyledText
  function dateToStyledText(dateStr: string[], eventWord: string) {
    let str = dateStr[0];

    if (str === "") {
      return null;
    }
    return new StyledText([`${eventWord} ${str}`], detailFont);
  }

  let eventStrs = [dateToStyledText(person["birth"], langArray["born"][sex]),
    dateToStyledText(person["death"], langArray["died"][sex])];

  for (let str of eventStrs) {
    if (str !== null) {
      result = result.concat(str);
    }
  }

  return result;
}


// Generates a node
class PersonNode implements INode {
  person: PersonStructure;
  details: PersonDetails;
  text: StyledText[];
  private prevDimensions: null | number[];
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


  constructor(_person: PersonStructure, pDetails: PersonDetails) {
    this.person = _person;
    this.details = pDetails;
    this.text = makeNodeText(_person); // Generates the text for this node
    this.prevDimensions = null;

    this.sidePadding = 20 * scale;

    this.x = 0;
    this.y = 0;

    this.ancestors = [];         // Top ancestor(s) a level up (ie. first parent)
    this.descendents = []; // Direct children a level down
    this.generation = 0; // generation
    this.shift_distance = 0; // if we need to shift the cell to fit
    this.parentsHidden = this.details.parentsHidden; // Are the parents hidden?
    this.childrenHidden = this.details.childrenHidden; // Are the children hidden?
    this.inFocus = false; // Is this the node currently in focus
    this.ancestorFocus = false; // Is this node the ancestor of the currently focused node?
    this.group = null; // by default we have no group
    this.redirects = pDetails.redirects;
    this.redirectsTo = pDetails.redirectsTo;
    this.flatAncestors = pDetails.ancestors;
  }

  // Returns the interior node
  getInteriorNodeById(_: string): PersonNode {
    return this;
  }

  // Establishes relations (determines if any are hidden)
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

  getChildConnectorPoint() {
    let newX = this.x + this.getWidth() / 2;
    let newY = this.y + this.getHeight() + nodeBorderMargin;
    return [newX, newY];
  }

  getParentConnectorPoint() {
    let newX = this.x + this.getWidth() / 2;
    let newY = this.y - nodeBorderMargin;
    return [newX, newY];
  }

  getId() {
    return this.person.id;
  }

  getIds() {
    return [this.person.id];
  }


  // Positioning
  getX(): number {
    return this.x;
  }

  getY(): number {
    return this.y;
  }

  setX(newX: number) {
    this.x = newX;
  }

  setY(newY: number) {
    this.y = newY;
  }


  // Dimensions
  getWidth() {
    return this.calcDimensions()[0];
  }

  getHeight() {
    return this.calcDimensions()[1];
  }

  calcDimensions(canvasView?: CanvasView): number[] {
    if (this.prevDimensions == null) {
      if (typeof canvasView === 'undefined') {
        throw new Error("Cannot determine dimensions without a given canvas view");
      }

      let dimensions = renderText(this.text, canvasView, this.x, this.y, false);

      if (typeof dimensions === 'undefined') {
        throw new Error("Could not determine dimensions");
      }
      let width = dimensions[0] + (this.sidePadding * 2);
      let height = dimensions[1];
      this.prevDimensions = [width, height];
    }

    return this.prevDimensions;
  }

  // Get the rectangle bounding this PersonNode
  getRect(canvasView: CanvasView) {
    let dimensions = this.calcDimensions(canvasView);

    return [this.x + canvasView.x - nodeBorderMargin, // X
      this.y + canvasView.y - nodeBorderMargin, // Y
      dimensions[0] + nodeBorderMargin * 2, // Width
      dimensions[1] + nodeBorderMargin * 2]; // Height
  }

  hitTest(canvasView: CanvasView, x: number, y: number) {
    let rect = this.getRect(canvasView);
    let left = rect[0];       // left bound
    let top = rect[1];       // top bound
    let right = left + rect[2];  // right bound
    let bottom = top + rect[3];  // bottom bound

    let isHit = (right >= x && x >= left) && (bottom >= y && y >= top); // Checks if within bounds
    return (isHit) ? this : null;
  }

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
      color = this.inFocus ? "#FF0" : "#DD0";
    }

    canvasView.context.lineWidth = lineWidth;
    canvasView.context.strokeStyle = color;
    canvasView.context.strokeRect(rectX, rectY, width, height);

    // Draws the images
    const dim = 15 * scale;
    if (this.parentsHidden || this.childrenHidden) {
      let image: CanvasImageSource;
      if (this.parentsHidden && !this.childrenHidden) {
        image = imageIcons.upArrow;
      } else if (!this.parentsHidden && this.childrenHidden) {
        image = imageIcons.downArrow;
      } else {
        image = imageIcons.doubleArrow;
      }
      image.width = dim;
      canvasView.context.drawImage(image, x + this.getWidth() - dim, y, dim, dim);
    }

    // What should we use as the user image?
    if (this.details["pics"].length > 0) {
      canvasView.context.drawImage(loadImage(this.details["pics"][0]), x, y, dim, dim);
    } else if (this.details["notes"].length > 0) {
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


  drawLines(canvasView: CanvasView) {
    for (let desc of this.descendents) {
      this.drawLineToChild(canvasView, desc);
    }
  }
}


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


  constructor(_nodes: any[]) {
    this.nodes = _nodes;
    this.spousalSpacing = 20 * scale;
    this.minHeight = 0;
    this.prevDimensions = null;
    this.ancestors = [];
    this.descendents = [];
    this.generation = 0;
    this.shift_distance = 0;
  }


  reposition() {
    for (let i = 1; i < this.nodes.length; i++) {
      // width + the extra spousalSpacing
      let xPadding = this.nodes[i - 1].getWidth() + this.spousalSpacing;
      this.nodes[i].setX(this.nodes[i - 1].getX() + xPadding);
      this.nodes[i].setY(this.nodes[i - 1].getY());
    }
  }


  getInteriorNodeById(nodeId: string) {
    let matchingId = this.nodes.filter(n => n.getId() === nodeId);
    // If we get a hit, return it. Otherwise, return null
    return matchingId.length >= 1 ? matchingId[0] : null;
  }

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

  getParentConnectorPoint() {
    return this.nodes[0].getParentConnectorPoint();
  }

  getChildConnectorPoint() {
    return this.nodes[0].getChildConnectorPoint();
  }


  getId() {
    return this.nodes[0].getId()
  }

  getIds() {
    return this.nodes.map(n => n.getId());
  }

  getMembers() {
    return this.nodes;
  }


  getX() {
    return this.nodes[0].getX();
  }

  getY() {
    return this.nodes[0].getY();
  }

  setX(newX: number) {
    this.nodes[0].setX(newX);
    this.reposition();
  }

  setY(newY: number) {
    this.nodes[0].setY(newY);
    this.reposition();
  }

  // Dimension calculations
  getWidth() {
    return this.calcDimensions()[0];
  }

  getHeight() {
    return this.calcDimensions()[1];
  }

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
   * @param canvasView    The view on which to draw the line
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

  draw(canvasView: CanvasView) {
    let lineWidth = 10 * scale; // Spouse line
    let y = this.getY() + (this.minHeight / 2); // Min-height make sure we work w/ the smallest one (ie. we fit all)
    let x2 = this.getX() + this.getWidth();

    PersonNodeGroup.drawLine(canvasView, this.getX(), y, x2, y, lineWidth, "#777");

    for (let node of this.nodes) {
      node.draw(canvasView);
    }
  }

  drawLines(canvasView: CanvasView) {
    this.nodes[0].drawLines(canvasView);

    for (let i = 2; i < this.nodes.length; i++) { // For multiple spouses
      this.nodes[i].drawLines(canvasView);
    }
  }
}