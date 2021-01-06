# familyTreeViewer
familyTreeViewer is a simple web-based family tree viewer. 
It takes a [GEDCOM](https://www.familysearch.org/developers/docs/guides/gedcom)
 file as input, and returns a JavaScript-based site which dynamically displays the 
 family tree and its details. 

# Usage
The GEDCOM file is parsed using `main.py`, found under `utils`. 
The default file path of the GEDCOM file is `familyTree.ged` - however, different 
filenames can be passed using `--file` (or `-f`).

Example usage: `main.py -f gedcom-files/my-family-tree.ged`

The Python script generates four JSON files, 
`structure.json`, `details.json`, `birthdays.json`, and `burials.json`.

* `structure.json` contains structural data - parents, children, spouses, sex, etc.
* `details.json` contains personal data - life events and pictures
* `birthdays.json` contains all the birthdays, sorted
* `burials.json` contains all the burials and their locations, sorted

## Viewing
Once the data is parsed and generated, the family tree can now be viewed 
interactively at `index.html`. 
All necessary resources are contained within the `resources` folder, 
excluding the fonts and FontAwesome 
(hosted by Google and Cloudflare, respectively).

The site is static, which makes it ideal for hosting on a small, static website (maybe GitHub pages?). 

## Support
The TypeScript is compiled to ES2015 - Chrome 51+, Firefox 54+, Safari 10+, and Edge 15+ all support this standard.



# Intra-Familial Marriage
Any cases of incestuous marriage would break the tree structure, 
since a person had to be in two places at once. 
Imagine a first-cousin marriage. 
The people would have to be in 2 places at once - 
under their parents as a descendant, and next to their spouse. 


To mitigate this issue, I duplicate the spousal relationship, 
keep the kids under one branch, and link the spouses together 
(if you click on the duplicate spouse, it goes to the original one). 



# Example

![Example (Kennedy Family)](https://i.imgur.com/0BKSYhI.png)

For testing, two good sources are the [English Monarchy](https://chronoplexsoftware.com/myfamilytree/samples/)
 and the [Kennedy family](https://chronoplexsoftware.com/myfamilytree/samples/) (shown above)


# Issues

This project is intended for relatively straight-forward family trees. 
It can handle size (my personal one has 2500+), 
and all the typical events - divorce, remarriage, multiple spouses, single parent, etc.

### Credits
* The image viewer is [img_box](https://github.com/krittanon-w/IMG-BOX)
* The tree structure algorithm was helped by [this algorithm](https://rachel53461.wordpress.com/2014/04/20/algorithm-for-drawing-trees/) and [this code](https://github.com/jepst/treeViewer)
