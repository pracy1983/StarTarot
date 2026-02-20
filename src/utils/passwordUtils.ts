export interface PasswordRequirements {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    number: boolean;
    special: boolean;
}

export const validatePassword = (password: string): PasswordRequirements => {
    return {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /[0-9]/.test(password),
        special: /[^A-Za-z0-9]/.test(password),
    };
};

export const isPasswordStrong = (reqs: PasswordRequirements): boolean => {
    return Object.values(reqs).every(Boolean);
};
