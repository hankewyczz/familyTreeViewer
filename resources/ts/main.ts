const imageIcons = {
  downArrow: loadImage('resources/images/downarrow.png'),
  upArrow: loadImage('resources/images/uparrow.png'),
  doubleArrow: loadImage('resources/images/doublearrow.png'),
  notes: loadImage('resources/images/notes.png'),
}


function getDetails(canvasView: any, data: any, curPerson: PersonDetails) {
  var structure = data["structure"];
  var sex = structure[curPerson["id"]]["sex"].toUpperCase();

  var container = document.createElement('div');
  container.style.display = "table";
  container.style.borderCollapse = "collapse";
  container.style.width = "100%";
  var names = document.createElement('div');
  names.className = 'detailTitleDiv';
  container.appendChild(names);


  // Localizaiton
  var langArray: any = getLang();

  // If we have multiple names
  for (var i = 0; i < curPerson.names.length; i++) {
    var nameDiv = document.createElement('div');
    nameDiv.className = 'detailTitle';
    // Parse the name
    if (i != 0) {
      if (curPerson.names[i] = "\/\/") {
        // A weird case we see with the English monarcy example file
        break;
      } else {
        var name = "AKA " + displayName(curPerson.names[i]);
      }
    } else {
      var name = displayName(curPerson.names[i]);
    }
    nameDiv.appendChild(document.createTextNode(name));
    names.appendChild(nameDiv);
  }


  function openRelCalc(person: PersonDetails) {
    var container = document.createElement('div');
    container.style.width = "100%";

    var nameDiv = document.createElement('div');
    nameDiv.className = 'detailTitle';

    var names = document.createElement('div');
    names.className = 'detailTitleDiv';
    container.appendChild(names);

    nameDiv.appendChild(document.createTextNode(langArray["relationshipCalculator"]));
    names.appendChild(nameDiv);

    var relCalcContainer = document.createElement('div');
    relCalcContainer.className = "detailRowcontainer";
    relCalcContainer.style.width = "100%";
    relCalcContainer.style.textAlign = "center";

    var person2text = document.createTextNode(langArray["person"] + "2");
    relCalcContainer.appendChild(person2text)

    // Second search bar
    var searchArea2 = document.createElement('div');
    searchArea2.id = "searchAreaP2";
    searchArea2.className = "search";

    var searchtext2 = document.createElement('input');
    searchtext2.type = "text";
    searchtext2.id = "searchtextP2";
    searchtext2.className = "searchTerm";
    searchtext2.autocomplete = "off";
    searchtext2.placeholder = "Пошук (Search)";

    var searchlist2 = document.createElement('div');
    searchlist2.id = "searchlistP2";

    searchArea2.appendChild(searchtext2);
    searchArea2.appendChild(searchlist2);
    relCalcContainer.appendChild(searchArea2);

    // Calculates the relationship, returns the result
    var searchButton = document.createElement('div');
    searchButton.className = "button";
    searchButton.style.cursor = "pointer";
    searchButton.appendChild(document.createTextNode("Calculate"));


    //finds the given person
    function findPerson(personName: string, id: null | string = null) {
      for (var i = 0; i < data["structure_raw"].length; i++) {
        if ((displayName(data["structure_raw"][i]["name"]) == personName.toString()) ||
            (data["structure_raw"][i]["id"] == id)) {
          return data["structure_raw"][i];
        }
      }
      return null;
    }

    searchButton.onclick = function (_) {
      var person1 = findPerson(person.names[0], person.id);
      var person2 = findPerson((document.getElementById("searchtextP2") as HTMLInputElement).value);

      if (person1 === null || person2 === null) {
        showError("Names must be entered exactly and in full");
        return;
      }


      var names = displayFirstName(person1.name) + langArray["and"] + displayFirstName(person2.name);
      names += langArray["are"];
      var relationship = relationshipCalculator(person1.id, person2.id, data);

      (document.getElementById("relCalResponse") as HTMLElement).innerHTML = names + relationship;

    }


    var responseText = document.createElement('p');
    responseText.id = "relCalResponse";
    responseText.style.padding = "5px";

    relCalcContainer.appendChild(document.createElement('br'));
    relCalcContainer.appendChild(searchButton);
    relCalcContainer.appendChild(document.createElement('br'));
    relCalcContainer.appendChild(responseText);


    container.appendChild(relCalcContainer);

    showInfoWindow(container);
    initSearchBar((document.getElementById("searchtextP2") as HTMLInputElement),
        (document.getElementById("searchlistP2") as HTMLElement), data, canvasView, false);
  }

  // Creates a link to the relationship calculator
  function relCalcLink(content: any) {
    var personLink = document.createElement('a');
    personLink.style.cursor = "pointer";
    var linkContent = document.createTextNode(content);
    personLink.appendChild(linkContent);

    personLink.addEventListener("click", function (event) {
      openRelCalc(curPerson);
    });

    personLink.style.color = "#2D89EF";
    return personLink;
  }

  function makeEventsPane() {
    // Initialize the data container
    var eventsDivContainer = document.createElement('div');
    eventsDivContainer.className = "detailRowcontainer";
    //eventsDivContainer.style.display = "table";
    eventsDivContainer.style.width = "100%";


    var rowGroupContainer = document.createElement('div');
    rowGroupContainer.style.display = "table";
    rowGroupContainer.style.width = "100%";

    var eventDiv = document.createElement('div');
    eventDiv.className = "detailRow1";
    eventDiv.style.display = "table";
    eventDiv.style.textAlign = "center";
    eventDiv.appendChild(relCalcLink(langArray["relationshipCalculator"]));
    eventsDivContainer.appendChild(eventDiv);


    // We use this to alternate div background colors. Using n-th child doesn't work too well,
    // since we go thru multiple exterior container divs
    var styleNumber = 0;


    // Creates the notes
    function makeNotes() {
      for (var i = 0; i < curPerson["notes"].length; i++) {
        var note = curPerson["notes"][i];
        var eventDiv = document.createElement('div');

        var divClass = (styleNumber == 0) ? "detailRow" : "detailRow1";
        styleNumber = (styleNumber == 0) ? 1 : 0; // Swap

        eventDiv.className = divClass;
        eventDiv.style.display = "table";

        var text = document.createElement('div');
        text.style.fontSize = "85%";
        text.style.lineHeight = "120%";
        text.style.padding = "5px";
        text.style.whiteSpace = "pre-wrap";

        text.appendChild(document.createTextNode(note));
        eventDiv.appendChild(text);
        eventsDivContainer.appendChild(eventDiv);
      }
    }

    makeNotes();

    // Run over each event
    for (var i = 0; i < curPerson["events"].length; i++) {
      var event = curPerson.events[i];

      var eventDiv = document.createElement('div');
      var divClass = (styleNumber == 0) ? "detailRow" : "detailRow1";
      styleNumber = (styleNumber == 0) ? 1 : 0; // Swap

      eventDiv.className = divClass;


      // Creates a field with a date and string
      function field(date: string, str: string | HTMLElement) {
        var dateDiv = document.createElement('div');
        dateDiv.className = 'rowIndex';
        dateDiv.appendChild(document.createTextNode(date));
        eventDiv.appendChild(dateDiv);

        var dataDiv = document.createElement('div');
        dataDiv.className = 'rowContent';
        // We make it text if it isn't already
        var dataNode = typeof str == "string" ? document.createTextNode(str) : str;
        dataDiv.appendChild(dataNode);
        eventDiv.appendChild(dataDiv);
      }

      // Creates a relationship event (marriage or divorce)
      function relationship(relArray: any[]) {
        var relDiv = document.createElement('div');

        for (var i = 0; i < relArray.length; i++) {
          // We make it text if it isn't already
          var relNode = typeof relArray[i] == "string" ? document.createTextNode(relArray[i]) : relArray[i];
          relDiv.appendChild(relNode);
        }

        return relDiv;
      }

      // Creates a link to another person
      function makePersonLink(personId: string) {
        var personLink = document.createElement('a');
        personLink.style.cursor = "pointer";
        var linkContent = document.createTextNode(displayName(structure[personId].name));
        personLink.appendChild(linkContent);
        (personLink as any)["linked_person_id"] = personId;

        personLink.addEventListener("click", function (event) {
          canvasView.setFocus((event.currentTarget as any)["linked_person_id"]);
        });

        return personLink;
      }


      let dateStr;
      let birthDate;
      switch (event[event.length - 1]) { // We take the letter indicating event type
        case "B": // Birth
          var birthInfo = document.createElement('span');
          birthDate = event[0] || "";

          // If we have a birth location, we parse it properly
          var birthLocation = event[1] ? langArray["locatedIn"] + event[1] : "";
          birthInfo.appendChild(document.createTextNode((langArray["born"] as any)[sex] + birthLocation));


          birthDate = birthDate.replace("ABT ", "");


          if ((birthDate != "") && (birthDate != null)) {
            let bd = new Date(birthDate);

            let ageToday = new Date(Date.now() - bd.valueOf());
            let yearsOld = Math.abs(ageToday.getUTCFullYear() - 1970);

            // MS * Secs * Mins * Hours * Days
            birthInfo.appendChild(
                document.createTextNode(` (${yearsOld.toString()} ${langArray["yearsAgo"]})`));
          }

          dateStr = dateToLocale(birthDate, langArray["months"]);


          field(dateStr, birthInfo);
          break;

        case "D": // Death
          var deathLocation = event[1] ? langArray["locatedIn"] + event[1] : "";
          var deathType = event[2] ? " (" + event[2] + ")" : "";
          var deathDate = event[0] || "";

          var ageAtDeath = "";
          let ageAtDeathStr = "";
          if ((birthDate != "") && (birthDate != null) && (deathDate != "")) {
            var dd = new Date(deathDate);
            var bd = new Date(birthDate);
            let ageApart = new Date(dd.valueOf() - bd.valueOf());
            let ageAtDeath = Math.abs(ageApart.getUTCFullYear() - 1970);
            // MS * Secs * Mins * Hours * Days
            ageAtDeathStr = " (" + ageAtDeath.toString() + " " + langArray["yearsOld"] + ")";
          }

          dateStr = dateToLocale(deathDate, langArray["months"]);

          field(dateStr, (langArray["died"] as any)[sex] + deathLocation + deathType + ageAtDeathStr);
          break;

        case "BUR": // Burial data
          var burialDate = event[0] || "";
          var burialLocation = event[1] ? langArray["locatedIn"] + event[1] : "";
          var burialType = event[2] ? " (" + event[2] + ")" : "";

          field(burialDate, langArray["buried"][sex] + burialLocation + burialType);
          break;

        case "OCC": // Occupation
          var occupationType = event[1] ? " " + event[1] : "";
          var occupationDate = event[0] || "";

          field(occupationDate, langArray["occupation"] + ":" + occupationType);
          break;

        case "M": // Marriage
        case "MARR":
          var marriageLocation = event[2] ? langArray["locatedIn"] + event[2] : "";
          var marriageLink = makePersonLink(event[1]);

          field(event[0], relationship([langArray["married"][sex], marriageLink, marriageLocation]));
          break;

        case "DIV": // Divorce
          var divorceLocation = event[2] ? langArray["locatedIn"] + event[2] : "";
          var divorceLink = makePersonLink(event[1]);

          field(event[0], relationship([langArray["divorced"], divorceLink, divorceLocation]));
          break;

        default: // Catch case
          console.log("Could not parse event type" + event[event.length - 1]);
      }
      rowGroupContainer.appendChild(eventDiv);
    }
    eventsDivContainer.appendChild(rowGroupContainer);


    // Handle the pictures

    function makePictures() {
      for (var i = 0; i < curPerson["pics"].length; i++) {
        var picture = curPerson.pics[i];
        var eventDiv = document.createElement('div');

        var divClass = (styleNumber == 0) ? "detailRow" : "detailRow1";
        styleNumber = (styleNumber == 0) ? 1 : 0; // Swap

        eventDiv.className = divClass;
        eventDiv.style.display = "table";
        eventDiv.style.textAlign = "center";

        // Get the pictures set up
        function makePicture(src: string) {
          var image = document.createElement('img');
          image.onclick = function () {
            imgBox(this)
          };
          image.style.width = "90%";
          image.style.marginTop = "5%";
          image.style.cursor = "pointer";
          image.src = src;

          eventDiv.appendChild(image);
        }

        makePicture(picture);
        eventsDivContainer.appendChild(eventDiv);
      }
    }

    makePictures();
    return eventsDivContainer;
  }


  container.appendChild(makeEventsPane());

  return container;
}


