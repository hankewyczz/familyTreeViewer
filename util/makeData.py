import argparse
import json
import os
import re

from dateutil import parser as date_parser
from gedcom.parser import Parser
import icu

import gedcomUtils as gu

# Goes through all the elements, sorts them into their appropriate lists
def generateArrays(gedcomParser):
    individuals, objects, families, notes = [], [], [], []
    for element in gedcomParser.get_root_child_elements():
        if element.get_tag() == "INDI":
            individuals.append(element)
        elif element.get_tag() == "OBJE":
            objects.append(element)
        elif element.get_tag() == "FAM":
            families.append(element)
        elif element.get_tag() == "NOTE":
            notes.append(element)

    return individuals, objects, families, notes


# This is where the magic happens
def main():
    print("Running!")

    # Parses arguments
    parser = argparse.ArgumentParser(description="Parse GEDCOM files for web viewing")
    parser.add_argument("--file", "-f", help="Source GEDCOM file", default="familyTree.ged")
    args = parser.parse_args()

    # Gets our input filename
    filename = args.file

    # The folder for the data files
    dataFolder = "../data/"

    # Data filenames
    structureOutput = f"{dataFolder}structure.json"
    detailsOutput = f"{dataFolder}details.json"
    burialOutput = f"{dataFolder}burials.json"
    birthdayOutput = f"{dataFolder}birthdays.json"

    # Initialize the structure and details containers
    structure = []
    details = {}
    birthdays = []
    burials = []

    # Initialize the parser
    gedcomParser = Parser()
    gedcomParser.parse_file(filename)
    # Creates lists of individuals, objects, and families
    individuals, objects, families, notes = generateArrays(gedcomParser)

    # No initial person at first
    initialPerson = None

    # Create the person objects
    personObjs = [gu.Person(indiv, families, objects, notes) for indiv in individuals]

    # Now, we do the real work
    for personObj in personObjs:
        # Sanity check - do the Ukrainian name genders check out?
        surname = re.search('/([^/)]+)', personObj.name[0]).group(1)

        if personObj.sex.upper() == "F":
            # Surname check ("ий")
            if surname.endswith("ий"):
                print("{0} should end in 'а', not 'ий'".format(personObj.name[0]))
        elif personObj.sex.upper() == "M":
            if surname.endswith("ська"):
                print("{0} should end in 'ий', not 'а'".format(personObj.name[0]))

        # We check for a common ancestor among all spouses:
        personObj.handleCommonAncestor(personObjs)

        person = {
            "id": personObj.id,
            "name": personObj.name[0],
            "sex": personObj.sex,
            "parents": personObj.parents,
            "spouses": personObj.spouses,
            "children": personObj.children,
            "birth": personObj.simpleBirthData,
            "death": personObj.simpleDeathData,
        }

        if initialPerson is None:
            initialPerson = person['id']

        detail = {
            "id": personObj.id,
            "pics": personObj.pics,
            "names": personObj.name,
            "notes": personObj.notes,
            "events": personObj.birthData +
                      # We only bother sorting the middle stuff
                      # Birth, death, and burial order never change (hopefully)
                      gu.sortEventsByDate(
                          # Marriage events
                          personObj.marriageData +
                          # Divorce events
                          personObj.divorceData +
                          # Occupation events
                          personObj.occupationData
                      ) +
                      personObj.deathData +  # Death event
                      personObj.burialData,  # Burial data
            "parentsHidden": personObj.parentsHidden,
            "childrenHidden": personObj.childrenHidden,
            "redirects": personObj.redirects,
            "redirectsTo": personObj.redirectsTo,
            "ancestors": personObj.ancestors,
        }

        structure.append(person)

        details[person["id"]] = detail

        # We add the information to the collections - the birthday list and the burial list

        # If birth data exists, and we get rid of the wrapper list, and we have a proper date
        if personObj.birthData and personObj.birthData[0] and personObj.birthData[0][0]:
            date = gu.SimpleDate(personObj.birthData[0][0])

            if date.month and date.day:
                birthdays.append([person["id"], f"{date.month}-{date.day}"])

        # Burial list
        if personObj.burialData and personObj.burialData[0] and personObj.burialData[0][1]:
            burialPlace = personObj.burialData[0][1]

            if burialPlace != "":
                burials.append([person["id"], burialPlace])

    jsonStyling = {"indent": 4, "separators": (',', ':')}

    # Sort the structures and birthday files file
    # Sorting in ukrainian:
    collator = icu.Collator.createInstance(icu.Locale('uk_UK.UTF-8'))

    def reverseNameOrder(p):
        # We split only the first parenthesis
        nonSurnames, surnames = p["name"].split("/", 1)
        return surnames + nonSurnames

    structure.sort(key=lambda p: collator.getSortKey(reverseNameOrder(p)))
    birthdays.sort(key=lambda birthday: date_parser.parse(birthday[1]))
    burials.sort(key=lambda burial: burial[1])

    if not os.path.exists(dataFolder):
        os.makedirs(dataFolder)

    # Generate the structure file
    with open(structureOutput, "w+", encoding="utf8") as f:
        json.dump(structure, f, **jsonStyling)

    # Generate the details file
    with open(detailsOutput, "w+", encoding="utf8") as f:
        json.dump(details, f, **jsonStyling)

    # Generate the birthdays file
    with open(birthdayOutput, "w+", encoding="utf8") as f:
        json.dump(birthdays, f, **jsonStyling)

    # Generate the burials file
    with open(burialOutput, "w+", encoding="utf8") as f:
        json.dump(burials, f, **jsonStyling)

    # Hang so user can see output before closing
    input("Done!")


if __name__ == "__main__":
    main()
