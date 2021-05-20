/**
 * Creates the relationship-calculator panel.
 * @param person        The person for which we find relationship connections (ie. person 1)
 * @param data          The data object
 * @param view          Our main view object
 */
function showRelationshipCalculator(person: PersonDetails, data: Data, view: CanvasView) {
	const langArray: { [key: string]: any } = getLang();

	// Create the main container, and the header
	let container = document.createElement('div');
	container.style.width = "100%";

	let headerDiv = document.createElement('div');
	headerDiv.className = 'detailTitleDiv';

	let header = document.createElement('div');
	header.className = 'detailTitle';

	header.appendChild(document.createTextNode(langArray["relationshipCalculator"]));
	headerDiv.appendChild(header);
	container.appendChild(headerDiv);


	// Create the calculator itself
	let calculatorContainer = document.createElement('div');
	calculatorContainer.className = "detailRowContainer";
	calculatorContainer.style.textAlign = "center";

	// Person #2 text
	calculatorContainer.appendChild(document.createTextNode(langArray["person"] + "2"))

	// Search div
	let searchArea = document.createElement('div');
	searchArea.className = "search";

	// Search input
	let searchInput = document.createElement('input');
	searchInput.type = "text";
	searchInput.id = "search-input-rel";
	searchInput.className = "searchTerm";
	searchInput.autocomplete = "off";
	searchInput.placeholder = "Пошук (Search)";

	let searchList = document.createElement('div');
	searchList.id = "search-results-rel";

	searchArea.appendChild(searchInput);
	searchArea.appendChild(searchList);
	calculatorContainer.appendChild(searchArea);

	// Create the "Calculate" button
	let searchButton = document.createElement('div');
	searchButton.className = "button";
	searchButton.style.cursor = "pointer";
	searchButton.appendChild(document.createTextNode("Calculate"));


	// Handle the action when we finally click Calculate
	searchButton.onclick = function (_: MouseEvent) {
		const person1 = data.findPersonById(person.id);
		const person2 = data.findPersonByName((document.getElementById("search-input-rel") as HTMLInputElement).value);

		if (person1 === null || person2 === null) {
			showError("People matching the given names could not be found");
			return;
		}


		let names = displayFirstName(person1.name) + langArray["and"] + displayFirstName(person2.name);
		names += langArray["are"];
		const relationship = relationshipCalculator(person1.id, person2.id, data);

		(document.getElementById("relCalResponse") as HTMLElement).innerHTML = names + relationship;
	}


	let responseText = document.createElement('p');
	responseText.id = "relCalResponse";
	responseText.style.padding = "5px";

	calculatorContainer.appendChild(document.createElement('br'));
	calculatorContainer.appendChild(searchButton);
	calculatorContainer.appendChild(document.createElement('br'));
	calculatorContainer.appendChild(responseText);


	container.appendChild(calculatorContainer);

	showInInfoWindow(container);
	initSearchBar((document.getElementById("search-input-rel") as HTMLInputElement),
			(document.getElementById("search-results-rel") as HTMLElement), data, view, false);
}


/**
 * Creates a div with the person's life details.
 * @param canvasView  Our canvasView (used for creating the person-links)
 * @param data        The data object
 * @param curPerson   The person whose life details we generate here.
 */
