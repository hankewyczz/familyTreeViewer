// Some formatting options
let scale = 1;
let baseVM = 50;
let baseHM = 20;
let baseBM = 5;
let verticalMargin = baseVM * scale;
let horizontalMargin = baseHM * scale;
let nodeBorderMargin = baseBM * scale;
const generationLimit = 6;
const mouseClickRadius = 50;
const xmlRTimeout = 20000;
const bgColor: { [key: string]: string } = {"m": "#ACE2F2", "f": "#F8AFD7", "": "#d3d3d3"}; // background colors

let currentLanguage = "UA";
const languages = [
  {
    id: "UA",
    name: "УКР",
    locatedIn: " в ",
    born: {"M": "Народився", "F": "Народилася"},
    died: {"M": "Помер", "F": "Померла"},
    parents: "Батьки",
    and: " і ",
    buried: {"M": "Похований", "F": "Похована"},
    occupation: "Праця",
    married: {"M": "Одружився з ", "F": "Вийшла за заміж з "},
    divorced: "Розлучились ",
    yearsOld: "років",
    yearsAgo: "років тому",
    // Relationship calculator
    samePerson: "та сама людина",
    siblings: {
      "MM": "брати", "MF": "брат/сестра",
      "FM": "сестра/брат", "FF": "сестри"
    },
    cousins: {
      "MM": "кузини", "MF": "кузини", "FM": "кузини",
      "FF": "кузинки"
    },
    child: {"M": "син", "F": "дочка"},
    parent: {"M": "батько", "F": "мама"},
    grandparent: {"M": "дідо", "F": "баба"},
    grandchild: {"M": "внук", "F": "внучка"},
    great: "пра",
    auntUncle: {"MM": "стрийко", "MF": "вуйко", "FM": "стриянка", "FF": "тета"},
    nieceNephew: {"MM": "братанець", "MF": "сестрінець", "FM": "братаниця", "FF": "сестріниця"},
    removed: "віддалені",
    relationshipCalculator: "Як ми споріднені?",
    person: "Людина ",
    noRelation: "не безпосередньо споріднені",
    are: " є ",
    months: ["січ.", "лют.", "бер.", "кві.", "тра.", "чер.", "лип.", "серп.", "вер.", "жов.", "лист.", "гру."],
  },
  {
    id: "EN",
    name: "ENG",
    locatedIn: " in ",
    born: {"M": "Born", "F": "Born"},
    died: {"M": "Died", "F": "Died"},
    parents: "Parents",
    and: " and ",
    buried: {"M": "Buried", "F": "Buried"},
    occupation: "Occupation",
    married: {"M": "Married ", "F": "Married "},
    divorced: "Divorced ",
    yearsOld: "years old",
    yearsAgo: "years ago",
    // Relationship calculator
    samePerson: "Same person",
    siblings: {
      "MM": "Brothers", "MF": "Brother/Sister",
      "FM": "Sister/Brother", "FF": "Sisters"
    },
    cousins: {
      "MM": "cousins", "MF": "cousins", "FM": "cousins",
      "FF": "кузинки"
    },
    child: {"M": "son", "F": "daughter"},
    parent: {"M": "father", "F": "mother"},
    grandparent: {"M": "grandfather", "F": "grandmother"},
    grandchild: {"M": "grandson", "F": "granddaughter"},
    great: "great",
    auntUncle: {"MM": "uncle", "MF": "uncle", "FM": "aunt", "FF": "aunt"},
    nieceNephew: {"MM": "nephew", "MF": "nephew", "FM": "niece", "FF": "niece"},
    removed: "removed",
    relationshipCalculator: "Relationship Calculator",
    person: "Person ",
    noRelation: "not directly related",
    are: " are ",
    months: ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"],
  },
];

function getLang() {
  for (let lang of languages) {
    if (lang["id"] == currentLanguage) {
      return lang;
    }
  }
  throw new Error(`Language ${currentLanguage} not found`);
}



// Updates the scaling
function updateScale(newScale: number) {
  scale = newScale;
  verticalMargin = baseVM * scale;
  horizontalMargin = baseHM * scale;
  nodeBorderMargin = baseBM * scale;
  baseFont.setSize(baseFont.getBaseSize() * scale);
  detailFont.setSize(detailFont.getBaseSize() * scale);
}


