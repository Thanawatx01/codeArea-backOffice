const { from, TABLE_NAMES } = require('./index');

const table = () => from(TABLE_NAMES.AI_FEEDBACK);

module.exports = { table };
