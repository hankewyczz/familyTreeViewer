// Handles the canvasView
class View {
  data: any;
  structure: { [key: string]: PersonStructure };
  details: { [key: string]: PersonDetails };

  tree: Tree | null;
  dragTimer: any | null;
  canvas: any | null;
  context: any | null;
  focusId: any | null;

  scrollx: number;
  scrolly: number;
  targetx: number;
  targety: number;
  lastclickposx: number;
  lastclickposy: number;
  lastscrollposy: number;
  lastscrollposx: number;

  dragging: boolean;
  ismousedown: boolean;

  animEase: number;

  constructor(data: any) {
    this.data = data;
    this.structure = data["structure"];
    this.details = data["details"];
    this.tree = null;
    this.dragTimer = null;
    this.canvas = null;
    this.context = null;
    this.focusId = null;

    this.scrollx = 0;
    this.scrolly = 0;
    this.targetx = 0;
    this.targety = 0;
    this.lastclickposx = 0;
    this.lastclickposy = 0;
    this.lastscrollposy = 0;
    this.lastscrollposx = 0;

    this.dragging = false;
    this.ismousedown = false;

    // The amount by which to ease the animation
    this.animEase = 0.5;
  }


  // Gets the top ancestor possible (up to X generations)
  //todo generation limit
  getTopAncestor(personid: string, generations = 4) {
    let structure = this.structure;

    // Gets all the ancestors up to the given
    function getAncestorsInGen(person: string, gen: number): any {
      var result: any[] = [];

      // we're not going further, just return this person
      if (gen == 0) {
        return [person];
      }

      if (person in structure) {
        // Gets the gens of each parent as well
        var parents = structure[person]["parents"];
        for (var j = parents.length - 1; j >= 0; j--) {
          result = result.concat(getAncestorsInGen(parents[j], gen - 1));
        }
      }
      return result;
    }

    var result = null;
    // Checks how many generations we have to go thru
    for (var i = generations; i >= 0; i--) {
      var generationResult = getAncestorsInGen(personid, i);
      if (generationResult.length > 0) {
        result = generationResult[0]; // Basically, this returns the male ancestor who is
        // the max generations (< generation) away from the given person
        break;
      }
    }
    return result;
  }


  // initializes the canvas
  initCanvas() {
    this.canvas = document.getElementById("canvas");
    this.context = this.canvas.getContext("2d");
  }

  ////////////////////////
  // MOUSE AND POSITION //
  ////////////////////////

  // Helper function for mousePosition and touchPosition
  parseEventPosition(event: any): number[] {
    var boundingRect = this.canvas.getBoundingClientRect();
    var x = (event.clientX - boundingRect.left) * (this.canvas.width / boundingRect.width);
    var y = (event.clientY - boundingRect.top) * (this.canvas.height / boundingRect.height);

    return [x, y];
  }


  // gets the true mouse position
  getMousePosition(event: any) {
    return this.parseEventPosition(event);
  }

  // Gets the touch position (for mobile devices)
  getTouchPosition(event: any) {
    // If this is the last touch
    if (event.touches.length == 0) {
      return [this.lastclickposx, this.lastclickposy];
    }
    return this.parseEventPosition(event.touches[0]);
  }

  // Animation for the dragging
  draggingAnim() {
    var elem: any = this;
    if (elem.dragTimer != null) {
      return;
    }

    // We initialize the timer
    elem.dragTimer = true;

    function dragAnim() {
      // get new X, Y coordinates
      elem.scrollx += elem.animEase * (elem.targetx - elem.scrollx);
      elem.scrolly += elem.animEase * (elem.targety - elem.scrolly);

      // If not dragging + we're within 0.1 of the targetx and targety:
      if ((!elem.dragging) && (Math.abs(elem.scrollx - elem.targetx) < 0.1)
          && (Math.abs(elem.scrolly - elem.targety) < 0.1)) {
        elem.scrollx = elem.targetx;
        elem.scrolly = elem.targety;
        elem.dragTimer = null;
      }
      elem.redraw();  // Redraw
      if (elem.dragTimer != null) {
        requestAnimFrame(dragAnim); // If the dragTimer isn't null, we keep going & animate
      }
    }

    requestAnimFrame(dragAnim); // Initialize
  }

  //////////////////////
  //  TREE FUNCTIONS  //
  //////////////////////

