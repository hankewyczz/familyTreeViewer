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
const bgColor: { [key: string]: string } = {"m": "#ACE2F2", "f": "#F8AFD7", "": "#d3d3d3"}; // background colors


const imageIcons = {
	downArrow: loadImage('resources/images/downarrow.png'),
	upArrow: loadImage('resources/images/uparrow.png'),
	doubleArrow: loadImage('resources/images/doublearrow.png'),
	notes: loadImage('resources/images/notes.png'),
}


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
		months: ["Jan.", "Feb.", "Mar.", "Apr.", "May", "Jun", "Jul.", "Aug.", "Sep.", "Oct.", "Nov.", "Dec."],
	},
];

/**
 * Gets the current language.
 */
function getLang() {
	for (let lang of languages) {
		if (lang["id"] == currentLanguage) {
			return lang;
		}
	}
	throw new Error(`Language ${currentLanguage} not found`);
}


/**
 * Universally updates the scale.
 * @param newScale  The new scale factor.
 */
function updateScale(newScale: number) {
	scale = newScale;
	verticalMargin = baseVM * scale;
	horizontalMargin = baseHM * scale;
	nodeBorderMargin = baseBM * scale;
	baseFont.scaleSize(scale);
	detailFont.scaleSize(scale);
}


/**
 * Loads an image.
 * @param source  The image source
 */
function loadImage(source: string) {
	let image = new Image();
	image.src = source;
	return image
}


/**
 * Generates the info window with the following
 * @param content  The content of the info window
 */
function showInInfoWindow(content: HTMLElement) {
	let info = document.getElementById("textinfo") as HTMLElement;

	// Clear it of any prior info
	while (info.firstChild) {
		info.removeChild(info.firstChild);
	}

	info.appendChild(content);
	info.scrollTop = 0;

	(document.getElementById("infowindow") as HTMLElement).style.opacity = "1";
}


/**
 * Parses the name for display
 * @param name  The name to parse.
 */
function displayName(name: string): string {
	return name.replace(/\//g, "");
}

/**
 * Parses only the first name for display.
 * @param name  The name to parse
 */
function displayFirstName(name: string) {
	return name.split("/")[0].trim();
}

/**
 * Parses the surname for display.
 * @param name  The name to parse
 */
function displaySurname(name: string) {
	let s = name.split("/", 2);
	return s.length == 2 ? s[1].trim() : "";
	// FOr some reason, this returned "" before in ALL CASES
}


/**
 * Initializes all of the interface buttons
 * @param data	Our data
 * @param view	Our CanvasView
 */
function initInterfaceButtons(data: Data, view: CanvasView) {
	const rawStructure = data.structure_raw;

	/**
	 * Generates the info window with some given information.
	 * @param dataSrc		The source of data to be displayed
	 * @param infoTitle	The title of the info window
	 */
	function generateInfoWindow(dataSrc: Array<Array<string>>, infoTitle: string) {
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

			// Append the link to the name container.
			const personLink = view.makePersonLink(curId);
			if (personLink !== null) {
				nameDiv.appendChild(personLink);
			}


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
			}
			else {
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

		let container = document.createElement('div');

		let headerDiv = document.createElement('div');
		headerDiv.className = 'detailTitleDiv';

		let header = document.createElement('div');
		header.className = 'detailTitle';
		header.appendChild(document.createTextNode(infoTitle));

		headerDiv.appendChild(header);
		container.appendChild(headerDiv);
		container.appendChild(contentContainer);

		showInInfoWindow(container);
	}

	// Index button
	(document.getElementById("indexbutton") as HTMLElement).onclick =
			function (_: MouseEvent) {
				// We generate an 2D array of [id, surname] for each person
				let namesArray = rawStructure.map(
						(p: PersonStructure) => [p["id"], displaySurname(p["name"])]);

				return generateInfoWindow(namesArray, "Index/Індех");
			};

	// Birthdays button
	(document.getElementById("birthdaybutton") as HTMLElement).onclick =
			function (_: MouseEvent) {
				const months = getLang()["months"];
				const bdayData = data.birthdays.map(a => [a[0], dateToLocale(a[1], months)]);
				return generateInfoWindow(bdayData, "Birthdays")
			};


	// Burial button
	(document.getElementById("burialbutton") as HTMLElement).onclick =
			function (_: MouseEvent) {
				generateInfoWindow(data.burials, "Burials")
			};

	// HELP BUTTON
	(document.getElementById("helpbutton") as HTMLElement).onclick =
			function (_: MouseEvent) {
				let helpDiv = (document.getElementById("helpDivHidden") as HTMLElement);
				// We have to clone it when we show it
				showInInfoWindow(helpDiv.cloneNode(true) as HTMLElement);
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


/**
 * Sets all the events for any search bar.
 * @param searchInput			The search bar element
 * @param searchResults		The search results element
 * @param data						Our data
 * @param view						Our view
 * @param link						Should the results link to the person or not?
 */
function initSearchBar(searchInput: HTMLInputElement,
											 searchResults: HTMLElement,
											 data: Data, view: CanvasView,
											 link = true) {

	const rawStructure = data.structure_raw;


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
		rowDiv.addEventListener("mousedown", function (event: any) {
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
	else if (dateArr.length === 2) {
		let month = months[parseInt(dateArr[0]) - 1];
		return `${approxStr}${dateArr[1]} ${month}`;
	}
	// We just have the year - return it;
	else if (dateArr.length === 1) {
		return approxStr + dateArr[0];
	}

	console.log("Could not parse date: " + dateStr);
	return dateStr;
}


/**
 * Displays an error message on the screen.
 * @param message	The message to display
 * @param fatal		Is the error fatal or not?
 */
function showError(message: string, fatal: boolean = false) {
	if (fatal) {
		console.error(message);
	}
	else {
		console.warn(message);
	}

	// gets the message element
	let messageElement = document.getElementById("message") as HTMLElement;
	// Sets value to the message
	messageElement.innerHTML = message;

	// Fades the message in
	messageElement.style.opacity = "1";
	messageElement.style.display = "block";

	// If the message isn't fatal, we fade out after 5 seconds
	if (!fatal) {
		setTimeout(function () {
			messageElement.style.opacity = "0";
			messageElement.style.display = "none";
		}, 5000);
	}
}