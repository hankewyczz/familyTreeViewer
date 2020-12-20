"use strict";
// SOURCE:
// https://gist.github.com/scf37/b9eed984a705243c27527a2036f09c0f
let options = {
    bgColor: 'rgba(0,0,0,0.9)',
    fadeDurationMs: 500,
    zIndex: 9999,
};
// Show the given image
function imgBox(source) {
    let container = initContainer();
    let imgUrl = typeof source === 'string' ? source : source.src;
    let bodyOverflow = document.body.style.overflow;
    let image = new Image();
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
        window.setTimeout(function () {
            container.style.display = 'none';
            container.innerHTML = '';
            document.body.style.overflow = bodyOverflow;
        }, options.fadeDurationMs * 0.8);
    }
    container.addEventListener('click', onClick);
}
let imgboxContainer;
function initContainer() {
    if (imgboxContainer) {
        return imgboxContainer;
    }
    let divBox = document.createElement('div');
    divBox.innerHTML =
        '<div id="imgBox" style="top:0;left:0;opacity:0;width:100%;height:100%;display:none;position:fixed;' +
            'cursor:pointer;z-index:' + options.zIndex + ';background-color:' + options.bgColor +
            ';transition:opacity ' + options.fadeDurationMs + 'ms"/>';
    imgboxContainer = divBox.firstChild;
    document.body.appendChild(imgboxContainer);
    return imgboxContainer;
}
