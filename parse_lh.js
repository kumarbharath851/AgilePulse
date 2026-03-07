
const fs = require('fs');
const d = JSON.parse(fs.readFileSync('C:/Bharath_POC/AgilePulse/lh-report.json','utf8'));
const score = d.categories.accessibility.score;
const auds = d.audits;
const fails = Object.values(auds).filter(function(v){ return v.score !== null && v.score < 1 && v.scoreDisplayMode === 'binary'; });
const passes = Object.values(auds).filter(function(v){ return v.score === 1 && v.scoreDisplayMode === 'binary'; });
const manual = Object.values(auds).filter(function(v){ return v.scoreDisplayMode === 'manual'; });
console.log('Accessibility Score: ' + Math.round(score * 100) + '/100');
console.log('Passed audits: ' + passes.length);
console.log('Failed audits: ' + fails.length);
console.log('Manual review needed: ' + manual.length);
console.log('--- FAILURES ---');
fails.forEach(function(v){
  const items = v.details && v.details.items ? v.details.items.length : 0;
  console.log('FAIL [' + v.id + '] ' + v.title + ' (' + items + ' elements) | ' + (v.description||''));
});
console.log('--- MANUAL REVIEW ---');
manual.forEach(function(v){ console.log('MANUAL [' + v.id + '] ' + v.title); });
