"use strict";
// Text attributes
class TextAttr {
    constructor(_size, _font, _style, _color, _baseSize) {
        this.size = _size;
        this.prevHeight = 0;
        this.font = _font;
        this.style = _style;
        this.color = _color;
        this.baseSize = _baseSize;
    }
    // Calculates the true font height on the canvas
    calcFontHeight(fontStyle) {
        let body = document.getElementsByTagName("body")[0];
        let tempDiv = document.createElement("div");
        let tempText = document.createTextNode("DUMMY TEXT");
        tempDiv.appendChild(tempText);
        tempDiv.setAttribute("style", fontStyle);
        body.appendChild(tempDiv);
        let height = tempDiv.offsetHeight;
        body.removeChild(tempDiv);
        // Remove the references
        // @ts-ignore
        body = null;
        // @ts-ignore
        tempDiv = null;
        // @ts-ignore
        tempText = null;
        return height;
    }
    getBaseSize() {
        return this.baseSize;
    }
    getSize() {
        return this.size;
    }
    setSize(newSize) {
        this.size = newSize;
        this.prevHeight = 0; // We have to recalculate the height
    }
    getHeight() {
        if (this.prevHeight <= 0) { // In this case, we haven't calculated it yet
            this.prevHeight = this.calcFontHeight("font: " + this.asText());
        }
        return this.prevHeight;
    }
    asText() {
        return this.style + " " + this.size + "px " + this.font;
    }
    // TODO - what element shoud this be?
    apply(elem) {
        // set the style
        elem.context.font = this.asText();
        // set the color
        elem.context.fillStyle = this.color;
    }
}
//// FONTS
const baseFontSize = 13;
const detailFontSize = 11;
const baseFont = new TextAttr(baseFontSize * scale, "sans-serif", "normal", "#000000", baseFontSize);
const detailFont = new TextAttr(detailFontSize * scale, "sans-serif", "normal", "#333", detailFontSize);
// TODO - is this ever anythig but a string?
function parseTextAsArray(texts) {
    let newText = [];
    for (let text of texts) {
        if (typeof text === "string") {
            let s = text.split("\n");
            for (let j = 0; j < s.length; j++) {
                newText.push(s[j]);
                if (j < s.length - 1) {
                    newText.push("\n");
                }
            }
        }
        else {
            newText.push(text);
        }
    }
    return newText;
}
// TOdo canvasview, what is "real"?
function renderText(text, view, _x, _y, real) {
    let lastFont = baseFont;
    view.context.textBaseline = "top";
    let maxWidth = 0;
    let maxLineHeight = 0;
    let x = _x;
    let y = _y;
    parseTextAsArray(text).map(e => {
        if (typeof e == "string") {
            if (e == "\n") {
                x = _x; // Reset X
                y += maxLineHeight; // Add to the max height
                maxLineHeight = 0; // reset line height
            }
            else { // just show the text
                if (real) {
                    view.context.fillText(e, x, y);
                }
                x += view.context.measureText(e).width;
                maxWidth = Math.max(maxWidth, x - _x);
                maxLineHeight = Math.max(maxLineHeight, lastFont.getHeight());
            }
        }
        else { // it is a TextAttr
            lastFont = e;
            e.apply(view);
        }
    });
    return [maxWidth, (y + maxLineHeight) - _y];
}
