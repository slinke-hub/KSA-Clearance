'use client';
import type { ProductDetails } from '@/lib/services/product-profile';
export function ProductDetailsFields({ value, onChange }: { value: ProductDetails; onChange: (value: ProductDetails) => void }) {
  const style = 'mt-1 w-full rounded border border-slate-300 bg-white p-2 text-sm text-slate-900 dark:bg-slate-800 dark:text-white';
  return <div className="grid gap-3 sm:grid-cols-2 text-xs">
    <label>Material, if known<input className={style} maxLength={100} value={value.material ?? ''} placeholder="e.g. steel, rubber, plastic" onChange={e=>onChange({...value,material:e.target.value})} /></label>
    <label>Vehicle class, if applicable<select className={style} value={value.vehicleClass ?? ''} onChange={e=>onChange({...value,vehicleClass:(e.target.value || undefined) as ProductDetails['vehicleClass']})}>
      <option value="">Not specified</option><option value="passenger">Passenger car / SUV</option><option value="goods">Goods vehicle / pickup</option><option value="bus">Bus</option><option value="tractor">Tractor</option><option value="special">Special-purpose vehicle</option>
    </select></label>
    <label className="sm:col-span-2">Function and application<input className={style} maxLength={300} value={value.use ?? ''} placeholder="e.g. complete engine-cooling fan for a passenger car" onChange={e=>onChange({...value,use:e.target.value})} /></label>
  </div>;
}
