interface PersonStructure {
  id:       string;
  name:     string;
  sex:      string;
  parents:  string[];
  spouses:  any[];
  children: any[];
  birth:    string[];
  death:    string[];
}

interface PersonDetails {
  id:             string;
  pics:           string[];
  names:          string[];
  notes:          string[];
  events:         Array<string[]>;
  parentsHidden:  boolean;
  childrenHidden: boolean;
  redirects:      boolean;
  redirectsTo:    string;
  ancestors:      Array<Array<number | string>>;
}