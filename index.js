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
const wordOrNumberRegexComponent = `(?:\\d+|[A-Z]+)`;
const answerRegexComponent = `\\((${wordOrNumberRegexComponent}(?:[${escapedAnswerSeparators}]${wordOrNumberRegexComponent})*)\\)`;
const idsRegexComponent = `(\\d+(?:,\\d+(?:\\s*(?:across|down)))*)\\.`;
const clueRegexComponents = [ // all backslashes escaped; to be separated by spaces
  `-`,                     // standard YAML list element indicator
  `\\((\\d+),(\\d+)\\)`,   // across, down
  idsRegexComponent,       // ids
  `(.+)`,                  // text
  answerRegexComponent     // answer
];
const clueRegex = new RegExp( '^' + clueRegexComponents.join('\\s+') + '$' );
const sizeRegex = /^(\d+)x(\d+)$/;
const idsRegex  = new RegExp( '^' + idsRegexComponent + '$');
const bodyBelongsToRegex = new RegExp( /^See (\d+)\s([aA]cross|[dD]own)$/ );

const placeHolderChar = 'X';

const spec = {
  description: [
    "This spec describes a crossword data format, based on YAML, intended to easy to read yet capable of encompassing all(ish) know aspects of standard crosswords.",
  ],
  definitions : {
    permittedKeys    : `Which key/value pairs are allowed, and the value's type`,
    answerSeparators : `How the different words in the answer are combined, where ',' means space-separated, '|' means contiguous, '-' means hyphenated`,
    clueRegex        : 'The pattern used to parse each clue',
    sizeRegex        : 'The pattern used to parse the size attribute (across integer x down integer)',
    idsRegex         : 'The pattern used to parse the ids of a clue',
  },
  permittedKeys,
  answerSeparators,
  clueRegex : clueRegex.toString(),
  sizeRegex : sizeRegex.toString(),
  idsRegex  : idsRegex.toString(),
  bodyBelongsToRegex: bodyBelongsToRegex.toString(),
  answerRegexComponent: answerRegexComponent.toString(),
  placeHolderChar,
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
        const [,acrossText,downText,idsText,bodyText,answerText] = matchedClue;
        const id = idsText.split(/\D+/)[0];
        if (!clues.hasOwnProperty(id)) {
          clues[id] = {}; // NB, the id is converted to a string when used as an object key.
        }
        if( clues.hasOwnProperty(direction) ){
          errors.push(`duplicate ${direction} for clue[${c}], in line='${clueText}'`);
        } else {
          const clue = { // ensure each clue knows its own id and direction
            id,
            direction
          };
          clues[id][direction] = clue;
          clue.coords = {
            across: parseInt(acrossText, 10),
            down: parseInt(downText, 10),
          };
          clue.raw = { // place the raw values here for later parsing/checking
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
// given sizeText='12x12', parse it into dimensions
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
// loop over clues, parsing ids, checking they are valid
///

function parseCluesIds( clues, errors ){

  // check all clues for belongsTo
  Object.keys(clues).forEach( id => {
    Object.keys(clues[id]).forEach( direction => {
      const clue = clues[id][direction];

      const matchBelongsTo = clue.raw.bodyText.match( bodyBelongsToRegex );
      if (!matchBelongsTo) {
        clue.belongsTo = null;
      } else if(! clue.raw.idsText.match(/^\d+$/)) {
        errors.push( `clue [${clue.id}][${clue.direction}] belongs to a clue, but does not have a simple idsText, ${clue.raw.idsText}`);
      } else {
        clue.belongsTo = {};
        clue.belongsTo.id = matchBelongsTo[1];
        clue.belongsTo.direction = matchBelongsTo[2].toLowerCase();

        // check it belongs to a valid clue
        if (!clues.hasOwnProperty(clue.belongsTo.id)) {
          errors.push( `clue [${clue.id}][${clue.direction}] belongs to an unknown id [${clue.belongsTo.id}]`);
        } else if( !clues[clue.belongsTo.id].hasOwnProperty(clue.belongsTo.direction) ){
          errors.push( `clue [${clue.id}][${clue.direction}] belongs to an id [${clue.belongsTo.id}] without direction=${clue.belongsTo.direction}`);
        }
      }
    });
  });

  // check all clues for owns, and that each owned clue belongsTo
  Object.keys(clues).forEach( id => {
    Object.keys(clues[id]).forEach( direction => {
      const clue = clues[id][direction];
      const idsItems = clue.raw.idsText.split(',');
      const ownedIdsItems = idsItems.slice(1);
      clue.owns = [];
      ownedIdsItems.forEach( idItem => {
        const [ownedId, ownedDirection] = idItem.split(' ');
        // check ownedId is valid,
        // if ownedDirection is specified, check is valid
        // otherwise infer it
        if (!clues.hasOwnProperty(ownedId)) {
          errors.push( `clue [${clue.id}][${clue.direction}] owns an unknown id [${ownedId}], in clueText='${clue.raw.clueText}'`);
        } else {
          if (ownedDirection !== undefined && !clues[ownedId].hasOwnProperty(ownedDirection)) {
            errors.push( `clue [${clue.id}][${clue.direction}] owns an id [${ownedId}] with an unknown direction [${ownedDirection}], in clueText='${clue.raw.clueText}'`);
          } else if (ownedDirection === undefined && Object.keys(clues[ownedId]).length === 2) {
            errors.push( `clue [${clue.id}][${clue.direction}] owns an id [${ownedId}] with an ambiguous direction, in clueText='${clue.raw.clueText}'`);
          } else {
            const inferredDirection = (ownedDirection !== undefined)? ownedDirection : Object.keys(clues[ownedId])[0];
            clue.owns.push({
              id : ownedId,
              direction : inferredDirection
            });

            const ownedClue = clues[ownedId][inferredDirection];
            if (!ownedClue.belongsTo) {
              errors.push(`clue [${clue.id}][${clue.direction}] owns a clue [${ownedId}][${inferredDirection}] which does not belongsTo anything`);
            } else if( ownedClue.belongsTo.id !== clue.id || ownedClue.belongsTo.direction !== clue.direction ){
              errors.push(`clue [${clue.id}][${clue.direction}] owns a clue [${ownedId}][${inferredDirection}] which belongsTo a different clue [${ownedClue.belongsTo.id}][${ownedClue.belongsTo.direction}]`);
            }
          }
        }
      });
    });
  });

  return {
  }
}

///
// loop over clues, processing the answers,
// to establish
// - length of this clue block (even if part of a bigger one)
// - length of full answer (if owns others)
// - parts[text, length, separatorToPrevPart]
///

function parseCluesAnswers( clues, errors ){

  // loop over all clues to calc answer parts, ignoring ownership for now
  Object.keys(clues).forEach( id => {
    Object.keys(clues[id]).forEach( direction => {
      const clue = clues[id][direction];
      // if (clue.owns.length > 0) { return; }
      const answer = {
        parts : [],
      };
      clue.answer = answer;
      // pick off first part, then all remaining parts with separators
      const matchedFirstPart = clue.raw.answerText.match(`^(${wordOrNumberRegexComponent})(.*)$`);
      if (!matchedFirstPart) {
        errors.push(`failed to parse first part of answer in clue [${clue.id}][${clue.direction}], answerText='${clue.raw.answerText}'`);
      } else {
        const [,firstPart, remainingPart] = matchedFirstPart;
        answer.parts.push({ source : firstPart })
        const remainingPartsRegex = new RegExp(`([${escapedAnswerSeparators.join()}])(${wordOrNumberRegexComponent})`, 'g');
        let matchReminingPart;
        while (matchReminingPart = remainingPartsRegex.exec(remainingPart)) {
          const [ , separator, wordOrNumber ] = matchReminingPart;
          answer.parts.push({
            source : wordOrNumber,
            separator
          });
        }

        // complete parsing of the parts
        answer.parts.forEach( part => {
          if (part.source.match(/\d+/)) {
            part.length = parseInt(part.source, 10);
            part.text = placeHolderChar.repeat(part.length);
            part.placeholder = true;
          } else {
            part.length = part.source.length;
            part.text = part.source;
            part.placeholder = false;
          }
        });

        answer.length = answer.parts.reduce( (sum, part) => sum + part.length, 0); // add up the part lengths
      }
    });
  });

  // loop over all clues which belongsTo something, to check they just have one answer part

  Object.keys(clues).forEach( id => {
    Object.keys(clues[id]).forEach( direction => {
      const clue = clues[id][direction];
      if (clue.belongsTo) {
        if (clue.answer.parts.length > 1) {
          errors.push(`clue [${clue.id}][${clue.direction}] belongsTo another clue, but has a multi-part answer, answerText='${clue.raw.answerText}'`);
        }
      }
    });
  });

  // - register membership of part to clue

  // loop over clues which do own
  // - check sizes of owned clues
  // - calc the delta parts that must belong to the owning clue
  // - register membership of parts to owned clues
  // - calc the owned clue's answer
  // - calc the owned clue's combined answer

  return {
  }
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

  parseCluesIds( parsing.clues, parsing.errors );
  if (parsing.errors.length !== 0) { return parsing; }

  parseCluesAnswers( parsing.clues, parsing.errors );
  if (parsing.errors.length !== 0) { return parsing; }
  // parseCluesAnswers - to get length for each clue's answers, and separators overal, and for each clue

  // checkAnswersFitInDimensions

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
