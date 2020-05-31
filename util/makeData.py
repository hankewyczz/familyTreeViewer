import re
import json
import gedcomUtils as gu
import argparse
import datetime
import os

import gedcom
from gedcom.element.individual import IndividualElement
from gedcom.element.object import ObjectElement
from gedcom.element.family import FamilyElement
from gedcom.parser import Parser


def ukrSort(part):
	'''
	We do this due to how the Ukrainian language is represented in Unicode. The basic Cyrillic alphabet
	covers the range of U+0410–U+04FF. However, the letter "I" is not part of the basic Cyrillic alphabet. 
	It's part of the Cyrillic extensions (U+0406). Therefore, when trying to alphabetize, the I becomes the first
	letter in this alphabet. 

	SO, to counter this, we replace any instances of "I" with "И" (the preceeding letter), and two "Я"'s, the last
	letter. This way, we are almost certain that this will come AFTER all words beginning with "И", but before 
	any starting with "Ї" (the next letter). 

	It's not perfect, but seeing as very few words begin with "И" to begin with, and none (that I know of) have a
	"ия" letter combination (let alone "ияя"), it does the job well. 

	Since we just use this function to determine the keys, it doesn't affect the name anywhere else, which is perfect


	Quick Wiki link for unicode reference:
	https://en.wikipedia.org/wiki/Cyrillic_script_in_Unicode#Basic_Cyrillic_alphabet

	'''
	originalI = ["і", "І"]
	for i in range(0, len(originalI)):
		part = re.sub(originalI[i], ["ияя", "ИЯЯ"][i], part)

	return part

def sortByNames(x):
	surnames = []
	nonSurnames = []
	inSurname = False # Checks if we are currently in the surname


	for part in x["name"].split(" "):
		part = ukrSort(part)
		inSurname = True if part.startswith("/") else inSurname

		# Check if in surname
		if inSurname:
			surnames.append(re.sub("/", "", part))			
		else:
			nonSurnames.append(part)

		# Checks if we've reached the end of the surname
		inSurname = False if part.endswith("/") else inSurname

	return surnames + nonSurnames


def isInstanceOf(element, tag):
	return element.get_tag() == tag


def generateArrays(gedcomParser):
	individuals, objects, families, notes = [], [], [], []
	for element in gedcomParser.get_root_child_elements():
		if isInstanceOf(element, "INDI"):
			individuals.append(element)
		elif isInstanceOf(element, "OBJE"):
			objects.append(element)
		elif isInstanceOf(element, "FAM"):
			families.append(element)
		elif isInstanceOf(element, "NOTE"):
			notes.append(element)

	return individuals, objects, families, notes



def main():
	# Parses arguments
	parser = argparse.ArgumentParser(description="Parse GEDCOM files for web viewing")
	parser.add_argument("--file", "-f", help="Source file", default="familyTree.ged")
	args = parser.parse_args()

	# Gets our input filename
	filename = args.file

	# The folder for the data files
	dataFolder = "../data/"

	# Data filenames
	structureOutput = "{0}structure.json".format(dataFolder)
	detailsOutput = "{0}details.json".format(dataFolder)
	burialOutput = "{0}burials.json".format(dataFolder)
	birthdayOutput = "{0}birthdays.json".format(dataFolder)

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
	# Loop over all people

	for individual in individuals:
		personObj = gu.Person(individual, families, objects, notes)


		def testCases(obj, former):
			if obj != former:
				print("{0} neq {1}".format(obj, former))

		testCases(personObj.id, gu.getID(individual))
		testCases(personObj.name[0], gu.getTag(individual, gedcom.tags.GEDCOM_TAG_NAME))
		testCases(personObj.name, gu.getTags(individual, gedcom.tags.GEDCOM_TAG_NAME))
		testCases(personObj.sex, gu.getTag(individual, gedcom.tags.GEDCOM_TAG_SEX).lower())
		testCases(personObj.parents, gu.getParents(individual, families))
		testCases(personObj.children, gu.getChildren(individual, families))
		testCases(personObj.spouses, gu.getSpouses(individual, families))
		testCases(personObj.birthData, gu.getBirthData(individual))
		testCases(personObj.deathData, gu.getDeathData(individual))


		person = {
			"id": personObj.id,
			"name": personObj.name[0],
			"sex": personObj.sex,
			"parents": personObj.parents,
			"spouses": personObj.spouses,
			"children": personObj.children,
			"birth": personObj.birthData,
			"death": personObj.deathData,
		}
		
		if initialPerson == None:
			initialPerson = person['id']


		testCases(personObj.fullBirthData, gu.getFullBirthData(individual))
		testCases(personObj.pics, gu.getPics(individual, objects))
		testCases(personObj.name, gu.getTags(individual, gedcom.tags.GEDCOM_TAG_NAME))
		testCases(personObj.notes, gu.getNotes(individual, notes))
		testCases(personObj.fullDeathData, gu.getFullDeathData(individual))

		testCases(personObj.marriageData, gu.getMarriageData(individual, families))
		testCases(personObj.divorceData, gu.getDivorceData(individual, families))
		testCases(personObj.occupationData, gu.getOccupationData(individual))
		testCases(personObj.burialData, gu.getBurialData(individual))

		detail = {
			"id": personObj.id,
			"pics": personObj.pics,
			"names": personObj.name,
			"notes": personObj.notes,
			"events": gu.sortByDate(
				# Birth event
				personObj.fullBirthData +
				# Marriage events
				personObj.marriageData + 
				# Divorce events
				personObj.divorceData +
				# Occupation events
				personObj.occupationData + 
				# Death event
				personObj.fullDeathData +
				# Burial data
				personObj.burialData
			),
		}


		structure.append(person)

		details[person["id"]] = detail

		# If birth data exists, and we get rid of the wrapper list, and we have a proper date
		birthData = personObj.fullBirthData
		if birthData and birthData[0] and birthData[0][0]:
			date = gu.stripBirthData(birthData[0][0])

			if date != "":
				birthday = [person["id"], date]
				birthdays.append(birthday)

		burialData = personObj.burialData
		if burialData and burialData[0] and burialData[0][1]:
			burialPlace = burialData[0][1]

			if burialData != "":
				burial = [person["id"], burialPlace]
				burials.append(burial)


	jsonStyling = {"sort_keys": True, "indent": 4, "separators":(',', ': ')}

	# Sort the structures and birthday files file
	structure.sort(key=sortByNames)
	birthdays.sort(key=lambda birthday: gu.dateParse(birthday[1]))
	burials.sort(key=lambda burial: burial[1])


	if not os.path.exists(dataFolder):
		os.makedirs(dataFolder)

	# Generate the structure file
	with open(structureOutput, "w+", encoding="utf8") as f:
		json.dump(structure, f, **jsonStyling)

	# Generate the details file
	with open(detailsOutput,"w+", encoding="utf8") as f:
		json.dump(details, f, **jsonStyling)

	# Generate the birthdays file
	with open(birthdayOutput, "w+", encoding="utf8") as f:
		json.dump(birthdays, f, **jsonStyling)

	# Generate the burials file
	with open(burialOutput, "w+", encoding="utf8") as f:
		json.dump(burials, f, **jsonStyling)

if __name__ == "__main__":
	main()
