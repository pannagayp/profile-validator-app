# Profile Validator App

This is a Next.js application built in Firebase Studio that allows users to connect to their Gmail account, process emails from pre-registered senders, and extract content from either the email body or its attachments (PDF, DOCX).

## Features

- **Gmail Integration**: Securely connect to a user's Gmail account using OAuth to read unread emails.
- **Sender Verification**: Emails are only displayed if the sender's email address is registered in the Firestore `client` collection.
- **Content Extraction**: Automatically extracts text content from the email body or supported attachments (`.pdf`, `.docx`, plain text).
- **Email Dashboard**: A clean UI to list filtered emails, show their attachments, and trigger the content extraction process.
- **User Management**: A page to view and add new authorized senders to the Firestore database.
- **AI-Powered Extraction (optional)**: Includes a Genkit flow to process extracted content using the Gemini API.

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Language**: TypeScript
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [ShadCN/UI](https://ui.shadcn.com/)
- **Database**: [Cloud Firestore](https://firebase.google.com/docs/firestore)
- **Generative AI**: [Genkit](https://firebase.google.com/docs/genkit) with the Gemini API
- **Authentication**: Firebase Authentication (for backend) & Google OAuth (for Gmail API)

## Getting Started

To get a local copy up and running, follow these steps.

### Prerequisites

- Node.js (v18 or later)
- npm or yarn

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/pannagayp/profile-validator-app.git
    cd profile-validator-app
    ```

2.  **Install NPM packages**
    ```bash
    npm install
    ```

3.  **Set up Environment Variables**

    Create a file named `.env` in the root of your project and add the following variables. You will need to get these credentials from the Google Cloud Console.

    ```
    # For Google OAuth and Gmail API
    NEXT_PUBLIC_GMAIL_API_KEY=YOUR_GMAIL_API_KEY
    NEXT_PUBLIC_GMAIL_CLIENT_ID=YOUR_GMAIL_OAUTH_CLIENT_ID.apps.googleusercontent.com

    # For Genkit AI
    GEMINI_API_KEY=YOUR_GEMINI_API_KEY
    ```

### Running the Development Server

Once the installation is complete and your environment variables are set, you can run the development server:

```bash
npm run dev
```

Open [http://localhost:9002](http://localhost:9002) with your browser to see the result.
