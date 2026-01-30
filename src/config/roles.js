const allRoles = {
  user: ['user', 'all'],
  admin: ['user', 'admin', 'all'],
  superadmin: ['user', 'admin', 'superadmin', 'all'],
};

const roles = Object.keys(allRoles);
const roleRights = new Map(Object.entries(allRoles));

module.exports = {
  roles,
  roleRights,
};
