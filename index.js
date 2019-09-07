'use strict'

// embellishes the parsing obj as the parsing procedes,
// returns when there is a fatal error with the parsing
function innerParse( parsing ){ 
  if (parsing.text === '') {
    parsing.errors.push( 'No text specified');
    return
  }

  // lots more parsing goes on in here

  return parsing;
}

// wrapper to set up the main parsing
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
