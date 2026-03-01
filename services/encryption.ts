/**
 * AES-256-GCM encryption for storing sensitive data in localStorage.
 * Uses the Web Crypto API with a derived key from PBKDF2.
 */

const SALT = new TextEncoder().encode('zeronotes-encryption-salt-v1');
const ITERATIONS = 100000;

// Derive an AES-256 key from a passphrase using PBKDF2
async function deriveKey(): Promise<CryptoKey> {
    // Use origin + a fixed phrase as the passphrase (device/origin-bound)
    const passphrase = `zeronotes-${window.location.origin}-local-key`;
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(passphrase),
        'PBKDF2',
        false,
        ['deriveKey']
    );

    return crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt: SALT, iterations: ITERATIONS, hash: 'SHA-256' },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

/**
 * Encrypt a plain text string. Returns a base64 string (IV + ciphertext).
 */
export async function encrypt(plainText: string): Promise<string> {
    if (!plainText) return '';

    const key = await deriveKey();
    const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for AES-GCM
    const encoded = new TextEncoder().encode(plainText);

    const ciphertext = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        encoded
    );

    // Combine IV + ciphertext into a single array, then base64 encode
    const combined = new Uint8Array(iv.length + new Uint8Array(ciphertext).length);
    combined.set(iv);
    combined.set(new Uint8Array(ciphertext), iv.length);

    return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt a base64 string (IV + ciphertext) back to plain text.
 */
export async function decrypt(encryptedBase64: string): Promise<string> {
    if (!encryptedBase64) return '';

    try {
        const key = await deriveKey();
        const combined = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));

        const iv = combined.slice(0, 12);
        const ciphertext = combined.slice(12);

        const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            key,
            ciphertext
        );

        return new TextDecoder().decode(decrypted);
    } catch {
        // If decryption fails (e.g., plain text from before encryption was added), return as-is
        return encryptedBase64;
    }
}
