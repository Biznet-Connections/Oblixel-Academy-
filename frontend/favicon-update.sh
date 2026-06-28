# Update index.html to use both SVG and a simple inline favicon
sed -i 's|<!-- Favicons (PNG for all browsers + Google Search) -->|<!-- Favicons -->|' index.html
sed -i 's|<link rel="icon" href="/favicon-16x16.png" sizes="16x16" type="image/png">|<link rel="icon" type="image/svg+xml" href="/favicon.svg">|' index.html
sed -i 's|<link rel="icon" href="/favicon-32x32.png" sizes="32x32" type="image/png">||' index.html
sed -i 's|<link rel="icon" href="/favicon-48x48.png" sizes="48x48" type="image/png">||' index.html
sed -i 's|<link rel="apple-touch-icon" href="/apple-touch-icon.png">|<link rel="apple-touch-icon" href="/favicon.svg">|' index.html
echo "✅ Updated index.html to use SVG favicon"
