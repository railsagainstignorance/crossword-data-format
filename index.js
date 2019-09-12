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

const answerSeparators = ',-|'.split();
const escapedAnswerSeparators = ',\-\|'.split();
const clueRegexComponents = [ // all backslashes escaped; to be separated by spaces
  `-`,                                                // standard YAML list element indicator
  `\\((\\d+),(\\d+)\\)`,                              // x,y
  `(\\d+(?:,\\d+(?:\\s*(?:across|down)))*)\\.`,       // ids
  `(.+)`,                                             // text
  `\\((\\d+(?:[${escapedAnswerSeparators}]\\d+)*)\\)` // answer
];
const clueRegex = new RegExp( '^' + clueRegexComponents.join('\\s+') + '$' );
const sizeRegex = /^(\d+)x(\d+)$/;

const spec = {
  description: [
    "This spec describes a crossword data format, based on YAML, intended to easy to read yet capable of encompassing all(ish) know aspects of standard crosswords.",
  ],
  definitions : {
    permittedKeys    : `Which key/value pairs are allowed, and the value's type`,
    answerSeparators : `How the different words in the answer are combined, where ',' means space-separated, '|' means contiguous, '-' means hyphenated`,
    clueRegex        : 'The pattern used to parse each clue',
    sizeRegex        : 'The pattern used to parse the size attribute (across integer x down integer)',
  },
  permittedKeys,
  answerSeparators,
  clueRegex : clueRegex.toString(),
  sizeRegex : sizeRegex.toString(),
}

///
// simple scan of the text, split into lines by \n,
// looking for known key/value pairs or key/lists,
// no attempt made to parse the list items (other than to gather them into lists),
// accumulating errors as we go,
// checking that we have found *all* the keys we were looking for,
// modifying a list of errors and returning the list of found key/values.
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
      const matchedListItem = line.match(/^(\- .+)$/);
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
// Take the raw list of lines for each of across and down and parse them.
// Just do enough to check we have the main phrases and establish the id of each clue.
// Save all the detailed validation for later.
// E.g. - (1,1) 1. Tries during proper practice session (9)
//   gives us: (x, y) clue ids and connectors. clue body text, (answer text)
// Just ensure we have a sequence of clues for each direction, which fit the basic pattern, with no duplications.
// Still TBD
// - flesh out regex to handle all clue possibilities
// - could refactor forEach to for, to allow immediate exit from the loops when the first error occurs
// (in later fns)
// - parse and validate sizeText
// - parse and validate ids
// - parse and validate answer
// - check clueId sequence is valid
// - create template if new clue
// - update direction-specific aspect of clue
// - check x,y fall within size
// - check full length of answer fits within size
// - check the clue ids are contiguous
///

function parseAcrossAndDownLines( acrossList, downList, errors ){
  const clues = {}; // [id] = { across: {}, down: {}}. Every clue possibly has an across and a down.

  // loop over the across list and the down list
  [ ['across', acrossList], ['down', downList] ].forEach( directionPair => {
    const [direction, clueTexts] = directionPair;
    // loop over the clues for this direction
    clueTexts.forEach( (clueText, c) => {
      const matchedClue = clueText.match( clueRegex );
      if (!matchedClue) {
        errors.push(`could not parse ${direction} clue[${c}], in line='${clueText}'`);
      } else {
        const [,xText,yText,idsText,bodyText,answerText] = matchedClue;
        const id = idsText.split(/\D+/)[0];
        if (!clues.hasOwnProperty(id)) {
          clues[id] = {}; // NB, the id is converted to a string when used as an object key.
        }
        if( clues.hasOwnProperty(direction) ){
          errors.push(`duplicate ${direction} for clue[${c}], in line='${clueText}'`);
        } else {
          clues[id][direction] = {};
          clues[id][direction].raw = { // place the raw values here for later parsing/checking
            xText,
            yText,
            idsText,
            bodyText,
            answerText,
            clueText,
            clueTextSequenceId : c
          }
        }
      }
    });
  });

  const integerIds = Object.keys( clues ).map( id => parseInt(id,10) ).sort((a,b) => a-b);
  const largestClueIdInt = integerIds[integerIds.length -1];
  const largestClueId = (integerIds.length > 0)? largestClueIdInt.toString() : '0';
  return {
    clues,
    largestClueId, // NB: clueId is a string (because Object keys).
  };
}

///
//
///

function parseSize( sizeText, errors ){
  const sizeComponents = {
    dimensions: {}
  };
  const matchedSize = sizeText.match( sizeRegex );
  if (matchedSize) {
    sizeComponents.dimensions.across = parseInt(matchedSize[1],10);
    sizeComponents.dimensions.down   = parseInt(matchedSize[2],10);
  } else {
    errors.push( `could not parse size from text='${sizeText}'`)
  }

  return sizeComponents;
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
  if (parsing.errors.length !== 0) { return parsing; }

  const foundClues = parseAcrossAndDownLines( parsing.across, parsing.down, parsing.errors );
  Object.assign( parsing, foundClues );
  if (parsing.errors.length !== 0) { return parsing; }

  const parsedSize = parseSize( parsing.size, parsing.errors );
  Object.assign( parsing, parsedSize );
  if (parsing.errors.length !== 0) { return parsing; }

  return parsing;
}

///
// wrapper to set up the main parsing
///
function parse( text='' ){
  const parsing = {
    errors : [],
    text,
    spec
  }
  innerParse( parsing );
  parsing.isValid = (parsing.errors.length == 0); // no errors means isValid
  return parsing;
}

function ping () { return 'pong'; }

module.exports = {
  ping,
  parse,
  spec
}
