const allRoles = {
  User: ['user', 'all'],
  admin: ['user', 'admin', 'all'],
  superadmin: ['superadmin', 'user', 'admin', 'all'],
};

const roles = Object.keys(allRoles);
const roleRights = new Map(Object.entries(allRoles));

module.exports = {
  roles,
  roleRights,
};