function showPersonDetails(canvasView: CanvasView, data: Data, curPerson: PersonDetails) {
	let container = document.createElement('div');
	container.style.display = "table";
	container.style.borderCollapse = "collapse";
	container.style.width = "100%";

	let headerDiv = document.createElement('div');
	headerDiv.className = 'detailTitleDiv';
	container.appendChild(headerDiv);


	// Localization
	const langArray: { [key: string]: any } = getLang();

	// If we have multiple names
	for (let i = 0; i < curPerson.names.length; i++) {
		let nameDiv = document.createElement('div');
		nameDiv.className = 'detailTitle';

		// Parse the name
		if (i !== 0) {
			if (curPerson.names[i] === "\/\/") {
				// A weird case we see with the English monarchy example file
				break;
			}
			else {
				nameDiv.appendChild(document.createTextNode(`AKA ${displayName(curPerson.names[i])}`));
			}
		}
		else {
			nameDiv.appendChild(document.createTextNode(displayName(curPerson.names[i])));
		}
		headerDiv.appendChild(nameDiv);
	}


	/**
	 * Creates a link which opens the relationship calculator.
	 */
	function relCalcLink() {
		let personLink = document.createElement('a');
		personLink.style.cursor = "pointer";
		let linkContent = document.createTextNode(langArray["relationshipCalculator"]);
		personLink.appendChild(linkContent);

		personLink.addEventListener("click", function () {
			showRelationshipCalculator(curPerson, data, canvasView);
		});

		personLink.style.color = "#28E";
		return personLink;
	}


	/*
	Now we create the events pane, containing this person's life details.
	 */
	const sex = data.structure[curPerson["id"]]["sex"].toUpperCase();

	// Initialize the data container
	let eventsDivContainer = document.createElement('div');
	eventsDivContainer.className = "detailRowContainer";


	let rowGroupContainer = document.createElement('div');
	rowGroupContainer.style.display = "table";
	rowGroupContainer.style.width = "100%";

	let eventDiv = document.createElement('div');
	eventDiv.className = "detailRow1";
	eventDiv.style.display = "table";
	eventDiv.style.textAlign = "center";
	eventDiv.appendChild(relCalcLink());
	eventsDivContainer.appendChild(eventDiv);


	// We use this to alternate div background colors. Using n-th child doesn't work too well,
	// since we go thru multiple exterior container divs
	let styleNumber = 0;


	// If this person has any notes, we render them here
	for (let note of curPerson["notes"]) {
		let eventDiv = document.createElement('div');

		let divClass = (styleNumber === 0) ? "detailRow" : "detailRow1";
		styleNumber = (styleNumber === 0) ? 1 : 0; // Swap

		eventDiv.className = divClass;
		eventDiv.style.display = "table";

		let text = document.createElement('div');
		text.style.fontSize = "85%";
		text.style.lineHeight = "120%";
		text.style.padding = "5px";
		text.style.whiteSpace = "pre-wrap";

		text.appendChild(document.createTextNode(note));
		eventDiv.appendChild(text);
		eventsDivContainer.appendChild(eventDiv);
	}

	// We use the birthDate in the death case as well, so we declare it to have a broader scope
	let birthDate = "";

	// Run over each event
	for (let event of curPerson["events"]) {
		/// HELPER FUNCTIONS


		/**
		 * Creates a field with a date and string
		 * @param date      The date the event occurred.
		 * @param content   The HTMLElement containing text describing the event.
		 */
		function field(date: string, content: HTMLElement) {
			let dateDiv = document.createElement('div');
			dateDiv.className = 'rowIndex';
			dateDiv.appendChild(document.createTextNode(dateToLocale(date, langArray["months"])));
			eventDiv.appendChild(dateDiv);

			let dataDiv = document.createElement('div');
			dataDiv.className = 'rowContent';

			dataDiv.appendChild(content);
			eventDiv.appendChild(dataDiv);
		}

		// Now, we start the work

		let eventDiv = document.createElement('div');

		let divClass = (styleNumber == 0) ? "detailRow" : "detailRow1";
		styleNumber = (styleNumber == 0) ? 1 : 0; // Swap
		eventDiv.className = divClass;


		switch (event[event.length - 1]) { // We take the letter indicating event type
				// Birth
			case "B":
				const birthInfo = document.createElement('span');
				// Date and location
				birthDate = event[0];
				let birthLocation = event[1] ? langArray["locatedIn"] + event[1] : "";

				birthInfo.appendChild(document.createTextNode(langArray["born"][sex] + birthLocation));


				if (birthDate !== "") {

					let birthDateObj = Date.parse(birthDate.replaceAll("ABT ", "").replaceAll("-", "/"));

					// We only proceed if the birth date could be properly parsed
					// For some reason, iOS can't parse the dates correctly, so we just ignore them
					if (!Object.is(NaN, birthDateObj)) {
						let ageToday = new Date(Date.now() - birthDateObj.valueOf());
						let yearsOld = Math.abs(ageToday.getUTCFullYear() - 1970);

						let yearsOldStr = ` (${yearsOld.toString()} ${langArray["yearsAgo"]})`;
						birthInfo.appendChild(document.createTextNode(yearsOldStr));
					}
				}

				field(birthDate, birthInfo);
				break;

				// Death
			case "D":
				const deathInfo = document.createElement('span');
				let deathDate = event[0];
				const deathLocation = event[1] ? langArray["locatedIn"] + event[1] : "";
				const deathType = event[2] ? ` (${event[2]})` : "";

				let basicText = langArray["died"][sex] + deathLocation + deathType;
				deathInfo.appendChild(document.createTextNode(basicText));


				let ageAtDeathStr = "";
				if (birthDate !== "" && deathDate !== "") {
					let deathDateObj = new Date(deathDate.replaceAll("ABT ", "").replaceAll("-", "/"));
					let birthDateObj = new Date(birthDate);

					// Only proceed if both are valid numbers
					if (!Object.is(NaN, birthDateObj) && !Object.is(NaN, deathDateObj)) {
						let ageApart = new Date(deathDateObj.valueOf() - birthDateObj.valueOf());
						let ageAtDeath = Math.abs(ageApart.getUTCFullYear() - 1970);

						if (!Object.is(NaN, ageAtDeath)) {
							ageAtDeathStr = ` (${ageAtDeath.toString()} ${langArray["yearsOld"]})`;
							deathInfo.appendChild(document.createTextNode(ageAtDeathStr));
						}
					}
				}

				field(deathDate, deathInfo);
				break;

				// Burial data
			case "BUR":
				let burialLocation = event[1] ? langArray["locatedIn"] + event[1] : "";
				let burialType = event[2] ? " (" + event[2] + ")" : "";

				const burialInfo = document.createElement('span');
				let burialText = langArray["buried"][sex] + burialLocation + burialType;
				burialInfo.appendChild(document.createTextNode(burialText));

				field(event[0], burialInfo);
				break;

				// Occupation
			case "OCC":
				let occupationType = event[1] ? " " + event[1] : "";

				const occupationInfo = document.createElement('span');
				let occText = langArray["occupation"] + ":" + occupationType;
				occupationInfo.appendChild(document.createTextNode(occText));

				field(event[0], occupationInfo);
				break;

			case "M": // Marriage
			case "MARR":
				let marriageLocation = event[2] ? langArray["locatedIn"] + event[2] : "";

				const marriageInfo = document.createElement('span');
				marriageInfo.appendChild(document.createTextNode(langArray["married"][sex]));
				const personLink = canvasView.makePersonLink(event[1]);
				if (personLink !== null) {
					marriageInfo.appendChild(personLink);
				}
				marriageInfo.appendChild(document.createTextNode(marriageLocation));

				field(event[0], marriageInfo);
				break;

			case "DIV": // Divorce
				let divorceLocation = event[2] ? langArray["locatedIn"] + event[2] : "";

				const divorceInfo = document.createElement('span');
				divorceInfo.appendChild(document.createTextNode(langArray["divorced"]));
				const divorceeLink = canvasView.makePersonLink(event[1]);
				if (divorceeLink !== null) {
					divorceInfo.appendChild(divorceeLink);
				}
				divorceInfo.appendChild(document.createTextNode(divorceLocation));

				field(event[0], divorceInfo);
				break;

			default: // Catch case
				console.log("Could not parse event type: " + event[event.length - 1]);
		}
		rowGroupContainer.appendChild(eventDiv);
	}
	eventsDivContainer.appendChild(rowGroupContainer);


	// Handle the pictures

	for (let picture of curPerson["pics"]) {
		let eventDiv = document.createElement('div');

		let divClass = (styleNumber == 0) ? "detailRow" : "detailRow1";
		divClass += " pictureRow";
		styleNumber = (styleNumber == 0) ? 1 : 0; // Swap

		eventDiv.className = divClass;

		const image = document.createElement('img');
		image.onclick = function () {
			imgBox(this)
		};
		image.className = "eventPicture";
		image.src = picture;

		eventDiv.appendChild(image);
		eventsDivContainer.appendChild(eventDiv);
	}
	container.appendChild(eventsDivContainer);

	return container;
}