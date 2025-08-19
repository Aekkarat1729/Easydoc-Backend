// src/utils/roleMapper.js
const roleToNumber = {
  ADMIN: 1,
  OFFICER: 2,
  USER: 3,
};

const numberToRole = {
  1: 'ADMIN',
  2: 'OFFICER',
  3: 'USER',
};

function mapRoleToNumber(roleText) {
  return roleToNumber[roleText] ?? null;
}

function mapNumberToRole(num) {
  return numberToRole[num] ?? null;
}

module.exports = {
  mapRoleToNumber,
  mapNumberToRole,
  roleToNumber,
  numberToRole,
};
