# College Meal Timetable Parser

A Node.js application that extracts text from college meal timetable images using Google's Gemini AI, parses the extracted text into structured meal data, and saves this data into MongoDB.

## Features

- **Image Text Extraction**: Uses Google's Gemini AI to extract text from timetable images
- **Text Parsing**: Parses extracted text into structured meal data (day, meal type, food items)
- **Data Validation**: Validates parsed data to ensure all days and meal types are present
- **MongoDB Integration**: Saves parsed meal data to MongoDB for persistence
- **Command-line Interface**: Simple CLI for processing timetable images

## Prerequisites

- Node.js (v18 or higher)
- MongoDB database
- Google Gemini API key (get from [Google AI Studio](https://aistudio.google.com/app/apikey))

## Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd yourfitnesspal
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the root directory with the following variables:
   ```
   GEMINI_API_KEY=your_gemini_api_key
   MONGODB_URI=your_mongodb_connection_string
   ```

## Directory Structure

```
.
├── images/                 # Directory for timetable images
│   └── timetable.jpg       # Default timetable image
├── data/
│   └── extracted/         # Directory for extracted text files
├── models/
│   └── Meal.js           # Mongoose model for meals
├── utils/
│   ├── geminiProcessor.js # Gemini AI text extraction
│   └── timetableParser.js  # Text parsing and validation
├── .env                    # Environment variables
├── extract-timetable-gemini.js # Main script
└── package.json
```

## Usage

1. Place your timetable image in the `images` directory (default: `timetable.jpg`)

### Basic Usage (with default image path)

```bash
node extract-timetable-gemini.js
```

### With Custom Image Path

```bash
node extract-timetable-gemini.js path/to/your/image.jpg
```

### Save to MongoDB

Add the `--save` flag to save the extracted data to MongoDB:

```bash
node extract-timetable-gemini.js --save
```

### Specify Image and Save

```bash
node extract-timetable-gemini.js path/to/your/image.jpg --save
```

### Clear Existing Data and Save New Data

```
node extract-timetable.js path/to/timetable-image.jpg --save --clear
```

### Test Parser with Sample Text File

```
node test-parser-text.js
```

### Retrieve Meals from MongoDB

```
node test-retrieve-meals.js
```

## Project Structure

- `extract-timetable.js`: Main script to extract text from images and save to MongoDB
- `test-parser-text.js`: Test script for parsing timetable text from a file
- `test-retrieve-meals.js`: Test script for retrieving meals from MongoDB
- `utils/`
  - `imageProcessor.js`: Handles image processing with GPT-4 Vision API
  - `timetableParser.js`: Parses text into structured meal data
- `models/`
  - `Meal.js`: MongoDB model for meal data
- `data/extracted/`: Directory for saving extracted text files

## Future Enhancements

- Web interface for image upload and processing
- Nutrition information extraction using food APIs
- Portion size selection and calorie calculation
- Semantic search using Pinecone and OpenAI embeddings

## License

MIT
