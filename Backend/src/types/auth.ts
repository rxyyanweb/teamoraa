export type Role = 'admin' | 'hr' | 'employee';
export type Portal = 'admin' | 'staff';
export interface AuthenticatedUser {
  id: string;
  companyId: string;
  name: string;
  email: string;
  role: Role;
  mustChangePassword: boolean;
  department: string;
  designation: string;
  employeeCode: string;
  phone: string;
  joinedAt: Date;
  active: boolean;
}
declare global {
  namespace Express {
    interface Request {
      portal: Portal;
      auth?: AuthenticatedUser;
    }
  }
}
