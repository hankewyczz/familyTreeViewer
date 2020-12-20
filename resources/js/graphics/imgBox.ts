// SOURCE:
// https://gist.github.com/scf37/b9eed984a705243c27527a2036f09c0f

options = {
    bgColor: 'rgba(0,0,0,0.9)', // background color
    fadeDurationMs: 500, // Fading durations
    zIndex: 9999, // Z index - just to cover everything
};

// Show the given image
function imgBox(source) {
    var container = initContainer();
    var imgUrl = typeof source === 'string' ? source : source.src;
    var bodyOverflow = document.body.style.overflow;

    var image = new Image();
    image.src = imgUrl;
    image.style.maxWidth = '90%';
    image.style.maxHeight = '90%';
    image.style.margin = 'auto';
    container.appendChild(image);
    // Hide scrolling
    document.body.style.overflow = 'hidden';
    container.style.display = 'flex';

    window.setTimeout(() => container.style.opacity = 1, 0);

    function onClick() {
        container.removeEventListener('click', onClick);
        container.style.opacity = 0;
        window.setTimeout(function() {
            container.style.display = 'none';
            container.innerHTML = '';
            document.body.style.overflow = bodyOverflow;
        }, options.fadeDurationMs * 0.8);
    }

    container.addEventListener('click', onClick)
}

var imgboxContainer;
function initContainer() {
    if (imgboxContainer) {
        return imgboxContainer;
    }

    var divBox = document.createElement('div');
    divBox.innerHTML =
        '<div id="imgBox" style="top:0px;left:0px;opacity:0;width:100%;height:100%;display:none;position:fixed;' +
        'cursor:pointer;z-index:' + options.zIndex +';background-color:' + options.bgColor +
        ';transition:opacity ' + options.fadeDurationMs + 'ms"/>';

    imgboxContainer = divBox.firstChild;
    document.body.appendChild(imgboxContainer);

    return imgboxContainer;
}