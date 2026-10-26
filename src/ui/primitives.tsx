import { useId, type ButtonHTMLAttributes, type ReactNode } from 'react'

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
}) {
  return <button type="button" {...props} className={`button button-${variant} ${className}`} />
}

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: 'neutral' | 'green' | 'amber'
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>
}

// Native controls retain their keyboard behavior. The field supplies one associated label.
export function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: (id: string, hintId?: string) => ReactNode
}) {
  const id = useId()
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children(id, hint ? `${id}-hint` : undefined)}
      {hint && <small id={`${id}-hint`}>{hint}</small>}
    </div>
  )
}

export function Avatar({ name, small = false }: { name: string; small?: boolean }) {
  return (
    <span className={`avatar ${small ? 'avatar-small' : ''}`} aria-hidden="true">
      {name
        .split(' ')
        .map((part) => part[0])
        .join('')}
    </span>
  )
}
