///
// Tiny unit test framework (via https://medium.com/javascript-scene/tdd-the-rite-way-53c9b46f45e3)
///
// specify
// - componment string as the name of the test,
// - the fn encapsulating all your asserts
// - (optional) the starting number of the count
// - (optional) the verbose flag to list all the oks even when there is no Error.
///
const test = (component, fn, count = 1, verbose=false) => {
  if (!component) { throw new Error(`Test Framework: Must specify a meaningful name for the set of tests`); }
  console.log(`# testing '${ component }'`);
  const oks = [];
  fn({
    same: ({actual, expected, msg, context}) => {
      if (!msg) { throw new Error(`Test Framework: Must specify a meaningful 'msg' for test ${count}`); }
      if (actual == expected) {
        oks.push(`ok ${ count } - ${ msg }`);
      } else {
        console.log( `${oks.join("\n")}` ); // display any previous successful tests as context
        const contextText = (context)? `context:\n    ${JSON.stringify(context)}` : '';
        throw new Error(
`not ok ${ count } -  ${ msg }
  expected:
    ${ expected }
  actual:
    ${ actual }
  ${ contextText }
`
        );
      }
      count++;
    }
  });
  console.log(` ok: ${oks.length} asserts`);
  if (verbose) {
    console.log( `${oks.join("\n")}`);
  }
  return count;
};

const crosswordDataFormat = require( "../index.js" );

test( 'basic module', assert => {
  assert.same({
         msg: 'exports a ping fn',
      actual: crosswordDataFormat.hasOwnProperty('ping'),
    expected: true
  });
  assert.same({
         msg: 'ping fn returns pong',
      actual: crosswordDataFormat.ping(),
    expected: 'pong'
  });
})

test( 'crosswordDataFormat.parse fn', assert => {
  assert.same({
         msg: 'exports a parse fn',
      actual: crosswordDataFormat.hasOwnProperty('parse'),
    expected: true
  });
  {
    const response = crosswordDataFormat.parse();

    assert.same({
           msg: 'returns an obj including 1 error mentioning "No text" and isValid==false for no input',
        actual: response && response.errors && response.errors.length==1 && response.errors[0].match(/No text/)
                && response.hasOwnProperty('isValid') && !response.isValid,
      expected: true
    });
  }
  {
    const specHeaders = [
      'version: standard v2',
      'name: Crossword 15813',
      'author: Falcon',
      'editor: Colin Inman',
      'copyright: 2018, Financial Times',
      'publisher: Financial Times',
      'pubdate: 2018/03/22',
      'size: 15x15',
      'across: ',
      'down: ',
    ];
    for (let i = 0; i < specHeaders.length; i++) {
      { // check for missing header keys
        const missingHeader = specHeaders[i];
        const missingHeaderKey = missingHeader.split(':')[0];
        const specHeadersMissingOne = specHeaders.filter( h => h !== missingHeader );
        const headerTextMissingOne = specHeadersMissingOne.join("\n");
        const response = crosswordDataFormat.parse(headerTextMissingOne);
        assert.same({
               msg: `returns an obj including 1 error mentioning the header and isValid==false for a missing header key: ${missingHeaderKey}`,
            actual: response && response.errors && response.errors.length===1 && response.errors[0].match(`missing.+${missingHeaderKey}`)
                    && response.hasOwnProperty('isValid') && !response.isValid,
          expected: true,
           context: {response}
        });
      }
      { // check for duplicated header keys
        const duplicatedHeader = specHeaders[i];
        const duplicatedHeaderKey = duplicatedHeader.split(':')[0];
        const headerTextWithDuplicatedOne = specHeaders.join("\n") + "\n" + duplicatedHeader;
        const response = crosswordDataFormat.parse(headerTextWithDuplicatedOne);
        assert.same({
               msg: `returns an obj including 1 error mentioning the header and isValid==false for a duplicated header key: ${duplicatedHeaderKey}`,
            actual: response && response.errors && response.errors.length===1 && response.errors[0].match(`duplicate.+${duplicatedHeaderKey}`)
                    && response.hasOwnProperty('isValid') && !response.isValid,
          expected: true,
           context: {response}
        });
      }
    }

    { // check for a valid header
      const response = crosswordDataFormat.parse(specHeaders.join("\n"));
      assert.same({
             msg: `returns no errors and isValid==true for a valid header`,
          actual: response && response.errors && response.errors.length===0 && response.hasOwnProperty('isValid') && response.isValid,
        expected: true
      });
    }
  }
  {
    // test for list handling (i.e. across and down)
  }
  {
    // questions: do we allow upper case keys?
  }
  {
    // questions: how do we establish that this is meant to be the particular format and version? Ans: give it a better name than 'standard'
  }
});
