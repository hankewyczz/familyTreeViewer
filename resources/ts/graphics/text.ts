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
  }

  /**
   * Scales the size of this TextAttribute (new size = base size * scale).
   * @param scale The scale factor by which we scale the size.
   */
  scaleSize(scale: number) {
    this.size = Math.trunc(this.baseSize * scale);
  }

  /**
   * Gets the line-height of text in with these attributes
   */
  getHeight() {
    // Hacky approximation of line-height; JS doesn't have a widely-supported proper way of doing this.
    return Math.trunc(this.size * 1.1);
  }

  /**
   * Applies the text-style to the given View.
   * @param view  The View to which we apply these text attributes
   */
  apply(view: CanvasView) {
    if (view.context !== null) {
      view.context.font = `${this.size}px ${this.font}`;
      view.context.fillStyle = this.color;
    }
  }
}


// Our font-styles
const baseFont = new TextAttributes("sans-serif", "#000000", 15);
const detailFont = new TextAttributes("sans-serif", "#444444", 12);


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


  for (let t of texts) {
    // Apply the attributes of this StyledText
    t.attributes.apply(view);

    // Render all of the texts
    for (let text of t.text) {
      if (view.context === null) {
        return;
      }

      // Only draw it if it should be displayed
      if (display) {
        view.context.fillText(text, _x, cur_y);
      }

      let curWidth = view.context.measureText(text).width - _x;
      maxWidth = Math.max(maxWidth, curWidth);
      lineHeight = Math.max(lineHeight, t.attributes.getHeight());


      // Create a line-break between each one
      cur_y += lineHeight;
      // Reset the line-height
      lineHeight = 0;
    }
  }

  // Returns the width and height of the resulting text
  return [maxWidth, (cur_y + lineHeight) - _y];
}