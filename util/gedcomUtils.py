import gedcom
from gedcom.element.individual import IndividualElement
from gedcom.element.object import ObjectElement
from gedcom.element.family import FamilyElement

from gedcom.parser import Parser
import os
import re
from dateutil import parser
import datetime


IMAGES_FOLDER = "../resources/photos/"


#### GENERAL UTILITIES #####
# Excludes an element from a list
# Mainly used to exclude our individual from the spouse list
def exclude(value, lst):
	while value in lst:
		lst.remove(value)
	return lst

# Parses the date
def dateParse(dateStr):
	try:
		return parser.parse(dateStr)
	except:
		return datetime.datetime.min# If we can't get a date, we go to min

# cleans up the date string
def cleanDate(x):
	# Strip any date inaccuracies
	x = re.sub("ABT ", "", x.upper())
	x = re.sub("ABOUT ", "", x)

	while True:
		# We try to get the start date
		dateRange = re.match('^(\d\d\d\d)[- ]\d\d\d\d', x)
		# If we get a match
		if dateRange:
			x = dateRange.groups()[0]
		else:
			break
	return x

# Gets the key for the given date
def dateKey(y):
	# If we're not given a date...
	if y[0] == "":
		# If it's birth
		if y[-1] == "B":
			# Make it the min date possible
			# Since we only use this for 
			return datetime.datetime(datetime.MINYEAR,1,1)
		# if it's death
		elif y[-1] == "D":
			# Make it max date possible
			return datetime.datetime(datetime.MAXYEAR,1,1)
		else:
			raise ValueError("No valid date given ({0})".format(y))
	# If we have a year, we just clean it and parse it (get num value)
	return dateParse(cleanDate(y[0]))


# Sort events chronologically
def sortByDate(lst):
	for date in lst:
		try:
			dateParse(cleanDate(date[0]))
		except:
			raise ValueError("Could not parse date", dateParse(""))
	
	lst.sort(key=dateKey)
	return lst
	



### MORE SPECIFIC ###


# Gets the id of the given individual
def getID(indiv):
	return indiv.get_pointer()

# Gets a given tag
def getTag(indiv, tag):
	for child in indiv.get_child_elements():
		if child.get_tag() == tag:
			return child.get_value()

# FOr a tag with multiple values
def getTags(indiv, tag, value=True):
	array = []
	for child in indiv.get_child_elements():
		if child.get_tag() == tag:
			if value:
				array.append(child.get_value())
			else:
				array.append(child)
	return array

# gets an element with this id
def getObj(id, objects):
	for obj in objects:
		if obj.get_pointer() == id:
			return obj

# parses the picture filename
def parsePictureFilename(filename):
	file = filename.split("\\")[-1] # Gets the filename
	fileJoined = os.path.join(IMAGES_FOLDER, file)
	return fileJoined




# gets pictures for the given individual
def getPics(individual, objects):
	# Gets all the objects for this given person
	objs = [getObj(obj, objects) for obj in getTags(individual, gedcom.tags.GEDCOM_TAG_OBJECT)]
	# gets the pictures from all of the objects
	pics = []
	for obj in objs:
		pic = getTag(obj, gedcom.tags.GEDCOM_TAG_FILE)
		pic = parsePictureFilename(pic)
		pics.append(pic)
	return pics


# Gets the given individual's parents
def getParents(individual, families):
	try:
		family = getObj(getTag(individual, gedcom.tags.GEDCOM_TAG_FAMILY_CHILD), families)
		# Since we examine the family in which this person is a child in,
		# we grab the husband and wife (as opposed to father/mother)
		father = getTag(family, gedcom.tags.GEDCOM_TAG_HUSBAND)
		mother = getTag(family, gedcom.tags.GEDCOM_TAG_WIFE)
		return [father, mother]
	except:
		return []


# Gets the spouse families
def getSFamily(individual, families):
	sFamilies = getTags(individual, gedcom.tags.GEDCOM_TAG_FAMILY_SPOUSE)
	# Converts them into objects
	sFamilies = [getObj(family, families) for family in sFamilies]
	return sFamilies



