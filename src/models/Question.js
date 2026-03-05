const { from, TABLE_NAMES } = require('./index');

const table = () => from(TABLE_NAMES.QUESTIONS);

module.exports = { table };
