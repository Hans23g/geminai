import google.generativeai as genai
import webbrowser
import os
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("GOOGLE_GEMINI_API_KEY")
API_MODEL = os.getenv("GOOGLE_GEMINI_API_MODEL", "gemini-2.0-flash")

try:
    genai.configure(api_key=API_KEY)
except Exception:
    print("Failed to configure API key. Check valid key again.")
    exit()

model = genai.GenerativeModel(API_MODEL)

print("Model loaded successfully.")
print("Chatbot is ready to use. (Type 'web' to open chat web page, 'exit' to quit)")
print("==========================")

while True:
    user_input = input("You: ")
    if user_input.lower() == 'exit':
        print("Exiting the chatbot. Goodbye!")
        break
    elif user_input.lower() == 'web':
        print("Opening Google in your default browser...")
        webbrowser.open(f'https://thuongtruong109.github.io/geminai?key={API_KEY}')
        print("Google opened successfully!")
        continue
    try:
        response = model.generate_content(user_input)
        print(f"Bot: {response.text}")
    except Exception as e:
        print(f"An error occurred: {e}")
        print("Please try again or check your input.")
        break