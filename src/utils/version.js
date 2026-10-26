const semver = require('semver');
const { version } = require('../../package.json');

// Version del API leida del package.json y validada con semver
if (!semver.valid(version)) {
  throw new Error(`La version "${version}" del package.json no es semver valida`);
}

const API_VERSION = version;
const API_PREFIX = '/api/v1';

module.exports = { API_VERSION, API_PREFIX };
