# familyTreeViewer
familyTreeViewer is a simple web-based family tree viewer. 
It takes a [GEDCOM](https://www.familysearch.org/developers/docs/guides/gedcom) file as input, and returns a JavaScript-based site dynamically displaying the family tree and its details. 

# Usage
The GEDCOM file is parsed using `makeData.py`, found under `utils`. The default file path is `familyTree.ged` - however, different filenames can be passed using `--file`.

The Python script generates two JSON files, `structure.json` and `details.json`. 

* `structure.json` contains structural data - parents, children, spouses, sex, etc.
* `details.json` contains personal data - life events and pictures

## Viewing
The family tree can now be viewed interactivly at `index.html`. All necessary resources are contained within the `resources` folder, excluding the fonts and FontAwesome (hosted by Google and Cloudflare, respectively).

## Support
**Generally speaking**, this project supports most **modern** browsers, desktop and mobile. This means that IE11 is a strech at best, and any older IE versions are all but guaranteed not to work (if you want IE support, take it up with [Bill Gates](https://www.gatesnotes.com/)). 

# Example

![Example (English Monarcy)](https://i.imgur.com/mXuwDfL.png)
This example family tree was generated using a GEDCOM file of the [English and British Kings and Queens
](https://chronoplexsoftware.com/myfamilytree/samples/).

# Issues

Generally speaking, the majority of issues will stem from parser issues (at least in my tests). The GEDCOM files used were mainly generated using [GRAMPS](https://gramps-project.org/blog/). 

This project is intended for relatively straight-forward family trees. It can handle size (my personal one has 500+), and all the typical events - divorce, remarriage, multiple spouses, single parent, etc.

**However**, if the GEDCOM file has any specific peculiarities (for example, a Hapsburg-type family), it's pretty likely that this viewer won't display it properly. 
