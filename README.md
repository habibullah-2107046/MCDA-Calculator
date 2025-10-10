# 🧮 AHP Calculator: Analytical Hierarchy Process

This is a **simple, single-page web application** designed to perform calculations for the **Analytical Hierarchy Process (AHP)**.  
It allows users to input a pairwise comparison matrix and instantly calculates the **Priority Vector (weights)**, **Consistency Index (CI)**, **Random Index (RI)**, and the crucial **Consistency Ratio (CR)**.

---

## 🚀 Features

- **Dynamic Matrix Generation** – Easily generate a pairwise comparison matrix based on the number of criteria (**N**) you specify (supports N = 2 to 20).  
- **Fraction Input Support** – Accepts both decimals and fractions (e.g., `1/3` or `5/2`).  
- **Automatic Reciprocal Calculation** – The lower triangle of the matrix is automatically filled with reciprocals of the upper triangle values.  
- **Comprehensive Results** – Displays:
  - Maximum eigenvalue (**λ<sub>max</sub>**)
  - **Consistency Index (CI)**
  - **Random Index (RI)**
  - **Consistency Ratio (CR)**
- **Consistency Check** – Indicates whether the CR value is acceptable (**< 0.10**).  
- **Export Functionality** – Export all results (Pairwise Matrix, Normalized Matrix, Priority Vector, and Consistency Info) into a single **Excel file (.xlsx)** for documentation.

---

## 🧭 How to Use

1. **Set Criteria Count**  
   Enter the number of criteria to compare (e.g., 3, 5, or 7).

2. **Generate Matrix**  
   Click the **"Generate Matrix"** button to create the pairwise comparison grid.

3. **Input Judgments**  
   Fill in the upper triangle using the **standard AHP scale (1–9)** and their reciprocals.  
   💡 You can use fractions like `1/5` or decimals like `0.2`.

4. **Calculate AHP**  
   Click **"Calculate AHP"** to compute the weights and consistency ratio.

5. **Review Results**  
   View the **Priority Vector** and **Consistency Ratio**.  
   If **CR ≥ 0.10**, revise your initial judgments for better consistency.

6. **Export Results**  
   Click **"Export to Excel"** to download a well-formatted spreadsheet containing:
   - Pairwise Matrix  
   - Normalized Matrix  
   - Priority Vector  
   - Consistency Metrics (λ<sub>max</sub>, CI, RI, CR)

---

## 💻 Running Locally

Since this is a **client-side web app** (HTML, CSS, JavaScript only), it runs directly in your browser — no server required!

### Steps:

1. **Download the Files**  
   Clone this repository or download the following files into a single folder: `index.html` `style.css` `script.js`
   
    ```bash
   https://github.com/habibullah-2107046/AHP-Calculator.git
3. **Open in Browser**  
Double-click the `index.html` file — it will open automatically in your default browser (Chrome, Firefox, Edge, etc.).

✅ That’s it! The AHP Calculator will be fully functional offline in your local browser.

---

## 🛠️ Technologies Used

- **HTML5** – Structure and layout  
- **CSS3** – Responsive and modern styling  
- **JavaScript (ES6)** – Core logic for matrix generation, AHP computation, and interactivity  
- **[SheetJS (xlsx.js)](https://sheetjs.com/)** – For generating and exporting Excel files

---

## 📜 License

This project is distributed under the **MIT License** — you are free to use, modify, and share.

---

## 📂 Project Structure

AHP-Calculator/

│

├── `index.html` # Defines the user interface and structure

├── `style.css` # Styles the layout, buttons, and tables

└── `script.js` # Handles matrix generation and AHP logic

---

### 🌐 Live Demo
You can view the live version here:  
👉 [AHP Calculator (GitHub Pages)](https://habibullah-2107046.github.io/AHP-Calculator/)

---

**Developed by [Md. Habibullah Masbah](https://github.com/habibullah-2107046)**  
🎓 Department of Urban & Regional Planning, RUET
🆔 Student ID: **2107046**  
📧 Email: [2107046.habibullah@gmail.com](mailto:2107046.habibullah@gmail.com)

Date: 10 October, 2025


---

**© 2025 Md. Habibullah Masbah — RUET, Bangladesh**
