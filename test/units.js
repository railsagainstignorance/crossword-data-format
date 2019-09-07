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

test( 'parse fn', assert => {
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
})


// // Something to test
// const double = x => x * 2;
//
// // A test suite
// test('double', assert => {
//   {
//     const msg = 'double() should take a number x and return the product of x and 2';
//
//     const actual = double(4);
//     const expected = 8;
//
//     assert.same(actual, expected, msg);
//   }
//
//   {
//     const msg = 'double() should return NaN for non-numbers';
//
//     const actual = isNaN(double('puppy'));
//     const expected = true;
//
//     assert.same(actual, expected, msg);
//   }
//
//   // failing test
//   {
//     const msg = 'false should be true?';
//
//     const actual = false;
//     const expected = true;
//
//     assert.same(actual, expected, msg);
//   }
// });
