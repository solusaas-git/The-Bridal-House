interface User {
  id?: string;
  username?: string;
  email?: string;
  role?: string;
  isVerified?: boolean;
}

export const isAdmin = (user: User | null): boolean => {
  return user?.role?.toLowerCase() === 'admin';
};

export const isManager = (user: User | null): boolean => {
  return user?.role?.toLowerCase() === 'manager' || isAdmin(user);
};

export const isEmployee = (user: User | null): boolean => {
  return user?.role === 'employee' || isManager(user);
};

export function canViewMenu(user: User | null, permission: string): boolean {
  if (!user) {
    return false;
  }
  
  // Admin and superadmin can access everything (case insensitive)
  const userRole = user.role?.toLowerCase();
  if (userRole === 'admin' || userRole === 'superadmin') {
    return true;
  }
  
  // Define basic permissions that all authenticated users can access
  const basicPermissions = ['dashboard', 'customers', 'payments', 'reservations', 'products', 'costs', 'approvals'];
  
  if (basicPermissions.includes(permission)) {
    return true;
  }
  
  // For other specific permissions, check user role
  switch (userRole) {
    case 'manager':
      return ['settings'].includes(permission);
    case 'employee':
      return false; // Employees only get basic permissions
    default:
      return false;
  }
}

export const canCreate = (user: User | null, resource: string): boolean => {
  if (!user) return false;
  if (isAdmin(user)) return true;
  
  switch (user.role?.toLowerCase()) {
    case 'manager':
      return ['customers', 'payments', 'reservations', 'items', 'costs'].includes(resource);
    case 'employee':
      return ['customers', 'payments', 'reservations', 'costs'].includes(resource);
    default:
      return false;
  }
};

export const canEdit = (user: User | null, resource: string): boolean => {
  return canCreate(user, resource);
};

export const canDelete = (user: User | null, resource: string): boolean => {
  if (!user) return false;
  if (isAdmin(user)) return true;
  
  switch (user.role?.toLowerCase()) {
    case 'manager':
      return ['customers', 'payments', 'reservations', 'items', 'costs'].includes(resource);
    case 'employee':
      return ['reservations', 'costs'].includes(resource);
    default:
      return false;
  }
};

export const canApprove = (user: User | null): boolean => {
  return isManager(user);
};

// Approval utilities
export const needsApproval = (user: User | null, action: 'edit' | 'delete' | 'create' = 'edit', resourceType: string | null = null): boolean => {
  if (!user) {
    return false;
  }

  // Admins can do everything directly
  if (isAdmin(user)) {
    return false;
  }

  // Managers can do most things directly, but some actions might need approval
  if (isManager(user)) {
    // For now, managers can do everything directly
    // You can add specific resource types that managers need approval for
    return false;
  }

  // Employees need approval for edit/delete actions, but can create directly
  if (user.role?.toLowerCase() === 'employee') {
    // Employees can create costs without approval
    if (action === 'create' && resourceType === 'cost') {
      return false;
    }
    // Employees need approval for cost deletion
    if (action === 'delete' && resourceType === 'cost') {
      return true;
    }
    // All other actions need approval
    return true;
  }

  // Default: non-admin users need approval
  return !isAdmin(user);
};

export const canManageApprovals = (user: User | null): boolean => {
  return isManager(user);
};

export const canViewApprovals = (user: User | null): boolean => {
  return user?.role?.toLowerCase() === 'employee' || isManager(user);
}; 