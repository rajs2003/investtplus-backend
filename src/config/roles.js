const allRoles = {
  user: ['user'],
  admin: ['user', 'admin'],
  superadmin: ['user', 'admin', 'superadmin'],
};

const roles = Object.keys(allRoles);
const roleRights = new Map(Object.entries(allRoles));

module.exports = {
  roles,
  roleRights,
};
