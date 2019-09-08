// Tiny unit test framework (via https://medium.com/javascript-scene/tdd-the-rite-way-53c9b46f45e3)
const test = (component, fn, count = 1) => {
  if (!component) { throw new Error(`Test Framework: Must specify a meaningful name for the set of tests`); }
  console.log(`# ${ component }`);
  fn({
    same: ({actual, expected, msg}) => {
      if (!msg) { throw new Error(`Test Framework: Must specify a meaningful 'msg' for test ${count}`); }
      if (actual == expected) {
        console.log(`ok ${ count } - ${ msg }`);
      } else {
        throw new Error(
    `not ok ${ count } -  ${ msg }
      expected:
        ${ expected }
      actual:
        ${ actual }
    `
        );
      }
      count++;
    }
  });
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
           msg: 'returns an obj including non-empty errors list and isValid==false for no input',
        actual: response && response.errors && response.errors.length>0 && response.hasOwnProperty('isValid') && !response.isValid,
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
      'down: '
    ];
    for (let i = 0; i < specHeaders.length; i++) {
      const missingHeader = specHeaders[i];
      const specHeadersMissingOne = specHeaders.filter( h => h !== missingHeader );
      const headerText = specHeadersMissingOne.join("\n");
      const response = crosswordDataFormat.parse(headerText);
      assert.same({
             msg: `returns an obj including non-empty errors list and isValid==false for a missing header: ${specHeaders[i]}`,
          actual: response && response.errors && response.errors.length>0 && response.hasOwnProperty('isValid') && !response.isValid,
        expected: true
      })
    }

    {
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
})
