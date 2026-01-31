<div align="center">
  <br />
  <a href="https://zeronotes.vercel.app">
    <img src="public/logo-dark.png" alt="ZeroNotes Logo" width="100" height="auto">
  </a>
  
  <h1 align="center">ZeroNotes</h1>

  <p align="center">
    <strong>Zero Friction. Zero Distractions. Pure Clarity.</strong>
  </p>

  <p align="center">
    <a href="https://zeronotes.vercel.app">View Demo</a>
    ·
    <a href="https://github.com/OmkarGharat/ZeroNotes/issues">Report Bug</a>
    ·
    <a href="https://github.com/OmkarGharat/ZeroNotes/issues">Request Feature</a>
  </p>
  
  [![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
  [![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)](https://reactjs.org/)
  [![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
  [![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
  [![Firebase](https://img.shields.io/badge/firebase-%23039BE5.svg?style=for-the-badge&logo=firebase)](https://firebase.google.com/)
</div>

<br />

<!-- SCREENSHOT PLACEHOLDER -->
<div align="center">
  <img src="https://placehold.co/1200x600/101010/FFFFFF/png?text=ZeroNotes+Interface+Preview" alt="ZeroNotes Screenshot" style="border-radius: 10px; box-shadow: 0px 10px 30px rgba(0,0,0,0.5);">
</div>

<br />

## 🔮 About The Project

**ZeroNotes** is a minimalist, developer-focused note-taking application designed to get out of your way. We believe that the best tool is the one you don't notice. 

In a world of complex productivity systems and cluttered interfaces, ZeroNotes offers a sanctuary for your thoughts. It starts instantly, requires no login for local use, and supports the features developers actually need.

### ✨ Why ZeroNotes?

*   **🚀 Instant Load**: Built with Vite for lightning-fast performance.
*   **🔒 Privacy First**: Notes are stored locally in your browser by default. No data leaves your device unless you choose to share.
*   **🌙 Beautiful UI**: A meticulously crafted interface with seamless Dark & Light mode integration.
*   **📝 Markdown Power**: Full GFM (GitHub Flavored Markdown) support with syntax highlighting for code blocks.
*   **🔗 Seamless Sharing**: One-click cloud publishing using Firebase to share read-only versions of your notes.
*   **⚡ Dev-Centric**: "Nuclear" backspace handling for code blocks and intuitive shortcuts.

<br />

## 🛠️ Tech Stack

*   **Framework**: [React](https://reactjs.org/) (v18)
*   **Build Tool**: [Vite](https://vitejs.dev/)
*   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
*   **Language**: [TypeScript](https://www.typescriptlang.org/)
*   **Editor**: [React Quill](https://github.com/zenoamaro/react-quill) + Custom Modules
*   **Backend (Sharing)**: [Firebase Firestore](https://firebase.google.com/)
*   **Routing**: [React Router](https://reactrouter.com/)
*   **Icons**: [Lucide React](https://lucide.dev/)

<br />

## 🚀 Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

*   npm
    ```sh
    npm install npm@latest -g
    ```

### Installation

1.  Clone the repo
    ```sh
    git clone https://github.com/OmkarGharat/ZeroNotes.git
    ```
2.  Install NPM packages
    ```sh
    npm install
    ```
3.  **Setup Environment Variables** (Required for Sharing)
    Create a `.env` file in the root directory and add your Firebase config:
    ```env
    FIREBASE_API_KEY=your_api_key
    FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
    FIREBASE_PROJECT_ID=your_project_id
    FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
    FIREBASE_MESSAGING_SENDER_ID=your_sender_id
    FIREBASE_APP_ID=your_app_id
    ```
4.  Start the development server
    ```sh
    npm run dev
    ```

<br />

## 🎮 Key Features

### 1. The "Zen" Editor
A clutter-free writing space that supports rich text, code blocks, and markdown shortcuts. Type `###` for a heading, ``` for code, or `-` for lists.

### 2. Share to Cloud
Need to show someone your code snippet or draft? Click the **Share** icon to instantly generate a public, read-only link. 
*   *Note: Shared notes are immutable public snapshots.*

### 3. Smart Search
Instantly filter through your local library with real-time search that indexes both titles and content.

### 4. Export
Your data is yours. Download any note as a `.md` file with a single click, ready for your favorite IDE or repository.

<br />

## 🤝 Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'feat: Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

<br />

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.

<br />

## 👨‍💻 Author

**Omkar Gharat**  
Project Link: [https://github.com/OmkarGharat/ZeroNotes](https://github.com/OmkarGharat/ZeroNotes)

<br />

<div align="center">
  <small>Made with ❤️ and TypeScript</small>
</div>
