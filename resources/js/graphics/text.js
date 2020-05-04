// Text attributes
function TextAttr(_size, _font, _style, _color, _baseSize) {
    // Calculates the true font height on the canvas
    function calcFontHeight(fontStyle) {
        var body = document.getElementsByTagName("body")[0];
        var tempDiv = document.createElement("div");
        var tempText = document.createTextNode("DUMMY TEXT");

        tempDiv.appendChild(tempText);
        tempDiv.setAttribute("style", fontStyle);

        body.appendChild(tempDiv);
        var height = tempDiv.offsetHeight;
        body.removeChild(tempDiv);

        return height;
    }

    var size = _size;
    var prevHeight = 0;

    funcs =  {
        getBaseSize : function() {
            return _baseSize;
        },
        getSize : function() { return size; },
        
        setSize : function(newSize) {
            size = newSize;
            prevHeight = 0; // We have to recalculate the height
        },

        getheight : function() {
            if (prevHeight <= 0) { // In this case, we haven't calculated it yet
                prevHeight = calcFontHeight("font: " + this.astext());
            }
            return prevHeight;
        },
        astext : function() { return _style + " " + size + "px " + _font; },
        apply : function(elem) {
            // set the style
            elem.context.font = this.astext();
            // set the color
            elem.context.fillStyle = _color;
        },
    }
    return funcs;
}



//// FONTS
var baseFontSize = 13;
var detailFontSize = 11;
var baseFont = TextAttr(baseFontSize * scale, "sans-serif", "normal", "#000000", baseFontSize);
var detailFont = TextAttr(detailFontSize * scale, "sans-serif", "normal", "#333", detailFontSize);



function renderText(_text, _view, _x, _y, real) {
    var x = _x;
    var y = _y;
    var lastFont = baseFont;
    _view.context.textBaseline = "top";
    var maxwidth = 0;
    var linemaxheight = 0;

    var _newtext = [];
    for (var i = 0; i < _text.length; i++) {
        if (typeof _text[i] == "string") {
            var s = _text[i].split("\n");
            for (var j = 0; j < s.length; j++) {
                _newtext.push(s[j]);
                if (j < s.length-1)
                {
                    _newtext.push("\n");
                }
            }
        } else {
            _newtext.push(_text[i]);
        }
    }
    for (var i = 0; i < _newtext.length; i++) {
        var elem = _newtext[i];
        if (typeof elem == "string") {
            if (elem == "\n") { // newline
                x = _x;
                y += linemaxheight;
                linemaxheight = 0;
            } else { // just show the text
                if (real)
                    _view.context.fillText(elem,x,y);
                x += _view.context.measureText(elem).width;
                maxwidth = Math.max(maxwidth, x-_x);
                linemaxheight = Math.max(linemaxheight, lastFont.getheight());
            }
        } else { // it is a TextAttr
            lastFont = elem;
            elem.apply(_view);
        }
    };
    return [maxwidth, (y + linemaxheight) - _y];
}