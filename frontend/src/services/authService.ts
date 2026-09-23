import { User, Role } from '../types';
import { ApiClient } from './apiClient';

export function getUserInitials(name?: string): string {
  if (!name) return 'TR';
  const cleaned = name.replace(/^(Dr\.|Mr\.|Mrs\.|Ms\.|Prof\.)\s+/i, '').trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'TR';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  const first = parts[0][0];
  const last = parts[parts.length - 1][0];
  return (first + last).toUpperCase();
}



const STORAGE_KEY = "siet_auth_user_v5";
const USERS_STORAGE_KEY = "siet_registered_users_v5";

// Purge any stale persistent user session from localStorage so starting the frontend always requires explicit login
try {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem("siet_auth_user");
  localStorage.removeItem("siet_auth_token");
} catch (e) {}


export const AuthService = {

    getUserInitials,

    getCurrentUser(): User | null {
        try {
            const user = sessionStorage.getItem(STORAGE_KEY);

            return user ? JSON.parse(user) : null;
        } catch (e) {
            return null;
        }
    },

    setCurrentUser(
        user: User,
        activeRole: Role | null = null
    ): void {

        const sessionData: User = {
            ...user,

            activeRole:
                activeRole ||
                user.activeRole ||
                user.role ||
                (user.roles ? user.roles[0] : null),

            sessionTime: new Date().toISOString(),

            initials: getUserInitials(user.name)
        };

        try {
            sessionStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(sessionData)
            );
        } catch (e) {}
    },

    logout(): void {
        try {
            sessionStorage.removeItem(STORAGE_KEY);
            sessionStorage.removeItem("siet_auth_user");
            sessionStorage.removeItem("siet_auth_token");

            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem("siet_auth_user");
            localStorage.removeItem("siet_auth_token");
        } catch (e) {}
    },

    async authenticate(
        emailOrRoll: string,
        password: string
    ): Promise<{
        success: boolean;
        message?: string;
        user?: User;
        requiresRoleSelection?: boolean;
    }> {

        try {

            const data = await ApiClient.login(
                emailOrRoll,
                password
            );

            // Backend successfully authenticated the user
            if (data.success && data.user) {

                // Store the user returned by the backend
                this.setCurrentUser(data.user);
            }

            return {
                success: data.success,
                user: data.user,
            };

        } catch (err: any) {

            console.log(err.message);

            return {
                success: false,
                message: err.message,
            };
        }
    }
};