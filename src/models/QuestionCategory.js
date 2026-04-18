const { from, TABLE_NAMES } = require('./index');

const table = () => from(TABLE_NAMES.QUESTION_CATEGORIES);

module.exports = { table };
