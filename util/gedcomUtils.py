import gedcom
from gedcom.element.individual import IndividualElement
from gedcom.element.object import ObjectElement
from gedcom.element.family import FamilyElement

from gedcom.parser import Parser
import os
import re
from dateutil import parser
import datetime


IMAGES_FOLDER = "resources/photos/"


#### GENERAL UTILITIES #####
# Cleans out any null values
def cleanNull(lst):
	newLst = []
	for val in lst:
		if val != None:
			newLst.append(val)
	return newLst


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
		return datetime.datetime.min # If we can't get a date, we go to min

# cleans up the date string
def cleanDate(x):
	# Strip any date inaccuracies
	x = re.sub("ABT ", "", x.upper())
	x = re.sub("ABOUT ", "", x) 
	# If we wanted to handle the 'BET' case, do it here

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
		return datetime.datetime(datetime.MAXYEAR,1,1)
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


# Strips birthday data
def stripBirthData(date):
    dateSplit = date.split()
    # Unless we have a full birthday, kill it
    if len(dateSplit) != 3:
        return ""

    try:
        day = int(dateSplit[0])
    # Cannot parse the day
    except ValueError:
        return ""

    # The day is not a valid one
    if day < 1 or day > 31:
        return ""

    if dateSplit[1].upper() not in ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]:
        return ""

    return "{0} {1}".format(str(day), dateSplit[1].title())


