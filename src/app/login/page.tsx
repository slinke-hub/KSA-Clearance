import { login } from './actions'
import { ShieldCheck } from 'lucide-react'

export default async function LoginPage(
  props: {
    searchParams: Promise<{ message?: string }>
  }
) {
  const searchParams = await props.searchParams;
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#080d16] p-4">
      {/* Background radial gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zatca-500/20 via-[#080d16] to-[#080d16] dark:opacity-100 opacity-0 pointer-events-none transition-opacity duration-1000" />
      
      <div className="w-full max-w-md relative z-10 glass-card p-8 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-2xl">
        <div className="flex flex-col items-center mb-8">
          <div className="h-16 w-16 bg-gradient-to-br from-zatca-400 to-zatca-600 rounded-full flex items-center justify-center shadow-lg shadow-zatca-500/30 mb-4 hover-float">
            <ShieldCheck className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 text-center">
            Agent Portal
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 text-center">
            ZATCA Regulatory Intelligence
          </p>
        </div>

        <form className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="agent@customs.gov.sa"
              required
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-zatca-500 transition-all placeholder:text-slate-400"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-zatca-500 transition-all"
            />
          </div>

          {searchParams?.message && (
            <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm rounded-lg text-center font-medium">
              {searchParams.message}
            </div>
          )}

          <button
            formAction={login}
            className="w-full mt-4 glass-button bg-zatca-500 hover:bg-zatca-600 dark:bg-zatca-600 dark:hover:bg-zatca-500 text-white font-medium py-2.5 rounded-lg transition-all shadow-lg shadow-zatca-500/25"
          >
            Authenticate
          </button>
        </form>
      </div>
    </div>
  )
}
