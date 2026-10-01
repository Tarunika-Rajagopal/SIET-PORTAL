import { User, Role } from '../types';
import { ApiClient } from './apiClient';

export function getUserInitials(name?: string): string {
  if (!name) return 'ST';
  const cleaned = name.replace(/^(Dr\.|Mr\.|Mrs\.|Ms\.|Prof\.)\s+/i, '').trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'ST';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  const first = parts[0][0];
  const last = parts[parts.length - 1][0];
  return (first + last).toUpperCase();
}



const STORAGE_KEY = "siet_auth_user_v5";

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

            // Purge student team and submission cache if it belongs to a different team/student
            const cachedTeamRaw = localStorage.getItem("siet_student_team_v6");
            if (cachedTeamRaw) {
                const cachedTeam = JSON.parse(cachedTeamRaw);
                const isDifferentTeam = (user.teamId && cachedTeam.id && user.teamId !== cachedTeam.id) ||
                                        (user.teamNo && cachedTeam.teamNo && user.teamNo !== cachedTeam.teamNo);
                const isMemberOfCached = Array.isArray(cachedTeam.members) && cachedTeam.members.some((m: any) =>
                    (user.rollNo && m.rollNo && m.rollNo.trim().toLowerCase() === user.rollNo.trim().toLowerCase()) ||
                    (user.email && m.email && m.email.trim().toLowerCase() === user.email.trim().toLowerCase())
                );
                if (isDifferentTeam || (!isMemberOfCached && (user.role === 'student' || user.activeRole === 'student'))) {
                    localStorage.removeItem("siet_student_team_v6");
                    localStorage.removeItem("siet_student_submissions_v6");
                }
            }
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
            localStorage.removeItem("siet_student_team_v6");
            localStorage.removeItem("siet_student_submissions_v6");

            // Purge all deliverable, submission date, and student caches to prevent cross-team contamination
            const keysToRemove: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k && (
                    k.startsWith('siet_deliverable_') ||
                    k.startsWith('siet_submission_date_') ||
                    k.startsWith('siet_student_')
                )) {
                    keysToRemove.push(k);
                }
            }
            keysToRemove.forEach(k => localStorage.removeItem(k));
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