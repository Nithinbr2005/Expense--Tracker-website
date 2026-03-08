# Expense Tracker Web App

A full-stack Expense Tracker built with a Python Flask backend and HTML/CSS/JS frontend, featuring a modern, premium design.

## Features
- Add new expenses with categories and optional descriptions
- View expenses in a list, ordered by date
- Filter expenses dynamically by category
- Delete any expense with a click
- Dynamic total balance calculation
- SQLite Database integration for persistent storage
- Responsive & modern glassmorphism UI built with CSS Grid and Flexbox
- Fluid animations and micro-interactions

## Prerequisites
- Python 3.7+ installed

## Installation

1. Open your terminal in this directory (`expense-tracker`).
2. (Optional) Create a virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```
3. Install Flask:
   ```bash
   pip install flask
   ```

## Running the Application

1. In the terminal, run the following command:
   ```bash
   python app.py
   ```
2. Open your web browser and navigate to:
   ```
   http://127.0.0.1:5000/
   ```

## Example Layout
- **Header:** Features the app title and a large, glowing "Total Balance" display that animates when expenses change.
- **Left Panel (Add Expense):** A clean glassmorphic form for entering the amount, category, date, and description.
- **Right Panel (Recent Expenses):** A structured table showing past expenses with a Category Filter dropdown. Each row has a sleek delete button to remove entries.