  // Generate the tree
  makeTree(nodeid: string) {
    var ancestor = this.getTopAncestor(nodeid);
    // Handle ancestor errors
    if (ancestor == null) {
      showError("No ancestor (" + nodeid + ") was found", true);
      return null;
    }
    return new Tree(this.structure, this.details, ancestor);
  }

  recreateTree() {
    this.setFocus(this.focusId);
  } // we just set focus to current node, redraw tree

  // Gets the true screen center
  findScreenCenter() {
    var left = 0;
    var top = 0;
    var right = this.canvas.width;
    var bottom = this.canvas.height;

    // We take the infowindow into account here
    var infoWindow = (document.getElementById("infowindow") as HTMLElement);
    if (isVisible(infoWindow)) {
      // Check for mobile (infoWindow will never be this wide normally)
      if (infoWindow.offsetWidth >= this.canvas.width * 0.8) {
        bottom -= infoWindow.offsetHeight;
      } else { // normal case
        right -= infoWindow.offsetWidth;
      }
    }

    return {"x": left + ((right - left) / 2), "y": top + ((bottom - top) / 2)};
  }

  setAncestors(node: any) {
    if (node == null) {
      return;
    }

    for (let ancestor of node.ancestors) {
      if (ancestor === null || this.tree === null) {
        continue;
      }
      let ancestorNode = this.tree.lookupNodeById(ancestor[0]);
      if (ancestorNode != null) {
        ancestorNode.ancestorFocus = true;
      }
    }

  }

  setFocus(node: string) {


    console.log(node);
    this.tree = this.makeTree(node);

    if (this.tree == null) {
      return;
    }


    let theNode = this.tree.lookupNodeById(node) as PersonNode;
    if (theNode.redirects) {
      node = theNode.redirectsTo;
      this.setFocus(node);
      return;
    }

    this.setAncestors(theNode); // highlight ancestors
    this.focusId = node; // Focus on the given node
    window.location.hash = node; // Change window hash

    this.tree.position(this);

    const center = this.findScreenCenter();


    this.scrollx = this.targetx = center.x - theNode.getX() - (theNode.getWidth() / 2);
    this.scrolly = this.targety = center.y - theNode.getY() - (theNode.getHeight() / 2);

    theNode.inFocus = true;
    this.canvas.focus();
    this.redraw();

    if (isVisible(document.getElementById("infowindow") as HTMLElement)) {
      this.showDetailedView(node); // If the info window is open, update it
    }

  }

  setFocusPosition(node: string, x: number, y: number) {
    this.tree = this.makeTree(node);
    if (this.tree == null) {
      return;
    }

    this.tree.position(this);
    let theNode = this.tree.lookupNodeById(node) as PersonNode;


    if (theNode.redirects) {
      node = theNode.redirectsTo;
      this.setFocus(node);
      return;
    }
    this.setAncestors(theNode);

    this.focusId = node;
    window.location.hash = node;

    this.scrollx = x - theNode.getX();
    this.scrolly = y - theNode.getY();

    theNode.inFocus = true;
    this.canvas.focus();
    this.redraw();

    if (isVisible(document.getElementById("infowindow") as HTMLElement)) {
      this.showDetailedView(node);
    }

    const center = this.findScreenCenter();
    this.targetx = center.x - theNode.getX() - (theNode.getWidth() / 2);
    this.targety = center.y - theNode.getY() - (theNode.getHeight() / 2);
    this.draggingAnim();
  }


  isHit(mousePosition: number[]) {

    if (this.tree !== null) {
      let nodeHit = this.tree.isHit(this, mousePosition[0], mousePosition[1]);

      if (nodeHit !== null) {
        return nodeHit;
      }
    }
    return null;
  }


  mouseUp(_: any, mousePosition: number[]) {
    var wasDragging = this.dragging;
    this.stopDragging(); // stop dragging

    if (wasDragging) {
      return; // We don't deal w/ drag mouseup cases here
    }

    // Hit-test for current mouse position
    let hitTest1 = this.isHit(mousePosition);

    // Hit-test for the last click
    let hitTest2 = this.isHit([this.lastclickposx, this.lastclickposy]);


    if (hitTest1 === null || hitTest2 === null) {
      return;
    }


    if (hitTest1 != hitTest2) {
      return; // Both nodes need to be the same (ie. our click and mouseUp must be on the same node)
    }

    this.setFocusPosition(hitTest1.getId(), hitTest1.getX() + this.scrollx, hitTest1.getY() + this.scrolly);
  }


