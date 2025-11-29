# Owen Medeiros - Portfolio Website

A modern, responsive portfolio website built with HTML, CSS, and JavaScript, designed for deployment on GitHub Pages.

## 🚀 Live Site

Visit the live website at: [https://omedeiro.github.io](https://omedeiro.github.io)

## 📋 Features

- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Modern UI/UX**: Clean, professional design with smooth animations
- **Project Showcase**: Dedicated section for featuring your best work
- **Interactive Navigation**: Smooth scrolling and mobile-friendly menu
- **Contact Section**: Easy ways for potential employers/clients to reach you
- **Performance Optimized**: Fast loading times and smooth interactions

## 🛠️ Technologies Used

- **HTML5**: Semantic markup for better accessibility and SEO
- **CSS3**: Modern styling with Flexbox, Grid, and custom animations
- **JavaScript**: Vanilla JS for interactive features and smooth UX
- **Font Awesome**: Icons for social links and visual elements
- **Google Fonts**: Inter font family for modern typography

## 📁 Project Structure

```
omedeiro.github.io/
├── index.html          # Main homepage
├── style.css           # Stylesheet with responsive design
├── script.js           # JavaScript for interactivity
├── README.md           # Project documentation
└── .github/
    └── copilot-instructions.md  # Development guidelines
```

## 🚀 Quick Start

### Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/omedeiro/omedeiro.github.io.git
   cd omedeiro.github.io
   ```

2. Open `index.html` in your browser or use a local server:
   ```bash
   # Using Python 3
   python -m http.server 8000
   
   # Using Node.js (if you have http-server installed)
   npx http-server
   
   # Using PHP
   php -S localhost:8000
   ```

3. Navigate to `http://localhost:8000` to view the site.

### GitHub Pages Deployment

1. Create a new repository named `omedeiro.github.io` (replace `omedeiro` with your GitHub username)

2. Push this code to the main branch:
   ```bash
   git add .
   git commit -m "Initial portfolio website"
   git remote add origin https://github.com/omedeiro/omedeiro.github.io.git
   git push -u origin main
   ```

3. Go to your repository settings on GitHub
4. Scroll to the "Pages" section
5. Select "Deploy from a branch" and choose "main" branch
6. Your site will be available at `https://omedeiro.github.io` within a few minutes

## ✏️ Customization

### Personal Information

Update the following sections in `index.html`:

1. **Hero Section**: Change name, title, and description
2. **About Section**: Add your bio and update skills
3. **Projects Section**: Replace placeholder projects with your actual work
4. **Contact Section**: Update email and social media links

### Styling

Modify `style.css` to match your personal brand:

- Change color scheme by updating CSS custom properties
- Adjust typography by modifying font families and sizes
- Customize animations and transitions to fit your style

### Projects

For each project in the projects section, update:

- **Title**: Your project name
- **Description**: Brief explanation of what the project does
- **Technologies**: Tech stack used (update the tech tags)
- **Links**: GitHub repository and live demo URLs
- **Image**: Replace placeholder with actual project screenshots

### Adding Real Project Images

1. Create an `images` or `assets` folder
2. Add your project screenshots
3. Update the `project-image` divs in `index.html`:
   ```html
   <div class="project-image">
       <img src="images/project1.jpg" alt="Project Name" />
   </div>
   ```

## 📱 Responsive Design

The website is built with a mobile-first approach and includes:

- Responsive navigation with hamburger menu on mobile
- Flexible grid layout for projects
- Optimized typography and spacing for all screen sizes
- Touch-friendly interface elements

## 🎨 Design Features

- **Smooth Animations**: CSS transitions and JavaScript-powered effects
- **Modern Typography**: Inter font for excellent readability
- **Professional Color Scheme**: Blue and gold accent colors
- **Interactive Elements**: Hover effects and smooth scrolling
- **Clean Layout**: Plenty of whitespace and clear visual hierarchy

## 📊 Performance Considerations

- Optimized images and icons
- Minimal external dependencies
- Efficient CSS and JavaScript
- Fast loading times
- Smooth animations at 60fps

## 🤝 Contributing

Feel free to fork this project and customize it for your own use. If you find bugs or have suggestions for improvements, please open an issue or submit a pull request.

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 📞 Contact

- **Email**: your.email@example.com
- **GitHub**: [https://github.com/omedeiro](https://github.com/omedeiro)
- **LinkedIn**: [https://linkedin.com/in/yourprofile](https://linkedin.com/in/yourprofile)

---

Built with ❤️ by Owen Medeiros
