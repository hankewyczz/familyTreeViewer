/**
 * Represents a group of identically-styled segments of text.
 */
class StyledText {
  // The texts
  text: string[];
  // Their attributes
  attributes: TextAttributes;

  /**
   * Creates a new StyledText instance.
   * @param text      The array of text
   * @param attributes  The text attributes
   */
  constructor(text: string[], attributes: TextAttributes) {
    this.text = text;
    this.attributes = attributes;
  }
}


/**
 * Attributes of a segment of text.
 */
class TextAttributes {
  // Sizing
  size: number;
  baseSize: number;
  // Style
  font: string;
  color: string;
  // Cached height
  prevHeight: number;


  /**
   * Creates a TextAttributes instance.
   * @param font      The font of the text
   * @param color     The color of the text
   * @param baseSize  The base size of the text
   */
  constructor(font: string, color: string, baseSize: number) {
    this.size = baseSize;
    this.baseSize = baseSize;
    this.font = font;
    this.color = color;
    this.prevHeight = 0;
  }

  /**
   * Calculates the true size of text in this font on the canvas.
   */
  calcTextHeight(): number {
    let body = document.getElementsByTagName("body")[0];
    let tempDiv = document.createElement("div");
    let tempText = document.createTextNode("DUMMY TEXT");

    tempDiv.appendChild(tempText);
    // Set the text-style attributes of this div
    tempDiv.setAttribute("style", `font: ${this.attributeString()}`);

    body.appendChild(tempDiv);
    let height = tempDiv.offsetHeight;
    body.removeChild(tempDiv);

    // Now that we've done the work, we null tempDiv to remove the reference
    // @ts-ignore (tempDiv isn't of type null, but I'm discarding of it)
    tempDiv = null;

    return height;
  }

  /**
   * Scales the size of this TextAttribute (new size = base size * scale).
   * @param scale The scale factor by which we scale the size.
   */
  scaleSize(scale: number) {
    this.size = this.baseSize * scale;
    this.prevHeight = 0; // We have to recalculate the height
  }

  /**
   * Gets the line-height of text in with these attributes
   */
  getHeight() {
    if (this.prevHeight <= 0) { // In this case, we haven't calculated it yet
      this.prevHeight = this.calcTextHeight();
    }
    return this.prevHeight;
  }

  /**
   * Returns the attributes of this TextAttr in a CSS-styled string.
   */
  attributeString() {
    return `${this.size}px ${this.font}`;
  }

  /**
   * Applies the text-style to the given View.
   * @param view  The View to which we apply these text attributes
   */
  apply(view: CanvasView) {
    if (view.context !== null) {
      view.context.font = this.attributeString();
      view.context.fillStyle = this.color;
    }
  }
}


//// FONTS
const baseFont = new TextAttributes("sans-serif", "#000", 13);
const detailFont = new TextAttributes("sans-serif", "#333", 11);


/**
 * Renders all of the texts in a given array of StyledTexts.
 * @param texts The StyledTexts which we are rendering
 * @param view  The View on which the text will be rendered
 * @param _x    The initial top-left x coordinate of the area on which we render the text
 * @param _y    The initial top-left y coordinate
 * @param display Whether this text should be displayed or not
 *                    The default is true; if false, the text is likely only begin used for
 *                    measurements.
 */
function renderText(texts: StyledText[], view: CanvasView, _x: number, _y: number,
                    display: boolean = true): number[] | void {
  if (view.context === null) {
    return;
  }

  view.context.textBaseline = "top";
  let maxWidth = 0;
  let lineHeight = 0;

  let cur_y = _y;


  texts.map(t => {
    // Apply the attributes of this StyledText
    t.attributes.apply(view);

    // Render all of the texts
    for (let text of t.text) {
      if (view.context === null) {
        return;
      }

      // Only draw it if it should be displayed
      if (display)  {
        view.context.fillText(text, _x, cur_y);
      }

      let curWidth = view.context.measureText(text).width - _x;
      maxWidth = Math.max(maxWidth, curWidth);
      lineHeight = Math.max(lineHeight, t.attributes.getHeight());


      // Create a line-break between each one
      cur_y += lineHeight;
      lineHeight = 0;  // Reset the line-height
    }

  })

  // Returns the width and height of the resulting text
  return [maxWidth, (cur_y + lineHeight) - _y];
}