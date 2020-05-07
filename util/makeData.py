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
	covers the range of U+0400–U+04FF. However, the letter "I" is not part of the basic Cyrillic alphabet. 
	It's part of the Cyrillic extensions (U+0406). Therefore, when trying to alphabetize, the I becomes the first
	letter in this alphabet. 

	SO, to counter this, we replace any instances of "I" with "И" (the preceeding letter), and two "Я"'s, the last
	letter. This way, we are almost certain that this will come AFTER all words beginning with "И", but before 
	any starting with "Ї" (the next letter). 

	It's not perfect, but seeing as very few words begin with "И" to begin with, and none (that I know of) have a
	"ияя" letter combination, it does the job well. 

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


def isNote(element):
	return element.get_tag() == "NOTE"


def generateArrays(gedcomParser):
	individuals, objects, families, notes = [], [], [], []
	for element in gedcomParser.get_root_child_elements():
		if isinstance(element, IndividualElement):
			individuals.append(element)
		elif isinstance(element, ObjectElement):
			objects.append(element)
		elif isinstance(element, FamilyElement):
			families.append(element)
		elif isNote(element):
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

	# Initialize the structure and details containers
	structure = []
	details = {}

	
	# Initialize the parser
	gedcomParser = Parser()
	gedcomParser.parse_file(filename)

	# Creates lists of individuals, objects, and families
	individuals, objects, families, notes = generateArrays(gedcomParser)
	

	# No initial person at first
	initialPerson = None
	# Loop over all people
	for individual in individuals:
		person = {
			"id": gu.getID(individual),
			"name": gu.getTag(individual, gedcom.tags.GEDCOM_TAG_NAME),
			"sex": gu.getTag(individual, gedcom.tags.GEDCOM_TAG_SEX).lower(),
			"parents": gu.getParents(individual, families),
			"spouses": gu.getSpouses(individual, families),
			"children": gu.getChildren(individual, families),
			"birth": gu.getBirthData(individual),
			"death": gu.getDeathData(individual),
		}
		
		if initialPerson == None:
			initialPerson = person['id']

		detail = {
			"id": person["id"],
			"pics": gu.getPics(individual, objects),
			"names": gu.getTags(individual, gedcom.tags.GEDCOM_TAG_NAME),
			"notes": gu.getNotes(individual, notes),
			"events": gu.sortByDate(
				# Birth event
				gu.getFullBirthData(individual) +
				# Death event
				gu.getFullDeathData(individual) +
				# Marriage events
				gu.getMarriageData(individual, families) + 
				# Divorce events
				gu.getDivorceData(individual, families) +
				# Occupation events
				gu.getOccupationData(individual) + 
				# Burial data
				gu.getBurialData(individual)
			),
		}
		

		structure.append(person)
		details[person["id"]] = detail


	jsonStyling = {"sort_keys": True, "indent": 4, "separators":(',', ': ')}


	# Sort the structure file
	structure.sort(key=sortByNames)
	if not os.path.exists(dataFolder):
		os.makedirs(dataFolder)

	# Generate the structure file
	with open(structureOutput, "w+", encoding="utf8") as f:
		json.dump(structure, f, **jsonStyling)

	# Generate the details file
	with open(detailsOutput,"w+", encoding="utf8") as f:
		json.dump(details, f, **jsonStyling)

if __name__ == "__main__":
	main()
