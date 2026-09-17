import { buildProductProfile } from './src/lib/services/product-profile';
console.log(buildProductProfile(process.argv[2] || 'laptop computer'));
