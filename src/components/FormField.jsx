import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'

export default function FormField({
  label,
  type = 'text',
  name,
  value,
  onChange,
  error,
  autoComplete,
  required = true,
  ...rest
}) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const isPassword = type === 'password'

  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-ink">
        {label}
      </label>
      <div className="relative">
        <input
          id={name}
          name={name}
          type={isPassword && isPasswordVisible ? 'text' : type}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          required={required}
          className={`mt-1 block w-full rounded-md border border-ink/15 bg-card-fill px-3 py-2 text-ink placeholder:text-ink/35 focus:border-jade focus:outline-none focus:ring-1 focus:ring-jade focus:shadow-[var(--shadow-glow)] ${
            isPassword ? 'pr-10' : ''
          }`}
          {...rest}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setIsPasswordVisible((previous) => !previous)}
            aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
            className="absolute inset-y-0 right-0 mt-1 flex items-center px-3 text-ink/40 hover:text-ink/70"
          >
            {isPasswordVisible ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-sm text-rust">{error}</p>}
    </div>
  )
}
