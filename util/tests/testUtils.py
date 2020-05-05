import os, sys
# Appends the parent filder to the path so we can properly import
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import gedcomUtils as gu
import unittest
import datetime

class TestUtils(unittest.TestCase):
	#  Tests the exclude function
	def testExclude(self):
		list0 = [2,3,4,5,6,7]
		list1 = [1,2,3,4,5,6,7]
		list2 = [1,2,1,3,4,5,1,6,7]
		list3 = [2,3,4,5,1,1,1,1,1,6,7,1,1,1,1]

		self.assertEqual(list0, gu.exclude(1, list1))
		self.assertEqual(list0, gu.exclude(1, list2))
		self.assertEqual(list0, gu.exclude(1, list3))
		self.assertEqual(list0, gu.exclude(1, list0))

	#  Tests the date parser
	def testDateParse(self):
		date0 = datetime.datetime(1827, 5, 5, 0, 0)
		date1 = "may 5 1827"
		date2 = "MAY 5th, 1827"
		date3 = "5 MAY 1827"

		self.assertEqual(date0, gu.dateParse(date1))
		self.assertEqual(date0, gu.dateParse(date2))
		self.assertEqual(date0, gu.dateParse(date3))

	# Tests the date cleaner
	def testCleanDate(self):
		date0 = "1827"
		date1 = "about 1827"
		date2 = "abt 1827"
		date3 = "1827-1930"
		date4 = "abt 1827-2001"

		self.assertEqual(date0, gu.cleanDate(date0))
		self.assertEqual(date0, gu.cleanDate(date1))
		self.assertEqual(date0, gu.cleanDate(date2))
		self.assertEqual(date0, gu.cleanDate(date3))
		self.assertEqual(date0, gu.cleanDate(date4))

	# Tests the date-key
	def testDateKey(self):
		date0 = datetime.datetime(1827, 5, 5, 0, 0)
		date1 = ["5 MAY 1827", "", "B"]
		date2 = ["5 MAY 1827", "", "", "D"]
		date3 = ["5 MAY 1827", "", "", "M"]

		min0 = datetime.datetime(datetime.MINYEAR, 1, 1)
		min1 = ["", "", "B"]
		min2 = ["", "NYC", "B"]

		max0 = datetime.datetime(datetime.MAXYEAR, 1, 1)
		max1 = ["", "NYC", "Heart conditions", "D"]
		max2 = ["", "", "", "D"]

		self.assertEqual(date0, gu.dateKey(date1))
		self.assertEqual(date0, gu.dateKey(date2))
		self.assertEqual(date0, gu.dateKey(date3))

		self.assertEqual(min0, gu.dateKey(min1))
		self.assertEqual(min0, gu.dateKey(min2))

		self.assertEqual(max0, gu.dateKey(max1))
		self.assertEqual(max0, gu.dateKey(max1))

	# Tests sortByDate
	def testSortByDate(self):
		fullList = [["5 MAY 1827", "", "B"], ["5 MAY 1867", "", "", "D"], ["3 DEC 1911", "", "", "D"], 
		["", "NYC", "Heart conditions", "D"], ["", "NYC", "B"]]

		sortedDate = gu.sortByDate(list(fullList))

		self.assertEqual(fullList[0], sortedDate[1])
		self.assertEqual(fullList[1], sortedDate[2])
		self.assertEqual(fullList[2], sortedDate[3])
		self.assertEqual(fullList[3], sortedDate[4])
		self.assertEqual(fullList[4], sortedDate[0])





if __name__ == '__main__':
	unittest.main()