const { from, TABLE_NAMES } = require('./index');

const table = () => from(TABLE_NAMES.TAGS);

module.exports = { table };