# Person object
class Person():
	def __init__(self, individual, families, objects, notes):
		self.indiv = individual
		self.getId()
		self.getName()
		self.getSex()
		self.getBirthData()
		self.getFullBirthData()
		self.getDeathData()
		self.getFullDeathData()
		self.getOccupationData()
		self.getBurialData()

		# Family
		self.getSpousalFamilies(families)
		self.getParents(families)
		self.getSpouses(families)
		self.getChildren(families)
		self.getMarriageData(families)
		self.getDivorceData(families)

		# Objects
		self.getPics(objects)

		# Notes
		self.getNotes(notes)

	
	# Gets the given tag
	def getTag(self, element, tag):
		return self.getTags(element, tag)[0]

	# Gets the given tags
	def getTags(self, element, tag, value=True):
		array = []
		for child in element.get_child_elements():
			if child.get_tag() == tag:
				if value:
					array.append(child.get_value())
				else:
					array.append(child)
		return array

	# Gets the ID of this person
	def getId(self):
		self.id = self.indiv.get_pointer()

	# Gets the name of this person
	def getName(self):
		self.name = self.getTags(self.indiv, "NAME")
	
	# Gets the sex of this person
	def getSex(self):
		self.sex = self.getTag(self.indiv, "SEX")[0].lower()

	# Gets this person's parents (if any)
	def getParents(self, families):
		try:
			family = getObj(self.getTag(self.indiv, "FAMC"), families) # Get the family object
			# Since we examine the family in which this person is a child in,
			# we grab the husband and wife (as opposed to father/mother)
			father = self.getTag(family, "HUSB")
			mother = self.getTag(family, "WIFE")

			self.parents = cleanNull([father, mother]) # Strip any null values
		except:
			self.parents = []

	# Gets all the families in which this person is a spouse
	def getSpousalFamilies(self, families):
		sFamilies = self.getTags(self.indiv, "FAMS")
		# Converts them into objects
		sFamilies = [getObj(family, families) for family in sFamilies]
		self.sFamilies = sFamilies

	# gets the spouse of this family
	def getSpouse(self, family):
		spouse = [self.getTag(family, "HUSB"), self.getTag(family, "WIFE")]
		spouse = cleanNull(spouse) # Removes any null values
		return exclude(self.id, spouse)[0] # Returns the one that isn't this person

	# Gets this person's spouses
	def getSpouses(self, families):
		spouseList = []
		try:
			for family in self.sFamilies:
				spouseList.append(self.getSpouse(family)) # Returns the one that isn't this person
		except:
			pass
			# We don't do anything here, since the spouseList is already set to []
			# Conviniently, this is what we want to return
		self.spouses = spouseList

	# Gets the children of this person (if any)
	def getChildren(self, families):
		childList = []
		try:
			for family in self.sFamilies:
				childList.extend(self.getTags(family, "CHIL"))
		except:
			pass # Since the list is [], exactly what we want to return

		self.children = childList

	# Gets the simple birth data (date and place)
	def getBirthData(self):
		birthPlace = self.indiv.get_birth_data()[1]
		birthPlace = birthPlace.split(",")[0]

		birthDate = self.indiv.get_birth_year()
		birthDate = str(birthDate) if birthDate != -1 else ''
		self.birthData = [birthDate, birthPlace]

	def getFullBirthData(self):
		d, l, x = self.indiv.get_birth_data()
		if all(x == '' for x in [d, l]):
			self.fullBirthData =  []
		else:
			self.fullBirthData = [[d, l, "B"]]

	# Gets simple death data
	def getDeathData(self):
		deathPlace = self.indiv.get_death_data()[1]
		deathPlace = deathPlace.split(",")[0]

		deathDate = self.indiv.get_death_year()
		deathDate = str(deathDate) if deathDate != -1 else ''
		self.deathData = [deathDate, deathPlace]

	# Gets the full death data
	def getFullDeathData(self):
		date, place, dType = "", "", ""

		for child in self.indiv.get_child_elements():
			if child.get_tag() == "DEAT":
				for childOfChild in child.get_child_elements():
					if childOfChild.get_tag() == "DATE":
						date = childOfChild.get_value()
					if childOfChild.get_tag() == "PLAC":
						place = childOfChild.get_value()
					if childOfChild.get_tag() == "TYPE":
						dType = childOfChild.get_value()

		if all(x == '' for x in [date, place, dType]):
			self.fullDeathData = []
		else:
			self.fullDeathData = [[date, place, dType, "D"]]


	# gets pictures from this person
	def getPics(self, objects):
		# Gets all the objects for this given person
		objs = [getObj(obj, objects) for obj in self.getTags(self.indiv, "OBJE")]
		# gets the pictures from all of the objects
		pics = []
		for obj in objs:
			pic = self.getTag(obj, "FILE")
			pic = parsePictureFilename(pic)
			pics.append(pic)
		self.pics = pics

	# Gets this person's notes
	def getNotes(self, notes):
		# Gets all the objects for this given person
		rawNotes = [getObj(note, notes) for note in self.getTags(self.indiv, "NOTE")]
		# gets the pictures from all of the objects
		result = []
		for note in rawNotes:
			parsedNote = "\t{0}".format(note.get_value())

			for childNote in note.get_child_elements():
				if childNote.get_tag() == "CONT" or childNote.get_tag() == "CONC":
					val = childNote.get_value()
					parsedNote += val if val != "" else "\n\n\t"

			result.append(parsedNote)
		self.notes = result



	# Abstract function for divorce and marriage data
	def getMDData(self, families, type):
		events = []
		tag = {"M": "MARR", "DIV": "DIV"}[type.upper()]

		for family in self.sFamilies:
			date, spouse, place = "", "", ""

			for child in family.get_child_elements():
				if child.get_tag() == tag:
					for sub in child.get_child_elements():
						if sub.get_tag() == "DATE":
							date = sub.get_value()
						elif sub.get_tag() == "PLAC":
							place = sub.get_value()

			if all(x == "" for x in [date, place]):
				pass
			else:
				events.append([date, self.getSpouse(family), place, type.upper()]) 
		return events

	def getMarriageData(self, families):
		self.marriageData = self.getMDData(families, "M")

	def getDivorceData(self, families):
		self.divorceData = self.getMDData(families, "DIV")


	# Gets occupation data
	def getOccupationData(self):
		occupations = []
		occs = self.getTags(self.indiv, "OCCU", value=False)

		for occ in occs:
			date = ""
			value = occ.get_value()
			inValue = True
			for sub in occ.get_child_elements():
				if inValue and sub.get_tag() in ["CONC", "CONT"]:
					value += sub.get_value()
					if sub.get_tag() == "CONC":
						inValue = False
				else:
					inValue = False

				if sub.get_tag() == "DATE":
					date = sub.get_value()
			occupations.append([date, value, "OCC"])

		self.occupationData = occupations


	# gets burial data
	def getBurialData(self):
		date, place, bType = "", "", ""
		inPlace, inType = False, False

		for child in self.indiv.get_child_elements():
			if child.get_tag() == "BURI":
				for childOfChild in child.get_child_elements():
					tag = childOfChild.get_tag()
					if tag == "DATE":
						date = childOfChild.get_value()

					if tag == "PLAC" or inPlace:
						place = childOfChild.get_value()

						for sub in childOfChild.get_child_elements():
							bType += sub.get_value()

					if tag == "TYPE":
						bType = childOfChild.get_value()

						for sub in childOfChild.get_child_elements():
							bType += sub.get_value()

		if all(x == '' for x in [date, place, bType]):
			self.burialData = []
		else:
			self.burialData = [[date, place, bType, "BUR"]]





