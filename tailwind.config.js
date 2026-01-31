/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
        "./**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class', // Manual toggling via 'dark' class on html
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
            },
            colors: {
                zero: {
                    // Modified Light Mode Palette to reduce glare
                    bg: '#F5F5F7',          // Soft Light Gray (was #FFFFFF)
                    darkBg: '#0D0D0D',      // Deep Onyx
                    surface: '#FFFFFF',     // Pure White Cards (was #F7F7F8)
                    darkSurface: '#171717', // Charcoal
                    text: '#1A1A1A',        // Soft Black (was #212121)
                    darkText: '#ECECEC',    // Off-White
                    secondaryText: '#71717A', // Zinc 500 (was #6E6E80)
                    darkSecondaryText: '#999999', // Muted Gray
                    border: '#E4E4E7',      // Zinc 200
                    darkBorder: '#2D2D2D',  // Iron
                    accent: '#000000',      // Pitch Black
                    darkAccent: '#FFFFFF'   // Pure White
                }
            },
            animation: {
                'fade-in': 'fadeIn 0.3s ease-out forwards',
                'fade-in-out': 'fadeInOut 3s ease-in-out forwards',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0', transform: 'translateY(10px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                fadeInOut: {
                    '0%': { opacity: '0', transform: 'translateY(-20px) translateX(-50%)' },
                    '10%': { opacity: '1', transform: 'translateY(0) translateX(-50%)' },
                    '90%': { opacity: '1', transform: 'translateY(0) translateX(-50%)' },
                    '100%': { opacity: '0', transform: 'translateY(-20px) translateX(-50%)' },
                }
            }
        }
    },
    plugins: [],
}
