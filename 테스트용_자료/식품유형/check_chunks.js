const fs = require('fs'), path = require('path');
const BASE = path.join(__dirname, '../../preprocessing/chunks');

['alcohol_주류법별표','foodtype_일반식품'].forEach(name => {
  const data = JSON.parse(fs.readFileSync(path.join(BASE, name+'.json'), 'utf-8'));
  console.log('=== '+name+' 샘플 ===');
  data.slice(0,2).forEach(c => {
    console.log('  id:', c.id);
    console.log('  metadata:', JSON.stringify(c.metadata));
    console.log('  text(앞80):', c.text.slice(0,80));
    console.log();
  });
});
