import re
import json
import gedcomUtils as gu
import argparse
import dateutil
import os
from gedcom.parser import Parser


def ukrStrSort(str_lst):
	''' Long story short - Python sorts by Unicode value, which doesn't work for Ukrainian. 

	The basic Cyrillic alphabet	covers the range of U+0410–U+04FF. 
	The letters "І/Ї/Є" are not part of this  - they're in the Cyrillic extensions (U+0406).
	'''

	alphabet = ["А", "Б", "В", "Г", "Ґ", "Д", "Е", "Є", "Ж", "З", "И", "І", "Ї", "Й", "К", "Л", 
	"М", "Н", "О", "П", "Р", "С", "Т", "У", "Ф", "Х", "Ц", "Ч", "Ш", "Щ", "Ю", "Я", "Ь", "а", "б", 
	"в", "г", "ґ", "д", "е", "є", "ж", "з", "и", "і", "ї", "й", "к", "л", "м", "н", "о", "п", "р", 
	"с", "т", "у", "ф", "х", "ц", "ч", "ш", "щ", "ю", "я", "ь"]

	string = ''.join(str_lst)
	# If the given character isn't in the list, then it's not something we need to worry about
	# Otherwise, we take the index + 1040 (The first letter, "А", has an ord value of 1040)
	# This allows for proper sorting of multilingual strings 
	return [ord(char) if char not in alphabet else alphabet.index(char) + 1040 for char in string]


def sortByNames(x):
	surnames = []
	nonSurnames = []
	inSurname = False # Checks if we are currently in the surname


	for part in x["name"].split(" "):
		inSurname = True if part.startswith("/") else inSurname

		# Check if in surname
		if inSurname:
			surnames.append(re.sub("/", "", part))			
		else:
			nonSurnames.append(part)

		# Checks if we've reached the end of the surname
		inSurname = False if part.endswith("/") else inSurname


	return ukrStrSort(surnames + nonSurnames)


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
	print("Running!")
	# Parses arguments
	parser = argparse.ArgumentParser(description="Parse GEDCOM files for web viewing")
	parser.add_argument("--file", "-f", help="Source file", default="familyTree.ged")
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
		surname = re.search('\/([^\/)]+)', personObj.name[0]).group(1)

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
		
		if initialPerson == None:
			initialPerson = person['id']

		detail = {
			"id": personObj.id,
			"pics": personObj.pics,
			"names": personObj.name,
			"notes": personObj.notes,
			"events": personObj.birthData + # Birth event
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
			# Death event
			personObj.deathData +
			# Burial data
			personObj.burialData
			,
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


	jsonStyling = {"indent": 4, "separators":(',', ':')}

	# Sort the structures and birthday files file
	structure.sort(key=sortByNames)
	birthdays.sort(key=lambda birthday: dateutil.parser.parse(birthday[1]))
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

	# Hang so user can see output before closing
	input("Done!")

if __name__ == "__main__":
	main()
