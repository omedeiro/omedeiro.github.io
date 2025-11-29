# GitHub Pages Deployment Guide

This guide will help you deploy your portfolio website to GitHub Pages.

## Prerequisites

- A GitHub account
- Git installed on your local machine
- This website code ready for deployment

## Step-by-Step Deployment

### 1. Create GitHub Repository

1. Go to [GitHub](https://github.com) and sign in
2. Click the "+" icon in the top right corner
3. Select "New repository"
4. **Important**: Name your repository `omedeiro.github.io` (replace `omedeiro` with your actual GitHub username)
5. Make sure the repository is **public**
6. Don't initialize with README (since you already have one)
7. Click "Create repository"

### 2. Connect Local Code to GitHub

Open terminal/command prompt in your project folder and run:

```bash
# Initialize git repository (if not already done)
git init

# Add all files
git add .

# Make your first commit
git commit -m "Initial portfolio website commit"

# Add GitHub repository as remote origin
git remote add origin https://github.com/omedeiro/omedeiro.github.io.git

# Push code to GitHub
git push -u origin main
```

**Note**: Replace `omedeiro` with your actual GitHub username in the URL above.

### 3. Enable GitHub Pages

1. Go to your repository on GitHub
2. Click on the "Settings" tab
3. Scroll down to the "Pages" section in the left sidebar
4. Under "Source", select "Deploy from a branch"
5. Choose "main" branch and "/ (root)" folder
6. Click "Save"

### 4. Access Your Live Website

After a few minutes, your website will be available at:
```
https://omedeiro.github.io
```

**Note**: Replace `omedeiro` with your actual GitHub username.

## Updating Your Website

Whenever you want to update your portfolio:

1. Make changes to your local files
2. Commit and push the changes:
   ```bash
   git add .
   git commit -m "Update portfolio content"
   git push
   ```
3. GitHub Pages will automatically redeploy your site within a few minutes

## Custom Domain (Optional)

If you want to use a custom domain like `www.yourname.com`:

1. Purchase a domain from a domain registrar
2. In your repository, create a file named `CNAME` (no extension) in the root directory
3. Add your custom domain to this file:
   ```
   www.yourname.com
   ```
4. Configure your domain's DNS settings to point to GitHub Pages
5. In GitHub repository settings > Pages, add your custom domain

## Troubleshooting

### Common Issues:

1. **Site not loading**: Wait 5-10 minutes after initial deployment
2. **404 Error**: Make sure your main file is named `index.html`
3. **Repository name**: Must be exactly `yourusername.github.io`
4. **Repository visibility**: Must be public for free GitHub accounts

### Checking Build Status:

1. Go to your repository on GitHub
2. Click the "Actions" tab to see deployment status
3. Green checkmark = successful deployment
4. Red X = deployment failed (check the logs for details)

## Best Practices

1. **Test locally first**: Always test changes on your local server before pushing
2. **Use descriptive commit messages**: Makes it easier to track changes
3. **Keep content updated**: Regularly update your projects and information
4. **Monitor performance**: Use tools like Google PageSpeed Insights
5. **Backup your work**: GitHub serves as a backup, but consider additional backups

## Next Steps

Once your site is live:

1. **Update your project content** with real projects and information
2. **Add your website URL** to your GitHub profile
3. **Share your portfolio** on LinkedIn and other professional networks
4. **Consider SEO optimization** by adding meta tags and structured data
5. **Set up analytics** with Google Analytics or similar tools

## Additional Resources

- [GitHub Pages Documentation](https://docs.github.com/pages)
- [Custom Domains for GitHub Pages](https://docs.github.com/pages/configuring-a-custom-domain-for-your-github-pages-site)
- [Web Performance Testing](https://pagespeed.web.dev/)

---

Happy coding! 🚀
