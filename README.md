## Geminai

**Geminai** is a `lightweight`, `simple` chatbot built with Python, leveraging [Google Generative AI](https://ai.google.dev/) to answer user queries. Its `minimalistic design` makes it easy to set up and `use directly` from your terminal, and also provides a modern web interface for convenient chatting.

### 🚀 Features

- **Simple CLI**: Fast, intuitive terminal interface
- **Web UI**: Responsive, user-friendly chat web page
- **Powered by Google Generative AI**: Accurate, context-aware responses
- **Minimal Setup**: Just install one dependency and set your API key
- **Customizable**: Easily adapt for your own use cases

### ⚙️ Prerequisites

- Python `3.7` or higher

### 🛠️ Setup

1. **Get your API key**

   - Go to [Google AI Studio](https://ai.google.dev/)
   - `Log in` > `Create a new project` > `Create a new API key`

2. **Install dependencies**

   ```bash
   pip install -q -U google-generativeai
   ```

3. **Configure environment variables**
   - Copy `.env.example` to `.env` and fill in your API key:
     ```
     GOOGLE_GEMINI_API_KEY=your_api_key_here
     GOOGLE_GEMINI_API_MODEL=gemini-2.0-flash
     ```
   - Or set the variable in your terminal:
     ```bash
     export GOOGLE_GEMINI_API_KEY='your_api_key_here'
     ```

### 💻 Usage

To run the chatbot, you need to set the environment variable `GOOGLE_GEMINI_API_KEY` with your API key. You can do this in your terminal:

```bash
export GOOGLE_GEMINI_API_KEY='your_api_key_here'
```

Then, you can run the chatbot application using the following command:

```bash
python cli.py
# For macOS or Linux
python3 cli.py
```

### ✨ Run on Terminal

```bash
$ python cli.py

You: What is the capital of France?
Bot: The capital of France is Paris.
```

### 🧪 Run on Web

Type `web` in the CLI to open the chat web page with your API key pre-filled:

```bash
$ python cli.py

You: web

# ---> Your web page will auto open
```

Or open directly:

- Visit: `https://thuongtruong109.github.io/geminai?key=<YOUR_GOOGLE_GEMINI_API_KEY>`
- Replace `<YOUR_GOOGLE_GEMINI_API_KEY>` with your actual API key.

### 📁 Project Structure

- [`cli.py`](cli.py): Python CLI chatbot
- [`index.html`](index.html): Web chat UI
- [`script.js`](script.js): Web chat logic
- [`style.css`](style.css): Web chat styling
- [`.env.example`](.env.example): Example environment config

### 🙏 Credits

- [Google Generative AI](https://ai.google.dev/)
- [Material Symbols](https://fonts.google.com/icons)
