import os
import re
from datetime import datetime
from dateutil import parser

# Where should we redirect the images to?
IMAGES_FOLDER = "resources/photos/"


############################
#### GENERAL UTILITIES #####
############################

# Filters out all null values in the given list
def filterNull(lst):
    return list(filter(None, lst))


########################
#### DATE UTILITIES ####
########################

# Represents a simple date
class SimpleDate:
    def __init__(self, date_string):
        year, month, day = None, None, None
        self.approximate = "ABT" in date_string.upper()

        # Strip any ABT approximation
        cleanStr = re.sub("ABT", "", date_string.upper())
        cleanStr = cleanStr.strip()

        # We set the years if the date isn't an empty string
        if cleanStr != "":
            # Parse the date
            date = parser.parse(cleanStr)

            # The string is either space-separated or dash-separated, so we take the larger of the two
            n = max(len(cleanStr.split()), len(cleanStr.split("-")))

            # Check what parts of the date we should keep
            if n >= 1:
                year = date.year
            if n >= 2:
                month = date.month
            if n == 3:
                day = date.day

        # Save the results
        self.year = year
        self.month = month
        self.day = day

    # Returns a string representation of this date
    def toString(self):
        prefix = "ABT " if self.approximate else ""
        return prefix + self.dateString()

    # Returns a simple string representation of this date (no approximation)
    def dateString(self):
        year = f'{self.year}' if self.year else ""
        month = f'-{self.month}' if self.month else ""
        day = f'-{self.day}' if self.day else ""
        return year + month + day

    # Returns a datetime object of this date
    def toDateObj(self):
        # If we don't have a date, we just return the largest possible time (for sorting purposes)
        if self.year is None and self.month is None and self.day is None:
            return datetime.max
        # Otherwise, we parse and return the datetime object
        return parser.parse(self.dateString())


# Given a list of events, sorts them chronologically
def sortEventsByDate(lst):
    # Takes the date from the event (index 0), parses it, and converts to datetime for easy comparison
    lst.sort(key=lambda event: SimpleDate(event[0]).toDateObj())
    return lst


###############################
#### GEDCOM-SPECIFIC UTILS ####
###############################


# From a list, get the first element matching the given ID
def getObj(obj_id, objects, person=False):
    for obj in objects:
        if (person and obj.id == obj_id) or (obj.get_pointer() == obj_id):
            return obj

    return None


# Gets a person by their ID
def getPerson(person_id, people):
    return getObj(person_id, people, True)


# Gets ancestors
def getAncestors(person, people, i=1):
    ancestors = []
    for parent in person.parents:
        # Append this person
        ancestors.append([parent, i])
        # Append this person's ancestors
        ancestors += getAncestors(getPerson(parent, people), people, i + 1)

    return ancestors


###################
## Tag utilities ##
###################

# Gets the given tag
def getTag(element, tag):
    tags = getTags(element, tag)
    return tags[0] if len(tags) >= 1 else []


# Gets the given tags
def getTags(element, tag, value=True):
    if element is None:
        return []

    array = []
    for child in element.get_child_elements():
        if child.get_tag() == tag:
            if value:
                array.append(child.get_value())
            else:
                array.append(child)
    return array


