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
// - added context to same(), for extra info when displaying an error (stringified and formatted).
// - refactored same() to receive a single obj, {actual, expected, msg, context}, rather than separate params. looks neater, more concise.
///
// to use test(), specify
// - component - a string as the name of the test,
// - fn - encapsulating all your asserts
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
        if( !verbose ){ console.log( `${oks.join("\n")}` ); }// display any previous successful tests as context, if we haven't already done so
        const contextText = (context)? `context:\n    ${JSON.stringify(context, null, 2)}` : '';
        throw new Error(
`not ok ${ count } - ${ msg }
  expected:
    ${ expected }
  actual:
    ${ actual }
  ${ contextText }
not ok ${ count } - ${ msg }
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

test( 'spec', assert => {
  assert.same({
         msg: 'exports a spec object',
      actual: crosswordDataFormat.hasOwnProperty('spec'),
    expected: true
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
          actual: response && response.errors && response.errors.length===0
               && response.hasOwnProperty('isValid') && response.isValid,
        expected: true
      });
    }
    { // check for a valid size
      const response = crosswordDataFormat.parse(specHeaders.join("\n"));
      assert.same({
             msg: `returns no errors and isValid==true for a valid header and size.across==15 and size.down==15`,
          actual: response && response.errors && response.errors.length===0
               && response.hasOwnProperty('isValid') && response.isValid
               && response.dimensions && response.dimensions.across===15 && response.dimensions.down===15,
        expected: true,
         context: {response},
      });
    }
    { // check for a invalid size
      ['15x', '17xy12'].forEach( sizeText => {
        const specHeadersBadSize = [
          'version: standard v2',
          'name: Crossword 15813',
          'author: Falcon',
          'editor: Colin Inman',
          'copyright: 2018, Financial Times',
          'publisher: Financial Times',
          'pubdate: 2018/03/22',
          'size: '+sizeText,
          'across: ',
          'down: ',
        ];

        const response = crosswordDataFormat.parse(specHeadersBadSize.join("\n"));
        assert.same({
               msg: `returns 1 error and isValid==false for a header with bad size='${sizeText}'`,
            actual: response && response.errors && response.errors.length===1
                 && response.hasOwnProperty('isValid') && ! response.isValid,
          expected: true,
           context: {response},
        });

      })
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
    const headerLines = specHeadersMinusAcrossAndDown
    .concat(['across:'])
    .concat(['- (1,1) 1. Tries during proper practice session (9)'])
    .concat(['down:']);

    {
      const response = crosswordDataFormat.parse(headerLines.join("\n"));
      assert.same({
             msg: `returns no errors and isValid==true for a valid header containing a simple across clue (with answer as a number)`,
          actual: response && response.errors && response.errors.length===0 && response.hasOwnProperty('isValid') && response.isValid,
        expected: true,
         context: {response}
      });
    }
    {
      const response = crosswordDataFormat.parse(headerLines.join("\n"));
      assert.same({
             msg: `returns largestClueId==1 for a valid header containing a simple across clue  (with answer as a number)`,
          actual: response && response.errors && response.errors.length===0 && response.hasOwnProperty('largestClueId') && response.largestClueId==='1',
        expected: true,
         context: {response}
      });
    }
  }
  {
    const headerLines = specHeadersMinusAcrossAndDown
    .concat(['across:'])
    .concat(['- (1,1) 1. Tries during proper practice session (9)'])
    .concat(['down:'])
    .concat(['- (3,1) 2. Tries during proper practice session (9)']);
    const response = crosswordDataFormat.parse(headerLines.join("\n"));
    assert.same({
           msg: `returns largestClueId==2 for a valid header containing one simple across clue and one simple down clues`,
        actual: response && response.errors && response.errors.length===0 && response.hasOwnProperty('largestClueId') && response.largestClueId==='2',
      expected: true,
       context: {response}
    });
  }
  {
    const headerLines = specHeadersMinusAcrossAndDown
    .concat(['across:'])
    .concat(['- (1,1) 1. An Across clue (5)'])
    .concat(['down:'])
    .concat(['- (3,1) 2. A Down clue (4)'])
    .concat(['- (5,1) 3. A Down clue (3)']);
    const response = crosswordDataFormat.parse(headerLines.join("\n"));
    assert.same({
           msg: `returns largestClueId==3 for a valid header containing one across clue and two down clues`,
        actual: response && response.errors && response.errors.length===0 && response.hasOwnProperty('largestClueId') && response.largestClueId==='3',
      expected: true,
       context: {response}
    });
  }
  {
    const headerLines = specHeadersMinusAcrossAndDown
    .concat(['across:'])
    .concat(['- (1,1) 1,2 down,3 down. An Across clue (5,4,3)'])
    .concat(['down:'])
    .concat(['- (3,1) 2. See 1 Across (4)'])
    .concat(['- (5,1) 3. See 1 Across (3)']);
    const response = crosswordDataFormat.parse(headerLines.join("\n"));
    assert.same({
           msg: `returns largestClueId==3 for a valid header containing one across clue combining with two down clues combined to a 1 word answer`,
        actual: response && response.errors && response.errors.length===0
             && response.hasOwnProperty('largestClueId') && response.largestClueId==='3',
      expected: true,
       context: {response}
    });
  }
  {
    ",-|".split('').forEach( s => {
      const headerLines = specHeadersMinusAcrossAndDown
      .concat(['across:'])
      .concat([`- (1,1) 1,2 down,3 down. An Across clue (5${s}4${s}3)`])
      .concat(['down:'])
      .concat(['- (3,1) 2. See 1 Across (4)'])
      .concat(['- (5,1) 3. See 1 Across (3)']);
      const response = crosswordDataFormat.parse(headerLines.join("\n"));
      assert.same({
             msg: `returns largestClueId==3 for a valid header containing one across clue combining with two down clues combined to a multi word answer with separator '${s}'`,
          actual: response && response.errors && response.errors.length===0
               && response.hasOwnProperty('largestClueId') && response.largestClueId==='3',
        expected: true,
         context: {response}
      });
    })
  }
  {
    const headerLines = specHeadersMinusAcrossAndDown
    .concat(['across:'])
    .concat([`- (1,1) 1,2 down,3 down. An Across clue (5,4,3)`])
    .concat(['down:'])
    .concat(['- (3,1) 2. See 1 Across (4)'])
    .concat(['- (5,1) 3. See 1 Across (3)']);
    const response = crosswordDataFormat.parse(headerLines.join("\n"));
    assert.same({
           msg: `returns clue[2].down.belongsTo.id=='1' and clue[2].down.belongsTo.direction=='across'`,
        actual: response && response.errors && response.errors.length===0
             && response.clues && response.clues['2'] && response.clues['2'].down && response.clues['2'].down.belongsTo
             && response.clues['2'].down.belongsTo.id==='1'
             && response.clues['2'].down.belongsTo.direction==='across',
      expected: true,
       context: {response}
    });
    assert.same({
           msg: `returns clue[1].across.owns.length===2`,
        actual: response && response.errors && response.errors.length===0
             && response.clues && response.clues['1'].across && response.clues['1'].across.owns
             && response.clues['1'].across.owns.length === 2,
      expected: true,
       context: {response}
    });
  }
  {
    const headerLines = specHeadersMinusAcrossAndDown
    .concat(['across:'])
    .concat([`- (1,1) 1,2 down,3 down. An Across clue (5,4,3)`])
    .concat(['down:'])
    .concat(['- (3,1) 2. I do not belong (4)'])
    .concat(['- (5,1) 3. See 1 Across (3)']);
    const response = crosswordDataFormat.parse(headerLines.join("\n"));
    assert.same({
           msg: `returns isValid===false when a clue should belong but doesn't`,
        actual: response.isValid,
      expected: false,
       context: {response}
    });
  }
  {
    const headerLines = specHeadersMinusAcrossAndDown
    .concat(['across:'])
    .concat([`- (1,1) 1,2 down,3 down. An Across clue (5,4,3)`])
    .concat(['down:'])
    .concat(['- (3,1) 2. See 3 Down (4)'])
    .concat(['- (5,1) 3. See 1 Across (3)']);
    const response = crosswordDataFormat.parse(headerLines.join("\n"));
    assert.same({
           msg: `returns isValid===false when a clue is owned but belongsTo a different clue`,
        actual: response.isValid,
      expected: false,
       context: {response}
    });
  }
  {
    const headerLines = specHeadersMinusAcrossAndDown
    .concat(['across:'])
    .concat([`- (1,1) 1,2 down,3 down. An Across clue (5,4,3)`])
    .concat(['down:'])
    .concat(['- (3,1) 2. See 1 Across (4)'])
    .concat(['- (5,1) 3. See 1 Across (3)'])
    .concat(['- (7,1) 4. A clue (2-2,3)'])
    ;
    const response = crosswordDataFormat.parse(headerLines.join("\n"));
    assert.same({
           msg: `clue[4][down].answer exists`,
        actual: response.isValid===true
             && response.clues && response.clues['4'].down
             && response.clues['4'].down.hasOwnProperty('answer'),
      expected: true,
       context: {response}
    });
    assert.same({
           msg: `clue[4][down].answer.length===7`,
        actual: response.clues['4'].down.answer.length === 7,
      expected: true,
       context: {response}
    });
    assert.same({
           msg: `clue[4][down].answer.parts[1].separator==='-'`,
        actual: response.clues['4'].down.answer.parts[1].separator === '-',
      expected: true,
       context: {response}
    });
    assert.same({
           msg: `clue[1][across].answer.length===5`,
        actual: response.clues['1'].across.answer.length,
      expected: 5,
       context: {response}
    });
    assert.same({
           msg: `clue[1][across].answer.lengthOwned===12`,
        actual: response.clues['1'].across.answer.lengthOwned,
      expected: 12,
       context: {response}
    });
  }
  {
    const headerLines = specHeadersMinusAcrossAndDown
    .concat(['across:'])
    .concat([`- (1,1) 1,2 down,3 down. An Across clue (5,4,3)`])
    .concat(['down:'])
    .concat(['- (3,1) 2. See 1 Across (4)'])
    .concat(['- (5,1) 3. See 1 Across (2,1)'])
    .concat(['- (7,1) 4. A clue (2-2,3)'])
    ;
    const response = crosswordDataFormat.parse(headerLines.join("\n"));
    assert.same({
           msg: `not allowed a belongsTo clue with multi-part answer`,
        actual: response.isValid,
      expected: false,
       context: {response}
    });
  }
  {
    const headerLines = specHeadersMinusAcrossAndDown
    .concat(['across:'])
    .concat([`- (5,5) 1. An Across clue too far? (11)`])
    .concat(['down:'])
    ;
    const response = crosswordDataFormat.parse(headerLines.join("\n"));
    assert.same({
           msg: `not allowed an answer overflowing the bounds of the grid`,
        actual: response.isValid===false && response.errors && response.errors.length > 0
             && response.errors[0].includes('outside'),
      expected: true,
       context: {response}
    });
  }
  {
    const headerLines = specHeadersMinusAcrossAndDown
    .concat(['across:'])
    .concat([`- (1,1) 1,2 down,3 down. An Across clue (16,4,3)`])
    .concat(['down:'])
    .concat(['- (3,1) 2. See 1 Across (4)'])
    .concat(['- (5,1) 3. See 1 Across (3)'])
    .concat(['- (7,1) 4. A clue (2-2,3)'])
    ;
    const response = crosswordDataFormat.parse(headerLines.join("\n"));
    assert.same({
           msg: `not allowed a complex answer overflowing the bounds of the grid`,
        actual: response.isValid===false && response.errors && response.errors.length > 0
             && response.errors[0].includes('outside'),
      expected: true,
       context: {response}
    });
  }
  {
    const headerLines = specHeadersMinusAcrossAndDown
    .concat(['across:'])
    .concat([`- (3,1) 2. An Across clue (5,4,3)`])
    .concat([`- (5,2) 1. An Across clue (5)`])
    .concat(['down:'])
    ;
    const response = crosswordDataFormat.parse(headerLines.join("\n"));
    assert.same({
           msg: `must have clues in order within each direction`,
        actual: response.isValid===false && response.errors && response.errors.length > 0
             && response.errors[0].includes('order'),
      expected: true,
       context: {response}
    });
  }
  {
    const headerLines = specHeadersMinusAcrossAndDown
    .concat(['across:'])
    .concat(['down:'])
    .concat([`- (3,1) 2. An Across clue (5,4,3)`])
    .concat([`- (5,2) 1. An Across clue (5)`])
    ;
    const response = crosswordDataFormat.parse(headerLines.join("\n"));
    assert.same({
           msg: `must have clues in order within each direction`,
        actual: response.isValid===false && response.errors && response.errors.length > 0
             && response.errors[0].includes('order'),
      expected: true,
       context: {response}
    });
  }
});
