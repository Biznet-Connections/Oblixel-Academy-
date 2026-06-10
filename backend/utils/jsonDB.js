const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '../data');

// Ensure data directory exists
if (!fs.existsSync(dataPath)) {
  fs.mkdirSync(dataPath, { recursive: true });
}

// Helper to read JSON file
function readJSON(fileName) {
  const filePath = path.join(dataPath, fileName);
  if (!fs.existsSync(filePath)) {
    return [];
  }
  const data = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(data);
}

// Helper to write JSON file
function writeJSON(fileName, data) {
  const filePath = path.join(dataPath, fileName);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// Helper to find by ID
function findById(fileName, id) {
  const items = readJSON(fileName);
  return items.find(item => item.id === id);
}

// Helper to add item
function addItem(fileName, item) {
  const items = readJSON(fileName);
  items.push(item);
  writeJSON(fileName, items);
  return item;
}

// Helper to update item
function updateItem(fileName, id, updates) {
  const items = readJSON(fileName);
  const index = items.findIndex(item => item.id === id);
  if (index === -1) return null;
  items[index] = { ...items[index], ...updates };
  writeJSON(fileName, items);
  return items[index];
}

// Helper to delete item
function deleteItem(fileName, id) {
  const items = readJSON(fileName);
  const filtered = items.filter(item => item.id !== id);
  writeJSON(fileName, filtered);
  return true;
}

// Helper to query items
function queryItems(fileName, filterFn) {
  const items = readJSON(fileName);
  return items.filter(filterFn);
}

module.exports = {
  readJSON,
  writeJSON,
  findById,
  addItem,
  updateItem,
  deleteItem,
  queryItems
};
