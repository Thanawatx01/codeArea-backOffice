const { from, TABLE_NAMES } = require('./index');

const table = () => from(TABLE_NAMES.SUBMISSIONS);

module.exports = { table };
