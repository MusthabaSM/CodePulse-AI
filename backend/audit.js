const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const metrics = await prisma.fileMetrics.findMany();
  console.log('Total file metrics:', metrics.length);
  
  if (metrics.length === 0) {
    console.log('No metrics found.');
    return;
  }

  const getStats = (key) => {
    const values = metrics.map(m => m[key]).filter(v => v !== undefined && v !== null);
    if (values.length === 0) return { mean: 0, min: 0, max: 0, variance: 0 };
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    return { mean: mean.toFixed(2), min, max, variance: variance.toFixed(2), values: [...new Set(values)].slice(0, 10) };
  };

  console.log('churnCount:', getStats('churnCount'));
  console.log('bugFixCount:', getStats('bugFixCount'));
  console.log('authorEntropy:', getStats('authorEntropy'));
}
run().catch(console.error).finally(() => prisma.$disconnect());