  // DETAILS
  lookupDetails(personId: string, callback: any) {
    if (personId in this.details) {
      callback(this.details[personId]);
      return;
    }
  }

  showDetailedView(personId: string) {
    var thisEl = this;

    this.lookupDetails(personId,
        function (thisDetails: any) {
          if (thisDetails == null) {
            showError("Person lookup failed", true);
          } else {
            showInfoWindow(getDetails(thisEl, thisEl.data, thisDetails));
          }
        });
  }


  // Mouse Functions
  stopDragging() {
    this.dragging = false;
    this.ismousedown = false;
    this.adjustVisibleArea();
  }

  // On mousemove
  mouseMove(buttons: any, mousePosition: number[]) {
    // if (window.event) {
    //   buttons = window.event.button || buttons;
    // }

    if (buttons == 0) {
      this.stopDragging();
    } // if no longer holding

    let x = mousePosition[0] - this.lastclickposx;
    let y = mousePosition[1] - this.lastclickposy;

    if (this.dragging) {
      this.targetx = this.lastscrollposx + x;
      this.targety = this.lastscrollposy + y;
      this.draggingAnim();
    }
    else if (this.ismousedown) {
      if (Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2)) > mouseClickRadius) {
        this.dragging = true;
      }
    }
  }

  // On mousedown
  mouseDown(buttons: any, mousePosition: number[]) {
    this.lastclickposx = mousePosition[0];
    this.lastclickposy = mousePosition[1];
    this.lastscrollposx = this.scrollx;
    this.lastscrollposy = this.scrolly;

    let hitTest = this.isHit(mousePosition);
    if (hitTest === null && !this.dragging) { // Only start dragging if it isn't a node
      this.dragging = true;
    }
    this.ismousedown = true;
  }


  setCanvasSize() {
    this.canvas.width = Math.min(window.outerWidth, window.innerWidth);
    this.canvas.height = Math.min(window.outerHeight, window.innerHeight);
  }


  /// SCALING
  changeScale(newScale: number) {
    if (newScale > 2 || newScale < 0.2) {
      return;
    }
    scale = newScale;
    updateScale(scale); // takes care of our default variables
    [baseFont, detailFont].map(f => f.setSize(f.getBaseSize() * scale));

    this.recreateTree();
  }

  zoomIn() {
    var newScale = scale + 0.1;
    this.changeScale(newScale);
  }

  zoomOut() {
    var newScale = scale - 0.1;
    this.changeScale(newScale);
  }

  zeroOut() {
    this.changeScale(1);
  }


  init(intialPerson: string) {
    var curView = this;

    // Intitialize
    this.initCanvas();
    this.setCanvasSize();
    this.setFocus(intialPerson);

    // Event listeners
    this.canvas.addEventListener("mousedown", function (mEvent: MouseEvent) {
      curView.mouseDown(mEvent.buttons, curView.getMousePosition(mEvent));
    }, false);

    this.canvas.addEventListener("mouseup", function (mEvent: MouseEvent) {
      curView.mouseUp(mEvent.buttons, curView.getMousePosition(mEvent));
    }, false);

    this.canvas.addEventListener("mousemove", function (mEvent: MouseEvent) {
      curView.mouseMove(mEvent.buttons, curView.getMousePosition(mEvent));
    }, false);

    this.canvas.addEventListener("touchstart", function (mEvent: MouseEvent) {
      curView.mouseDown(1, curView.getTouchPosition(mEvent));
      mEvent.preventDefault(); // just to be safe
      mEvent.stopPropagation();
    }, false);

    this.canvas.addEventListener("touchend", function (mEvent: MouseEvent) {
      curView.mouseUp(1, curView.getTouchPosition(mEvent));
      mEvent.preventDefault();
      mEvent.stopPropagation();
    }, false);

    this.canvas.addEventListener("touchmove", function (mEvent: MouseEvent) {
      curView.mouseMove(1, curView.getTouchPosition(mEvent));
      mEvent.stopPropagation();
      mEvent.preventDefault();
    }, false);

    // KEY EVENT LISTENERS //
    // Finds the next relation in the groups given
    function upDown(relations: any, groupRelations: any) {
      if (relations.length > 0) {
        return relations[0]; // If we can go up/down, target is the first one
      } else if (groupRelations && groupRelations.length > 0) {
        return groupRelations[0]; // If they're grouped, the group has them
      }
    }

    function moveSiblings(lowerBound: number, upperBound: number, change: any) {
      var target = null;
      if (curView.tree === null) {
        return;
      }
      var node = curView.tree.lookupNodeById(curView.focusId) as PersonNode;
      var groupUp = node.group ? node.group.ancestorsUp : null;
      var parentNode = upDown(node.ancestorsUp, groupUp) || null;


      if (parentNode) {
        var siblings = parentNode.descendentsDown;
        var index = siblings.indexOf(node);

        if (index < 0 && node.group) { // Group case
          index = siblings.indexOf(node.group);
        }
        if (index > lowerBound && index < (siblings.length + upperBound)) {
          target = siblings[index + change]; // Get the sibling
        }
      }
      return target;
    }

    function keyEventListeners(keyEvent: KeyboardEvent) {
      var target = null;

      // Don't mess w/ any system shortcuts (we use metaKey in case of macs)
      if (keyEvent.ctrlKey || keyEvent.altKey || keyEvent.metaKey) {
        return;
      }

      switch (keyEvent.keyCode) {
        case 189:
        case 173: // MINUS (and the seperate FireFox minus keycode)
          curView.zoomOut();
          keyEvent.preventDefault();
          break;

        case 187:
        case 61: // PLUS (and FireFox's plus)
          curView.zoomIn();
          keyEvent.preventDefault();
          break;

        case 48: // Zero
          curView.zeroOut();
          keyEvent.preventDefault();
          break

        case 38:
        case 87: // up arrow and W
          if (curView.tree === null) {
            break;
          }
          var node = curView.tree.lookupNodeById(curView.focusId);
          if (node === null) {
            break;
          }
          var groupUp = node.group ? node.group.ancestorsUp : null;
          target = upDown(node.ancestorsUp, groupUp);
          keyEvent.preventDefault();
          break;

        case 40:
        case 83: // Down arrow and S key
          if (curView.tree === null) {
            break;
          }
          var node = curView.tree.lookupNodeById(curView.focusId);
          if (node === null) {
            break;
          }
          var groupDown = node.group ? node.group.descendentsDown : null;
          target = upDown(node.descendentsDown, groupDown);
          keyEvent.preventDefault();
          break;

        case 37:
        case 65: // Left arrow and A key
          target = moveSiblings(0, 0, -1);
          keyEvent.preventDefault();
          break;

        case 39:
        case 68: //  Right arrow and D key
          target = moveSiblings(-1, -1, 1);
          keyEvent.preventDefault();
          break;

          keyEvent.preventDefault();
          break;

        case 9: // Tab
          // Switch spouses
          if (curView.tree === null) {
            break;
          }
          var node = curView.tree.lookupNodeById(curView.focusId);
          if (node === null) {
            break;
          }
          if (node.group) {
            var spouses = node.group.getMembers();
            var currentIndex = spouses.indexOf(node);
            if (currentIndex + 1 < spouses.length) {
              target = spouses[currentIndex + 1];
            }
          }

          keyEvent.preventDefault();
          break;
      }

      if (target != null) {
        let x = target.getX() + curView.scrollx;
        let y = target.getY() + curView.scrolly
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
      var hash = getHashString();
      if (hash == "") {
        hash = intialPerson;
      }
      if (curView.focusId == hash) {
        return;
      }
      curView.setFocus(hash);
    });
  }

  adjustVisibleArea() {
    var changed = false;
    if (this.tree === null) {
      return;
    }
    let boundaries: number[] | null = this.tree.getBoundaries();

    if (boundaries === null) {
      return;
    }


    if (boundaries[2] + this.scrollx < 0) {
      this.targetx = (this.canvas.width / 2) - boundaries[2];
      changed = true;
    }

    if (boundaries[3] + this.scrolly < 0) {
      this.targety = (this.canvas.height / 2) - boundaries[3];
      changed = true;
    }
    if (boundaries[0] + this.scrollx > this.canvas.width) {
      this.targetx = (this.canvas.width / 2) + boundaries[0];
      changed = true;
    }
    if (boundaries[1] + this.scrolly > this.canvas.height) {
      this.targety = (this.canvas.height / 2) - boundaries[1];
      changed = true;
    }

    if (changed) {
      this.draggingAnim();
    }
  }

  redraw() {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.tree != null) {
      this.tree.draw(this);
    }
  }
}