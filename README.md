🧠 Profile Validator App
The Profile Validator App is a Next.js application built using Firebase Studio. It allows users to securely connect their Gmail account, process emails from pre-registered senders, and extract content from either the email body or attachments (PDF, DOCX, or plain text).

✨ Features
🔐 Gmail Integration: Securely connect to a Gmail account via OAuth and read unread emails.

📧 Sender Verification: Only emails from senders registered in the Firestore client collection are displayed.

🧾 Content Extraction: Automatically extracts text from email bodies and attachments (.pdf, .docx, .txt).

📊 Email Dashboard: A clean, modern UI to list filtered emails, display attachments, and trigger content extraction.

👥 User Management: Add or view authorized senders directly from the Firestore database.

🤖 AI-Powered Processing (Optional): Includes a Genkit flow using the Gemini API to analyze and refine extracted data.

🧰 Tech Stack
Framework: Next.js (App Router)

Language: TypeScript

Styling: Tailwind CSS

UI Components: ShadCN/UI

Database: Cloud Firestore

Generative AI: Genkit + Gemini API

Authentication: Firebase Authentication & Google OAuth (Gmail API)

⚙️ Getting Started
Follow these steps to run the project locally:

✅ Prerequisites
Node.js (v18 or later)

npm or yarn

📦 Installation
Clone the Repository:

git clone https://github.com/pannagayp/profile-validator-app.git
cd profile-validator-app
Install Dependencies:

npm install
Set Up Environment Variables:
Create a .env file in the root directory and add:

# Google OAuth & Gmail API
NEXT_PUBLIC_GMAIL_API_KEY=YOUR_GMAIL_API_KEY
NEXT_PUBLIC_GMAIL_CLIENT_ID=YOUR_GMAIL_OAUTH_CLIENT_ID.apps.googleusercontent.com

# Genkit AI
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
🚀 Run the Development Server
npm run dev
The app will start on http://localhost:3000