# Person object
class Person:
    # Create a person object
    def __init__(self, individual, families, objects, notes, originalPerson=True):
        # originalPerson checks if this is a normal person (default is true)
        # The only cases this wouldn't be true is for dummy placeholders
        # 	Dummy placeholders are placeholder nodes that redirect to the original person
        if originalPerson:
            # Set some default values:
            self.redirects = False
            self.redirectsTo = ""
            self.parentsHidden = False
            self.childrenHidden = False
            self.indiv = individual

            # Initialize personal information
            self.id = self.indiv.get_pointer()
            self.name = getTags(self.indiv, "NAME")
            self.sex = getTag(self.indiv, "SEX")[0].lower()

            # Life data
            self.saveBirthData()
            self.saveDeathData()
            self.getOccupationData()
            self.getBurialData()

            # Family
            self.getSpousalFamilies(families)
            self.getParents(families)
            self.getSpouses(families)
            self.getChildren(families)
            self.getMarriageData(families)
            self.getDivorceData(families)

            # Pictures
            self.getPics(objects)

            # Notes
            self.getNotes(notes)

    ####################
    #### BASIC INFO ####
    ####################

    # Gets the simple birth data (date and place)
    def saveBirthData(self):
        # Get the basic birth information
        date, location, _x = self.indiv.get_birth_data()

        year = self.indiv.get_birth_year()
        year = str(year) if year != -1 else ''

        # The simple birth data consists of the year, and the first part of the location
        # eg ["1903", "Kyiv"]
        self.simpleBirthData = [year, location.split(",")[0]]

        # Now, we save the birth data as an event
        if date == "" and location == "":
            self.birthData = []
        else:
            self.birthData = [[SimpleDate(date).toString(), location, "B"]]

    # Gets death data
    def saveDeathData(self):
        date, location, _x = self.indiv.get_death_data()

        year = self.indiv.get_death_year()
        year = str(year) if year != -1 else ''

        self.simpleDeathData = [year, location.split(",")[0]]

        dType = ""

        for child in self.indiv.get_child_elements():
            if child.get_tag() == "DEAT":
                for childOfChild in child.get_child_elements():
                    if childOfChild.get_tag() == "TYPE":
                        dType = childOfChild.get_value()

        if date == "" and location == "" and dType == "":
            self.deathData = []
        else:
            self.deathData = [[SimpleDate(date).toString(), location, dType, "D"]]

    ##############################
    #### FAMILIAL INFORMATION ####
    ##############################

    # Gets this person's parents (if any)
    def getParents(self, families):
        # Get the family in which this person is a child
        family = getObj(getTag(self.indiv, "FAMC"), families)
        parents = [getTag(family, "HUSB"), getTag(family, "WIFE")]

        self.parents = filterNull(parents)  # Strip any null values

    # Gets all the families in which this person is a spouse
    def getSpousalFamilies(self, families):
        sFamilies = getTags(self.indiv, "FAMS")
        # Converts them into objects
        self.sFamilies = [getObj(family, families) for family in sFamilies]

    # Gets the spouse of the given family
    def getSpouse(self, family):
        spouse = [getTag(family, "HUSB"), getTag(family, "WIFE")]
        spouse = filterNull(spouse)  # Removes any null values

        while self.id in spouse:
            spouse.remove(self.id)

        return spouse[0]  # Returns the one that isn't this person

    # Gets this person's spouses
    def getSpouses(self, families):
        self.spouses = [self.getSpouse(family) for family in self.sFamilies]

    # Gets the children of this person (if any)
    def getChildren(self, families):
        self.children = []

        for family in self.sFamilies:
            self.children.extend(getTags(family, "CHIL"))

    # gets pictures from this person
    def getPics(self, objects):
        # gets the pictures from all of the objects
        picLst = []
        # Iterates over all of the objects associated with this person
        for obj in [getObj(obj, objects) for obj in getTags(self.indiv, "OBJE")]:
            imageFileName = getTag(obj, "FILE").split("\\")[-1]
            picLst.append(os.path.join(IMAGES_FOLDER, imageFileName))

        self.pics = picLst

    # Gets this person's notes
    def getNotes(self, notes):
        # Gets all the objects for this given person
        rawNotes = [getObj(note, notes) for note in getTags(self.indiv, "NOTE")]

        # gets the pictures from all of the objects
        result = []
        for note in rawNotes:
            # Paragraph formatting
            parsedNote = f"\t{note.get_value()}"

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
            date, place = "", ""

            for child in family.get_child_elements():
                if child.get_tag() == tag:
                    for sub in child.get_child_elements():
                        if sub.get_tag() == "DATE":
                            date = sub.get_value()
                        elif sub.get_tag() == "PLAC":
                            place = sub.get_value()

            if date == '' and place == '':
                continue
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

        for occ in getTags(self.indiv, "OCCU", value=False):
            date = ""
            value = occ.get_value()

            for sub in occ.get_child_elements():
                if sub.get_tag() in ["CONC", "CONT"]:
                    value += sub.get_value()
                if sub.get_tag() == "DATE":
                    date = sub.get_value()

            occupations.append([date, value, "OCC"])

        self.occupationData = occupations

    # gets burial data
    def getBurialData(self):
        date, place, _x = self.indiv.get_burial_data()
        bType = ""

        for child in self.indiv.get_child_elements():
            if child.get_tag() == "BURI":
                for childOfChild in child.get_child_elements():
                    tag = childOfChild.get_tag()
                    # Get the descriptions of burial (typically, it's more info about location)
                    if tag == "PLAC" or tag == "TYPE":
                        if tag == "TYPE":
                            bType += childOfChild.get_value()

                        for sub in childOfChild.get_child_elements():
                            bType += sub.get_value()

        if date == '' and place == '' and bType == '':
            self.burialData = []
        else:
            self.burialData = [[date, place, bType, "BUR"]]

    def getAllAncestors(self, people):
        self.ancestors = getAncestors(self, people, 1)

    def initRedirect(self, redirectingTo, people):
        self.redirects = True
        self.redirectsTo = redirectingTo.id
        self.parentsHidden = False
        self.childrenHidden = False
        self.indiv = None

        # Give it an ID that doesn't exist
        ID = redirectingTo.id
        while getPerson(ID, people) != None:
            ID += "1"

        self.id = ID

        self.name = list(redirectingTo.name)
        self.sex = redirectingTo.sex
        self.simpleBirthData = list(redirectingTo.simpleBirthData)
        self.birthData = list(redirectingTo.birthData)
        self.simpleDeathData = list(redirectingTo.simpleDeathData)
        self.deathData = list(redirectingTo.deathData)
        self.occupationData = []
        self.burialData = []
        self.sFamilies = []
        self.parents = []
        self.spouses = []
        self.children = []
        self.marriageData = []
        self.divorceData = []
        self.pics = []
        self.notes = []
        self.ancestors = []

    def replaceSpouse(self, old, new):
        # Switch this person's spouses
        self.spouses = [new.id if s == old.id else s for s in self.spouses]

        # Remove this person from the old
        old.spouses = [s for s in old.spouses if s != self.id]

        # Add this person to the new spouses
        new.spouses.append(self.id)

    def replaceParent(self, old, new):
        self.parents = [new if p == old else p for p in self.parents]

    def areAncestorsShared(self, person):
        # Clean up the ancestors - remove the generational counts, and remove duplicates
        ancestors1 = list(set([ancestor[0] for ancestor in self.ancestors]))
        ancestors2 = list(set([ancestor[0] for ancestor in person.ancestors]))

        # Check if the ancestor lists overlap
        union = set()
        for ancestorSet in [ancestors1, ancestors2]:
            if ancestorSet == []:
                # Can't be any overlap if one list is empty
                return False
            for ancestor in ancestorSet:
                if ancestor in union:
                    return True
                union.add(ancestor)
        return False

    # Handles the case of the common ancestor
    # Basically, to avoid completely destroying the tree structure, we use dummy people
    # A dummy person is just a link to the real person, but doesn't show any children/parents
    # Therefore, only one set of parents/children shows at once, so the conflict doesn't ever show up
    def handleCommonAncestor(self, people):
        for spouse in self.spouses:
            # Get the spouse object
            spouse = getPerson(spouse, people)

            if self.areAncestorsShared(spouse):
                if self.name > spouse.name:
                    person1, person2 = self, spouse
                else:
                    person1, person2 = spouse, self

                # Duplicate person2
                duplicateP2 = Person(None, None, None, None, originalPerson=False)
                duplicateP2.initRedirect(person2, people)

                # The duplicate has the ancestors hidden
                duplicateP2.parentsHidden = True
                # The real one has the children hidden
                person2.childrenHidden = True

                # Find the overlap of the children (in case of multiple marriages)
                children = [x for x in self.children if x in person2.children]

                for child in children:
                    getPerson(child, people).replaceParent(person2.id, duplicateP2.id)

                duplicateP2.children = children
                # person2 only keeps the children not of this marriage
                person2.children = [x for x in person2.children if x not in children]

                person1.replaceSpouse(person2, duplicateP2)
                people.append(duplicateP2)

                # Now, we deal with the duplicate person1
                duplicateP1 = Person(None, None, None, None, originalPerson=False)
                duplicateP1.initRedirect(person1, people)
                duplicateP1.parentsHidden = True
                duplicateP1.childrenHidden = True

                person2.spouses.append(duplicateP1.id)
                duplicateP1.spouses = [person2.id]
                people.append(duplicateP1)

                print(f'Duplicate families: {person1.name}, {person2.name}')
