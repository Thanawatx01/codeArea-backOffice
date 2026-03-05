const { from, TABLE_NAMES } = require('./index');

const table = () => from(TABLE_NAMES.USERS);

module.exports = { table };
