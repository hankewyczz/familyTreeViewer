class Data {
	structure: { [key: string]: PersonStructure };
	structure_raw: PersonStructure[];
	details: { [key: string]: PersonDetails };
	burials: string[][];
	birthdays: string[][];

	constructor(structure: PersonStructure[], details: { [key: string]: PersonDetails },
							burials: string[][], birthdays: string[][]) {
		this.structure = {};
		this.structure_raw = structure;
		structure.map((p: PersonStructure) => this.structure[p["id"]] = p);
		this.details = details;
		this.burials = burials;
		this.birthdays = birthdays;
	}

	/**
	 * Finds the PersonStructure with the given name (if any).
	 * @param name  The name to search for.
	 */
	findPersonByName(name: string) {
		name = name.replaceAll("/", "");

		for (let person of this.structure_raw) {
			if (displayName(person["name"]) === name) {
				return person;
			}
		}
		return null;
	}

	/**
	 * Finds the PersonStructure with the given ID
	 * @param id  The ID to search for.
	 */
	findPersonById(id: string) {
		return (id in this.structure) ? this.structure[id] : null;
	}
}


/**
 * Grabs the contents of a JSON file, and then executes the given callback.
 * @param address   The address of the file
 */
async function getJsonData(address: string) {
	let ret = fetch(address).then(r => r.json());
	console.log(`Fetching ${address}`);
	return ret;
}


/**
 * Loads all the JSON data (and parses it).
 */
async function loadData() {
	/* We append this every time to ensure that the JSON files aren't kept in the cache.
	Fixes an issue where, for some reason, JSON files wouldn't reflect an update.
	For example, they'd call a person which no longer existed (since only some of the files would
	update?, or not reflect changes). */
	const rand = Math.random().toString(36).substr(2, 5);

	// All the files we need
	const structureFile = "data/structure.json?" + rand;
	const detailsFile = "data/details.json?" + rand;
	const burialsFile = "data/burials.json?" + rand;
	const birthdaysFile = "data/birthdays.json?" + rand;

	// Get the structure file
	let structureData: PersonStructure[] = await getJsonData(structureFile);

	// Get the details file
	let detailsData: { [key: string]: PersonDetails } = await getJsonData(detailsFile);

	// Get the burials file
	let burialsData: string[][] = await getJsonData(burialsFile);

	// Get birthdays
	let birthdaysData: string[][] = await getJsonData(birthdaysFile);

	// Return data as soon as all of our work has finished
	return await Promise.all([structureData, detailsData, burialsData, birthdaysData])
	.then(() => new Data(structureData, detailsData, burialsData, birthdaysData));
}