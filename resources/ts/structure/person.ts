/**
 * A person object from the structures.json file.
 * Represents a person's structural information (ie. everything needed to properly
 *    construct a PersonNode).
 */
interface PersonStructure {
  id:       string;
  name:     string;
  sex:      string;
  parents:  string[];
  spouses:  any[];
  children: any[];
  parentsHidden:  boolean;
  childrenHidden: boolean;
  birth:    string[];
  death:    string[];
}

/**
 * A person object from the details.json file.
 * Represents a person's details: their life events,
 */
interface PersonDetails {
  id:             string;
  pics:           string[];
  names:          string[];
  notes:          string[];
  events:         Array<string[]>;
  redirects:      boolean;
  redirectsTo:    string;
  ancestors:      Array<Array<number | string>>;
}