# Gets the spouse from this family
def getSpouse(individual, family):
	spouse = [getTag(family, gedcom.tags.GEDCOM_TAG_HUSBAND), getTag(family, gedcom.tags.GEDCOM_TAG_WIFE)]
	return exclude(getID(individual), spouse)[0]



# gets the individual's spouses
def getSpouses(individual, families):
	sFamilies = getSFamily(individual, families)
	spouseList = []
	try:
		for family in sFamilies:
			spouseList.append(getSpouse(individual, family))
	except:
		pass
		# We don't do anything here, since the spouseList is already set to []
		# Conviniently, this is what we want to return
		# However, we still have to handle the exception in this case

	return spouseList



# Gets the individuals children
def getChildren(individual, families):
	sFamilies = getSFamily(individual, families)
	childList = []
	try:
		for family in sFamilies:
			childList.extend(getTags(family, gedcom.tags.GEDCOM_TAG_CHILD))
	except:
		pass
		# See explaination above

	return childList




# Gets simple birth data
def getBirthData(individual):
	birthPlace = individual.get_birth_data()[1]
	birthPlace = birthPlace.split(",")[0]

	birthDate = individual.get_birth_year()
	birthDate = str(birthDate) if birthDate != -1 else ''
	return [birthDate, birthPlace]


# Gets simple death data
def getDeathData(individual):
	deathPlace = individual.get_death_data()[1]
	deathPlace = deathPlace.split(",")[0]
	deathDate = individual.get_death_year()
	deathDate = str(deathDate) if deathDate != -1 else ''

	return [deathDate, deathPlace]



# gets FULL birth data
def getFullBirthData(individual):
	d, l, x = individual.get_birth_data()
	if all(x == '' for x in [d, l]):
		return []
	else:
		return [[d, l, "B"]]


# gets FULL death data
def getFullDeathData(indiv):
	date, place, dType = "", "", ""

	for child in indiv.get_child_elements():
		if child.get_tag() == gedcom.tags.GEDCOM_TAG_DEATH:
			for childOfChild in child.get_child_elements():
				if childOfChild.get_tag() == gedcom.tags.GEDCOM_TAG_DATE:
					date = childOfChild.get_value()
				if childOfChild.get_tag() == gedcom.tags.GEDCOM_TAG_PLACE:
					place = childOfChild.get_value()
				if childOfChild.get_tag() == "TYPE":
					dType = childOfChild.get_value()

	if all(x == '' for x in [date, place, dType]):
		return []
	else:
		return [[date, place, dType, "D"]]


# Abstract function for divorce and marriage data
def getMDData(individual, families, type):
	events = []
	sFamilies = getSFamily(individual, families)
	tag = {"M": gedcom.tags.GEDCOM_TAG_MARRIAGE, "DIV": "DIV"}[type.upper()]

	for family in sFamilies:
		date, spouse, place = "", "", ""

		for child in family.get_child_elements():
			if child.get_tag() == tag:
				for sub in child.get_child_elements():
					if sub.get_tag() == gedcom.tags.GEDCOM_TAG_DATE:
						date = sub.get_value()
					elif sub.get_tag() == gedcom.tags.GEDCOM_TAG_PLACE:
						place = sub.get_value()

		spouse = getSpouse(individual, family)

		if all(x == "" for x in [date, place]):
			pass
		else:
			events.append([date, spouse, place, type.upper()]) 
	return events



# gets marriage data
def getMarriageData(individual, families):
	return getMDData(individual, families, "M")


# gets divorce data
def getDivorceData(individual, families):
	return getMDData(individual, families, "DIV")



# gets occupation data
def getOccupationData(individual):
	occupations = []
	occs = getTags(individual, gedcom.tags.GEDCOM_TAG_OCCUPATION, value=False)

	for occ in occs:
		date = ""
		for sub in occ.get_child_elements():
			if sub.get_tag() == gedcom.tags.GEDCOM_TAG_DATE:
				date = sub.get_value()
		occupations.append([date, occ.get_value(), "OCC"])

	return occupations