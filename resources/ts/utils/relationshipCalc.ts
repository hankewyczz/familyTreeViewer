/**
 * Calculates the relationship between two people.
 * @param person1 The first person
 * @param person2 The second person
 * @param data    The family data
 */
function relationshipCalculator(person1: string, person2: string, data: Data): string {
	const langArray: { [key: string]: any } = getLang();
	const details = data.details;

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
					// We know that a[1] and a2[1] are always numbers (due to the order), but TS doesn't
					// @ts-ignore
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
	function distanceToAncestor(person: string, ancestor: string): number {
		for (let a of details[person]["ancestors"]) {
			if (a[0] === ancestor) {
				return a[1] as number;
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
					case "1":
						return `${i}st`;
					case "2":
						return `${i}nd`;
					case "3":
						return `${i}rt`;
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

	const sexA = data.structure[person1]["sex"].toUpperCase();
	const sexB = data.structure[person2]["sex"].toUpperCase();
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
	 * Returns the sex of the least common relation (ie. person1's sibling, and person2's parent/grandparent)
	 *    This is necessary for the Ukrainian language parsing. For example, there are two terms for
	 *    "uncle" - one for "father's brother", and another for "mother's brother".
	 * @param p1 The first person
	 * @param p2 The second person
	 */
	function getSiblingAncestor(p1: string, p2: string) {
		let parents1 = data.structure[p1]["parents"];
		let parents1children = [];

		// Get the batch of children, of which p1 is a part of (handles multiple marriage cases)
		for (let parent of parents1) {
			parents1children = data.structure[parent]["children"];
			if (parents1children.includes(p1)) {
				break;
			}
		}

		// Creates an array of all the IDs of p2's ancestors
		let ancestors2 = data.details[p2]["ancestors"].map((a: (string | number)[]) => a[0]);


		for (let child of parents1children) {
			if (ancestors2.includes(child)) {
				return data.structure[child]["sex"].toUpperCase();
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
			let parents2 = data.structure[person2]["parents"];
			let parentSex = "F"; // Keep this as a default

			// Iterate over p2's parents
			for (let parent2 of parents2) {
				let ancestorsB = data.details[parent2]["ancestors"].map((a: (string | number)[]) => a[0]);
				// Check if the ancestor is on this parent's side
				if (ancestorsB.includes(lcAncestor[0])) {
					parentSex = data.structure[parent2]["sex"].toUpperCase();
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