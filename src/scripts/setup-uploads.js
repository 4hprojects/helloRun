const fs = require('fs');
const path = require('path');

// Define upload directories
const uploadDirs = [
  path.join(__dirname, '../public/uploads'),
  path.join(__dirname, '../public/uploads/organizer-docs'),
  path.join(__dirname, '../public/uploads/event-images'),
  path.join(__dirname, '../public/uploads/profile-photos')
];

// Create directories if they don't exist
uploadDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`✓ Created directory: ${dir}`);
  } else {
    console.log(`✓ Directory already exists: ${dir}`);
  }
});

// Create .gitkeep files to preserve empty directories in git
uploadDirs.forEach(dir => {
  const gitkeepPath = path.join(dir, '.gitkeep');
  if (!fs.existsSync(gitkeepPath)) {
    fs.writeFileSync(gitkeepPath, '');
    console.log(`✓ Created .gitkeep in: ${dir}`);
  }
});

console.log('\n✅ Upload directories setup complete!');