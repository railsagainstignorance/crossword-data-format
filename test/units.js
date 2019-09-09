///
// Tiny unit test framework (via https://medium.com/javascript-scene/tdd-the-rite-way-53c9b46f45e3)
// Loving it's tinyness and see-it-all-at-once-ness.
//
// In the post, Eric Elliott describes "TDD the RITE Way", where the acronym RITE stands for
// - Readable
// - Isolated OR Integrated
// - Thorough
// - Explicit
//
// I suspect I am abusing the 'I' aspect, and perhaps also the 'R'.
///
// Will be interesting to see how much I fiddle with the framework and if I can keep it tiny
// - added insistence that test()'s component is set properly.
// - added insistence that assert.same()'s msg is set properly.
// - added vebose option to test(), with default to just log a count of all the oks if there is no Error,
//    e.g.
//       # testing 'basic module'
//        ok: 2 asserts
//       # testing 'crosswordDataFormat.parse fn'
//        ok: 23 asserts
// - removed count as a test() input param. Can't see why I'd ever need this. Now declared within test().
// - returning count from test(), so the overall count of tests can be totted up later.
// - tweaked some of the logging formatting.
// - stuck (so far) with just assert's same() option but...
//    have gone for long concatenations of && phrases in the 'actual' (instead of multiple calls to assert.same),
//    which means some ambiguity as to which failed phrase triggered an Error, so...
// - added context to same(), for extra info when displaying an error (stringified but not formatted - maybe later).
// - refactored same() to receive a single obj, {actual, expected, msg, context}, rather than separate params. looks neater, more concise.
///
// to use test(), specify
// - componment - a string as the name of the test,
// -  fn - encapsulating all your asserts
// - verbose (optional flag, default=false) - to explicitly list all the oks even when there is no Error.
///
// to use assert.same(), specify
// - {actual, expected, msg, context} - an obj, where
// -- actual - the value 'actually' returned in the test
// -- expected - the target value (and same() checks if actual === expected)
// -- msg (non-optional) - the text which names/describes the purpose of this specific test
// -- context (optional) - extra info to display if actual !== expected
///
const test = (component, fn, verbose=false) => {
  if (!component) { throw new Error(`Test Framework: Must specify a meaningful name for the set of tests`); }
  console.log(`# testing '${ component }'`);
  let count = 1;
  const oks = [];
  fn({
    same: ({actual, expected, msg, context}) => {
      if (!msg) { throw new Error(`Test Framework: Must specify a meaningful 'msg' for test ${count}`); }
      if (actual == expected) {
        oks.push(`ok ${ count } - ${ msg }`);
      } else {
        console.log( `${oks.join("\n")}` ); // display any previous successful tests as context
        const contextText = (context)? `context:\n    ${JSON.stringify(context, null, 2)}` : '';
        throw new Error(
`not ok ${ count } - ${ msg }
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
  return count-1;
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

test( 'crosswordDataFormat.parse fn - basic header keys', assert => {
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
    // questions: do we allow upper case keys?
    // questions: do we insist across comes before down? Should not affect final crossword. But, TRADITION !!!
  }
  {
    // questions: how do we establish that this is meant to be the particular format and version? Ans: give it a better name than 'standard'
  }
  {
    // test we offer a spec defining the format
  }
});

test( 'crosswordDataFormat.parse fn - list handling (i.e. across and down)', assert => {
  const specHeadersMinusAcrossAndDown = [
    'version: standard v2',
    'name: Crossword 15813',
    'author: Falcon',
    'editor: Colin Inman',
    'copyright: 2018, Financial Times',
    'publisher: Financial Times',
    'pubdate: 2018/03/22',
    'size: 15x15',
  ];
  // minus
  // 'across:',
  // 'down:'

  {
    const acrossLines = [
      '- (1,1) 1. Tries during proper practice session (9)',
    ]

    const headerLines = specHeadersMinusAcrossAndDown
    .concat(['across:'])
    .concat( acrossLines )
    .concat(['down:']);

    {
      const response = crosswordDataFormat.parse(headerLines.join("\n"));
      assert.same({
             msg: `returns no errors and isValid==true for a valid header containing a simple across clue`,
          actual: response && response.errors && response.errors.length===0 && response.hasOwnProperty('isValid') && response.isValid,
        expected: true,
         context: {response}
      });
    }
    {
      const response = crosswordDataFormat.parse(headerLines.join("\n"));
      assert.same({
             msg: `returns largestClueId==1 for a valid header containing a simple across clue`,
          actual: response && response.errors && response.errors.length===0 && response.hasOwnProperty('largestClueId') && response.largestClueId===1,
        expected: true,
         context: {response}
      });
    }
  }
});