// Parses the hash
function parseHash(initPerson: string) {
  var showHelp = false;
  var initialPerson = initPerson;
  if (getHashString()) {
    if (getHashString().toLowerCase() == "help") {
      showHelp = true;
    } else {
      initialPerson = getHashString();
    }
  }
  return [showHelp, initialPerson];
}


// Shows the help window once fully loaded
function showHelp() {
  var helpInterval = setInterval(function () {
    if (document.readyState !== 'complete') {
      return;
    }

    clearInterval(helpInterval); // Kill the interval
    // Show the info window for help
    showInfoWindow((document.getElementById("helpDivHidden") as HTMLElement).cloneNode(true) as HTMLElement);
  }, 200);
}


// @ts-ignore
function numPeople(data) {
  var num = Object.keys(data).length;
  (document.getElementById("numPeople") as HTMLElement).innerHTML = "<strong>" + num + "</strong> people in this tree";
}

function main() {
  // @ts-ignore
  loadData(function (data) {
    console.log("%cDone", "font-weight:bold; font-size: 1.2em;");
    // Hide the loading message when loaded
    (document.getElementById("loadingwindow") as HTMLElement).style.display = "none";

    if (data == null) {
      showError("Data could not be loaded", true);
      return;
    }

    var canvasView = new View(data);
    initInterfaceButtons(data, canvasView);

    var initialPerson = "@I0000@";
    if (!(initialPerson in data["structure"])) {
      initialPerson = Object.keys(data["structure"])[0];
    }

    var hashParsed = parseHash(initialPerson);

    // @ts-ignore
    canvasView.init(hashParsed[1]); // Initialize with the initial user

    // If the hash requires help:
    if (hashParsed[0]) {
      showHelp();
    }

    numPeople(data["structure"]);
  });

}


