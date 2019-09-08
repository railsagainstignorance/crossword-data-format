'use strict'

const permittedKeys = { // mapped to their type
  version: 'string',
  name: 'string',
  author: 'string',
  editor: 'string',
  copyright: 'string',
  publisher: 'string',
  pubdate: 'string',
  size: 'string',
  across: 'list',
  down: 'list'
}

///
// simple scan of the text, split into lines by \n,
// looking for known key/value pairs or key/lists,
// no attempt made to parse the list items (other than to gather them into lists),
// accumulating errors as we go,
// checking that we have found *all* the keys we were looking for,
// returning a list of errors and the list of found key/values.
// A non-empty list of errors means the scan has failed.
///
function scanYamlText( text, errors ){
  const lines = text.split("\n");
  const foundItems = {};
  let inList = false;
  let currentList;
  lines.forEach( (line, i) => {
    const tidiedLine = line.replace( /\#.*/, '') // strip out comments
                           .trimRight();
    if (line === '') { return }
    const matchedKeyValue = line.match(/^([a-z]+):(.*)$/);
    if (matchedKeyValue) {
      const key = matchedKeyValue[1];
      const value = matchedKeyValue[2].trimLeft();
      inList = false;
      if (permittedKeys.hasOwnProperty(key)) {
        if( foundItems.hasOwnProperty(key) ){
          errors.push( `duplicate key, ${key}, found in line[${i}]='${line}'`);
        } else if( permittedKeys[key] === 'list' ){
          if (value !== '') {
            errors.push(`unexpected text found after list key in line[${i}]='${line}'`);
          } else {
            inList = true;
            currentList = [];
            foundItems[key] = currentList;
          }
        } else {
          foundItems[key] = value;
        }
      } else {
        errors.push(`unrecognised key, '${key}', in line[${i}]='${line}'`);
      }
    } else if (inList){
      const matchedListItem = line.match(/^- (.+)$/);
      if (matchedListItem) {
        currentList.push( matchedListItem[1] );
      } else {
        errors.push(`could not parse as list item: line[${i}]='${line}'`);
      }
    } else {
      errors.push(`no key specified and cannot be a list item, in line[${i}]='${line}'`);
    }
  })

  const missingKeys = Object.keys(permittedKeys).filter( key => !foundItems.hasOwnProperty(key) );
  if (missingKeys.length > 0) {
    errors.push( `missing keys: ${missingKeys.join(', ')}`);
  }

  return foundItems;
}

///
// embellishes the parsing obj as the parsing procedes,
// returns when there is a fatal error with the parsing
///
function innerParse( parsing ){
  if (parsing.text === '') {
    parsing.errors.push( 'No text specified');
    return
  }

  // lots more parsing goes on in here
  const foundItems = scanYamlText( parsing.text, parsing.errors );
  Object.assign( parsing, foundItems );

  return parsing;
}

///
// wrapper to set up the main parsing
///
function parse( text='' ){
  const parsing = {
    errors : [],
    text
  }
  innerParse( parsing );
  parsing.isValid = (parsing.errors.length == 0); // no errors means isValid
  return parsing;
}

function ping () { return 'pong'; }

module.exports = {
  ping,
  parse
}