// Loads an image
function loadImage(source: string) {
  let image = new Image();
  image.src = source;
  return image
}


// Generates the info window with the following
function showInfoWindow(content: HTMLElement) {
  let info = document.getElementById("textinfo") as HTMLElement;

  // Clear it of any prior info
  while (info.firstChild) {
    info.removeChild(info.firstChild);
  }

  info.appendChild(content);
  info.scrollTop = 0;

  fadeIn(document.getElementById("infowindow") as HTMLElement,
      0.05, "block");
}


// Gets the hash string
function getHashString() {
  let hash = window.location.hash;
  if (hash[0] == "#") {
    hash = hash.substr(1);
  }
  return decodeURIComponent(hash);
}

// Parses the name for display
function displayName(name: string): string {
  return name.replace(/\//g, "");
}

// PArses only the first string
function displayFirstName(name: string) {
  return name.split("/")[0].trim();
}

// Parses the surname for display
function displaySurname(name: string) {
  let s = name.split("/", 2);
  return s.length == 2 ? s[1].trim() : "";
  // FOr some reason, this returned "" before in ALL CASES
}


// Initializes all of the interface buttons
function initInterfaceButtons(data: { [key: string]: any }, view: View) {
  const rawStructure = data["structure_raw"];

  // Generates the info fi
  function generateUtils(dataSrc: Array<Array<string>>, infoTitle: string) {
    // generate index
    function makeIndex() {
      // Contains all of the content (ie. all of the rows) of this infowindow
      let contentContainer = document.createElement('div');
      contentContainer.className = "container";

      // Contains one category
      let categoryDiv: null | HTMLElement = null;
      // Helps us determine if we need a new category
      let previousItem = "";


      // Handles a single row of the info window
      function createRow(rowInfo: string[]) {
        let curItem = rowInfo[1];
        let curId = rowInfo[0];

        // Create a container to hold the name
        let nameDiv = document.createElement('div');
        // Create a link to the given person
        let personNameLink = document.createElement("a");
        personNameLink.style.cursor = "pointer";

        // Parse this person's name
        let personName = displayName(data["structure"][curId]["name"]);

        // Set the link text
        personNameLink.appendChild(document.createTextNode(personName));
        // Make sure the link goes to the correct person
        (personNameLink as any)["link_person_id"] = curId;
        personNameLink.addEventListener("click",
            (e: any) => view.setFocus(e.currentTarget["link_person_id"]));

        // Append the link to the name container.
        nameDiv.appendChild(personNameLink);


        // Do we need a new category?
        if (curItem != previousItem) {
          // Create a new row container
          let rowDiv = document.createElement('div');
          let divClass = (styleNumber == 0) ? "detailRow" : "detailRow1";
          styleNumber = (styleNumber == 0) ? 1 : 0; // Swap
          rowDiv.className = divClass;

          let rowIndex = document.createElement('div');
          rowIndex.className = "rowIndex";
          rowIndex.appendChild(document.createTextNode(curItem));

          categoryDiv = document.createElement('div');
          categoryDiv.className = "rowContent";

          rowDiv.appendChild(rowIndex);
          rowDiv.appendChild(categoryDiv);
          contentContainer.appendChild(rowDiv);
        } else {
          // Add a space between each name if not in a new row
          nameDiv.style.marginTop = "10px";
        }


        previousItem = curItem;
        (categoryDiv as HTMLElement).appendChild(nameDiv);
      }

      let styleNumber = 0;
      for (let rowInfo of dataSrc) {
        createRow(rowInfo);
      }
      return contentContainer;
    }

    let container = document.createElement('div');


    let headerDiv = document.createElement('div');
    headerDiv.className = 'detailTitleDiv';

    let header = document.createElement('div');
    header.className = 'detailTitle';
    header.appendChild(document.createTextNode(infoTitle));

    headerDiv.appendChild(header);
    container.appendChild(headerDiv);
    container.appendChild(makeIndex());

    showInfoWindow(container);
  }

  // Index button
  (document.getElementById("indexbutton") as HTMLElement).onclick =
      function (_: MouseEvent) {
        // We generate an 2D array of [id, surname] for each person
        let namesArray = rawStructure.map(
            (p: PersonStructure) => [p["id"], displaySurname(p["name"])]);

        return generateUtils(namesArray, "Index/Індех");
      };

  // Birthdays button
  (document.getElementById("birthdaybutton") as HTMLElement).onclick =
      function (_: MouseEvent) {
        return generateUtils(data["birthdays"], "Birthdays")
      };


  // Burial button
  (document.getElementById("burialbutton") as HTMLElement).onclick =
      function (_: MouseEvent) {
        generateUtils(data["burials"], "Burials")
      };


  // HELP BUTTON
  (document.getElementById("helpbutton") as HTMLElement).onclick =
      function (_: MouseEvent) {
        let helpDiv = (document.getElementById("helpDivHidden") as HTMLElement);
        // We have to clone it when we show it
        showInfoWindow(helpDiv.cloneNode(true) as HTMLElement);
      };

  // Change the languages
  (document.getElementById("languagebutton") as HTMLElement).onclick = function (_) {
    let newIndex = 0;

    // Gets the next language
    for (let i = 0; i < languages.length; i++) {
      if (languages[i]["id"] == currentLanguage) {
        newIndex = (i + 1 < languages.length) ? i + 1 : 0;
        currentLanguage = languages[newIndex]["id"];
        break;
      }
    }

    // Update the button
    (document.getElementById("languagebutton") as HTMLElement).innerHTML = languages[newIndex]["name"];

    view.recreateTree(); // Redraw
  };


  // Zoom handling
  (document.getElementById("zoomin") as HTMLElement).onclick = (_) => view.zoomIn();
  (document.getElementById("zoomout") as HTMLElement).onclick = (_) => view.zoomOut();


  initSearchBar(document.getElementById("searchtext") as HTMLInputElement,
      document.getElementById("searchlist") as HTMLInputElement, data, view);
}



// Sets all the events for any search bar
function initSearchBar(searchInput: HTMLInputElement,
                       searchResults: HTMLElement,
                       data: { [key: string]: any }, view: View,
                       link = true) {

  const rawStructure = data["structure_raw"];


  /**
   * Creates a result row for the given PersonStructure.
   * @param person  The person for which we create a result instance.
   */
  function generateResultRow(person: PersonStructure) {
    let rowDiv = document.createElement('div');
    rowDiv.className = "searchresult";

    // add life dates (if we have any)
    let birth = person["birth"][0];
    let death = person["death"][0];
    let lifeRange = (birth || death) ? " (" + birth + "–" + death + ")" : "";

    rowDiv.textContent = displayName(person["name"]) + lifeRange;

    // Add link action to this row
    rowDiv.addEventListener("mousedown", function(event: any) {
      searchInput.value = displayName(person["name"]);
      if (link) {
        view.setFocus(event.currentTarget["search-result-id"]);
      }
      // Return the full name (used for the relationship calculator)
      return searchInput.value;
    });

    // Set the ID attribute of the link (so we know where to go)
    (rowDiv as any)["search-result-id"] = person["id"];

    return rowDiv;
  }


  // When the search box is selected, all the text is highlighted
  searchInput.addEventListener("focus", (event: FocusEvent) => {
    (event.currentTarget as HTMLInputElement).select()
  });


  // If the search box isn't selected, we hide the search results
  searchInput.addEventListener("blur", (_: FocusEvent) => {
    searchResults.style.display = "none";
  });

  // Handle what happens on user input
  searchInput.addEventListener("input", (_: Event) => {
    // Each time the input changes, we empty the list and start anew
    while (searchResults.firstChild) {
      searchResults.removeChild(searchResults.firstChild);
    }

    // Don't start searching unless the user has inputted 2+ characters
    if (searchInput.value.length < 2) {
      searchResults.style.display = "none";
      return;
    }

    // Make the results visible
    searchResults.style.display = "block";

    const splitInput = searchInput.value.toLowerCase().split(" ");
    // Do we have any hits for the search results?
    let anyMatches = false;


    for (let person of rawStructure) {
      // Checks if the names match
      let name = displayName(person["name"]).toLowerCase();
      let match = splitInput.every(t => name.includes(t));

      if (match) {
        // We filter out any dummy placeholders from the search results
        // Dummy nodes have an integer after the real person's ID.
        // Real person: @XXXXX@, dummy link to real person: @XXXXX@X
        if (person["id"].endsWith("@")) {
          anyMatches = true;
          searchResults.appendChild(generateResultRow(person));
        }
      }
    }

    if (!anyMatches) {
      searchResults.appendChild(document.createTextNode("No results"));
    }
  })
}


/**
 * Converts a date in an ISO format to a locale string.
 * @param dateStr The date string in the (near) ISO format.
 * @param months  The months names of the locale.
 */
function dateToLocale(dateStr: string, months: string[]) {
  let approximate = dateStr.includes("ABT");
  let approxStr = approximate ? "ABT " : "";

  // Remove the ABT approximation
  dateStr = dateStr.replace('ABT ', '');

  let dateArr = dateStr.split("-");

  // We have the year, month, and day
  if (dateArr.length === 3) {
    let month = months[parseInt(dateArr[1]) - 1];
    return `${approxStr}${dateArr[2]} ${month} ${dateArr[0]}`;
  }
  // We just have the year - return it;
  else if (dateArr.length === 1) {
    return dateArr[0];
  }

  console.log("Could not parse date: " + dateStr);
  return dateStr;
}


/**
 * Calculates the relationship between two people.
 * @param person1 The first person
 * @param person2 The second person
 * @param data    The family data
 */
function relationshipCalculator(person1: string, person2: string, data: any): string {
  const langArray: { [key: string]: any } = getLang();
  const details = data["details"];

  /**
   * Finds the least common ancestor of two given people
   * @param p1  The first person
   * @param p2  The second person
   */
  function leastCommonAncestor(p1: string, p2: string) {
    let ancestors1 = details[p1]["ancestors"];
    let ancestors2 = details[p2]["ancestors"];

    // We include the initial people in the ancestor lists as well
    //    Needed in case one person IS the common ancestor
    //    (ie. father and son, father is the LC ancestor)
    ancestors1.push([p1, 0]);
    ancestors2.push([p2, 0]);

    let commonAncestors = [];
    for (let a1 of ancestors1) {
      for (let a2 of ancestors2) {
        if (a1[0] === a2[0]) {
          commonAncestors.push([a1[0], a1[1] + a2[1]]);
        }
      }
    }

    // Sort by the generational spacing (ascending order)
    commonAncestors.sort(function (a, b) {
      return a[1] - b[1]
    });

    return commonAncestors.length > 0 ? commonAncestors[0] : null;
  }

  /**
   * Finds how far away the given ancestor is
   * @param person    The base person
   * @param ancestor  Their ancestor
   */
  function distanceToAncestor(person: string, ancestor: string) {
    for (let a of details[person]["ancestors"]) {
      if (a[0] === ancestor) {
        return a[1];
      }
    }

    throw new Error(`${ancestor} is not an ancestor of ${person}`)
  }

  /**
   * Parses the given number into the cousin number.
   * @param i The cousin number
   */
  function parseCousinNumber(i: number) {
    if (currentLanguage == "UA") {
      return i.toString() + "і ";
    }
    else {
      // An array of the number, as a string, reversed
      // ie. 14 -> ["4", "1"]
      let numArray = (i.toString()).split("").reverse();

      // If the number is in the teens, this doesn't apply
      // Isn't English wonderful?!?
      if (numArray[1] != "1") {
        switch (numArray[0]) {
          case "1": return `${i}st`;
          case "2": return `${i}nd`;
          case "3": return `${i}rt`;
        }
      }
      return `${i}th`;
    }
  }

  /**
   * Parses the given number into "times removed"
   * @param i The cousin number
   */
  function parseRemovedNumber(i: number) {
    if (currentLanguage == "UA") {
      return (i === 1) ? "1 раз " : `${i} разів `;
    }
    else {
      return (i === 1) ? "once " : ((i === 2) ? "twice " : `${i} times `);
    }
  }

  let lcAncestor = leastCommonAncestor(person1, person2);

  // If we don't have a shared ancestor, don't bother going any further
  if (lcAncestor === null) {
    return langArray["noRelation"];
  }

  const generationA = distanceToAncestor(person1, lcAncestor[0]);
  const generationB = distanceToAncestor(person2, lcAncestor[0]);

  const sexA = data["structure"][person1]["sex"].toUpperCase();
  const sexB = data["structure"][person2]["sex"].toUpperCase();
  // The order here is relevant (especially for Ukrainian)
  const sexes = sexA + sexB;

  // If the two people are on the same level
  if (generationA === generationB) {
    if (generationA === 0) {
      return langArray["samePerson"];
    }
    if (generationA === 1) {
      return langArray["siblings"][sexes];
    }
    if (generationA >= 2) {
      return parseCousinNumber(generationA - 1) + langArray["cousins"][sexes];
    }
  }

  /**
   * Handles the case where one person is the sibling of the other person's direct ancestor
   * @param p1 The first person
   * @param p2 The second person
   */
  function getSiblingAncestor(p1: string, p2: string) {
    let parents1 = data["structure"][p1]["parents"];
    let parents1children;

    // Get the batch of children, of which p1 is a part of (handles multiple marriage cases)
    for (let parent of parents1) {
      parents1children = data["structure"][parent]["children"];
      if (parents1children.includes(p1)) {
        break;
      }
    }

    // Creates an array of all the IDs of p2's ancestors
    let ancestors2 = data["details"][p2]["ancestors"].map((a: string[]) => a[0]);


    for (let child of parents1children) {
      if (ancestors2.includes(child)) {
        return data["structure"][child]["sex"].toUpperCase();
      }
    }
    return "F"; // Default fallback
  }


  // If person1 is less than person2 (ie. person1 is higher up)
  if (generationA < generationB) {
    // B is a direct descendant of A
    if (generationA === 0) {
      // Parent/child
      if (generationB == 1) {
        return langArray["parent"][sexA] + "/" + langArray["child"][sexB];
      }
      // Grandparent/grandchild
      else if (generationB == 2) {
        return langArray["grandparent"][sexA] + "/" + langArray["grandchild"][sexB];
      }
      // Great-grand...
      else {
        let prefix = "";
        for (let i = generationB - 2; i > 0; i--) {
          prefix += langArray["great"] + "-";
        }
        return prefix + langArray["grandparent"][sexA] + "/" + prefix + langArray["grandchild"][sexB];
      }
    }

    // B is a descendant of A's sibling
    else if (generationA == 1) {
      // For Ukrainian: to determine стрійко vs. вуйко
      let parents2 = data["structure"][person2]["parents"];
      let parentSex = "F"; // Keep this as a default

      // Iterate over p2's parents
      for (let parent2 of parents2) {
        let ancestorsB = data["details"][parent2]["ancestors"].map((a: string[]) => a[0]);
        // Check if the ancestor is on this parent's side
        if (ancestorsB.includes(lcAncestor[0])) {
          parentSex = data["structure"][parent2]["sex"].toUpperCase();
        }
      }

      let siblingSex = getSiblingAncestor(person1, person2);

      if (generationB === 2) {
        // B is the child of A's sibling
        return langArray["auntUncle"][sexA + parentSex] + "/" + langArray["nieceNephew"][sexB + siblingSex];
      }
      else {
        let prefix = "";
        for (let i = generationB - 2; i > 0; i--) {
          prefix += langArray["great"] + "-";
        }
        return prefix + langArray["auntUncle"][sexA + parentSex] + "/" + prefix + langArray["nieceNephew"][sexB + siblingSex];
      }
    }

    // General cousin case
    else {
      let number = parseCousinNumber(generationA - 1);
      let removedNumber = parseRemovedNumber(generationB - generationA);
      let removed = ", " + removedNumber + langArray["removed"];
      return number + langArray["cousins"][sexes] + removed;
    }
  }

  // If person B is less than person A
  // We just reverse this case, call the function again, and reverse the results
  if (generationA > generationB) {
    let splitStr = relationshipCalculator(person2, person1, data).split("/");
    // Reverse the order
    return `${splitStr[1]}/${splitStr[0]}`;
  }

  return "Relationship could not be calculated";
}