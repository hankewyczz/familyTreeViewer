/**
 * Grabs the contents of a JSON file, and then executes the given callback.
 * @param address   The address of the file
 * @param callback  The callback function to execute
 */
async function getJsonData(address: string, callback: any) {
  return fetch(address).then(r => r.json()).then(r => callback(r));
}


/**
 * Loads all the JSON data (and parses it).
 * @param callback  The callback to execute with the parsed data
 */
async function loadData(callback: any) {
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

  // Initialize data dict
  let data: { [key: string]: any } = {};


  // Get the structure file
  let structureData = getJsonData(structureFile, (content: PersonStructure[]) => {
    data["structure"] = {};
    content.map(p => data["structure"][p["id"]] = p);
    data["structure_raw"] = content;
    console.log("Loaded structure.json");
  });

  // Get the details file
  let detailsData = getJsonData(detailsFile, (content: { [key: string]: PersonDetails }) => {
    data["details"] = content;
    console.log("Loaded details.json");
  })

  // Get the burials file
  let burialsData = getJsonData(burialsFile, (content: string[]) => {
    data["burials"] = content;
    console.log("Loaded burials.json");
  })

  // Get birthdays
  let birthdaysData = getJsonData(birthdaysFile, (returnVal: any) => {
    data["birthdays"] = returnVal;
    console.log("Loaded birthdays.json");

  })

  // Run our callback as soon as all of our data has loaded
  await Promise.all([structureData, detailsData, burialsData, birthdaysData])
  .then(() => callback(data));
}