/* JS for dealing with various animations */


// Uses the proper browser-optimized animationFrame method
function requestAnimFrame(callback){
  return window.requestAnimationFrame(callback) || 
  window.mozRequestAnimationFrame(callback) || // firefox
  window.webkitRequestAnimationFrame(callback) || // webkit
  function(callback) { window.setTimeout(callback, 1000 / 60) }; // last resort
};


// Fades the given element in
function fadeIn(elem, fadeStep=0.05, displayType="inline-block") {
    // If a display style exists, and it isn't none:
    if (elem.style.display && elem.style.display != "none")
        return;
    
    // Define opacity and display type
    elem.style.opacity = 0;
    elem.style.display = displayType;
    //console.log("ok");

    // Start fading in
    (function fade() {
      var opacity = parseFloat(elem.style.opacity);
      // We increment if we can
      if (!((opacity += fadeStep) > 1)) {
        elem.style.opacity = opacity;
        // Animate the fading
        requestAnimFrame(fade); 
      }   
      else {
        elem.style.opacity = 1;
      }
    })();
}

// Fades the given element out
function fadeOut(elem, fadeStep=0.05){
  // Reset opacity to one
  elem.style.opacity = 1;

  (function fade() {
    // If we're still above 0
    if ((elem.style.opacity -= fadeStep) > 0) {
      // animate the fading
      requestAnimFrame(fade);
    }
    else {
      // hide the element
      elem.style.opacity = 0;
      elem.style.display = "none";
    }
  })();
}



// Displays an error message on the screen (not in debugger)
function showError(message, fatal) {
  // gets the message element
  var messageElement = document.getElementById("message");
  // Sets value to the message
  messageElement.innerHTML = message;

  // Fades the message in
  fadeIn(messageElement, 0.05, "inline-block");
  
  // If the message isn't fatal, we fade out after 5 seconds
  if (!fatal) {
      setTimeout(function(){ 
        fadeOut(messageElement, 0.05);
      }, 5000);
    }
}