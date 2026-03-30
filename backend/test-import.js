const compression = require('compression');
console.log('Type of compression:', typeof compression);
console.log('Compression object keys:', Object.keys(compression));
if (typeof compression === 'function') {
  console.log('SUCCESS: compression is a function');
} else {
  console.log('FAILURE: compression is not a function');
}
