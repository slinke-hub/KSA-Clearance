import 'dotenv/config';
import { predictHsCode } from './src/lib/services/ai-classifier';

async function run() {
  const result = await predictHsCode('Apple iPhone 15 Pro Max 256GB Titanium');
  console.log('AI Prediction:', result);
}

run();
