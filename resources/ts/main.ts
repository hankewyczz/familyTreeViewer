/**
 * Parses the window hash.
 * @param initPerson  If the hash has nothing, we resort to this person as a fallback
 */
function parseHash(initPerson: string) {
  let initialPerson = initPerson;
  let hash = getHashString();

  if (hash !== null) {
    if (hash.toLowerCase() === "help") {
      // If the hash requires help:
      let helpInterval = setInterval(function () {
        if (document.readyState !== 'complete') {
          return;
        }

        clearInterval(helpInterval); // Kill the interval
        // Show the info window for help
        showInfoWindow((document.getElementById("helpDivHidden") as HTMLElement).cloneNode(true) as HTMLElement);
      }, 200);
    }
    else {
      initialPerson = hash;
    }
  }
  return initialPerson;
}


/**
 * This is where the magic happens.
 */
function main() {
  loadData(function (data: { [key: string]: any }) {
    console.log("%cAll data loaded", "text-decoration: underline;");

    // Hide the loading message when loaded
    (document.getElementById("loadingwindow") as HTMLElement).style.display = "none";

    if (data == null) {
      showError("Data could not be loaded", true);
      return;
    }

    const canvasView = new CanvasView(data);

    initInterfaceButtons(data, canvasView);

    let initialPerson = "@I0000@";
    if (!(initialPerson in data["structure"])) {
      initialPerson = Object.keys(data["structure"])[0];
    }

    canvasView.init(parseHash(initialPerson)); // Initialize with the initial user

    // Update the help text to indicate how many people there are in this tree
    (document.getElementById("numPeople") as HTMLElement).innerHTML =
        `<strong>${data["structure_raw"].length}</strong> people in this tree`;

  }).then(() => console.log("%cReady!", "font-weight:bold; font-size: 1.5em;"));

}


