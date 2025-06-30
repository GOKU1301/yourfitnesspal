# JiitNutrition - AI-Powered Meal Tracker

A full-stack application that extracts meal information from JIIT'S mess timetable , analyzes nutritional content, and provides personalized meal tracking. Built with React.js, Node.js, and powered by Gemini AI, Nutritionix API, and Pinecone for semantic food mapping.

## ✨ Features

- **AI-Powered OCR**: Extracts meal data from timetable images using Google's Gemini AI
- **Nutrition Analysis**: Integrates with Nutritionix API for accurate nutrition data
- **Smart Food Mapping**: Uses Pinecone and @xenova/transformers for semantic search to map local food names to standard equivalents
- **Responsive Dashboard**: Modern React.js interface for tracking daily nutrition and meal planning
- **Admin Portal**: Secure upload and processing of timetable images with real-time validation
- **Multi-Platform**: Web-based solution accessible from any device

## 🚀 Tech Stack

- **Frontend**: React.js, Vite, Tailwind CSS
- **Backend**: Node.js, Express.js
- **Database**: MongoDB Atlas
- **AI/ML**: 
  - Google Gemini API (OCR and fallback nutrition analysis)
  - Pinecone (vector search)
  - @xenova/transformers (embeddings)
- **APIs**: Nutritionix (primary nutrition data)
- **Deployment**: Vercel (Frontend), Railway (Backend)

## 📋 Prerequisites

- Node.js (v18 or higher)
- MongoDB Atlas account
- Google Gemini API key ([Get from Google AI Studio](https://aistudio.google.com/app/apikey))
- Nutritionix API key ([Get from Nutritionix](https://www.nutritionix.com/business/api))
- Pinecone API key ([Get from Pinecone](https://www.pinecone.io/))

## 🛠️ Installation

### Backend Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd yourfitnesspal/backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables (create `.env` in the backend directory):
   ```env
   PORT=5000
   MONGODB_URI=your_mongodb_atlas_uri
   GEMINI_API_KEY=your_gemini_api_key
   NUTRITIONIX_APP_ID=your_nutritionix_app_id
   NUTRITIONIX_APP_KEY=your_nutritionix_app_key
   PINECONE_API_KEY=your_pinecone_api_key
   PINECONE_INDEX=your_pinecone_index_name
   JWT_SECRET=your_jwt_secret
   ADMIN_EMAIL=your_admin@email.com
   ADMIN_PASSWORD=your_secure_password
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables (create `.env` in the frontend directory):
   ```env
   VITE_API_URL=http://localhost:5000
   ```

## 📁 Project Structure

```
.
├── backend/
│   ├── config/            # Configuration files
│   ├── controllers/       # Route controllers
│   ├── middlewares/       # Custom middlewares
│   ├── models/            # MongoDB models
│   ├── routes/            # API routes
│   ├── services/          # Business logic
│   ├── utils/             # Utility functions
│   │   ├── foodMapping.js # Semantic food mapping with Pinecone
│   │   ├── gemini.js      # Gemini AI integration
│   │   └── nutrition.js   # Nutrition data processing
│   └── server.js          # Express server
│
├── frontend/
│   ├── public/            # Static files
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── context/       # React context providers
│   │   ├── pages/         # Page components
│   │   ├── services/      # API services
│   │   └── App.js         # Main App component
│   └── vite.config.js     # Vite configuration
│
├── .env                   # Backend environment variables
└── README.md              # Project documentation
```

## 🚀 Getting Started

### Running the Application

1. Start the backend server:
   ```bash
   cd backend
   npm start
   ```

2. In a new terminal, start the frontend development server:
   ```bash
   cd frontend
   npm run dev
   ```

3. Access the application at `http://localhost:5173`

### Admin Features

1. **Upload Timetable**
   - Navigate to the admin dashboard
   - Upload a clear image of the college meal timetable
   - The system will automatically process and extract meal information

2. **View Nutrition Data**
   - Browse through the weekly meal plan
   - Click on any meal to view detailed nutrition information
   - Track daily and weekly nutrition intake

3. **Manage Food Mappings**
   - View and edit food mappings in the admin panel
   - Add custom mappings for local food items
   - Monitor mapping confidence scores

### For Developers

#### Adding New Food Mappings

1. To add a new food mapping manually:
   ```bash
   cd backend
   node utils/addFoodMapping.js "Local Food Name" "Standard Food Name"
   ```

2. The system will automatically generate embeddings and update the Pinecone index

#### Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `MONGODB_URI` | MongoDB Atlas connection string | ✅ |
| `GEMINI_API_KEY` | Google Gemini API key | ✅ |
| `NUTRITIONIX_APP_ID` | Nutritionix Application ID | ✅ |
| `NUTRITIONIX_APP_KEY` | Nutritionix Application Key | ✅ |
| `PINECONE_API_KEY` | Pinecone API key | ✅ |
| `PINECONE_INDEX` | Pinecone index name | ✅ |
| `JWT_SECRET` | Secret for JWT token generation | ✅ |
| `ADMIN_EMAIL` | Admin login email | ✅ |
| `ADMIN_PASSWORD` | Admin login password | ✅ |

## 🧠 How It Works

1. **Image Processing**
   - Uploaded timetable images are processed using Gemini AI's OCR capabilities
   - Extracted text is parsed into structured meal data

2. **Food Recognition**
   - Each food item is matched against our database using semantic search
   - Pinecone's vector search finds the closest matching standard food items
   - Confidence scores determine if Gemini AI fallback is needed

3. **Nutrition Analysis**
   - Primary nutrition data comes from Nutritionix API
   - For unmapped items, Gemini AI provides fallback nutrition estimates
   - All nutrition data is aggregated and stored in MongoDB

4. **User Experience**
   - Interactive dashboard shows daily and weekly nutrition
   - Responsive design works on all devices
   - Real-time updates as new data is processed

## 🚀 Deployment

### Frontend (Vercel)

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Deploy:
   ```bash
   cd frontend
   vercel
   ```

### Backend (Railway)

1. Install Railway CLI:
   ```bash
   npm i -g @railway/cli
   ```

2. Link and deploy:
   ```bash
   railway login
   cd backend
   railway up
   ```

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Google Gemini AI for OCR capabilities
- Nutritionix for comprehensive nutrition data
- Pinecone for powerful semantic search
- The open-source community for amazing tools and libraries
