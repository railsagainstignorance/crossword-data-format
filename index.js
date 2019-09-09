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
// Take the raw list of lines for each of across and down, and the raw size, and parse them.
// E.g. - (1,1) 1. Tries during proper practice session (9)
// Just do enough to check we have the main bits.
// Save all the detailed validation for later.
// So, just ensure we have a sequence of clues for each direction.
// Don't process the full idsText or answertext.
///
//const clueRegex = /^- \((\d+),(\d+)\) (\d+(?:[,\-]\d+(?:across|down)?))\. (.+) \(([^\)]+)\)$/; // x,y,ids,text,answer
const clueRegex = /^- \((\d+),(\d+)\) (\d+)\. (.+) \((\d+)\)$/; // x,y,ids,text,answer
function parseAcrossAndDownLines( acrossList, downList, sizeText, errors ){
  const clues = {}; // [id] = { across: ..., down: ...}

  // TBD
  // - parse and validate sizeText

  [ ['across', acrossList], ['down', downList] ].forEach( directionPair => {
    const [direction, clueTexts] = directionPair;
    clueTexts.forEach( (clueText, c) => {
      const matchedClue = clueText.match( clueRegex );
      if (!matchedClue) {
        errors.push(`could not parse ${direction} clue[${c}], in line='${clueText}'`);
      } else {
        const [,xText,yText,idsText,bodyText,answerText] = matchedClue;
        // TBD
        // - parse and validate ids
        // - parse and validate answer
        // - start with plucking off first id of ids
        // - check clueId sequence is valid
        // - create template if new clue
        // - update direction-specific aspect of clue
        // - check x,y fall within size

        const id = idsText.split(/\D+/)[0];
        if (!clues.hasOwnProperty(id)) {
          clues[id] = {};
        }
        if( clues.hasOwnProperty(direction) ){
          errors.push(`duplicate ${direction} for clue[${c}], in line='${clueText}'`);
        } else {
          clues[id][direction] = {};
          clues[id][direction].raw = {
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
  // check the list is contiguous
  const parsedClues = {
    clues,
    largestClueId : integerIds[integerIds.length -1],
  }
  return parsedClues;
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
  if (parsing.errors.length === 0) {
    const foundClues = parseAcrossAndDownLines( parsing.across, parsing.down, parsing.size, parsing.errors );
    Object.assign( parsing, foundClues );
  }

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
