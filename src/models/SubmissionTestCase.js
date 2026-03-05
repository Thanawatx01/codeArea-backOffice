const { from, TABLE_NAMES } = require('./index');

const table = () => from(TABLE_NAMES.SUBMISSION_TEST_CASES);

module.exports = { table };
